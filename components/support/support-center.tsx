'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus, MessageSquarePlus, Loader2, MessagesSquare } from 'lucide-react'

import type { SupportTicket } from '@/lib/types'
import { TICKET_STATUS_LABELS } from '@/lib/types'
import { createTicket } from '@/app/actions/support'
import { formatThaiDateTime } from '@/lib/format'
import { ChatPanel } from '@/components/support/chat-panel'
import { BusinessHoursBanner } from '@/components/support/business-hours-banner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export function SupportCenter({
  initialTickets,
  currentUserId,
}: {
  initialTickets: SupportTicket[]
  currentUserId: string
}) {
  const router = useRouter()
  const [tickets, setTickets] = React.useState(initialTickets)
  const [selectedId, setSelectedId] = React.useState<string | null>(
    initialTickets[0]?.id ?? null,
  )
  const [newOpen, setNewOpen] = React.useState(false)

  React.useEffect(() => {
    setTickets(initialTickets)
    if (!selectedId && initialTickets[0]) setSelectedId(initialTickets[0].id)
  }, [initialTickets, selectedId])

  const selected = tickets.find((t) => t.id === selectedId) ?? null

  return (
    <>
      <BusinessHoursBanner className="mb-4" />
      <div className="border-border bg-card grid h-[72vh] min-h-0 grid-cols-1 overflow-hidden rounded-xl border md:grid-cols-[300px_1fr]">
        {/* Ticket list */}
        <aside className="border-border flex min-h-0 flex-col border-b md:border-b-0 md:border-r">
          <div className="border-border flex items-center justify-between gap-2 border-b px-4 py-3">
            <h2 className="text-sm font-semibold">รายการสนทนา</h2>
            <Button size="sm" onClick={() => setNewOpen(true)}>
              <Plus className="size-4" />
              ใหม่
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {tickets.length === 0 ? (
              <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-2 px-4 py-8 text-center text-sm">
                <MessageSquarePlus className="size-8 opacity-50" />
                ยังไม่มีการสนทนา
                <br />
                กด &quot;ใหม่&quot; เพื่อเปิดคำถามถึงทีมงาน
              </div>
            ) : (
              <ul className="divide-border divide-y">
                {tickets.map((t) => (
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
                          {t.subject}
                        </span>
                        <Badge
                          variant={t.status === 'open' ? 'success' : 'secondary'}
                        >
                          {TICKET_STATUS_LABELS[t.status]}
                        </Badge>
                      </div>
                      <span className="text-muted-foreground text-xs">
                        {formatThaiDateTime(t.last_message_at)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* Chat thread */}
        <section className="flex min-h-0 flex-col">
          {selected ? (
            <>
              <div className="border-border flex items-center justify-between gap-3 border-b px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {selected.subject}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    เปิดเมื่อ {formatThaiDateTime(selected.created_at)}
                  </p>
                </div>
                <Badge
                  variant={selected.status === 'open' ? 'success' : 'secondary'}
                >
                  {TICKET_STATUS_LABELS[selected.status]}
                </Badge>
              </div>
              <ChatPanel
                key={selected.id}
                ticketId={selected.id}
                currentUserId={currentUserId}
                closed={selected.status === 'closed'}
                peerLabel="ทีมงาน"
              />
            </>
          ) : (
            <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-2 text-sm">
              <MessagesSquare className="size-10 opacity-40" />
              เลือกการสนทนา หรือเปิดคำถามใหม่
            </div>
          )}
        </section>
      </div>

      <NewTicketDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onCreated={(id) => {
          setSelectedId(id)
          setNewOpen(false)
          router.refresh()
        }}
      />
    </>
  )
}

function NewTicketDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (ticketId: string) => void
}) {
  const [subject, setSubject] = React.useState('')
  const [message, setMessage] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function handleSubmit() {
    if (submitting) return
    setSubmitting(true)
    setError(null)
    const res = await createTicket({ subject, message })
    setSubmitting(false)
    if (res.status === 'error') {
      setError(res.message)
      return
    }
    setSubject('')
    setMessage('')
    if (res.data) onCreated(res.data.ticketId)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent
        title="เปิดการสนทนาใหม่"
        description="ส่งคำถามถึงทีมงาน แล้วแชทสดเพื่อรับความช่วยเหลือได้ทันที"
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ticket-subject">หัวข้อ</Label>
            <Input
              id="ticket-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="เช่น สอบถามเรื่องการถอนเงิน"
              maxLength={200}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ticket-message">รายละเอียด</Label>
            <Textarea
              id="ticket-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="อธิบายเรื่องที่ต้องการให้ช่วยเหลือ"
              rows={4}
              maxLength={4000}
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            ยกเลิก
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !subject.trim() || !message.trim()}
          >
            {submitting ? (
              <Loader2 className="animate-spin" />
            ) : (
              <MessageSquarePlus className="size-4" />
            )}
            เริ่มสนทนา
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
