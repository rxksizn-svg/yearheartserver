'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import type { TranscriptEntry } from '@/lib/types'

type ActionResult<T = undefined> =
  | { status: 'success'; message?: string; data?: T }
  | { status: 'error'; message: string }

async function getSessionProfile() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, email, role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) return null
  return { supabase, profile }
}

const createSchema = z.object({
  subject: z.string().trim().min(1, 'กรุณากรอกหัวข้อ').max(200),
  message: z.string().trim().min(1, 'กรุณากรอกข้อความ').max(4000),
})

/** Open a new support ticket with the first message. Returns the ticket id. */
export async function createTicket(
  input: unknown,
): Promise<ActionResult<{ ticketId: string }>> {
  const session = await getSessionProfile()
  if (!session) return { status: 'error', message: 'กรุณาเข้าสู่ระบบ' }
  const { supabase, profile } = session

  const parsed = createSchema.safeParse(input)
  if (!parsed.success) {
    return {
      status: 'error',
      message: parsed.error.issues[0]?.message ?? 'ข้อมูลไม่ถูกต้อง',
    }
  }

  const { data: ticket, error } = await supabase
    .from('support_tickets')
    .insert({
      user_id: profile.id,
      subject: parsed.data.subject,
      status: 'open',
    })
    .select('id')
    .single()

  if (error || !ticket) {
    console.log('[v0] createTicket error:', error?.message)
    return { status: 'error', message: 'เปิด ticket ไม่สำเร็จ กรุณาลองใหม่' }
  }

  const senderRole = profile.role === 'admin' ? 'admin' : 'user'
  const { error: msgError } = await supabase.from('ticket_messages').insert({
    ticket_id: ticket.id,
    sender_id: profile.id,
    sender_role: senderRole,
    body: parsed.data.message,
  })

  if (msgError) {
    console.log('[v0] createTicket message error:', msgError.message)
    return { status: 'error', message: 'ส่งข้อความแรกไม่สำเร็จ กรุณาลองใหม่' }
  }

  revalidatePath('/support')
  revalidatePath('/admin')
  return { status: 'success', data: { ticketId: ticket.id } }
}

const messageSchema = z.object({
  ticketId: z.string().uuid(),
  body: z.string().trim().min(1).max(4000),
})

/** Post a message into a ticket. RLS restricts to the owner or an admin. */
export async function sendMessage(input: unknown): Promise<ActionResult> {
  const session = await getSessionProfile()
  if (!session) return { status: 'error', message: 'กรุณาเข้าสู่ระบบ' }
  const { supabase, profile } = session

  const parsed = messageSchema.safeParse(input)
  if (!parsed.success) {
    return { status: 'error', message: 'ข้อความไม่ถูกต้อง' }
  }

  // Block posting to a closed ticket (the row is still readable by both sides).
  const { data: ticket } = await supabase
    .from('support_tickets')
    .select('status')
    .eq('id', parsed.data.ticketId)
    .maybeSingle()
  if (!ticket) return { status: 'error', message: 'ไม่พบ ticket' }
  if (ticket.status === 'closed') {
    return { status: 'error', message: 'บทสนทนานี้ถูกปิดแล้ว' }
  }

  const senderRole = profile.role === 'admin' ? 'admin' : 'user'
  const { error } = await supabase.from('ticket_messages').insert({
    ticket_id: parsed.data.ticketId,
    sender_id: profile.id,
    sender_role: senderRole,
    body: parsed.data.body,
  })

  if (error) {
    console.log('[v0] sendMessage error:', error.message)
    return { status: 'error', message: 'ส่งข้อความไม่สำเร็จ' }
  }

  await supabase
    .from('support_tickets')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', parsed.data.ticketId)

  return { status: 'success' }
}

async function assertAdmin() {
  const session = await getSessionProfile()
  if (!session) return null
  if (session.profile.role !== 'admin') return null
  return session
}

/** Admin: close (or reopen) a ticket. */
export async function setTicketStatus(
  ticketId: string,
  status: 'open' | 'closed',
): Promise<ActionResult> {
  const session = await assertAdmin()
  if (!session) return { status: 'error', message: 'ไม่มีสิทธิ์ดำเนินการ' }
  const { supabase } = session

  const { error } = await supabase
    .from('support_tickets')
    .update({
      status,
      closed_at: status === 'closed' ? new Date().toISOString() : null,
    })
    .eq('id', ticketId)

  if (error) {
    console.log('[v0] setTicketStatus error:', error.message)
    return { status: 'error', message: 'อัปเดตสถานะไม่สำเร็จ' }
  }

  revalidatePath('/support')
  revalidatePath('/admin')
  return { status: 'success' }
}

/**
 * Admin: permanently delete a ticket and all of its messages (cascade). This
 * cannot be undone — the UI must confirm first.
 */
export async function deleteTicket(ticketId: string): Promise<ActionResult> {
  const session = await assertAdmin()
  if (!session) return { status: 'error', message: 'ไม่มีสิทธิ์ดำเนินการ' }
  const { supabase } = session

  const { error } = await supabase
    .from('support_tickets')
    .delete()
    .eq('id', ticketId)

  if (error) {
    console.log('[v0] deleteTicket error:', error.message)
    return { status: 'error', message: 'ลบการสนทนาไม่สำเร็จ' }
  }

  revalidatePath('/support')
  revalidatePath('/admin')
  return { status: 'success', message: 'ลบการสนทนาเรียบร้อยแล้ว' }
}

/**
 * Admin: snapshot the full conversation into the ticket as immutable evidence
 * and close it. The transcript is stored as JSON with sender names resolved.
 */
export async function saveTranscript(ticketId: string): Promise<ActionResult> {
  const session = await assertAdmin()
  if (!session) return { status: 'error', message: 'ไม่มีสิทธิ์ดำเนินการ' }
  const { supabase } = session

  const { data: messages, error: msgError } = await supabase
    .from('ticket_messages')
    .select('sender_id, sender_role, body, created_at')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true })

  if (msgError) {
    console.log('[v0] saveTranscript read error:', msgError.message)
    return { status: 'error', message: 'อ่านบทสนทนาไม่สำเร็จ' }
  }

  // Resolve sender display names for the snapshot.
  const senderIds = Array.from(new Set((messages ?? []).map((m) => m.sender_id)))
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, email')
    .in('id', senderIds.length > 0 ? senderIds : ['00000000-0000-0000-0000-000000000000'])

  const nameById = new Map<string, string>()
  for (const p of profiles ?? []) {
    nameById.set(p.id, p.name || p.email || 'ผู้ใช้')
  }

  const transcript: TranscriptEntry[] = (messages ?? []).map((m) => ({
    sender_role: m.sender_role as 'user' | 'admin',
    sender_name: nameById.get(m.sender_id) ?? 'ผู้ใช้',
    body: m.body,
    created_at: m.created_at,
  }))

  const now = new Date().toISOString()
  const { error } = await supabase
    .from('support_tickets')
    .update({
      transcript,
      transcript_saved_at: now,
      status: 'closed',
      closed_at: now,
    })
    .eq('id', ticketId)

  if (error) {
    console.log('[v0] saveTranscript write error:', error.message)
    return { status: 'error', message: 'บันทึกบทสนทนาไม่สำเร็จ' }
  }

  revalidatePath('/support')
  revalidatePath('/admin')
  return {
    status: 'success',
    message: `บันทึกบทสนทนา ${transcript.length} ข้อความเรียบร้อย`,
  }
}
