'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { ImageUploadField, publicMediaUrl } from '@/components/admin/image-upload-field'
import { deleteAnnouncement, saveAnnouncement } from '@/app/actions/news'
import type { Announcement } from '@/lib/data/news'

type Draft = {
  title: string
  body: string
  image_path: string | null
  is_active: boolean
  show_in_ticker: boolean
}

const EMPTY: Draft = { title: '', body: '', image_path: null, is_active: true, show_in_ticker: true }

const dateFormat = new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium' })

export function AnnouncementManager({ announcements }: { announcements: Announcement[] }) {
  const router = useRouter()
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [open, setOpen] = React.useState(false)
  const [draft, setDraft] = React.useState<Draft>(EMPTY)
  const [error, setError] = React.useState<string | null>(null)
  const [notice, setNotice] = React.useState<string | null>(null)
  const [pending, startTransition] = React.useTransition()

  function openNew() {
    setEditingId(null)
    setDraft(EMPTY)
    setError(null)
    setOpen(true)
  }

  function openEdit(item: Announcement) {
    setEditingId(item.id)
    setDraft({
      title: item.title,
      body: item.body,
      image_path: item.image_path,
      is_active: item.is_active,
      show_in_ticker: item.show_in_ticker,
    })
    setError(null)
    setOpen(true)
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    startTransition(async () => {
      const result = await saveAnnouncement(editingId, draft)
      if (result.status === 'error') {
        setError(result.message)
        return
      }
      setOpen(false)
      setNotice(result.message ?? 'บันทึกแล้ว')
      router.refresh()
    })
  }

  function remove(item: Announcement) {
    if (!window.confirm(`ลบประกาศ "${item.title}" ?`)) return
    startTransition(async () => {
      const result = await deleteAnnouncement(item.id)
      setNotice(result.message ?? null)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {notice ?? `ทั้งหมด ${announcements.length.toLocaleString('th-TH')} ประกาศ`}
        </p>
        <Button onClick={openNew} className="h-11">
          <Plus aria-hidden="true" />
          เขียนประกาศ
        </Button>
      </div>

      {announcements.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          ยังไม่มีประกาศ
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border/60">
          {announcements.map((item) => (
            <li key={item.id} className="flex items-center gap-3 py-3">
              {item.image_path ? (
                <img
                  src={publicMediaUrl(item.image_path) || '/placeholder.svg'}
                  alt=""
                  className="size-12 shrink-0 rounded-lg object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="size-12 shrink-0 rounded-lg bg-muted" aria-hidden="true" />
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="truncate text-sm font-medium">{item.title}</p>
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <Badge variant={item.is_active ? 'default' : 'secondary'}>
                    {item.is_active ? 'แสดงอยู่' : 'ซ่อน'}
                  </Badge>
                  {item.show_in_ticker && <Badge variant="outline">แถบเลื่อน</Badge>}
                  <span>{dateFormat.format(new Date(item.created_at))}</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-11"
                onClick={() => openEdit(item)}
                aria-label={`แก้ไข ${item.title}`}
              >
                <Pencil aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-11 text-destructive"
                onClick={() => remove(item)}
                disabled={pending}
                aria-label={`ลบ ${item.title}`}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="sm:max-w-lg"
          title={editingId ? 'แก้ไขประกาศ' : 'เขียนประกาศ'}
          description="ประกาศจะแสดงให้ผู้ใช้ทุกคนเห็นในหน้าหลักและหน้าประกาศ"
        >
          <form onSubmit={submit} className="flex flex-col gap-4">

            <div className="flex flex-col gap-2">
              <Label htmlFor="ann-title">หัวข้อ</Label>
              <Input
                id="ann-title"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                maxLength={200}
                required
                className="h-11 text-base"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="ann-body">รายละเอียด</Label>
              <Textarea
                id="ann-body"
                value={draft.body}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                maxLength={5000}
                rows={5}
                className="text-base"
              />
            </div>

            <ImageUploadField
              folder="announcements"
              value={draft.image_path}
              onChange={(path) => setDraft({ ...draft, image_path: path })}
            />

            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input
                type="checkbox"
                className="size-5 accent-primary"
                checked={draft.is_active}
                onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
              />
              แสดงประกาศนี้ให้ผู้ใช้เห็น
            </label>
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input
                type="checkbox"
                className="size-5 accent-primary"
                checked={draft.show_in_ticker}
                onChange={(e) => setDraft({ ...draft, show_in_ticker: e.target.checked })}
              />
              แสดงในแถบประกาศเลื่อนบนหัวเว็บ
            </label>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <DialogFooter>
              <Button type="submit" disabled={pending} className="h-11 w-full sm:w-auto">
                {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
                บันทึก
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
