'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/data/royalties'
import { normalizeRows, type ParsedRow } from '@/lib/royalty-import'

export type ActionState = {
  status: 'idle' | 'success' | 'error'
  message?: string
  imported?: number
}

function parseNumber(value: string): number {
  const cleaned = value.replace(/[,฿\s]/g, '').trim()
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : Number.NaN
}

function revalidateRoyaltyViews() {
  revalidatePath('/admin')
  revalidatePath('/')
  revalidatePath('/analytics')
  revalidatePath('/earnings')
  revalidatePath('/withdrawals')
}

/**
 * Bulk import via pasted CSV. Expected columns:
 * dsp,isrc,catalogue_title,revenue_type_desc,sales,revenue_thb,period
 */
export async function importRoyaltyCsv(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireAdmin()
  } catch {
    return { status: 'error', message: 'เฉพาะผู้ดูแลระบบเท่านั้นที่นำเข้าข้อมูลได้' }
  }

  const userId = String(formData.get('userId') ?? '').trim()
  const raw = String(formData.get('csv') ?? '').trim()

  if (!userId) return { status: 'error', message: 'กรุณาเลือกศิลปิน/ค่ายเพลงที่จะผูกกับข้อมูล' }
  if (!raw) return { status: 'error', message: 'กรุณาวางข้อมูล CSV ก่อนนำเข้า' }

  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length === 0) return { status: 'error', message: 'ไม่พบข้อมูลในไฟล์ CSV' }

  const first = lines[0].split(',')
  const hasHeader = first.length >= 6 && Number.isNaN(parseNumber(first[5] ?? ''))
  const dataLines = hasHeader ? lines.slice(1) : lines

  const rows: {
    user_id: string
    dsp: string
    isrc: string
    catalogue_title: string
    revenue_type_desc: string
    sales: number
    revenue_thb: number
    period: string | null
  }[] = []

  for (const [i, line] of dataLines.entries()) {
    const cols = line.split(',').map((c) => c.trim())
    if (cols.length < 6) {
      return { status: 'error', message: `แถวที่ ${i + 1}: ข้อมูลไม่ครบ (ต้องมีอย่างน้อย 6 คอลัมน์)` }
    }
    const [dsp, isrc, title, revType, salesStr, revStr, period] = cols
    const sales = parseNumber(salesStr)
    const revenue = parseNumber(revStr)
    if (Number.isNaN(sales) || Number.isNaN(revenue)) {
      return { status: 'error', message: `แถวที่ ${i + 1}: จำนวนยอดขายหรือรายได้ไม่ถูกต้อง` }
    }
    if (!dsp || !isrc || !title) {
      return { status: 'error', message: `แถวที่ ${i + 1}: DSP, ISRC และชื่อเพลงห้ามว่าง` }
    }
    rows.push({
      user_id: userId,
      dsp,
      isrc,
      catalogue_title: title,
      revenue_type_desc: revType || 'Stream Revenue',
      sales: Math.max(0, Math.round(sales)),
      revenue_thb: Math.round(revenue * 100) / 100,
      period: period || null,
    })
  }

  const supabase = await createClient()
  const { error } = await supabase.from('royalty_line_items').insert(rows)
  if (error) {
    return { status: 'error', message: `นำเข้าไม่สำเร็จ: ${error.message}` }
  }

  revalidateRoyaltyViews()
  return { status: 'success', imported: rows.length, message: `นำเข้าสำเร็จ ${rows.length} รายการ` }
}

/**
 * Import parsed spreadsheet rows (module 6). The client parses the .xlsx with
 * SheetJS, maps columns, and submits validated rows as JSON; we re-validate
 * here before insert.
 */
