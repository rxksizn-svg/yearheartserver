'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(120),
  artistName: z.string().trim().max(120).optional().default(''),
  labelName: z.string().trim().max(120).optional().default(''),
  payoutInfo: z.string().trim().max(500).optional().default(''),
})

export type ProfileActionState = {
  status: 'idle' | 'success' | 'error'
  message?: string
}

export async function updateProfile(
  _prev: ProfileActionState,
  formData: FormData,
): Promise<ProfileActionState> {
  const parsed = schema.safeParse({
    name: formData.get('name'),
    artistName: formData.get('artistName') ?? '',
    labelName: formData.get('labelName') ?? '',
    payoutInfo: formData.get('payoutInfo') ?? '',
  })

  if (!parsed.success) {
    return {
      status: 'error',
      message: parsed.error.issues[0]?.message ?? 'Invalid input.',
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { status: 'error', message: 'Your session has expired.' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      name: parsed.data.name,
      label_name: parsed.data.labelName || null,
      payout_info: parsed.data.payoutInfo || null,
    })
    .eq('id', user.id)

  if (error) {
    return {
      status: 'error',
      message: 'Could not save your changes. Please try again.',
    }
  }

  revalidatePath('/settings')
  revalidatePath('/', 'layout')
  return { status: 'success', message: 'Your profile has been updated.' }
}
