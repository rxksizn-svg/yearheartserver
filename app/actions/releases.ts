'use server'

import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { z } from 'zod'
import {
  notifyReleaseStatusChanged,
  notifyReleaseSubmitted,
} from '@/lib/discord'
import { createClient } from '@/lib/supabase/server'
import { RELEASE_STATUS_ORDER } from '@/lib/types'
import { sameArtistName } from '@/lib/artist-names'
import { ISRC_PATTERN } from '@/lib/upc-matching'

const isrcField = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, '').toUpperCase())
  .refine((v) => !v || ISRC_PATTERN.test(v), 'รูปแบบ ISRC ไม่ถูกต้อง (เช่น THA012400001)')
  .optional()
  .nullable()

export type ReleaseActionState = {
  status: 'idle' | 'success' | 'error'
  message?: string
  releaseId?: string
}

const UNREGISTERED_ARTIST_MESSAGE =
  'กรุณาเลือกชื่อศิลปินที่ลงทะเบียนไว้ในระบบเท่านั้น'

async function isRegisteredArtistName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  name: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('artist_names')
    .select('name')
    .eq('user_id', userId)
  return (data ?? []).some((row) => sameArtistName(row.name, name))
}

const optionalUrl = z
  .string()
  .trim()
  .url('กรุณากรอกลิงก์ให้ถูกต้อง')
  .max(1000)
  .optional()
  .nullable()
  .or(z.literal(''))

const releaseFields = {
  track_type: z.enum(['Single', 'EP', 'Album']),
  album_name: z.string().trim().max(200).optional().nullable(),
  song_title: z.string().trim().min(1, 'กรุณากรอกชื่อผลงาน').max(200),
  artist_name: z.string().trim().min(1, 'กรุณากรอกชื่อศิลปิน').max(200),
  cover_path: z.string().trim().max(500).optional().nullable(),
  audio_path: z.string().trim().max(500).optional().nullable(),
  cover_url: optionalUrl,
  audio_url: optionalUrl,
  audio_filename: z.string().trim().max(300).optional().nullable(),
  composer: z.string().trim().min(1, 'กรุณากรอกชื่อผู้แต่ง/ผู้ประพันธ์').max(300),
  producer: z.string().trim().min(1, 'กรุณากรอกชื่อ Producer').max(300),
  genre: z.string().trim().min(1, 'กรุณากรอกแนวเพลง').max(120),
  upc_ean_isrc: z.string().trim().max(120).optional().nullable(), isrc: isrcField,
  is_explicit: z.boolean(),
  is_ai_generated: z.boolean(),
  submitter_name: z.string().trim().min(1, 'กรุณากรอกชื่อ-นามสกุล').max(200),
  submitter_email: z.string().trim().email('อีเมลไม่ถูกต้อง'),
  submitter_phone: z
    .string()
    .trim()
    .min(6, 'กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง')
    .max(30),
  consent_content_id: z.boolean().refine((v) => v === true, {
    message: 'กรุณายอมรับหลักเกณฑ์ด้านเนื้อหาและ Content ID',
  }),
  consent_terms: z.boolean(),
  consent_copyright: z.boolean(),
}

// Each asset needs either an uploaded file OR a Google Drive link.
type AssetFields = {
  cover_path?: string | null
  cover_url?: string | null
  audio_path?: string | null
  audio_url?: string | null
}

function assetRefine<T extends z.ZodType<AssetFields>>(schema: T) {
  return schema
    .refine((v) => Boolean(v.cover_path) || Boolean(v.cover_url), {
      message: 'กรุณาอัพโหลดไฟล์ปกเพลง หรือใส่ลิงก์ Google Drive',
      path: ['cover_path'],
    })
    .refine((v) => Boolean(v.audio_path) || Boolean(v.audio_url), {
      message: 'กรุณาอัพโหลดไฟล์เสียง หรือใส่ลิงก์ Google Drive',
      path: ['audio_path'],
    })
}

const releaseSchema = assetRefine(z.object(releaseFields))

