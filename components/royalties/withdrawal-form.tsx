'use client'

import * as React from 'react'
import Link from 'next/link'
import { useActionState } from 'react'
import { CheckCircle2, AlertCircle, Loader2, Info, CalendarClock } from 'lucide-react'

import { requestWithdrawal, type ActionState } from '@/app/actions/payout'
import { formatTHB, formatThaiDate } from '@/lib/format'
import {
  calculateWithdrawal,
  WHT_THRESHOLD,
  WHT_RATE,
} from '@/lib/withdrawal-calc'
import type { WithdrawalWindow } from '@/lib/payout-schedule'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'

const MIN_WITHDRAWAL = 300
const FORM_ID = 'withdrawal-request-form'
const initialState: ActionState = { status: 'idle' }

/** Format a Date as Thai time, e.g. 14:05 น. */
function formatThaiTime(date: Date): string {
  return (
    new Intl.DateTimeFormat('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date) + ' น.'
  )
}

export function WithdrawalForm({
  availableBalance,
  hasPayoutProfile,
  window,
}: {
  availableBalance: number
  hasPayoutProfile: boolean
  window: WithdrawalWindow
}) {
  const [state, formAction, isPending] = useActionState(
    requestWithdrawal,
    initialState,
  )
  const [amount, setAmount] = React.useState('')
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [requestedAt, setRequestedAt] = React.useState<Date | null>(null)

  const numericAmount = Number(amount)
  const canWithdraw =
    window.isOpen && availableBalance >= MIN_WITHDRAWAL && hasPayoutProfile

  const amountValid =
    Number.isFinite(numericAmount) &&
    numericAmount >= MIN_WITHDRAWAL &&
    numericAmount <= availableBalance

  const breakdown = calculateWithdrawal(numericAmount || 0)

  // Close the confirmation dialog once a submission resolves.
  React.useEffect(() => {
    if (state.status === 'success') {
      setConfirmOpen(false)
      setAmount('')
    } else if (state.status === 'error') {
      setConfirmOpen(false)
    }
  }, [state])

  function openConfirm() {
    if (!canWithdraw || !amountValid) return
    setRequestedAt(new Date())
    setConfirmOpen(true)
  }

  return (
    <>
      <form id={FORM_ID} action={formAction} className="flex flex-col gap-4">
        {!window.isOpen && (
          <div className="border-warning/30 bg-warning/10 text-warning flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm">
            <Info className="mt-0.5 size-4 shrink-0" />
            <span>
              ขณะนี้ยังไม่อยู่ในรอบการเบิกเงิน รอบถัดไปจะเปิดวันที่{' '}
              <span className="font-semibold">
                {formatThaiDate(window.nextOpensOnISO)}
              </span>
            </span>
          </div>
        )}

        {window.isOpen && !hasPayoutProfile && (
          <div className="border-warning/30 bg-warning/10 text-warning flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm">
            <Info className="mt-0.5 size-4 shrink-0" />
            <span>
              กรุณากรอก{' '}
              <Link href="#payout-profile" className="font-medium underline">
                ข้อมูลการรับเงิน
              </Link>{' '}
              ให้ครบก่อนจึงจะสามารถถอนเงินได้
            </span>
          </div>
        )}

        {state.status !== 'idle' && state.message && (
          <div
            role="status"
            className={
              state.status === 'success'
                ? 'border-success/30 bg-success/10 text-success flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm'
                : 'border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm'
            }
          >
            {state.status === 'success' ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
            )}
            <span>{state.message}</span>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="amount">จำนวนเงินที่ต้องการถอน (บาท)</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            inputMode="decimal"
            min={MIN_WITHDRAWAL}
            max={availableBalance}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={String(MIN_WITHDRAWAL)}
            disabled={!canWithdraw}
            required
          />
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              ถอนขั้นต่ำ {formatTHB(MIN_WITHDRAWAL)}
            </span>
            <button
              type="button"
              onClick={() => setAmount(String(availableBalance))}
              disabled={!canWithdraw}
              className="text-brand font-medium disabled:opacity-50"
            >
              ถอนทั้งหมด
            </button>
          </div>
        </div>

        {numericAmount > availableBalance && (
          <p className="text-destructive text-xs">
            จำนวนเงินเกินยอดคงเหลือที่ถอนได้
          </p>
        )}

        <Button
          type="button"
          className="w-full"
          disabled={!canWithdraw || !amountValid}
          onClick={openConfirm}
        >
          ส่งคำขอถอนเงิน
        </Button>
        <p className="text-muted-foreground text-center text-xs">
          {window.isOpen
            ? `เปิดให้เบิกถอนถึง ${formatThaiDate(window.closesOnISO)}`
            : 'คำขอถอนเงินทำได้เฉพาะในรอบการเบิกเงินเท่านั้น'}
        </p>
      </form>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent
          title="ยืนยันการถอนเงิน"
          description="ตรวจสอบรายละเอียดและยอดที่จะได้รับสุทธิก่อนยืนยัน"
        >
          <div className="flex flex-col gap-4">
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
              <CalendarClock className="size-4 shrink-0" />
              <span>
                วันที่ถอน {requestedAt ? formatThaiDate(requestedAt.toISOString()) : '-'}
                {' · '}
                เวลา {requestedAt ? formatThaiTime(requestedAt) : '-'}
              </span>
            </div>

            <dl className="border-border divide-border divide-y rounded-lg border text-sm">
              <div className="flex items-center justify-between px-3 py-2.5">
                <dt className="text-muted-foreground">รายการที่จะถอน</dt>
                <dd className="font-medium tabular-nums">
                  {formatTHB(breakdown.gross)}
                </dd>
              </div>
              <div className="flex items-center justify-between px-3 py-2.5">
                <dt className="text-muted-foreground">
                  ภาษีหัก ณ ที่จ่าย ({(WHT_RATE * 100).toFixed(0)}%)
                  {!breakdown.taxable && (
                    <span className="ml-1 text-xs">
                      (ยอดต่ำกว่า {WHT_THRESHOLD.toLocaleString('th-TH')} บาท ไม่หัก)
                    </span>
                  )}
                </dt>
                <dd className="text-destructive font-medium tabular-nums">
                  {breakdown.wht > 0 ? `- ${formatTHB(breakdown.wht)}` : formatTHB(0)}
                </dd>
              </div>
              <div className="flex items-center justify-between px-3 py-2.5">
                <dt className="text-muted-foreground">ค่าธรรมเนียมการถอน</dt>
                <dd className="text-destructive font-medium tabular-nums">
                  {`- ${formatTHB(breakdown.fee)}`}
                </dd>
              </div>
              <div className="bg-muted/30 flex items-center justify-between px-3 py-3">
                <dt className="font-semibold">ยอดที่จะได้รับสุทธิ</dt>
                <dd className="text-success text-base font-bold tabular-nums">
                  {formatTHB(breakdown.net)}
                </dd>
              </div>
            </dl>

            <p className="text-muted-foreground text-xs">
              ยอด {formatTHB(breakdown.gross)} จะถูกหักออกจากยอดคงเหลือของคุณ
              และโอนเข้าบัญชีธนาคารที่ลงทะเบียนไว้หลังหักภาษีและค่าธรรมเนียม
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={isPending}
            >
              ยกเลิก
            </Button>
            {/*
              Associate this submit button with the main form via the `form`
              attribute so it submits even though the dialog is portaled outside
              the form's DOM subtree.
            */}
            <Button
              type="submit"
              form={FORM_ID}
              className="sm:min-w-40"
              disabled={isPending}
            >
              {isPending && <Loader2 className="animate-spin" />}
              ยืนยันการถอนเงิน
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