export async function importRoyaltyRows(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireAdmin()
  } catch {
    return { status: 'error', message: 'เฉพาะผู้ดูแลระบบเท่านั้นที่นำเข้าข้อมูลได้' }
  }

  const userId = String(formData.get('userId') ?? '').trim()
  const rowsJson = String(formData.get('rows') ?? '')
  if (!userId) return { status: 'error', message: 'กรุณาเลือกศิลปิน/ค่ายเพลงที่จะผูกกับข้อมูล' }

  let raw: Record<string, unknown>[]
  try {
    raw = JSON.parse(rowsJson)
  } catch {
    return { status: 'error', message: 'ข้อมูลที่ส่งมาไม่ถูกต้อง' }
  }
  if (!Array.isArray(raw) || raw.length === 0) {
    return { status: 'error', message: 'ไม่พบข้อมูลสำหรับนำเข้า' }
  }

  // Re-run the same normalization on the server as a trust boundary.
  const { rows, errors } = normalizeRows(raw)
  if (errors.length > 0) {
    return { status: 'error', message: errors.slice(0, 3).join(' · ') }
  }
  if (rows.length === 0) {
    return { status: 'error', message: 'ไม่มีแถวที่นำเข้าได้' }
  }

  const insertRows = rows.map((r: ParsedRow) => ({
    user_id: userId,
    dsp: r.dsp,
    isrc: r.isrc,
    catalogue_title: r.catalogue_title,
    revenue_type_desc: r.revenue_type_desc,
    sales: r.sales,
    revenue_thb: r.revenue_thb,
    period: r.period,
    artist_name: r.artist_name,
    country: r.country,
    gross_income_thb: r.gross_income_thb,
    net_income_thb: r.net_income_thb,
  }))

  const supabase = await createClient()
  const { error } = await supabase.from('royalty_line_items').insert(insertRows)
  if (error) {
    return { status: 'error', message: `นำเข้าไม่สำเร็จ: ${error.message}` }
  }

  revalidateRoyaltyViews()
  return {
    status: 'success',
    imported: insertRows.length,
    message: `นำเข้าสำเร็จ ${insertRows.length} รายการ`,
  }
}