export async function createRelease(
  input: unknown,
): Promise<ReleaseActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { status: 'error', message: 'กรุณาเข้าสู่ระบบก่อนส่งผลงาน' }
  }

  const parsed = releaseSchema.safeParse(input)
  if (!parsed.success) {
    return {
      status: 'error',
      message: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง',
    }
  }

  const v = parsed.data

  if (!(await isRegisteredArtistName(supabase, user.id, v.artist_name))) {
    return { status: 'error', message: UNREGISTERED_ARTIST_MESSAGE }
  }

  // Any uploaded path must live under the user's own folder (matches storage RLS).
  const prefix = `${user.id}/`
  if (
    (v.cover_path && !v.cover_path.startsWith(prefix)) ||
    (v.audio_path && !v.audio_path.startsWith(prefix))
  ) {
    return { status: 'error', message: 'ไฟล์ที่อัพโหลดไม่ถูกต้อง' }
  }

  const { data, error } = await supabase
    .from('releases')
    .insert({
      user_id: user.id,
      track_type: v.track_type,
      album_name: v.album_name || null,
      song_title: v.song_title,
      artist_name: v.artist_name,
      cover_path: v.cover_path || null,
      audio_path: v.audio_path || null,
      cover_url: v.cover_url || null,
      audio_url: v.audio_url || null,
      audio_filename: v.audio_filename || null,
      composer: v.composer,
      producer: v.producer,
      genre: v.genre,
      upc_ean_isrc: v.upc_ean_isrc || null, isrc: v.isrc || null,
      is_explicit: v.is_explicit,
      is_ai_generated: v.is_ai_generated,
      submitter_name: v.submitter_name,
      submitter_email: v.submitter_email,
      submitter_phone: v.submitter_phone,
      consent_content_id: v.consent_content_id,
      consent_terms: v.consent_terms,
      consent_copyright: v.consent_copyright,
    })
    .select('id')
    .single()

  if (error) {
    console.log('[v0] createRelease error:', error.message)
    return { status: 'error', message: 'บันทึกผลงานไม่สำเร็จ กรุณาลองอีกครั้ง' }
  }

  after(() =>
    notifyReleaseSubmitted({
      id: data.id,
      song_title: v.song_title,
      artist_name: v.artist_name,
      status: 'submitted',
      track_type: v.track_type,
      album_name: v.album_name,
      submitter_name: v.submitter_name,
      submitter_email: v.submitter_email,
      cover_path: v.cover_path,
      cover_url: v.cover_url,
    }),
  )

  revalidatePath('/releases')
  revalidatePath('/admin')
  return {
    status: 'success',
    message: 'ส่งผลงานเข้าระบบเรียบร้อยแล้ว',
    releaseId: data.id,
  }
}

const updateReleaseSchema = assetRefine(
  z.object({ ...releaseFields, releaseId: z.string().uuid() }),
)

/**
 * Lets a release owner edit and resubmit a release that an admin rejected.
 * On success the status flips to 'revised' ("ลูกค้าส่งแก้ไข") so admins can see
 * the customer sent a correction. RLS also enforces owner + rejected status.
 */
