import { createClient } from '@/lib/supabase/server'
import { fetchAllRows } from '@/lib/supabase/fetch-all'
import type {
  EarningsSummary,
  PayoutProfile,
  Profile,
  RoyaltyLineItem,
  WithdrawalRequest,
} from '@/lib/types'

/**
 * Ensures the current session belongs to an admin. Throws otherwise.
 * Returns the admin's user id.
 */
export async function requireAdmin(): Promise<string> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('unauthenticated')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'admin') throw new Error('forbidden')
  return user.id
}

/** Lists all profiles (admin only, enforced by RLS). Used to attribute royalties. */
export async function listArtists(): Promise<Profile[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true })
  return (data ?? []) as Profile[]
}

/** All withdrawal requests across users (admin only). */
export async function getAllWithdrawals(): Promise<
  (WithdrawalRequest & { profile: Pick<Profile, 'name' | 'email'> | null })[]
> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('withdrawal_requests')
    .select(
      'id, user_id, amount_thb, status, payee_name, bank_name, bank_account_number, requested_at, processed_at',
    )
    .order('requested_at', { ascending: false })

  const rows = (data ?? []) as WithdrawalRequest[]
  if (rows.length === 0) return []

  // withdrawal_requests references auth.users, not profiles, so join in JS
  // instead of relying on a PostgREST foreign-key embed.
  const userIds = Array.from(new Set(rows.map((r) => r.user_id)))
  const { data: profileRows } = await supabase
    .from('profiles')
    .select('id, name, email')
    .in('id', userIds)

  const profileMap = new Map(
    (profileRows ?? []).map((p) => [p.id, { name: p.name, email: p.email }]),
  )

  return rows.map((w) => ({
    ...w,
    amount_thb: Number(w.amount_thb),
    profile: profileMap.get(w.user_id) ?? null,
  }))
}

export async function getLineItems(userId: string): Promise<RoyaltyLineItem[]> {
  const supabase = await createClient()
  const data = await fetchAllRows((from, to) =>
    supabase
      .from('royalty_line_items')
      .select(
        'id, user_id, dsp, isrc, catalogue_title, revenue_type_desc, sales, revenue_thb, period, status, created_at, artist_name, country, gross_income_thb, net_income_thb',
      )
      .eq('user_id', userId)
      .order('period', { ascending: false })
      .order('revenue_thb', { ascending: false })
      .order('id', { ascending: true })
      .range(from, to),
  )

  return data.map((r) => ({
    ...r,
    revenue_thb: Number(r.revenue_thb),
    sales: Number(r.sales),
    gross_income_thb: r.gross_income_thb == null ? null : Number(r.gross_income_thb),
    net_income_thb: r.net_income_thb == null ? null : Number(r.net_income_thb),
  })) as RoyaltyLineItem[]
}

export async function getWithdrawals(
  userId: string,
): Promise<WithdrawalRequest[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('withdrawal_requests')
    .select(
      'id, user_id, amount_thb, status, payee_name, bank_name, bank_account_number, requested_at, processed_at',
    )
    .eq('user_id', userId)
    .order('requested_at', { ascending: false })

  return (data ?? []).map((w) => ({
    ...w,
    amount_thb: Number(w.amount_thb),
  })) as WithdrawalRequest[]
}

/**
 * Net of admin balance adjustments for a user (credits minus debits), e.g. the
 * "เติมเงิน" top-ups applied from the admin panel. Users can read their own rows
 * via the "own adjustments readable" RLS policy.
 */
export async function getAdjustmentsNet(userId: string): Promise<number> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('balance_adjustments')
    .select('amount_thb, type')
    .eq('user_id', userId)

  return (data ?? []).reduce((sum, a) => {
    const amount = Number(a.amount_thb)
    return sum + (a.type === 'credit' ? amount : -amount)
  }, 0)
}

export async function getPayoutProfile(
  userId: string,
): Promise<PayoutProfile | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('payout_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  return (data as PayoutProfile) ?? null
}

/**
 * Computes the financial summary from ledger data.
 * Available balance = approved earnings + net admin adjustments (top-ups)
 *   - (paid + processing + pending withdrawals).
 * Pending/processing withdrawals are held so a user cannot request the same
 * funds twice before an admin resolves them.
 */
export async function getEarningsSummary(
  userId: string,
): Promise<EarningsSummary> {
  const [items, withdrawals, adjustmentsNet] = await Promise.all([
    getLineItems(userId),
    getWithdrawals(userId),
    getAdjustmentsNet(userId),
  ])

  const totalEarned = items
    .filter((i) => i.status === 'approved')
    .reduce((sum, i) => sum + i.revenue_thb, 0)

  const totalStreams = items.reduce((sum, i) => sum + i.sales, 0)

  const totalWithdrawn = withdrawals
    .filter((w) => w.status === 'paid')
    .reduce((sum, w) => sum + w.amount_thb, 0)

  const pendingWithdrawals = withdrawals
    .filter((w) => w.status === 'pending' || w.status === 'processing')
    .reduce((sum, w) => sum + w.amount_thb, 0)

  const availableBalance =
    totalEarned + adjustmentsNet - totalWithdrawn - pendingWithdrawals

  return {
    totalEarned,
    totalWithdrawn,
    pendingWithdrawals,
    availableBalance,
    adjustmentsNet,
    totalStreams,
  }
}

/** Aggregate approved revenue by DSP, sorted desc. */
export function aggregateByDsp(items: RoyaltyLineItem[]) {
  const map = new Map<string, { revenue: number; streams: number }>()
  for (const i of items) {
    const cur = map.get(i.dsp) ?? { revenue: 0, streams: 0 }
    cur.revenue += i.revenue_thb
    cur.streams += i.sales
    map.set(i.dsp, cur)
  }
  return Array.from(map.entries())
    .map(([dsp, v]) => ({ dsp, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
}

/** Aggregate approved revenue by period (YYYY-MM), sorted ascending for charts. */
export function aggregateByPeriod(items: RoyaltyLineItem[]) {
  const map = new Map<string, number>()
  for (const i of items) {
    const key = i.period ?? 'ไม่ระบุ'
    map.set(key, (map.get(key) ?? 0) + i.revenue_thb)
  }
  return Array.from(map.entries())
    .map(([period, revenue]) => ({ period, revenue }))
    .sort((a, b) => a.period.localeCompare(b.period))
}

/** Aggregate revenue and streams by catalogue title (a "release"). */
export function aggregateByTitle(items: RoyaltyLineItem[]) {
  const map = new Map<
    string,
    { revenue: number; streams: number; isrc: string }
  >()
  for (const i of items) {
    const cur = map.get(i.catalogue_title) ?? {
      revenue: 0,
      streams: 0,
      isrc: i.isrc,
    }
    cur.revenue += i.revenue_thb
    cur.streams += i.sales
    map.set(i.catalogue_title, cur)
  }
  return Array.from(map.entries())
    .map(([title, v]) => ({ title, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
}
