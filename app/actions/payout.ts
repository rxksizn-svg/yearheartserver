'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getEarningsSummary, getPayoutProfile } from '@/lib/data/royalties'
import { getWithdrawalWindowForRole } from '@/lib/payout-schedule'
import { formatThaiDate } from '@/lib/format'
import { calculateWithdrawal } from '@/lib/withdrawal-calc'

export type ActionState = {
  status: 'idle' | 'success' | 'error'
  message?: string
}

const MIN_WITHDRAWAL = 300

const payoutProfileSchema = z.object({
  full_name: z.string().trim().min(1, 'กรุณากรอกชื่อ-นามสกุลตามกฎหมาย'),
  artist_label_name: z.string().trim().min(1, 'กรุณากรอกชื่อศิลปิน/ค่ายเพลง'),
  address: z.string().trim().min(1, 'กรุณากรอกที่อยู่'),
  national_id: z
    .string()
    .trim()
    .regex(/^\d{13}$/, 'เลขบัตรประชาชนต้องมี 13 หลัก'),
  phone: z
    .string()
    .trim()
    .regex(/^0\d{8,9}$/, 'กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง'),
  email: z.string().trim().email('อีเมลไม่ถูกต้อง'),
  bank_name: z.string().trim().min(1, 'กรุณาเลือกธนาคาร'),
  bank_account_number: z
    .string()
    .trim()
    .regex(/^\d{10,15}$/, 'เลขบัญชีธนาคารไม่ถูกต้อง'),
})

export async function savePayoutProfile(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { status: 'error', message: 'กรุณาเข้าสู่ระบบ' }

  const parsed = payoutProfileSchema.safeParse({
    full_name: formData.get('full_name'),
    artist_label_name: formData.get('artist_label_name'),
    address: formData.get('address'),
    national_id: formData.get('national_id'),
    phone: formData.get('phone'),
    email: formData.get('email'),
    bank_name: formData.get('bank_name'),
    bank_account_number: formData.get('bank_account_number'),
  })

  if (!parsed.success) {
    return {
      status: 'error',
      message: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง',
    }
  }

  const { error } = await supabase
    .from('payout_profiles')
    .upsert({ user_id: user.id, ...parsed.data }, { onConflict: 'user_id' })

  if (error) {
    return { status: 'error', message: 'บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่' }
  }

  revalidatePath('/withdrawals')
  revalidatePath('/settings')
  return { status: 'success', message: 'บันทึกข้อมูลการรับเงินเรียบร้อยแล้ว' }
}

export async function requestWithdrawal(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { status: 'error', message: 'กรุณาเข้าสู่ระบบ' }

  // Withdrawals are only allowed during the account's payout window
  // (quarterly for most roles, monthly for signed label artists).
  const { data: roleRow } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  const window = getWithdrawalWindowForRole(roleRow?.role ?? 'artist')
  if (!window.isOpen) {
    return {
      status: 'error',
      message: `ขณะนี้ยังไม่อยู่ในรอบการเบิกเงิน รอบถัดไปจะเปิดวันที่ ${formatThaiDate(window.nextOpensOnISO)}`,
    }
  }

  const amount = Number(formData.get('amount'))
  if (!Number.isFinite(amount) || amount <= 0) {
    return { status: 'error', message: 'จำนวนเงินไม่ถูกต้อง' }
  }
  if (amount < MIN_WITHDRAWAL) {
    return {
      status: 'error',
      message: `ยอดถอนขั้นต่ำคือ ${MIN_WITHDRAWAL.toLocaleString('th-TH')} บาท`,
    }
  }

  // Must have a completed payout profile before withdrawing.
  const profile = await getPayoutProfile(user.id)
  if (!profile) {
    return {
      status: 'error',
      message: 'กรุณากรอกข้อมูลการรับเงินให้ครบก่อนทำการถอน',
    }
  }

  // Re-check the available balance server-side to prevent over-withdrawal.
  const summary = await getEarningsSummary(user.id)
  if (amount > summary.availableBalance) {
    return {
      status: 'error',
      message: `ยอดเงินคงเหลือไม่เพียงพอ (คงเหลือ ${summary.availableBalance.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท)`,
    }
  }

  // Compute deductions server-side (withholding tax + fee) as the trust
  // boundary — the client dialog shows the same numbers for confirmation.
  const breakdown = calculateWithdrawal(amount)

  const { error } = await supabase.from('withdrawal_requests').insert({
    user_id: user.id,
    amount_thb: breakdown.gross,
    wht_thb: breakdown.wht,
    fee_thb: breakdown.fee,
    net_amount_thb: breakdown.net,
    status: 'pending',
    payee_name: profile.full_name,
    bank_name: profile.bank_name,
    bank_account_number: profile.bank_account_number,
  })

  if (error) {
    return { status: 'error', message: 'ส่งคำขอถอนเงินไม่สำเร็จ กรุณาลองใหม่' }
  }

  revalidatePath('/withdrawals')
  revalidatePath('/earnings')
  revalidatePath('/')
  const netText = breakdown.net.toLocaleString('th-TH', {
    minimumFractionDigits: 2,
  })
  return {
    status: 'success',
    message: `ส่งคำขอถอนเงินเรียบร้อยแล้ว ยอดที่จะได้รับสุทธิ ${netText} บาท ทีมงานจะดำเนินการภายใน 5-7 วันทำการ`,
  }
}