export async function updateRelease(
  input: unknown,
): Promise<ReleaseActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { status: 'error', message: 'กรุณาเข้าสู่ระบบก่อนแก้ไขผลงาน' }
  }

  const parsed = updateReleaseSchema.safeParse(input)
  if (!parsed.success) {
    return {
      status: 'error',
      message: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง',
    }
  }
  const v = parsed.data

  // Confirm the release exists, is owned by this user, and is currently rejected.
  const { data: existing } = await supabase
    .from('releases')
    .select('user_id, submitter_email, status, artist_name')
    .eq('id', v.releaseId)
    .maybeSingle()

  if (!existing) {
    return { status: 'error', message: 'ไม่พบผลงานที่ต้องการแก้ไข' }
  }

  const email = user.email?.toLowerCase() ?? ''
  const isOwner =
    existing.user_id === user.id ||
    existing.submitter_email?.toLowerCase() === email
  if (!isOwner) {
    return { status: 'error', message: 'ไม่มีสิทธิ์แก้ไขผลงานนี้' }
  }
  // A rejected release may keep its original name; changing it requires a registered one.
  if (
    !sameArtistName(v.artist_name, existing.artist_name ?? '') &&
    !(await isRegisteredArtistName(supabase, user.id, v.artist_name))
  ) {
    return { status: 'error', message: UNREGISTERED_ARTIST_MESSAGE }
  }
  if (existing.status !== 'rejected') {
    return {
      status: 'error',
      message: 'แก้ไขได้เฉพาะผลงานที่ถูกปฏิเสธเท่านั้น',
    }
  }

  // Any uploaded path must live under the user's own folder (matches storage RLS).
  const prefix = `${user.id}/`
  if (
    (v.cover_path && !v.cover_path.startsWith(prefix)) ||
    (v.audio_path && !v.audio_path.startsWith(prefix))
  ) {
    return { status: 'error', message: 'ไฟล์ที่อัพโหลดไม่ถูกต้อง' }
  }

  const { error } = await supabase
    .from('releases')
    .update({
      track_type: v.track_type,
      album_name: v.album_name || null,
      song_title: v.song_title,
      artist_name: v.artist_name,
      cover_path: v.cover_path || null,
      audio_path: v.audio_path || null,
      cover_url: v.cover_url || null,
      audio_url: v.audio_url || null,
      audio_filename: v.audio_filename || null,
      composer: v.composer,
      producer: v.producer,
      genre: v.genre,
      upc_ean_isrc: v.upc_ean_isrc || null, isrc: v.isrc || null,
      is_explicit: v.is_explicit,
      is_ai_generated: v.is_ai_generated,
      submitter_name: v.submitter_name,
      submitter_email: v.submitter_email,
      submitter_phone: v.submitter_phone,
      consent_content_id: v.consent_content_id,
      consent_terms: v.consent_terms,
      consent_copyright: v.consent_copyright,
      status: 'revised',
    })
    .eq('id', v.releaseId)

  if (error) {
    console.log('[v0] updateRelease error:', error.message)
    return { status: 'error', message: 'บัน��ึกการแก้ไขไม่สำเร็จ กรุณาลองอีกครั้ง' }
  }

  after(() =>
    notifyReleaseSubmitted(
      {
        id: v.releaseId,
        song_title: v.song_title,
        artist_name: v.artist_name,
        status: 'revised',
        track_type: v.track_type,
        album_name: v.album_name,
        submitter_name: v.submitter_name,
        submitter_email: v.submitter_email,
        cover_path: v.cover_path,
        cover_url: v.cover_url,
      },
      'revised',
    ),
  )

  revalidatePath('/releases')
  revalidatePath('/admin')
  return {
    status: 'success',
    message: 'ส่งแก้ไขผลงานเรียบร้อยแล้ว',
    releaseId: v.releaseId,
  }
}

// Full field set an admin fills when adding several releases at once, mirroring
// the single Upload Release form. Each row is mapped to an owner account via
// submitter_email; optional columns fall back to sensible defaults.
const bulkRowSchema = z.object({
  submitter_email: z.string().trim().email('อีเมลไม่ถูกต้อง'),
  submitter_name: z.string().trim().max(200).optional().nullable(),
  submitter_phone: z.string().trim().max(30).optional().nullable(),
  song_title: z.string().trim().min(1, 'กรุณากรอกชื่อเพลง').max(200),
  artist_name: z.string().trim().min(1, 'กรุณากรอกชื่อศิลปิน').max(200),
  track_type: z.enum(['Single', 'EP', 'Album']).default('Single'),
  album_name: z.string().trim().max(200).optional().nullable(),
  composer: z.string().trim().max(300).optional().nullable(),
  producer: z.string().trim().max(300).optional().nullable(),
  genre: z.string().trim().max(120).optional().nullable(),
  upc_ean_isrc: z.string().trim().max(120).optional().nullable(), isrc: isrcField,
  is_explicit: z.boolean().default(false),
  is_ai_generated: z.boolean().default(false),
  cover_url: optionalUrl,
  audio_url: optionalUrl,
})

const bulkSchema = z.object({
  rows: z.array(bulkRowSchema).min(1, 'กรุณาเพิ่มอย่างน้อย 1 รายการ').max(100),
})

export type BulkReleaseState = {
  status: 'idle' | 'success' | 'error'
  message?: string
  created?: number
  mapped?: number
  unmapped?: number
}

