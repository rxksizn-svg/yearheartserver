'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

import { updateProfile, type ProfileActionState } from '@/app/actions/profile'
import { ROLE_LABELS, type Profile } from '@/lib/types'
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
import { Badge } from '@/components/ui/badge'

const initialState: ProfileActionState = { status: 'idle' }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="animate-spin" />}
      บันทึกการเปลี่ยนแปลง
    </Button>
  )
}

export function SettingsForm({ profile }: { profile: Profile }) {
  const [state, formAction] = useActionState(updateProfile, initialState)

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>โปรไฟล์</CardTitle>
          <CardDescription>
            แก้ไขข้อมูลบัญชีที่แสดงทั่วทั้งพอร์ทัล
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

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">อีเมล</Label>
            <Input id="email" value={profile.email} disabled readOnly />
            <p className="text-muted-foreground text-xs">
              อีเมลจัดการผ่านระบบยืนยันตัวตน ไม่สามารถแก้ไขได้ที่นี่
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="account-type">ประเภทบัญชี</Label>
            <div>
              <Badge variant="secondary">{ROLE_LABELS[profile.role]}</Badge>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">ชื่อ-นามสกุล</Label>
            <Input
              id="name"
              name="name"
              defaultValue={profile.name ?? ''}
              placeholder="ชื่อของคุณ"
              required
            />
          </div>

          {profile.role === 'label' ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="labelName">ชื่อค่ายเพลง</Label>
              <Input
                id="labelName"
                name="labelName"
                defaultValue={profile.label_name ?? ''}
                placeholder="เช่น Northbound Records"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="artistName">ชื่อศิลปิน / ชื่อในวงการ</Label>
              <Input
                id="artistName"
                name="artistName"
                defaultValue={profile.artist_name ?? ''}
                placeholder="เช่น Mira Solace"
              />
            </div>
          )}
        </CardContent>
        <CardFooter className="justify-end">
          <SubmitButton />
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ข้อมูลการรับเงิน</CardTitle>
          <CardDescription>
            บัญชีธนาคารและข้อมูลผู้รับเงินสำหรับโอนค่าลิขสิทธิ์
            จัดการได้ในหน้าการถอนเงิน
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-end">
          <Button
            type="button"
            variant="outline"
            nativeButton={false}
            render={<Link href="/withdrawals#payout-profile" />}
          >
            จัดการข้อมูลการรับเงิน
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
