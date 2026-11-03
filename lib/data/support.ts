import { createClient } from '@/lib/supabase/server'
import type {
  SupportTicket,
  SupportTicketWithProfile,
  TicketMessage,
} from '@/lib/types'

/** Tickets owned by a single user, newest activity first. Gated by RLS. */
export async function getUserTickets(userId: string): Promise<SupportTicket[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('user_id', userId)
    .order('last_message_at', { ascending: false })

  return (data ?? []) as SupportTicket[]
}

/** Every ticket with the owner's profile (admin only; gated by RLS). */
export async function getAllTickets(): Promise<SupportTicketWithProfile[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('support_tickets')
    .select(
      '*, profile:profiles!support_tickets_user_id_fkey(name, email, artist_name)',
    )
    .order('last_message_at', { ascending: false })

  return (data ?? []) as SupportTicketWithProfile[]
}

/** A single ticket by id. RLS restricts access to the owner or an admin. */
export async function getTicketById(
  id: string,
): Promise<SupportTicket | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  return (data as SupportTicket | null) ?? null
}

/** All messages for a ticket, oldest first. Gated by RLS. */
export async function getTicketMessages(
  ticketId: string,
): Promise<TicketMessage[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('ticket_messages')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true })

  return (data ?? []) as TicketMessage[]
}
