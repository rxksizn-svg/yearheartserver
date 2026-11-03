import type { Metadata } from 'next'
import { PageHeader } from '@/components/dashboard/page-header'
import { SettingsForm } from '@/components/dashboard/settings-form'
import { requireProfile } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'ตั้งค่าบัญชี — Yearheart Artist Portal',
}

export default async function SettingsPage() {
  const profile = await requireProfile()

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader
        title="ตั้งค่าบัญชี"
        description="จัดการโปรไฟล์และข้อมูลการรับเงินของคุณ"
      />
      <SettingsForm profile={profile} />
    </div>
  )
}
