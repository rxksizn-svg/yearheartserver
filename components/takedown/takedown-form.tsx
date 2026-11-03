'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Disc3,
  Info,
} from 'lucide-react'

import { createTakedownRequest } from '@/app/actions/takedown'
import { RELEASE_STATUS_LABELS, type Release } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type Feedback = { type: 'success' | 'error'; message: string } | null

/** A release already has an active/complete request and cannot be re-submitted. */
function isLocked(release: Release, blockedIds: Set<string>) {
  return release.status === 'takedown' || blockedIds.has(release.id)
}

export function TakedownForm({
  releases,
  blockedReleaseIds,
  defaultContact,
}: {
  releases: Release[]
  blockedReleaseIds: string[]
  defaultContact: { name: string; email: string; phone: string }
}) {
  const router = useRouter()
  const blocked = React.useMemo(
    () => new Set(blockedReleaseIds),
    [blockedReleaseIds],
  )

  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [contactName, setContactName] = React.useState(defaultContact.name)
  const [contactEmail, setContactEmail] = React.useState(defaultContact.email)
  const [contactPhone, setContactPhone] = React.useState(defaultContact.phone)
  const [reason, setReason] = React.useState('')
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [pending, startTransition] = React.useTransition()
  const [feedback, setFeedback] = React.useState<Feedback>(null)

  const selected = releases.find((r) => r.id === selectedId) ?? null
  const canSubmit =
    Boolean(selected) &&
    reason.trim().length > 0 &&
    contactName.trim().length > 0 &&
    contactEmail.trim().length > 0 &&
    contactPhone.trim().length > 0

  function submit() {
    if (!selected || !canSubmit) return
    startTransition(async () => {
      const res = await createTakedownRequest({
        release_id: selected.id,
        song_title: selected.song_title,
        artist_name: selected.artist_name,
        reason: reason.trim(),
        contact_name: contactName.trim(),
        contact_email: contactEmail.trim(),
        contact_phone: contactPhone.trim(),
      })
      setConfirmOpen(false)
      if (res.status === 'error') {
        setFeedback({ type: 'error', message: res.message })
        return
      }
      setFeedback({
        type: 'success',
        message: res.message ?? 'ส่งคำขอเรียบร้อยแล้ว',
      })
      setSelectedId(null)
      setReason('')
      router.refresh()
    })
  }

  if (releases.length === 0) {
    return (
      <div className="border-border bg-card text-muted-foreground flex flex-col items-center gap-2 rounded-xl border border-dashed py-12 text-center text-sm">
        <Disc3 className="size-8 opacity-40" />
        <p>ยังไม่มีผลงานเพลงในบัญชีของคุณที่สามารถขอ TakeDown ได้</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Step 1: pick a release to take down */}
        <section className="border-border bg-card rounded-xl border p-5">
          <h2 className="text-sm font-semibold">1. เลือกเพลงที่ต้องการลบ</h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            ระบบดึงข้อมูลจากผลงานเพลงที่คุณส่งเข้าระบบ
          </p>

          <ul className="mt-4 flex flex-col gap-2">
            {releases.map((release) => {
              const locked = isLocked(release, blocked)
              const active = release.id === selectedId
              return (
                <li key={release.id}>
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => setSelectedId(release.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
                      active
                        ? 'border-brand bg-brand/10'
                        : 'border-border hover:bg-accent',
                      locked && 'cursor-not-allowed opacity-60 hover:bg-transparent',
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-4 shrink-0 items-center justify-center rounded-full border',
                        active ? 'border-brand' : 'border-muted-foreground/40',
                      )}
                      aria-hidden
                    >
                      {active && (
                        <span className="bg-brand size-2 rounded-full" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {release.song_title}
                      </span>
                      <span className="text-muted-foreground block truncate text-xs">
                        {release.artist_name} · {release.track_type}
                        {release.album_name ? ` · ${release.album_name}` : ''}
                      </span>
                    </span>
                    {locked && (
                      <span className="text-muted-foreground shrink-0 text-xs">
                        {release.status === 'takedown'
                          ? RELEASE_STATUS_LABELS.takedown
                          : 'มีคำขออยู่แล้ว'}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </section>

        {/* Step 2: reason + contact */}
        <section className="border-border bg-card flex flex-col gap-4 rounded-xl border p-5">
          <div>
            <h2 className="text-sm font-semibold">2. รายละเอียดคำขอ</h2>
            <p className="text-muted-foreground mt-0.5 text-xs">
              โปรดระบุเหตุผลและข้อมูลติดต่อกลับ
            </p>
          </div>

          {feedback && (
            <div
              role="status"
              className={cn(
                'flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm',
                feedback.type === 'success'
                  ? 'border-success/30 bg-success/10 text-success'
                  : 'border-destructive/30 bg-destructive/10 text-destructive',
              )}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              ) : (
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reason">เหตุผลในการขอลบเพลง</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="เช่น ต้องการนำเพลงออกจากทุกแพลตฟอร์ม เนื่องจาก..."
              rows={4}
              maxLength={4000}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contact_name">ชื่อ-นามสกุลผู้ติดต่อ</Label>
            <Input
              id="contact_name"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contact_email">อีเมล</Label>
            <Input
              id="contact_email"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contact_phone">เบอร์โทรศัพท์</Label>
            <Input
              id="contact_phone"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </div>

          <div className="border-warning/30 bg-warning/10 text-warning flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs">
            <Info className="mt-0.5 size-4 shrink-0" />
            <span>
              การส่งคำขอนี้ไม่ได้ลบเพลงทันที ทีมงานจะตรวจสอบและดำเนินการ
              TakeDown ให้ต่อไป
            </span>
          </div>

          <Button
            type="button"
            className="w-full"
            disabled={!canSubmit || pending}
            onClick={() => setConfirmOpen(true)}
          >
            ส่งคำขอ TakeDown
          </Button>
        </section>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent
          title="ยืนยันการส่งคำขอ TakeDown"
          description="ตรวจสอบข้อมูลก่อนส่งให้ทีมงานดำเนินการ"
        >
          {selected && (
            <dl className="border-border divide-border divide-y rounded-lg border text-sm">
              <div className="flex items-center justify-between px-3 py-2.5">
                <dt className="text-muted-foreground">เพลง</dt>
                <dd className="font-medium">{selected.song_title}</dd>
              </div>
              <div className="flex items-center justify-between px-3 py-2.5">
                <dt className="text-muted-foreground">ศิลปิน</dt>
                <dd className="font-medium">{selected.artist_name}</dd>
              </div>
              <div className="flex items-center justify-between px-3 py-2.5">
                <dt className="text-muted-foreground">ติดต่อกลับ</dt>
                <dd className="font-medium">{contactName}</dd>
              </div>
            </dl>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={pending}
            >
              ยกเลิก
            </Button>
            <Button
              type="button"
              className="sm:min-w-40"
              onClick={submit}
              disabled={pending}
            >
              {pending && <Loader2 className="animate-spin" />}
              ยืนยันส่งคำขอ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
