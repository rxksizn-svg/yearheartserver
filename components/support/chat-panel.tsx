'use client'

import * as React from 'react'
import { Send, Loader2, Lock } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { sendMessage } from '@/app/actions/support'
import { refreshUnreadChats } from '@/components/support/use-unread-chats'
import type { TicketMessage } from '@/lib/types'
import { formatThaiTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

type ChatPanelProps = {
  ticketId: string
  currentUserId: string
  /** When true, the composer is disabled (ticket closed). */
  closed?: boolean
  /** Optional label for the other party, shown on their bubbles. */
  peerLabel?: string
}

/**
 * Realtime chat thread for a single ticket. Loads history via the browser
 * Supabase client (RLS-gated) and subscribes to INSERTs so both the user and
 * the admin see new messages live. Sending goes through a server action.
 */
export function ChatPanel({
  ticketId,
  currentUserId,
  closed = false,
  peerLabel,
}: ChatPanelProps) {
  // Stable browser client shared between the realtime effect and handlers.
  const [supabase] = React.useState(() => createClient())
  const [messages, setMessages] = React.useState<TicketMessage[]>([])
  const [loading, setLoading] = React.useState(true)
  const [body, setBody] = React.useState('')
  const [sending, setSending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  const scrollToBottom = React.useCallback(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [])

  const appendMessage = React.useCallback((msg: TicketMessage) => {
    setMessages((prev) =>
      prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
    )
  }, [])

  const refetch = React.useCallback(async () => {
    const { data } = await supabase
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })
    setMessages((data ?? []) as TicketMessage[])
  }, [supabase, ticketId])

  React.useEffect(() => {
    let active = true

    async function setup() {
      setLoading(true)
      // Realtime postgres_changes are RLS-gated, so the socket must carry the
      // user's access token or no INSERT events are delivered.
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session) supabase.realtime.setAuth(session.access_token)

      const { data } = await supabase
        .from('ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true })
      if (!active) return
      setMessages((data ?? []) as TicketMessage[])
      setLoading(false)
    }
    setup()

    // Live updates: append any new message for this ticket, de-duped by id.
    const channel = supabase
      .channel(`ticket-messages-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_messages',
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => appendMessage(payload.new as TicketMessage),
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [ticketId, supabase, appendMessage])

  React.useEffect(() => {
    scrollToBottom()
  }, [messages, loading, scrollToBottom])

  // Opening a chat, or receiving a message while it's open, marks it read.
  const lastMessageId = messages.at(-1)?.id
  React.useEffect(() => {
    if (loading) return
    supabase
      .rpc('mark_ticket_read', { p_ticket_id: ticketId })
      .then(() => refreshUnreadChats())
  }, [supabase, ticketId, loading, lastMessageId])

  async function handleSend() {
    const trimmed = body.trim()
    if (!trimmed || sending) return
    setSending(true)
    setError(null)
    const res = await sendMessage({ ticketId, body: trimmed })
    setSending(false)
    if (res.status === 'error') {
      setError(res.message)
      return
    }
    setBody('')
    // Guarantee the sender sees their own message even if the realtime echo is
    // delayed; de-dup keeps it consistent when the echo does arrive.
    refetch()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter to send, Shift+Enter for newline. Respect IME composition.
    if (
      e.key === 'Enter' &&
      !e.shiftKey &&
      !e.nativeEvent.isComposing &&
      e.keyCode !== 229
    ) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
      >
        {loading ? (
          <div className="text-muted-foreground flex h-full items-center justify-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" />
            กำลังโหลดบทสนทนา…
          </div>
        ) : messages.length === 0 ? (
          <div className="text-muted-foreground flex h-full items-center justify-center text-center text-sm">
            ยังไม่มีข้อความ เริ่มการสนทนาได้เลย
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === currentUserId
            return (
              <div
                key={m.id}
                className={cn('flex', mine ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[78%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
                    mine
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-muted text-foreground rounded-bl-sm',
                  )}
                >
                  {!mine && peerLabel && (
                    <p className="mb-0.5 text-xs font-medium opacity-70">
                      {m.sender_role === 'admin' ? 'ทีมงาน' : peerLabel}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p
                    className={cn(
                      'mt-1 text-right text-[10px]',
                      mine
                        ? 'text-primary-foreground/70'
                        : 'text-muted-foreground',
                    )}
                  >
                    {formatThaiTime(m.created_at)}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="border-border border-t p-3">
        {error && (
          <p className="text-destructive mb-2 text-xs">{error}</p>
        )}
        {closed ? (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-2 text-sm">
            <Lock className="size-4" />
            บทสนทนานี้ถูกปิดแล้ว
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="พิมพ์ข้อความ… (Enter เพื่อส่ง, Shift+Enter ขึ้นบรรทัดใหม่)"
              rows={1}
              className="max-h-32 min-h-10 resize-none"
            />
            <Button
              type="button"
              onClick={handleSend}
              disabled={sending || !body.trim()}
              className="shrink-0"
              aria-label="ส่งข้อความ"
            >
              {sending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
