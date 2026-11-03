'use client'

import * as React from 'react'
import { ArrowRight, ExternalLink, FileText, ShieldCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ReleaseForm } from '@/components/dashboard/release-form'

type ReleaseDefaults = {
  submitterName?: string
  submitterEmail?: string
  artistName?: string
}

const POLICY_LINKS = [
  {
    id: 'terms',
    title: 'ข้อกำหนดในการให้บริการ (Terms of Service)',
    description:
      'เงื่อนไขและข้อตกลงในการใช้บริการจัดจำหน่ายเพลงของ YearHeart Records',
    href: 'https://yearheart.co.th/terms-of-service',
    Icon: FileText,
  },
  {
    id: 'privacy',
    title: 'นโยบายความเป็นส่วนตัว (Privacy Policy)',
    description:
      'รายละเอียดการเก็บรวบรวมและใช้ข้อมูลส่วนบุคคลของคุณ',
    href: 'https://yearheart.co.th/privacy-policy',
    Icon: ShieldCheck,
  },
] as const

export function ReleaseConsentGate({
  userId,
  defaults,
  artistOptions,
}: {
  userId: string
  defaults?: ReleaseDefaults
  artistOptions: string[]
}) {
  const [accepted, setAccepted] = React.useState(false)
  const [confirmed, setConfirmed] = React.useState(false)

  if (confirmed) {
    return (
      <ReleaseForm userId={userId} defaults={defaults} artistOptions={artistOptions} />
    )
  }

  return (
    <Card>
      <CardContent className="space-y-6 py-6">
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold">
            ยอมรับข้อกำหนดก่อนส่ง Release
          </h2>
          <p className="text-muted-foreground text-sm text-pretty">
            ก่อนเริ่มส่งผลงาน กรุณาอ่านและยอมรับข้อกำหนดในการให้บริการและนโยบายความเป็นส่วนตัวของ
            YearHeart Records คุณสามารถคลิกลิงก์ด้านล่างเพื่อเปิดอ่านฉบับเต็มได้
          </p>
        </div>

        <ul className="flex flex-col gap-3">
          {POLICY_LINKS.map((policy) => (
            <li key={policy.id}>
              <a
                href={policy.href}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:border-brand/50 hover:bg-accent/50 flex items-center gap-3.5 rounded-xl border p-4 transition-colors"
              >
                <span className="bg-brand/10 text-brand flex size-10 shrink-0 items-center justify-center rounded-lg">
                  <policy.Icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-medium">
                    {policy.title}
                    <ExternalLink className="text-muted-foreground size-3.5 shrink-0" />
                  </span>
                  <span className="text-muted-foreground block text-xs text-pretty">
                    {policy.description}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>

        <label
          htmlFor="accept-terms"
          className="border-input flex cursor-pointer items-start gap-3 rounded-xl border p-4"
        >
          <input
            id="accept-terms"
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="accent-brand mt-0.5 size-4 shrink-0 rounded"
          />
          <span className="text-sm font-medium">
            ฉันได้ยอมรับข้อกำหนดการให้บริการแล้ว
          </span>
        </label>

        <div className="flex justify-end border-t pt-6">
          <Button disabled={!accepted} onClick={() => setConfirmed(true)}>
            ดำเนินการต่อ
            <ArrowRight />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