/**
 * Admin-only: create multiple releases in one submit. Each row is linked to an
 * owner by matching submitter_email to a profile; unmatched emails are owned by
 * the admin but stay visible to the email owner via the submitter_email RLS rule.
 * Running track numbers (track_no) are assigned automatically by the sequence.
 */
export async function createReleasesBulk(
  input: unknown,
): Promise<BulkReleaseState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { status: 'error', message: 'กรุณาเข้าสู่ระบบ' }
  }

  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (me?.role !== 'admin') {
    return { status: 'error', message: 'ไม่มีสิทธิ์ดำเนินการ' }
  }

  const parsed = bulkSchema.safeParse(input)
  if (!parsed.success) {
    return {
      status: 'error',
      message: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง',
    }
  }
  const rows = parsed.data.rows

  // Map each submitter email to an existing account (case-insensitive).
  const emails = Array.from(
    new Set(rows.map((r) => r.submitter_email.toLowerCase())),
  )
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email')
    .in('email', emails)

  const emailToId = new Map<string, string>()
  for (const p of profiles ?? []) {
    if (p.email) emailToId.set(p.email.toLowerCase(), p.id)
  }

  let mapped = 0
  let unmapped = 0
  const payload = rows.map((r) => {
    const ownerId = emailToId.get(r.submitter_email.toLowerCase())
    if (ownerId) mapped++
    else unmapped++
    return {
      user_id: ownerId ?? user.id,
      track_type: r.track_type,
      album_name: r.album_name || null,
      song_title: r.song_title,
      artist_name: r.artist_name,
      cover_url: r.cover_url || null,
      audio_url: r.audio_url || null,
      composer: r.composer || '-',
      producer: r.producer || '-',
      genre: r.genre || '-',
      upc_ean_isrc: r.upc_ean_isrc || null, isrc: r.isrc || null,
      is_explicit: r.is_explicit,
      is_ai_generated: r.is_ai_generated,
      submitter_name: r.submitter_name || r.artist_name,
      submitter_email: r.submitter_email,
      submitter_phone: r.submitter_phone || '-',
      consent_content_id: true,
      consent_terms: true,
      consent_copyright: true,
      status: 'submitted' as const,
    }
  })

  const { data, error } = await supabase
    .from('releases')
    .insert(payload)
    .select('id')

  if (error) {
    console.log('[v0] createReleasesBulk error:', error.message)
    return { status: 'error', message: 'เพิ่มรายการไม่��ำเร็จ กรุณาลองอีกครั้ง' }
  }

  revalidatePath('/admin')
  revalidatePath('/releases')
  return {
    status: 'success',
    message: `เพิ่ม ${data?.length ?? 0} ราย���ารเรียบร้อย (ผูกบัญชี ${mapped}, ยังไม่ผูก ${unmapped})`,
    created: data?.length ?? 0,
    mapped,
    unmapped,
  }
}

// Catalog update rows carry an optional `id`: present => overlay an existing
// release, absent => create a new one. All non-key fields are optional so a
// partial edit only overwrites the columns the admin actually changed.
const catalogRowSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  submitter_email: z.string().trim().email('อีเมลไม่ถูกต้อง'),
  submitter_name: z.string().trim().max(200).optional().nullable(),
  submitter_phone: z.string().trim().max(30).optional().nullable(),
  song_title: z.string().trim().min(1, 'กรุณากรอกชื่อเพลง').max(200),
  artist_name: z.string().trim().min(1, 'กรุณากรอกชื่อศิลปิน').max(200),
  track_type: z.enum(['Single', 'EP', 'Album']).default('Single'),
  album_name: z.string().trim().max(200).optional().nullable(),
  composer: z.string().trim().max(300).optional().nullable(),
  producer: z.string().trim().max(300).optional().nullable(),
  genre: z.string().trim().max(120).optional().nullable(),
  upc_ean_isrc: z.string().trim().max(120).optional().nullable(), isrc: isrcField,
  is_explicit: z.boolean().default(false),
  is_ai_generated: z.boolean().default(false),
  cover_url: optionalUrl,
  audio_url: optionalUrl,
})

