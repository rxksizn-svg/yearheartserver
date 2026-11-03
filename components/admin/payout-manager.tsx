'use client'

import * as React from 'react'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Building2,
  ChevronDown,
  Eye,
  FileDown,
  Mail,
} from 'lucide-react'

import { updateWithdrawalStatus, type ActionState } from '@/app/actions/admin'
import type { WithdrawalRequest, WithdrawalStatus } from '@/lib/types'
import { formatTHB, formatThaiDate } from '@/lib/format'
import { calculateWithdrawal, WHT_RATE } from '@/lib/withdrawal-calc'
import { WithdrawalStatusBadge } from '@/components/royalties/withdrawal-status-badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'

export type PayoutDetail = {
  full_name: string
  address: string
  national_id: string
  phone: string
  email: string
  bank_name: string
  bank_account_number: string
}

export type QueueItem = WithdrawalRequest & {
  profile: { name: string | null; email: string } | null
}

const initial: ActionState = { status: 'idle' }

const FILTERS: { value: WithdrawalStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'pending', label: 'รอดำเนินการ' },
  { value: 'processing', label: 'กำลังโอน' },
  { value: 'paid', label: 'จ่ายแล้ว' },
  { value: 'rejected', label: 'ปฏิเสธ' },
]

function Banner({ state }: { state: ActionState }) {
  if (state.status === 'idle' || !state.message) return null
  const ok = state.status === 'success'
  return (
    <div
      role="status"
      className={
        ok
          ? 'border-success/30 bg-success/10 text-success flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm'
          : 'border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm'
      }
    >
      {ok ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
      ) : (
        <AlertCircle className="mt-0.5 size-4 shrink-0" />
      )}
      <span>{state.message}</span>
    </div>
  )
}

function SubmitButton({
  label,
  variant,
}: {
  label: string
  variant?: 'default' | 'outline' | 'destructive'
}) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant={variant} disabled={pending}>
      {pending && <Loader2 className="animate-spin" />}
      {label}
    </Button>
  )
}

function useCloseOnSuccess(status: ActionState['status'], onClose: () => void) {
  React.useEffect(() => {
    if (status === 'success') {
      const t = setTimeout(onClose, 600)
      return () => clearTimeout(t)
    }
  }, [status, onClose])
}

/** Simple status transition (start processing) with no extra fields. */
function QuickAction({
  id,
  nextStatus,
  label,
  variant,
}: {
  id: string
  nextStatus: WithdrawalStatus
  label: string
  variant?: 'default' | 'outline' | 'destructive'
}) {
  const [, action] = useActionState(updateWithdrawalStatus, initial)
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={nextStatus} />
      <SubmitButton label={label} variant={variant} />
    </form>
  )
}