/** Add a single royalty line item manually. */
export async function addRoyaltyItem(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await requireAdmin()
  } catch {
    return { status: 'error', message: 'เฉพาะผู้ดูแลระบบเท่านั้นที่เพิ่มข้อมูลได้' }
  }

  const userId = String(formData.get('userId') ?? '').trim()
  const dsp = String(formData.get('dsp') ?? '').trim()
  const isrc = String(formData.get('isrc') ?? '').trim()
  const title = String(formData.get('catalogueTitle') ?? '').trim()
  const revType = String(formData.get('revenueType') ?? '').trim() || 'Stream Revenue'
  const sales = parseNumber(String(formData.get('sales') ?? '0'))
  const revenue = parseNumber(String(formData.get('revenue') ?? '0'))
  const period = String(formData.get('period') ?? '').trim()

  if (!userId) return { status: 'error', message: 'กรุณาเลือกศิลปิน/ค่ายเพลง' }
  if (!dsp || !isrc || !title) return { status: 'error', message: 'กรุณากรอก DSP, ISRC และชื่อเพลงให้ครบ' }
  if (Number.isNaN(sales) || Number.isNaN(revenue) || revenue < 0) {
    return { status: 'error', message: 'จำนวนยอดขายหรือรายได้ไม่ถูกต้อง' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('royalty_line_items').insert({
    user_id: userId,
    dsp,
    isrc,
    catalogue_title: title,
    revenue_type_desc: revType,
    sales: Math.max(0, Math.round(sales)),
    revenue_thb: Math.round(revenue * 100) / 100,
    period: period || null,
  })
  if (error) return { status: 'error', message: `บันทึกไม่สำเร็จ: ${error.message}` }

  revalidateRoyaltyViews()
  return { status: 'success', imported: 1, message: 'เพิ่มรายการรายได้เรียบร้อยแล้ว' }
}

/** Update a withdrawal request status (admin only). */
export async function updateWithdrawalStatus(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let adminId: string
  try {
    adminId = await requireAdmin()
  } catch {
    return { status: 'error', message: 'เฉพาะผู้ดูแลระบบเท่านั้น' }
  }

  const id = String(formData.get('id') ?? '').trim()
  const status = String(formData.get('status') ?? '').trim()
  const rejectReason = String(formData.get('rejectReason') ?? '').trim()
  const paymentReference = String(formData.get('paymentReference') ?? '').trim()
  const allowed = ['pending', 'processing', 'paid', 'rejected']
  if (!id || !allowed.includes(status)) {
    return { status: 'error', message: 'ข้อมูลไม่ถูกต้อง' }
  }
  if (status === 'rejected' && !rejectReason) {
    return { status: 'error', message: 'กรุณาระบุเหตุผลในการปฏิเสธ' }
  }

  const resolved = status === 'paid' || status === 'rejected'
  const supabase = await createClient()
  const { error } = await supabase
    .from('withdrawal_requests')
    .update({
      status,
      processed_at: resolved ? new Date().toISOString() : null,
      processed_by: resolved ? adminId : null,
      reject_reason: status === 'rejected' ? rejectReason : null,
      payment_reference: status === 'paid' ? paymentReference || null : null,
    })
    .eq('id', id)

  if (error) return { status: 'error', message: `อัปเดตไม่สำเร็จ: ${error.message}` }

  revalidateRoyaltyViews()
  return { status: 'success', message: 'อัปเดตสถานะเรียบร้อยแล้ว' }
}

/** Update a user's profile: name, role, status, artist/label name (admin only). */
export async function updateUserProfile(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let adminId: string
  try {
    adminId = await requireAdmin()
  } catch {
    return { status: 'error', message: 'เฉพาะผู้ดูแลระบบเท่านั้น' }
  }

  const userId = String(formData.get('userId') ?? '').trim()
  const name = String(formData.get('name') ?? '').trim()
  const role = String(formData.get('role') ?? '').trim()
  const accountStatus = String(formData.get('accountStatus') ?? '').trim()
  const labelName = String(formData.get('labelName') ?? '').trim()

  if (!userId) return { status: 'error', message: 'ไม่พบผู้ใช้' }
  if (!['artist', 'label', 'label_artist', 'admin'].includes(role)) {
    return { status: 'error', message: 'บทบาทไม่ถูกต้อง' }
  }
  if (!['active', 'pending', 'suspended'].includes(accountStatus)) {
    return { status: 'error', message: 'สถานะไม่ถูกต้อง' }
  }
  // Prevent admins from locking themselves out.
  if (userId === adminId && (role !== 'admin' || accountStatus === 'suspended')) {
    return {
      status: 'error',
      message: 'ไม่สามารถลดสิทธิ์หรือระงับบัญชีผู้ดูแลของตนเองได้',
    }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({
      name: name || null,
      role,
      status: accountStatus,
      label_name: labelName || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  if (error) return { status: 'error', message: `บันทึกไม่สำเร็จ: ${error.message}` }

  revalidateRoyaltyViews()
  return { status: 'success', message: 'อัปเดตข้อมูลผู้ใช้เรียบร้อยแล้ว' }
}

/** Permanently delete a user and all their data (admin only, via service role). */
export async function deleteUser(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let adminId: string
  try {
    adminId = await requireAdmin()
  } catch {
    return { status: 'error', message: 'เฉพาะผู้ดูแลระบบเท่านั้น' }
  }

  const userId = String(formData.get('userId') ?? '').trim()
  if (!userId) return { status: 'error', message: 'ไม่พบผู้ใช้' }
  if (userId === adminId) {
    return { status: 'error', message: 'ไม่สามารถลบบัญชีของตนเองได้' }
  }

  // Deleting the auth user cascades to profiles and all user-owned tables.
  const service = createServiceClient()
  const { error } = await service.auth.admin.deleteUser(userId)
  if (error) return { status: 'error', message: `ลบไม่สำเร็จ: ${error.message}` }

  revalidateRoyaltyViews()
  return { status: 'success', message: 'ลบบัญชีผู้ใช้เรียบร้อยแล้ว' }
}

/** Manually credit or debit a user's balance (admin only). */
export async function adjustBalance(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let adminId: string
  try {
    adminId = await requireAdmin()
  } catch {
    return { status: 'error', message: 'เฉพาะผู้ดูแลระบบเท่านั้น' }
  }

  const userId = String(formData.get('userId') ?? '').trim()
  const type = String(formData.get('type') ?? '').trim()
  const amount = parseNumber(String(formData.get('amount') ?? '0'))
  const note = String(formData.get('note') ?? '').trim()

  if (!userId) return { status: 'error', message: 'ไม่พบผู้ใช้' }
  if (!['credit', 'debit'].includes(type)) {
    return { status: 'error', message: 'ประเภทการปรับยอดไม่ถูกต้อง' }
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { status: 'error', message: 'จำนวนเงินต้องมากกว่า 0' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('balance_adjustments').insert({
    user_id: userId,
    admin_id: adminId,
    amount_thb: Math.round(amount * 100) / 100,
    type,
    note: note || null,
  })

  if (error) return { status: 'error', message: `บันทึกไม่สำเร็จ: ${error.message}` }

  revalidateRoyaltyViews()
  return {
    status: 'success',
    message: type === 'credit' ? 'เติมเงินเรียบร้อยแล้ว' : 'หักเงินเรียบร้อยแล้ว',
  }
}