const catalogSchema = z.object({
  rows: z.array(catalogRowSchema).min(1, 'กรุณาเพิ่มอย่างน้อย 1 รายการ').max(200),
})

export type CatalogUpdateState = {
  status: 'idle' | 'success' | 'error'
  message?: string
  created?: number
  updated?: number
  mapped?: number
  unmapped?: number
}

/**
 * Admin-only bulk catalog updater. Rows with an `id` overlay (update) the
 * matching release in place, preserving its status and consent flags; rows
 * without an `id` are inserted as brand-new releases. Ownership is (re)mapped
 * from submitter_email to an existing account when possible.
 */
export async function upsertReleasesBulk(
  input: unknown,
): Promise<CatalogUpdateState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { status: 'error', message: 'กรุณาเข้าสู่ระบบ' }
  }

  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (me?.role !== 'admin') {
    return { status: 'error', message: 'ไม่มีสิทธิ์ดำเนินการ' }
  }

  const parsed = catalogSchema.safeParse(input)
  if (!parsed.success) {
    return {
      status: 'error',
      message: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง',
    }
  }
  const rows = parsed.data.rows

  // Map each submitter email to an existing account (case-insensitive).
  const emails = Array.from(
    new Set(rows.map((r) => r.submitter_email.toLowerCase())),
  )
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email')
    .in('email', emails)

  const emailToId = new Map<string, string>()
  for (const p of profiles ?? []) {
    if (p.email) emailToId.set(p.email.toLowerCase(), p.id)
  }

  let created = 0
  let updated = 0
  let mapped = 0
  let unmapped = 0

  // Shared column mapping for both insert and update paths.
  const toColumns = (r: (typeof rows)[number]) => {
    const ownerId = emailToId.get(r.submitter_email.toLowerCase())
    if (ownerId) mapped++
    else unmapped++
    return {
      ownerId,
      cols: {
        track_type: r.track_type,
        album_name: r.album_name || null,
        song_title: r.song_title,
        artist_name: r.artist_name,
        cover_url: r.cover_url || null,
        audio_url: r.audio_url || null,
        composer: r.composer || '-',
        producer: r.producer || '-',
        genre: r.genre || '-',
        upc_ean_isrc: r.upc_ean_isrc || null, isrc: r.isrc || null,
        is_explicit: r.is_explicit,
        is_ai_generated: r.is_ai_generated,
        submitter_name: r.submitter_name || r.artist_name,
        submitter_email: r.submitter_email,
        submitter_phone: r.submitter_phone || '-',
      },
    }
  }

  const inserts: Record<string, unknown>[] = []

  for (const r of rows) {
    const { ownerId, cols } = toColumns(r)

    if (r.id) {
      // Overlay an existing release. Status and consent flags are intentionally
      // left untouched so an update does not reset an approved/in-review item.
      const { error } = await supabase
        .from('releases')
        .update({ ...cols, user_id: ownerId ?? user.id })
        .eq('id', r.id)
      if (error) {
        console.log('[v0] upsertReleasesBulk update error:', error.message)
        return {
          status: 'error',
          message: 'อัปเดตแคทตาล็อคไม่สำเร็จ กรุณาลองอีกครั้ง',
        }
      }
      updated++
    } else {
      inserts.push({
        ...cols,
        user_id: ownerId ?? user.id,
        consent_content_id: true,
        consent_terms: true,
        consent_copyright: true,
        status: 'submitted' as const,
      })
    }
  }

  if (inserts.length > 0) {
    const { data, error } = await supabase
      .from('releases')
      .insert(inserts)
      .select('id')
    if (error) {
      console.log('[v0] upsertReleasesBulk insert error:', error.message)
      return {
        status: 'error',
        message: 'เพิ่มรายการใหม่ไม่สำเร็จ กรุณาลองอีกครั้ง',
      }
    }
    created = data?.length ?? 0
  }

  revalidatePath('/admin')
  revalidatePath('/releases')
  return {
    status: 'success',
    message: `อัปเดตแคทตาล็อคเรียบร้อย · แก้ไข ${updated} รายการ · เพิ่มใหม่ ${created} รายการ (ผูกบัญชี ${mapped}, ยังไม่ผูก ${unmapped})`,
    created,
    updated,
    mapped,
    unmapped,
  }
}

