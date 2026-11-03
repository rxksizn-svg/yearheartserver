'use client'

import * as React from 'react'
import useSWR, { mutate } from 'swr'

import { createClient } from '@/lib/supabase/client'

export const UNREAD_CHATS_KEY = 'unread-chats'

async function fetchUnreadCount(): Promise<number> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('unread_ticket_count')
  if (error) throw error
  return (data as number | null) ?? 0
}

export function refreshUnreadChats() {
  return mutate(UNREAD_CHATS_KEY)
}

/**
 * Number of chats with messages from the other party that the current user
 * hasn't read yet. Admins count customer messages; customers count admin
 * replies. Refreshes live via realtime, with a slow poll as a safety net.
 */
export function useUnreadChats() {
  const { data } = useSWR(UNREAD_CHATS_KEY, fetchUnreadCount, {
    refreshInterval: 60_000,
    revalidateOnFocus: true,
  })
  const channelId = React.useId()

  React.useEffect(() => {
    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null
    let cancelled = false

    async function subscribe() {
      // postgres_changes are RLS-gated, so the socket needs the user's token.
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (cancelled || !session) return
      supabase.realtime.setAuth(session.access_token)

      channel = supabase
        .channel(`unread-chats-${channelId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'ticket_messages' },
          () => refreshUnreadChats(),
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'support_tickets' },
          () => refreshUnreadChats(),
        )
        .subscribe()
    }
    subscribe()

    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
  }, [channelId])

  return data ?? 0
}
