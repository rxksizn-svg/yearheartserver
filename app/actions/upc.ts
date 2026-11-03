'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { fetchAllRows } from '@/lib/supabase/fetch-all'
import {
  CodeIndex,
  ISRC_PATTERN,
  normalizeText,
  planCreate,
  planUpdate,
  UPC_PATTERN,
  type UpcCatalogRelease,
} from '@/lib/upc-matching'

export type UpcUpdateState = {
  status: 'success' | 'error'
  message: string
  updated?: number
  created?: number
  skipped?: number
  /** Indexes into `ops` that were written successfully. */
  doneIndexes?: number[]
}

const upc = z.string().trim().regex(UPC_PATTERN, 'รหัส UPC ไม่ถูกต้อง').nullable()
const isrc = z.string().trim().toUpperCase().regex(ISRC_PATTERN, 'รหัส ISRC ไม่ถูกต้อง').nullable()

const opSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('update'), id: z.string().uuid(), upc, isrc }),
  z.object({
    type: z.literal('create'),
    songTitle: z.string().trim().min(1).max(200),
    artistName: z.string().trim().min(1).max(200),
    albumName: z.string().trim().max(200),
    email: z.union([z.literal(''), z.string().trim().toLowerCase().email('อีเมลไม่ถูกต้อง').max(254)]),
    upc,
    isrc,
  }),
])

const schema = z.object({
  ops: z.array(opSchema).min(1, 'ไม่มีรายการให้บันทึก').max(5000, 'บันทึกได้สูงสุด 5,000 รายการต่อครั้ง'),
})

const CHUNK = 25

type CatalogRow = Pick<
  UpcCatalogRelease,
  'id' | 'song_title' | 'artist_name' | 'album_name' | 'upc_ean_isrc' | 'isrc'
>

