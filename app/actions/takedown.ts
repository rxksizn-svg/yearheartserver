'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { after } from 'next/server'

import { notifyTakedown, type DiscordReleaseInfo } from '@/lib/discord'
import { createClient } from '@/lib/supabase/server'

const NOTIFY_RELEASE_COLUMNS =
  'id, song_title, artist_name, status, track_type, album_name, submitter_name, submitter_email, cover_path, cover_url'

type ActionResult<T = undefined> =
  | { status: 'success'; message?: string; data?: T }
  | { status: 'error'; message: string }

async function getSessionProfile() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, email, role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) return null
  return { supabase, profile }
}

const createSchema = z.object({
  release_id: z.string().uuid().optional().nullable(),
  song_title: z.string().trim().min(1, 'กรุณากรอกชื่อเพลง').max(200),
  artist_name: z.string().trim().min(1, 'กรุณากรอกชื่อศิลปิน').max(200),
  reason: z.string().trim().min(1, 'กรุณาระบุเหตุผลในการขอลบเพลง').max(4000),
  contact_name: z.string().trim().min(1, 'กรุณากรอกชื่อ-นามสกุลผู้ติดต่อ').max(200),
  contact_email: z.string().trim().email('อีเมลไม่ถูกต้อง'),
  contact_phone: z
    .string()
    .trim()
    .min(6, 'กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง')
    .max(30),
})

/**
 * User submits a request to take a song down from the platform. This never
 * deletes anything — it only records the request for an admin to review.
 */
export async function createTakedownRequest(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const session = await getSessionProfile()
  if (!session) return { status: 'error', message: 'กรุณาเข้าสู่ระบบ' }
  const { supabase, profile } = session

  const parsed = createSchema.safeParse(input)
  if (!parsed.success) {
    return {
      status: 'error',
      message: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง',
    }
  }

  // If a release is referenced, confirm it belongs to the requester (RLS also
  // enforces this, but validating here gives a clearer error).
  let requestedRelease: DiscordReleaseInfo | null = null
  if (parsed.data.release_id) {
    const { data: release } = await supabase
      .from('releases')
      .select(`${NOTIFY_RELEASE_COLUMNS}, user_id`)
      .eq('id', parsed.data.release_id)
      .maybeSingle()
    requestedRelease = release

    const owns =
      release &&
      (release.user_id === profile.id ||
        release.submitter_email?.toLowerCase() === profile.email?.toLowerCase())

    if (!owns) {
      return { status: 'error', message: 'ไม่พบผลงานเพลงนี้ในบัญชีของคุณ' }
    }
  }

  const { data, error } = await supabase
    .from('takedown_requests')
    .insert({
      user_id: profile.id,
      release_id: parsed.data.release_id ?? null,
      song_title: parsed.data.song_title,
      artist_name: parsed.data.artist_name,
      reason: parsed.data.reason,
      contact_name: parsed.data.contact_name,
      contact_email: parsed.data.contact_email,
      contact_phone: parsed.data.contact_phone,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error || !data) {
    console.log('[v0] createTakedownRequest error:', error?.message)
    return { status: 'error', message: 'ส่งคำขอไม่สำเร็จ กรุณาลองใหม่' }
  }

  const reason = parsed.data.reason
  const notifyInfo: DiscordReleaseInfo = requestedRelease ?? {
    song_title: parsed.data.song_title,
    artist_name: parsed.data.artist_name,
    status: 'submitted',
    submitter_name: parsed.data.contact_name,
    submitter_email: parsed.data.contact_email,
  }
  after(() => notifyTakedown(notifyInfo, 'requested', { reason }))

  revalidatePath('/takedown')
  revalidatePath('/admin')
  return { status: 'success', message: 'ส่งคำขอ TakeDown เรียบร้อยแล้ว', data: { id: data.id } }
}

const resolveSchema = z.object({
  id: z.string().uuid(),
  decision: z.enum(['completed', 'rejected']),
  admin_note: z.string().trim().max(2000).optional().nullable(),
})

/**
 * Admin resolves a takedown request. On 'completed' the target release's status
 * is set to 'takedown' (the release itself is NOT deleted) and a snapshot of the
 * release is stored on the request as immutable evidence. On 'rejected' the
 * release is left untouched. The request row is always kept for history.
 */
export async function resolveTakedownRequest(
  input: unknown,
): Promise<ActionResult> {
  const session = await getSessionProfile()
  if (!session || session.profile.role !== 'admin') {
    return { status: 'error', message: 'ไม่มีสิทธิ์ดำเนินการ' }
  }
  const { supabase, profile } = session

  const parsed = resolveSchema.safeParse(input)
  if (!parsed.success) {
    return {
      status: 'error',
      message: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง',
    }
  }

  const { id, decision, admin_note } = parsed.data

  const { data: request } = await supabase
    .from('takedown_requests')
    .select('id, release_id, status, song_title, artist_name, reason, contact_name, contact_email')
    .eq('id', id)
    .maybeSingle()

  if (!request) {
    return { status: 'error', message: 'ไม่พบคำขอนี้' }
  }

  let snapshot: Record<string, unknown> | null = null

  if (decision === 'completed' && request.release_id) {
    // Snapshot the release exactly as it is now, then mark it as taken down.
    const { data: release } = await supabase
      .from('releases')
      .select('*')
      .eq('id', request.release_id)
      .maybeSingle()

    if (release) {
      snapshot = release as Record<string, unknown>
      const { error: relError } = await supabase
        .from('releases')
        .update({ status: 'takedown' })
        .eq('id', request.release_id)

      if (relError) {
        console.log('[v0] resolveTakedownRequest release update error:', relError.message)
        return { status: 'error', message: 'อัปเดตสถานะเพลงไม่สำเร็จ' }
      }
    }
  }

  const { error } = await supabase
    .from('takedown_requests')
    .update({
      status: decision,
      admin_id: profile.id,
      admin_note: admin_note || null,
      release_snapshot: snapshot,
      processed_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    console.log('[v0] resolveTakedownRequest error:', error.message)
    return { status: 'error', message: 'บันทึกผลไม่สำเร็จ' }
  }

  let notifyInfo: DiscordReleaseInfo = {
    song_title: request.song_title,
    artist_name: request.artist_name,
    status: decision === 'completed' ? 'takedown' : 'submitted',
    submitter_name: request.contact_name,
    submitter_email: request.contact_email,
  }
  if (request.release_id) {
    const { data: current } = await supabase
      .from('releases')
      .select(NOTIFY_RELEASE_COLUMNS)
      .eq('id', request.release_id)
      .maybeSingle()
    if (current) notifyInfo = current
  }
  after(() =>
    notifyTakedown(notifyInfo, decision, {
      reason: request.reason,
      adminNote: admin_note,
    }),
  )

  revalidatePath('/admin')
  revalidatePath('/takedown')
  revalidatePath('/releases')
  return {
    status: 'success',
    message:
      decision === 'completed' ? 'TakeDown สำเร็จแล้ว' : 'บันทึกผลเรียบร้อยแล้ว',
  }
}
