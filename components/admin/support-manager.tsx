'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  Save,
  Lock,
  Unlock,
  Download,
  MessagesSquare,
  Search,
  ShieldCheck,
  Trash2,
  AlertTriangle,
} from 'lucide-react'

import type { SupportTicketWithProfile } from '@/lib/types'
import { TICKET_STATUS_LABELS } from '@/lib/types'
import {
  setTicketStatus,
  saveTranscript,
  deleteTicket,
} from '@/app/actions/support'
import { formatThaiDateTime } from '@/lib/format'
import { ChatPanel } from '@/components/support/chat-panel'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type Filter = 'all' | 'open' | 'closed'

function ticketLabel(t: SupportTicketWithProfile) {
  return (
    t.profile?.name ||
    t.profile?.artist_name ||
    t.profile?.email ||
    'ผู้ใช้'
  )
}

export function SupportManager({
  initialTickets,
  currentAdminId,
}: {
  initialTickets: SupportTicketWithProfile[]
  currentAdminId: string
}) {
  const router = useRouter()
  const [selectedId, setSelectedId] = React.useState<string | null>(
    initialTickets[0]?.id ?? null,
  )
  const [filter, setFilter] = React.useState<Filter>('all')
  const [search, setSearch] = React.useState('')
  const [busy, setBusy] = React.useState<null | 'save' | 'status' | 'delete'>(
    null,
  )
  const [feedback, setFeedback] = React.useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = React.useState(false)

  const filtered = initialTickets.filter((t) => {
    if (filter !== 'all' && t.status !== filter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return (
        t.subject.toLowerCase().includes(q) ||
        ticketLabel(t).toLowerCase().includes(q) ||
        (t.profile?.email ?? '').toLowerCase().includes(q)
      )
    }
    return true
  })

  const selected =
    initialTickets.find((t) => t.id === selectedId) ?? null

  async function handleSave() {
    if (!selected || busy) return
    setBusy('save')
    setFeedback(null)
    const res = await saveTranscript(selected.id)
    setBusy(null)
    setFeedback(res.message ?? (res.status === 'success' ? 'บันทึกแล้ว' : null))
    if (res.status === 'success') router.refresh()
  }

  async function handleToggleStatus() {
    if (!selected || busy) return
    setBusy('status')
    setFeedback(null)
    const next = selected.status === 'open' ? 'closed' : 'open'
    const res = await setTicketStatus(selected.id, next)
    setBusy(null)
    if (res.status === 'error') setFeedback(res.message)
    else router.refresh()
  }

  async function handleDelete() {
    if (!selected || busy) return
    setBusy('delete')
    setFeedback(null)
    const res = await deleteTicket(selected.id)
    setBusy(null)
    setDeleteOpen(false)
    if (res.status === 'error') {
      setFeedback(res.message)
      return
    }
    setSelectedId(null)
    router.refresh()
  }

  function handleDownload() {
    if (!selected?.transcript) return
    const lines = [
      `หลักฐานการสนทนา (Support Ticket)`,
      `หัวข้อ: ${selected.subject}`,
      `ผู้ใช้: ${ticketLabel(selected)} (${selected.profile?.email ?? '-'})`,
      `บันทึกเมื่อ: ${formatThaiDateTime(selected.transcript_saved_at)}`,
      `----------------------------------------`,
      ...selected.transcript.map(
        (e) =>
          `[${formatThaiDateTime(e.created_at)}] ${
            e.sender_role === 'admin' ? 'ทีมงาน' : e.sender_name
          }: ${e.body}`,
      ),
    ]
    const blob = new Blob([lines.join('\n')], {
      type: 'text/plain;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ticket-${selected.id.slice(0, 8)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="border-border bg-card grid h-[72vh] min-h-0 grid-cols-1 overflow-hidden rounded-xl border md:grid-cols-[320px_1fr]">
      {/* Ticket list */}
      <aside className="border-border flex min-h-0 flex-col border-b md:border-b-0 md:border-r">
        <div className="border-border flex flex-col gap-2 border-b p-3">
          <div className="relative">
            <Search className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาผู้ใช้หรือหัวข้อ"
              className="pl-8"
            />
          </div>
          <div className="flex gap-1">
            {(['all', 'open', 'closed'] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  'flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors',
                  filter === f
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground',
                )}
              >
                {f === 'all'
                  ? 'ทั้งหมด'
                  : f === 'open'
                    ? 'กำลังสนทนา'
                    : 'ปิดแล้ว'}
              </button>
            ))}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="text-muted-foreground flex h-full items-center justify-center px-4 py-8 text-center text-sm">
              ไม่พบการสนทนา
            </div>
          ) : (
            <ul className="divide-border divide-y">
              {filtered.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(t.id)}
                    className={cn(
                      'hover:bg-muted/60 flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors',
                      selectedId === t.id && 'bg-muted',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">
                        {ticketLabel(t)}
                      </span>
                      <Badge
                        variant={t.status === 'open' ? 'success' : 'secondary'}
                      >
                        {TICKET_STATUS_LABELS[t.status]}
                      </Badge>
                    </div>
                    <span className="text-muted-foreground truncate text-xs">
                      {t.subject}
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      {formatThaiDateTime(t.last_message_at)}
                      {t.transcript_saved_at && ' · บันทึกหลักฐานแล้ว'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* Chat + admin controls */}
      <section className="flex min-h-0 flex-col">
        {selected ? (
          <>
            <div className="border-border flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {ticketLabel(selected)}
                </p>
                <p className="text-muted-foreground truncate text-xs">
                  {selected.subject} · {selected.profile?.email ?? '-'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleToggleStatus}
                  disabled={busy !== null}
                >
                  {busy === 'status' ? (
                    <Loader2 className="animate-spin" />
                  ) : selected.status === 'open' ? (
                    <Lock className="size-4" />
                  ) : (
                    <Unlock className="size-4" />
                  )}
                  {selected.status === 'open' ? 'ปิดสนทนา' : 'เปิดใหม่'}
                </Button>
                {selected.transcript_saved_at ? (
                  <Button size="sm" variant="secondary" onClick={handleDownload}>
                    <Download className="size-4" />
                    ดาวน์โหลดหลักฐาน
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={busy !== null}
                  >
                    {busy === 'save' ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}
                    บันทึกการสนทนา
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setDeleteOpen(true)}
                  disabled={busy !== null}
                >
                  <Trash2 className="size-4" />
                  ลบสนทนา
                </Button>
              </div>
            </div>

            {selected.transcript_saved_at && (
              <div className="border-border text-muted-foreground flex items-center gap-2 border-b bg-muted/40 px-4 py-2 text-xs">
                <ShieldCheck className="text-success size-4" />
                บันทึกบทสนทนาเป็นหลักฐานแล้วเมื่อ{' '}
                {formatThaiDateTime(selected.transcript_saved_at)}
              </div>
            )}

            {feedback && (
              <div className="border-border text-foreground border-b px-4 py-2 text-xs">
                {feedback}
              </div>
            )}

            <ChatPanel
              key={selected.id}
              ticketId={selected.id}
              currentUserId={currentAdminId}
              closed={selected.status === 'closed'}
              peerLabel={ticketLabel(selected)}
            />
          </>
        ) : (
          <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-2 text-sm">
            <MessagesSquare className="size-10 opacity-40" />
            เลือกการสนทนาเพื่อเริ่มตอบกลับ
          </div>
        )}
      </section>

      <Dialog
        open={deleteOpen}
        onOpenChange={(o) => busy !== 'delete' && setDeleteOpen(o)}
      >
        <DialogContent
          title="ลบการสนทนานี้?"
          description={
            selected
              ? `การสนทนา "${selected.subject}" ของ ${ticketLabel(selected)} และข้อความทั้งหมดจะถูกลบออกจากระบบอย่างถาวร รวมถึงหลักฐานที่บันทึกไว้ (ถ้ามี) การกระทำนี้ไม่สามารถย้อนกลับได้`
              : ''
          }
        >
          <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>คำเตือน: หากต้องเก็บเป็นหลักฐาน โปรดดาวน์โหลดหลักฐานก่อนลบ</span>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={busy === 'delete'}
            >
              ยกเลิก
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={busy === 'delete'}
            >
              {busy === 'delete' ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              ยืนยันลบถาวร
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