export async function applyUpcUpdates(input: unknown): Promise<UpcUpdateState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { status: 'error', message: 'กรุณาเข้าสู่ระบบ' }

  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (me?.role !== 'admin') return { status: 'error', message: 'ไม่มีสิทธิ์ดำเนินการ' }

  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    return { status: 'error', message: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง' }
  }
  const { ops } = parsed.data

  // Re-check against the live catalog: another admin may have saved since the preview.
  const catalog = await fetchAllRows<CatalogRow>((from, to) =>
    supabase
      .from('releases')
      .select('id, song_title, artist_name, album_name, upc_ean_isrc, isrc')
      .range(from, to)
      .returns<CatalogRow[]>(),
  )
  const byId = new Map(catalog.map((r) => [r.id, r]))
  const index = new CodeIndex(catalog)

  // Owner priority: the account with the given email, then whoever the artist name is
  // registered to. Otherwise the admin holds it and `submitter_email` keeps the email so
  // the `profiles_link_releases` trigger hands it over when that email signs up.
  type Owner = { id: string; name: string | null; email: string }
  const emails = [...new Set(ops.flatMap((op) => (op.type === 'create' && op.email ? [op.email] : [])))]
  const byEmail = new Map<string, Owner>()
  for (let i = 0; i < emails.length; i += 200) {
    const { data: found } = await supabase
      .from('profiles')
      .select('id, name, email')
      .in('email', emails.slice(i, i + 200))
      .returns<Owner[]>()
    for (const p of found ?? []) byEmail.set(p.email.trim().toLowerCase(), p)
  }

  const { data: names } = await supabase
    .from('artist_names')
    .select('name, user_id, profile:profiles!artist_names_user_id_fkey(name, email)')
    .returns<{ name: string; user_id: string; profile: { name: string | null; email: string } | null }[]>()
  const owners = new Map<string, Owner>()
  for (const n of names ?? []) {
    const key = normalizeText(n.name)
    if (key && n.profile && !owners.has(key)) {
      owners.set(key, { id: n.user_id, name: n.profile.name, email: n.profile.email })
    }
  }

  const updates: { index: number; id: string; set: Record<string, string> }[] = []
  const inserts: { index: number; row: Record<string, unknown> }[] = []
  const seenTargets = new Set<string>()
  let skipped = 0
  let pendingClaims = 0

  ops.forEach((op, i) => {
    if (op.type === 'update') {
      const target = byId.get(op.id)
      if (!target || seenTargets.has(op.id)) return void skipped++
      const plan = planUpdate(target, op.upc, op.isrc, index)
      if (plan.action === 'skip') return void skipped++
      seenTargets.add(op.id)
      index.add(target.id, target.song_title, target.artist_name, target.album_name, plan.set.upc_ean_isrc ?? null, plan.set.isrc ?? null)
      updates.push({ index: i, id: op.id, set: plan.set })
      return
    }

    const plan = planCreate(op, index)
    if (plan.action === 'skip') return void skipped++
    const pseudoId = `new-${i}`
    index.add(pseudoId, op.songTitle, op.artistName, op.albumName || null, op.upc, op.isrc)
    const owner = (op.email && byEmail.get(op.email)) || owners.get(normalizeText(op.artistName))
    if (!owner) pendingClaims++
    inserts.push({
      index: i,
      row: {
        user_id: owner?.id ?? user.id,
        track_type: op.albumName ? 'Album' : 'Single',
        album_name: op.albumName || null,
        song_title: op.songTitle,
        artist_name: op.artistName,
        composer: '-',
        producer: '-',
        genre: '-',
        upc_ean_isrc: op.upc,
        isrc: op.isrc,
        submitter_name: owner?.name || op.artistName,
        submitter_email: owner?.email ?? (op.email || '-'),
        submitter_phone: '-',
        consent_content_id: true,
        consent_terms: true,
        consent_copyright: true,
        status: 'live',
      },
    })
  })

  const doneIndexes: number[] = []

  for (let i = 0; i < updates.length; i += CHUNK) {
    const results = await Promise.all(
      updates.slice(i, i + CHUNK).map(async (u) => {
        const { error, count } = await supabase
          .from('releases')
          .update(u.set, { count: 'exact' })
          .eq('id', u.id)
        if (error) console.log('[v0] upc update error:', error.message)
        return error || count === 0 ? null : u.index
      }),
    )
    for (const idx of results) if (idx !== null) doneIndexes.push(idx)
  }
  const updated = doneIndexes.length

  let created = 0
  for (let i = 0; i < inserts.length; i += 200) {
    const batch = inserts.slice(i, i + 200)
    const { error } = await supabase.from('releases').insert(batch.map((b) => b.row))
    if (error) {
      console.log('[v0] upc insert error:', error.message)
      continue
    }
    created += batch.length
    for (const b of batch) doneIndexes.push(b.index)
  }

  revalidatePath('/admin/upc')
  revalidatePath('/admin/releases')
  revalidatePath('/releases')

  const failed = updates.length + inserts.length - updated - created
  if (updated + created === 0) {
    return {
      status: 'error',
      message: skipped > 0 ? `ไม่มีรายการให้บันทึก (ข้ามรายการซ้ำ ${skipped} รายการ)` : 'บันทึกไม่สำเร็จ กรุณาลองใหม่',
      skipped,
      doneIndexes,
    }
  }
  const parts = [`อัพเดท ${updated} รายการ`, `เพิ่มเพลงใหม่ ${created} รายการ`]
  if (created > 0 && pendingClaims > 0) parts.push(`ผูกกับบัญชี Admin ชั่วคราว ${pendingClaims} รายการ`)
  if (skipped > 0) parts.push(`ข้ามรายการซ้ำ ${skipped} รายการ`)
  if (failed > 0) parts.push(`ไม่สำเร็จ ${failed} รายการ`)
  return { status: 'success', message: `บันทึกแล้ว · ${parts.join(' · ')}`, updated, created, skipped, doneIndexes }
}
