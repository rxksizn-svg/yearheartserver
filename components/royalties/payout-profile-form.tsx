'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

import { savePayoutProfile, type ActionState } from '@/app/actions/payout'
import type { PayoutProfile } from '@/lib/types'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const THAI_BANKS = [
  'ธนาคารกสิกรไทย',
  'ธนาคารกรุงเทพ',
  'ธนาคารกรุงไทย',
  'ธนาคารไทยพาณิชย์',
  'ธนาคารกรุงศรีอยุธยา',
  'ธนาคารทหารไทยธนชาต (ttb)',
  'ธนาคารออมสิน',
  'ธนาคารเกียรตินาคินภัทร',
  'ธนาคารซีไอเอ็มบี ไทย',
  'ธนาคารยูโอบี',
]

const initialState: ActionState = { status: 'idle' }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="animate-spin" />}
      บันทึกข้อมูล
    </Button>
  )
}

function Field({
  id,
  label,
  children,
}: {
  id: string
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  )
}

export function PayoutProfileForm({
  profile,
}: {
  profile: PayoutProfile | null
}) {
  const [state, formAction] = useActionState(savePayoutProfile, initialState)

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>ข้อมูลผู้รับเงิน</CardTitle>
          <CardDescription>
            ข้อมูลนี้ใช้สำหรับออกหนังสือรับรองการหักภาษี ณ ที่จ่าย และการโอนเงิน
            กรุณากรอกให้ตรงกับเอกสารทางการ
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {state.status !== 'idle' && state.message && (
            <div
              role="status"
              className={
                state.status === 'success'
                  ? 'border-success/30 bg-success/10 text-success flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm'
                  : 'border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm'
              }
            >
              {state.status === 'success' ? (
                <CheckCircle2 className="size-4 shrink-0" />
              ) : (
                <AlertCircle className="size-4 shrink-0" />
              )}
              <span>{state.message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="full_name" label="ชื่อ-นามสกุล (ตามบัตรประชาชน)">
              <Input
                id="full_name"
                name="full_name"
                defaultValue={profile?.full_name ?? ''}
                required
              />
            </Field>
            <Field id="artist_label_name" label="ชื่อศิลปิน / ค่ายเพลง">
              <Input
                id="artist_label_name"
                name="artist_label_name"
                defaultValue={profile?.artist_label_name ?? ''}
                required
              />
            </Field>
          </div>

          <Field id="address" label="ที่อยู่">
            <Textarea
              id="address"
              name="address"
              defaultValue={profile?.address ?? ''}
              rows={2}
              placeholder="บ้านเลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์"
              required
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="national_id" label="เลขบัตรประชาชน 13 หลัก">
              <Input
                id="national_id"
                name="national_id"
                inputMode="numeric"
                maxLength={13}
                defaultValue={profile?.national_id ?? ''}
                placeholder="1234567890123"
                required
              />
            </Field>
            <Field id="phone" label="เบอร์โทรศัพท์">
              <Input
                id="phone"
                name="phone"
                inputMode="numeric"
                defaultValue={profile?.phone ?? ''}
                placeholder="0812345678"
                required
              />
            </Field>
          </div>

          <Field id="email" label="อีเมลสำหรับติดต่อ">
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={profile?.email ?? ''}
              required
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>บัญชีธนาคาร</CardTitle>
          <CardDescription>บัญชีปลายทางสำหรับรับเงินค่าลิขสิทธิ์</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field id="bank_name" label="ธนาคาร">
            <select
              id="bank_name"
              name="bank_name"
              defaultValue={profile?.bank_name ?? ''}
              required
              className="border-input bg-background focus-visible:ring-ring h-9 rounded-md border px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1"
            >
              <option value="" disabled>
                เลือกธนาคาร
              </option>
              {THAI_BANKS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </Field>
          <Field id="bank_account_number" label="เลขที่บัญชี">
            <Input
              id="bank_account_number"
              name="bank_account_number"
              inputMode="numeric"
              defaultValue={profile?.bank_account_number ?? ''}
              placeholder="1234567890"
              required
            />
          </Field>
        </CardContent>
        <CardFooter className="justify-end">
          <SubmitButton />
        </CardFooter>
      </Card>
    </form>
  )
}
