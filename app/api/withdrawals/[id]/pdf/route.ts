import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { calculateWithdrawal } from '@/lib/withdrawal-calc'
import { documentNumber, renderWithdrawalPdf } from '@/lib/pdf/withdrawal-document'

export const runtime = 'nodejs'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!UUID_RE.test(id)) return new NextResponse(null, { status: 404 })

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new NextResponse(null, { status: 401 })

  // RLS scopes these reads: owners get their own rows, admins get everything.
  const { data: w } = await supabase
    .from('withdrawal_requests')
    .select(
      'id, user_id, amount_thb, status, payee_name, bank_name, bank_account_number, requested_at, processed_at, reject_reason, payment_reference, wht_thb, fee_thb, net_amount_thb',
    )
    .eq('id', id)
    .maybeSingle()
  if (!w) return new NextResponse(null, { status: 404 })

  const [{ data: payout }, { data: profile }] = await Promise.all([
    supabase
      .from('payout_profiles')
      .select('full_name, artist_label_name, address, national_id, phone, email, bank_name, bank_account_number')
      .eq('user_id', w.user_id)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('name, email, artist_name, label_name')
      .eq('id', w.user_id)
      .maybeSingle(),
  ])

  const amount = Number(w.amount_thb)
  const calc = calculateWithdrawal(amount)

  const pdf = await renderWithdrawalPdf({
    id: w.id,
    status: w.status,
    requestedAt: w.requested_at,
    processedAt: w.processed_at,
    paymentReference: w.payment_reference,
    rejectReason: w.reject_reason,
    gross: amount,
    wht: w.wht_thb != null ? Number(w.wht_thb) : calc.wht,
    fee: w.fee_thb != null ? Number(w.fee_thb) : calc.fee,
    net: w.net_amount_thb != null ? Number(w.net_amount_thb) : calc.net,
    customer: {
      fullName: payout?.full_name || w.payee_name || profile?.name || '',
      email: payout?.email || profile?.email || '',
      phone: payout?.phone || '',
      address: payout?.address || '',
      nationalId: payout?.national_id || '',
      artistName:
        payout?.artist_label_name || profile?.artist_name || profile?.label_name || '',
    },
    bank: {
      name: w.bank_name || payout?.bank_name || '',
      accountNumber: w.bank_account_number || payout?.bank_account_number || '',
      accountName: w.payee_name || payout?.full_name || '',
    },
  })

  const filename = `${documentNumber(w.id, w.requested_at)}.pdf`
  const inline = new URL(req.url).searchParams.get('inline') === '1'
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
