import { CalendarClock, CircleCheck, Lock } from 'lucide-react'

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { formatThaiDate } from '@/lib/format'
import {
  PAYOUT_QUARTERS,
  type WithdrawalWindow,
} from '@/lib/payout-schedule'

export function PayoutSchedule({ window }: { window: WithdrawalWindow }) {
  if (window.frequency === 'monthly') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="text-brand size-5" />
            รอบการเบิกเงิน (รายเดือน)
          </CardTitle>
          <CardDescription>
            ศิลปินในสังกัด YearHeart Records สามารถเบิกถอนรายได้ได้ทุกวันตลอดทั้งเดือน
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="border-success/30 bg-success/10 text-success flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm">
            <CircleCheck className="mt-0.5 size-4 shrink-0" />
            <span>
              ขณะนี้เปิดให้เบิกถอนได้ (รอบเดือน
              {window.monthLabelFull ? ` ${window.monthLabelFull}` : ''}) ถึงวันที่{' '}
              <span className="font-semibold">
                {formatThaiDate(window.closesOnISO)}
              </span>
            </span>
          </div>

          <ul className="flex flex-col gap-2">
            <li className="border-success/40 bg-success/5 flex items-center gap-3 rounded-lg border px-3.5 py-3">
              <span className="bg-success/15 text-success flex size-9 shrink-0 items-center justify-center rounded-md">
                <CircleCheck className="size-4.5" />
              </span>
              <div>
                <p className="text-sm font-medium">เบิกถอนได้ตลอดทั้งเดือน</p>
                <p className="text-muted-foreground text-xs">
                  ยอดคงเหลือที่ได้รับการอนุมัติแล้วพร้อมให้ถอนเข้าบัญชีที่ลงทะเบียนไว้
                </p>
              </div>
            </li>
          </ul>

          <div className="text-muted-foreground border-border/60 mt-1 space-y-1.5 border-t pt-3 text-xs leading-relaxed">
            <p>
              รอบเดือนใหม่จะเริ่มในวันที่{' '}
              <span className="font-medium">
                {formatThaiDate(window.nextOpensOnISO)}
              </span>
            </p>
            <p>
              หากเกิดการเปลี่ยนแปลง ทางบริษัทอาจเปลี่ยนแปลงกำหนดการโดยไม่แจ้งให้ทราบล่วงหน้า
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="text-brand size-5" />
          รอบการเบิกเงิน (รายไตรมาส)
        </CardTitle>
        <CardDescription>
          รายได้จะถูกส่งและจ่ายเป็นรายไตรมาสตามกำหนดการด้านล่าง
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {window.isOpen ? (
          <div className="border-success/30 bg-success/10 text-success flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm">
            <CircleCheck className="mt-0.5 size-4 shrink-0" />
            <span>
              ขณะนี้เปิดให้เบิกถอนได้ (
              {window.activeQuarter?.id}: {window.activeQuarter?.coveredLabel}){' '}
              ถึงวันที่{' '}
              <span className="font-semibold">
                {formatThaiDate(window.closesOnISO)}
              </span>
            </span>
          </div>
        ) : (
          <div className="border-warning/30 bg-warning/10 text-warning flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm">
            <Lock className="mt-0.5 size-4 shrink-0" />
            <span>
              ขณะนี้ยังไม่อยู่ในรอบการเบิกเงิน รอบถัดไป (
              {window.nextQuarter?.id}) จะเปิดวันที่{' '}
              <span className="font-semibold">
                {formatThaiDate(window.nextOpensOnISO)}
              </span>
            </span>
          </div>
        )}

        <ul className="flex flex-col gap-2">
          {PAYOUT_QUARTERS.map((q) => {
            const isActive = window.activeQuarter?.id === q.id
            const isNext = !window.isOpen && window.nextQuarter?.id === q.id
            return (
              <li
                key={q.id}
                className={
                  'flex flex-col gap-2 rounded-lg border px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between ' +
                  (isActive
                    ? 'border-success/40 bg-success/5'
                    : isNext
                      ? 'border-brand/40 bg-brand/5'
                      : 'border-border bg-card')
                }
              >
                <div className="flex items-center gap-3">
                  <span
                    className={
                      'flex size-9 shrink-0 items-center justify-center rounded-md text-xs font-semibold ' +
                      (isActive
                        ? 'bg-success/15 text-success'
                        : 'bg-muted text-muted-foreground')
                    }
                  >
                    {q.id}
                  </span>
                  <div>
                    <p className="text-sm font-medium">
                      รายได้เดือน {q.coveredFull}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      ส่งรายได้ {q.deliveryLabel}
                    </p>
                  </div>
                </div>
                <div className="pl-12 sm:pl-0 sm:text-right">
                  <p className="text-xs font-medium">จ่ายเงิน {q.paymentLabel}</p>
                  <p className="text-muted-foreground text-xs">
                    เบิกได้ 16–{q.windowEndDay} ของเดือนจ่าย
                  </p>
                </div>
              </li>
            )
          })}
        </ul>

        <div className="text-muted-foreground border-border/60 mt-1 space-y-1.5 border-t pt-3 text-xs leading-relaxed">
          <p>
            หากเกิดการเปลี่ยนแปลง ทางบริษัทอาจเปลี่ยนแปลงกำหนดการโดยไม่แจ้งให้ทราบล่วงหน้า
          </p>
          <p>
            กรณีเลยวันเบิก ท่านจะไม่สามารถเบิกเงินได้จนกว่าจะถึงรอบถัดไป
            โดยบริษัทจะเก็บค่าลิขสิทธิ์ล่าสุดไว้จ่ายในรอบถัดไป
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
