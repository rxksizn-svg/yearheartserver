'use server'

import { revalidatePath } from 'next/cache'

import type { ActionState } from '@/app/actions/admin'
import { MAX_ARTIST_NAMES } from '@/lib/artist-names'
import { requireAdmin } from '@/lib/data/royalties'
import { createClient } from '@/lib/supabase/server'

function revalidateArtistViews() {
  revalidatePath('/admin/users')
  revalidatePath('/releases/new')
}

/** Admin only: register an artist name a user may submit releases under. */
export async function addArtistName(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireAdmin()
  } catch {
    return { status: 'error', message: 'เฉพาะผู้ดูแลระบบเท่านั้น' }
  }

  const userId = String(formData.get('userId') ?? '').trim()
  const name = String(formData.get('name') ?? '').trim()
  if (!userId) return { status: 'error', message: 'ไม่พบผู้ใช้' }
  if (!name) return { status: 'error', message: 'กรุณากรอกชื่อศิลปิน' }
  if (name.length > 200) return { status: 'error', message: 'ชื่อศิลปินยาวเกินไป' }

  const supabase = await createClient()
  const { error } = await supabase.from('artist_names').insert({ user_id: userId, name })

  if (error) {
    if (error.code === '23505') {
      return { status: 'error', message: 'มีชื่อศิลปินนี้อยู่แล้ว' }
    }
    if (error.message.includes('ARTIST_NAME_LIMIT')) {
      return {
        status: 'error',
        message: `เพิ่มได้สูงสุด ${MAX_ARTIST_NAMES} ชื่อต่อผู้ใช้`,
      }
    }
    return { status: 'error', message: `เพิ่มไม่สำเร็จ: ${error.message}` }
  }

  // Keep the profile's display name populated with the first registered name.
  await supabase
    .from('profiles')
    .update({ artist_name: name })
    .eq('id', userId)
    .is('artist_name', null)

  revalidateArtistViews()
  return { status: 'success', message: `เพิ่ม "${name}" แล้ว` }
}

/** Admin only: remove a registered artist name. */
export async function removeArtistName(id: string): Promise<ActionState> {
  try {
    await requireAdmin()
  } catch {
    return { status: 'error', message: 'เฉพาะผู้ดูแลระบบเท่านั้น' }
  }

  const supabase = await createClient()
  const { data: removed, error } = await supabase
    .from('artist_names')
    .delete()
    .eq('id', id)
    .select('user_id, name')
    .maybeSingle()

  if (error) return { status: 'error', message: `ลบไม่สำเร็จ: ${error.message}` }
  if (!removed) return { status: 'error', message: 'ไม่พบชื่อศิลปินนี้' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('artist_name')
    .eq('id', removed.user_id)
    .maybeSingle()

  if (profile?.artist_name?.trim().toLowerCase() === removed.name.trim().toLowerCase()) {
    const { data: next } = await supabase
      .from('artist_names')
      .select('name')
      .eq('user_id', removed.user_id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    await supabase
      .from('profiles')
      .update({ artist_name: next?.name ?? null })
      .eq('id', removed.user_id)
  }

  revalidateArtistViews()
  return { status: 'success', message: `ลบ "${removed.name}" แล้ว` }
}