function PayDialog({
  item,
  open,
  onOpenChange,
}: {
  item: QueueItem
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [state, action] = useActionState(updateWithdrawalStatus, initial)
  useCloseOnSuccess(state.status, () => onOpenChange(false))
  const net = item.net_amount_thb ?? calculateWithdrawal(item.amount_thb).net
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="ยืนยันการจ่ายเงิน"
        description={`โอนยอดสุทธิ ${formatTHB(net)} (หลังหักภาษีและค่าธรรมเนียม) ให้ ${item.profile?.name || item.payee_name || item.profile?.email || 'ผู้ใช้'}`}
      >
        <form action={action} className="flex flex-col gap-4">
          <Banner state={state} />
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="status" value="paid" />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`ref-${item.id}`}>เลขอ้างอิงการโอน (ไม่บังคับ)</Label>
            <Input
              id={`ref-${item.id}`}
              name="paymentReference"
              placeholder="เช่น TXN20260316001"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <SubmitButton label="ยืนยันจ่ายแล้ว" />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function RejectDialog({
  item,
  open,
  onOpenChange,
}: {
  item: QueueItem
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [state, action] = useActionState(updateWithdrawalStatus, initial)
  useCloseOnSuccess(state.status, () => onOpenChange(false))
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="ปฏิเสธคำขอถอนเงิน"
        description={`${formatTHB(item.amount_thb)} — ยอดเงินจะถูกคืนเข้ายอดคงเหลือของผู้ใช้`}
      >
        <form action={action} className="flex flex-col gap-4">
          <Banner state={state} />
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="status" value="rejected" />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`reason-${item.id}`}>เหตุผลในการปฏิเสธ</Label>
            <Textarea
              id={`reason-${item.id}`}
              name="rejectReason"
              rows={3}
              required
              placeholder="เช่น ข้อมูลบัญชีธนาคารไม่ถูกต้อง"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <SubmitButton label="ยืนยันปฏิเสธ" variant="destructive" />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function BankDetails({
  item,
  detail,
}: {
  item: QueueItem
  detail?: PayoutDetail
}) {
  const [open, setOpen] = React.useState(false)
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
        aria-expanded={open}
      >
        <Building2 className="size-3.5" />
        ข้อมูลบัญชีธนาคาร
        <ChevronDown
          className={'size-3.5 transition-transform ' + (open ? 'rotate-180' : '')}
        />
      </button>
      {open && (
        <dl className="text-muted-foreground bg-muted/40 mt-2 grid grid-cols-1 gap-x-4 gap-y-1 rounded-lg p-3 text-xs sm:grid-cols-2">
          <div>
            <dt className="inline font-medium">ธนาคาร: </dt>
            <dd className="inline">{item.bank_name || detail?.bank_name || '-'}</dd>
          </div>
          <div>
            <dt className="inline font-medium">เลขบัญชี: </dt>
            <dd className="inline tabular-nums">
              {item.bank_account_number || detail?.bank_account_number || '-'}
            </dd>
          </div>
          <div>
            <dt className="inline font-medium">ชื่อบัญชี: </dt>
            <dd className="inline">{item.payee_name || detail?.full_name || '-'}</dd>
          </div>
          {detail?.national_id && (
            <div>
              <dt className="inline font-medium">เลขบัตรประชาชน: </dt>
              <dd className="inline tabular-nums">{detail.national_id}</dd>
            </div>
          )}
          {detail?.phone && (
            <div>
              <dt className="inline font-medium">โทร: </dt>
              <dd className="inline tabular-nums">{detail.phone}</dd>
            </div>
          )}
          {detail?.address && (
            <div className="sm:col-span-2">
              <dt className="inline font-medium">ที่อยู่: </dt>
              <dd className="inline">{detail.address}</dd>
            </div>
          )}
        </dl>
      )}
    </div>
  )
}

const STATUS_TEXT: Record<string, string> = {
  pending: 'รอดำเนินการ',
  processing: 'กำลังโอน',
  paid: 'จ่ายแล้ว',
  rejected: 'ปฏิเสธ',
}

function DocumentActions({
  item,
  detail,
  net,
}: {
  item: QueueItem
  detail?: PayoutDetail
  net: number
}) {
  const pdfUrl = `/api/withdrawals/${item.id}/pdf`
  const email = detail?.email || item.profile?.email || ''
  const name = detail?.full_name || item.payee_name || item.profile?.name || ''
  const subject = `ใบแจ้งรายละเอียดการถอนเงิน - ${formatThaiDate(item.requested_at)}`
  const body = [
    `เรียน คุณ${name}`,
    '',
    `บริษัทขอแจ้งรายละเอียดคำขอถอนเงินของท่าน วันที่ ${formatThaiDate(item.requested_at)}`,
    `ยอดที่ขอถอน: ${formatTHB(item.amount_thb)}`,
    `ยอดโอนสุทธิ: ${formatTHB(net)}`,
    `สถานะ: ${STATUS_TEXT[item.status] ?? item.status}`,
    '',
    'รายละเอียดทั้งหมดอยู่ในไฟล์ PDF ที่แนบมากับอีเมลนี้',
    '',
    'ขอแสดงความนับถือ',
    'บริษัท เยียร์ฮาร์ท เอนเตอร์เทนเม้นท์ จำกัด',
    'โทร 02-1147169',
  ].join('\n')
  const mailto = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <a
        href={`${pdfUrl}?inline=1`}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonVariants({ size: 'sm', variant: 'outline' })}
      >
        <Eye />
        ดูเอกสาร
      </a>
      <a
        href={pdfUrl}
        download
        className={buttonVariants({ size: 'sm', variant: 'outline' })}
      >
        <FileDown />
        ดาวน์โหลด PDF
      </a>
      {email && (
        <a
          href={mailto}
          title={`เปิดอีเมลถึง ${email} แล้วแนบไฟล์ PDF`}
          className={buttonVariants({ size: 'sm', variant: 'outline' })}
        >
          <Mail />
          ส่งอีเมล
        </a>
      )}
    </div>
  )
}

