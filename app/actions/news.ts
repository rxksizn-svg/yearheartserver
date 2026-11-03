'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { SITE_MEDIA_BUCKET } from '@/lib/data/news'

type ActionResult = { status: 'success'; message?: string } | { status: 'error'; message: string }

async function getAdminClient() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .maybeSingle()
  if (profile?.role !== 'admin') return null
  return { supabase, adminId: profile.id as string }
}

const imagePath = z
  .string()
  .trim()
  .regex(/^(announcements|posts)\/[a-z0-9-]+\.(png|jpe?g|webp|gif)$/i, 'ไฟล์ภาพไม่ถูกต้อง')
  .nullable()
  .optional()

const announcementSchema = z.object({
  title: z.string().trim().min(1, 'กรุณากรอกหัวข้อประกาศ').max(200),
  body: z.string().trim().max(5000).default(''),
  image_path: imagePath,
  is_active: z.boolean().default(true),
  show_in_ticker: z.boolean().default(true),
})

function revalidateNews() {
  revalidatePath('/', 'layout')
}

async function removeImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  path: string | null | undefined,
) {
  if (path) await supabase.storage.from(SITE_MEDIA_BUCKET).remove([path])
}

export async function saveAnnouncement(id: string | null, input: unknown): Promise<ActionResult> {
  const session = await getAdminClient()
  if (!session) return { status: 'error', message: 'เฉพาะผู้ดูแลระบบเท่านั้น' }
  const parsed = announcementSchema.safeParse(input)
  if (!parsed.success) return { status: 'error', message: parsed.error.issues[0].message }
  const { supabase, adminId } = session
  const values = { ...parsed.data, image_path: parsed.data.image_path ?? null }

  if (id) {
    const { data: previous } = await supabase
      .from('announcements')
      .select('image_path')
      .eq('id', id)
      .maybeSingle()
    const { error } = await supabase
      .from('announcements')
      .update({ ...values, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) return { status: 'error', message: 'บันทึกประกาศไม่สำเร็จ' }
    if (previous?.image_path && previous.image_path !== values.image_path) {
      await removeImage(supabase, previous.image_path)
    }
  } else {
    const { error } = await supabase
      .from('announcements')
      .insert({ ...values, created_by: adminId })
    if (error) return { status: 'error', message: 'สร้างประกาศไม่สำเร็จ' }
  }

  revalidateNews()
  return { status: 'success', message: id ? 'บันทึกประกาศแล้ว' : 'เผยแพร่ประกาศแล้ว' }
}

export async function deleteAnnouncement(id: string): Promise<ActionResult> {
  const session = await getAdminClient()
  if (!session) return { status: 'error', message: 'เฉพาะผู้ดูแลระบบเท่านั้น' }
  const { supabase } = session
  const { data } = await supabase
    .from('announcements')
    .delete()
    .eq('id', id)
    .select('image_path')
    .maybeSingle()
  await removeImage(supabase, data?.image_path)
  revalidateNews()
  return { status: 'success', message: 'ลบประกาศแล้ว' }
}

const postSchema = z.object({
  title: z.string().trim().min(1, 'กรุณากรอกหัวข้อบทความ').max(200),
  slug: z.string().trim().max(80).default(''),
  excerpt: z.string().trim().max(500).default(''),
  content: z.string().trim().min(1, 'กรุณาเขียนเนื้อหาบทความ').max(50000),
  cover_path: imagePath,
  is_published: z.boolean().default(false),
})

function toSlug(raw: string, title: string): string {
  const clean = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60)
  const fromInput = clean(raw)
  if (fromInput) return fromInput
  const fromTitle = clean(title)
  const suffix = Math.random().toString(36).slice(2, 7)
  return fromTitle ? `${fromTitle}-${suffix}` : `news-${Date.now().toString(36)}${suffix}`
}

export async function savePost(id: string | null, input: unknown): Promise<ActionResult> {
  const session = await getAdminClient()
  if (!session) return { status: 'error', message: 'เฉพาะผู้ดูแลระบบเท่านั้น' }
  const parsed = postSchema.safeParse(input)
  if (!parsed.success) return { status: 'error', message: parsed.error.issues[0].message }
  const { supabase, adminId } = session
  const { slug: rawSlug, ...rest } = parsed.data
  const slug = toSlug(rawSlug, rest.title)
  const now = new Date().toISOString()

  const { data: previous } = id
    ? await supabase.from('posts').select('cover_path, published_at').eq('id', id).maybeSingle()
    : { data: null }

  const values = {
    ...rest,
    slug,
    cover_path: rest.cover_path ?? null,
    published_at: rest.is_published ? (previous?.published_at ?? now) : null,
  }

  const { error } = id
    ? await supabase.from('posts').update({ ...values, updated_at: now }).eq('id', id)
    : await supabase.from('posts').insert({ ...values, author_id: adminId })

  if (error) {
    return {
      status: 'error',
      message: error.code === '23505' ? 'ลิงก์ (slug) นี้ถูกใช้แล้ว กรุณาเปลี่ยนใหม่' : 'บันทึกบทความไม่สำเร็จ',
    }
  }
  if (previous?.cover_path && previous.cover_path !== values.cover_path) {
    await removeImage(supabase, previous.cover_path)
  }

  revalidateNews()
  return {
    status: 'success',
    message: rest.is_published ? 'เผยแพร่บทความแล้ว' : 'บันทึกฉบับร่างแล้ว',
  }
}

export async function deletePost(id: string): Promise<ActionResult> {
  const session = await getAdminClient()
  if (!session) return { status: 'error', message: 'เฉพาะผู้ดูแลระบบเท่านั้น' }
  const { supabase } = session
  const { data } = await supabase
    .from('posts')
    .delete()
    .eq('id', id)
    .select('cover_path')
    .maybeSingle()
  await removeImage(supabase, data?.cover_path)
  revalidateNews()
  return { status: 'success', message: 'ลบบทความแล้ว' }
}