/**
 * Admin-only destructive action: permanently delete EVERY release in the
 * catalog. There is no soft-delete or recovery — the caller must confirm in the
 * UI first. Returns how many rows were removed.
 */
export async function deleteAllReleases(): Promise<CatalogUpdateState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { status: 'error', message: 'กรุณาเข้าสู่ระบบ' }
  }

  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (me?.role !== 'admin') {
    return { status: 'error', message: 'ไม่มีสิทธิ์ดำเนินการ' }
  }

  // Delete all rows. PostgREST needs a filter, so match every non-null id.
  const { data, error } = await supabase
    .from('releases')
    .delete()
    .not('id', 'is', null)
    .select('id')

  if (error) {
    console.log('[v0] deleteAllReleases error:', error.message)
    return {
      status: 'error',
      message: 'ล้างแคทตาล็อคไม่สำเร็จ กรุณาลองอีกครั้ง',
    }
  }

  revalidatePath('/admin')
  revalidatePath('/releases')
  const removed = data?.length ?? 0
  return {
    status: 'success',
    message: `ล้างแคทตาล็อคเรียบร้อย ลบผลงานทั้งหมด ${removed} รายการออกจากระบบแล้ว`,
  }
}

export async function getReleaseAssetUrls(
  releaseId: string,
): Promise<{ coverUrl: string | null; audioUrl: string | null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { coverUrl: null, audioUrl: null }

  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (me?.role !== 'admin') return { coverUrl: null, audioUrl: null }

  const { data: release } = await supabase
    .from('releases')
    .select('cover_path, audio_path, cover_url, audio_url')
    .eq('id', releaseId)
    .maybeSingle()
  if (!release) return { coverUrl: null, audioUrl: null }

  const sign = async (path: string | null) => {
    if (!path) return null
    const { data } = await supabase.storage
      .from('release-assets')
      .createSignedUrl(path, 60 * 10)
    return data?.signedUrl ?? null
  }

  // Prefer a signed URL for an uploaded file; fall back to the Google Drive link.
  const [coverSigned, audioSigned] = await Promise.all([
    sign(release.cover_path),
    sign(release.audio_path),
  ])
  return {
    coverUrl: coverSigned ?? release.cover_url ?? null,
    audioUrl: audioSigned ?? release.audio_url ?? null,
  }
}

const statusSchema = z.object({
  releaseId: z.string().uuid(),
  status: z.enum(RELEASE_STATUS_ORDER as [string, ...string[]]),
  admin_note: z.string().trim().max(1000).optional(),
})

export async function updateReleaseStatus(
  input: unknown,
): Promise<ReleaseActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { status: 'error', message: 'unauthorized' }
  }

  // Admin gate — profiles.role must be 'admin'. Storage/table RLS also enforces it.
  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (me?.role !== 'admin') {
    return { status: 'error', message: 'ไม่มีสิทธิ์ดำเนินการ' }
  }

  const parsed = statusSchema.safeParse(input)
  if (!parsed.success) {
    return { status: 'error', message: 'ข้อมูลไม่ถูกต้อง' }
  }

  const { data: previous } = await supabase
    .from('releases')
    .select('status')
    .eq('id', parsed.data.releaseId)
    .maybeSingle()

  const { data: updated, error } = await supabase
    .from('releases')
    .update({
      status: parsed.data.status,
      admin_note: parsed.data.admin_note ?? null,
    })
    .eq('id', parsed.data.releaseId)
    .select(
      'id, song_title, artist_name, status, track_type, album_name, submitter_name, submitter_email, cover_path, cover_url',
    )
    .maybeSingle()

  if (error) {
    console.log('[v0] updateReleaseStatus error:', error.message)
    return { status: 'error', message: 'อัปเดตสถานะไม่สำเร็จ' }
  }

  if (updated && previous && previous.status !== updated.status) {
    after(() =>
      notifyReleaseStatusChanged(
        updated,
        previous.status,
        parsed.data.admin_note,
      ),
    )
  }

  revalidatePath('/admin')
  revalidatePath('/releases')
  return { status: 'success', message: 'อัปเดตสถานะเรียบร้อยแล้ว' }
}