function PayoutRow({
  item,
  detail,
}: {
  item: QueueItem
  detail?: PayoutDetail
}) {
  const [dialog, setDialog] = React.useState<'pay' | 'reject' | null>(null)
  const actionable = item.status === 'pending' || item.status === 'processing'

  // Prefer the values stored at request time; fall back to recomputing for
  // older rows saved before the deduction fields existed.
  const calc = calculateWithdrawal(item.amount_thb)
  const wht = item.wht_thb ?? calc.wht
  const fee = item.fee_thb ?? calc.fee
  const net = item.net_amount_thb ?? calc.net
  const taxable = wht > 0

  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-medium">
              {item.profile?.name || item.payee_name || item.profile?.email || 'ผู้ใช้'}
            </p>
            <WithdrawalStatusBadge status={item.status} />
          </div>
          <p className="text-muted-foreground mt-0.5 text-xs">
            ขอเมื่อ {formatThaiDate(item.requested_at)}
            {item.processed_at && ` · ดำเนินการ ${formatThaiDate(item.processed_at)}`}
          </p>
          {item.status === 'paid' && item.payment_reference && (
            <p className="text-muted-foreground text-xs">
              อ้างอิง: {item.payment_reference}
            </p>
          )}
          {item.status === 'rejected' && item.reject_reason && (
            <p className="text-destructive text-xs">เหตุผล: {item.reject_reason}</p>
          )}
          <BankDetails item={item} detail={detail} />
          <DocumentActions item={item} detail={detail} net={net} />
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
          <div className="text-right">
            <p className="text-muted-foreground text-[11px]">ยอดโอนสุทธิ</p>
            <span className="text-base font-semibold tabular-nums">
              {formatTHB(net)}
            </span>
          </div>
          {actionable && (
            <div className="flex items-center gap-2">
              {item.status === 'pending' && (
                <QuickAction
                  id={item.id}
                  nextStatus="processing"
                  label="เริ่มโอน"
                  variant="outline"
                />
              )}
              <Button size="sm" onClick={() => setDialog('pay')}>
                จ่ายแล้ว
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setDialog('reject')}
              >
                ปฏิเสธ
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Deduction breakdown — mirrors the customer's withdrawal dialog. */}
      <dl className="bg-muted/40 mt-3 flex flex-col gap-1.5 rounded-lg px-3 py-2.5 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">ยอดที่ขอถอน</dt>
          <dd className="tabular-nums">{formatTHB(item.amount_thb)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">
            ภาษีหัก ณ ที่จ่าย ({Math.round(WHT_RATE * 100)}%)
            {!taxable && <span className="ml-1 text-xs">— ไม่ถึงเกณฑ์</span>}
          </dt>
          <dd className="text-destructive tabular-nums">
            {taxable ? `- ${formatTHB(wht)}` : formatTHB(0)}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">ค่าธรรมเนียมการถอน</dt>
          <dd className="text-destructive tabular-nums">- {formatTHB(fee)}</dd>
        </div>
        <div className="border-border mt-1 flex items-center justify-between border-t pt-2">
          <dt className="font-medium">ยอดโอนสุทธิ</dt>
          <dd className="text-base font-semibold tabular-nums">
            {formatTHB(net)}
          </dd>
        </div>
      </dl>

      <PayDialog
        item={item}
        open={dialog === 'pay'}
        onOpenChange={(v) => setDialog(v ? 'pay' : null)}
      />
      <RejectDialog
        item={item}
        open={dialog === 'reject'}
        onOpenChange={(v) => setDialog(v ? 'reject' : null)}
      />
    </li>
  )
}

export function PayoutManager({
  items,
  payoutDetails,
}: {
  items: QueueItem[]
  payoutDetails: Record<string, PayoutDetail>
}) {
  const [filter, setFilter] = React.useState<WithdrawalStatus | 'all'>('all')
  const filtered = filter === 'all' ? items : items.filter((i) => i.status === filter)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1">
        {FILTERS.map((f) => {
          const count =
            f.value === 'all'
              ? items.length
              : items.filter((i) => i.status === f.value).length
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors ' +
                (filter === f.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input text-muted-foreground hover:bg-muted')
              }
            >
              {f.label} ({count})
            </button>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground py-10 text-center text-sm">
          ไม่มีคำขอในหมวดนี้
        </p>
      ) : (
        <ul className="divide-border divide-y">
          {filtered.map((item) => (
            <PayoutRow
              key={item.id}
              item={item}
              detail={payoutDetails[item.user_id]}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
