import { createClient } from '@/lib/supabase/server'
import type { ArtistNameEntry } from '@/lib/artist-names'
import type {
  BalanceAdjustment,
  PayoutProfile,
  Profile,
  UserBalance,
  WithdrawalRequest,
} from '@/lib/types'

export type AdminUserRow = Profile & {
  balance: UserBalance
  artist_names: ArtistNameEntry[]
}

/**
 * Lists every profile with computed balance figures, using the admin-only
 * `admin_user_balances` RPC (SECURITY DEFINER, guarded by is_admin()).
 */
export async function listUsersWithBalances(): Promise<AdminUserRow[]> {
  const supabase = await createClient()

  const [{ data: profiles }, { data: balances }, { data: artistNames }] =
    await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: true }),
      supabase.rpc('admin_user_balances'),
      supabase
        .from('artist_names')
        .select('id, user_id, name')
        .order('created_at', { ascending: true }),
    ])

  const namesByUser = new Map<string, ArtistNameEntry[]>()
  for (const n of (artistNames ?? []) as (ArtistNameEntry & { user_id: string })[]) {
    const list = namesByUser.get(n.user_id) ?? []
    list.push({ id: n.id, name: n.name })
    namesByUser.set(n.user_id, list)
  }

  const balanceMap = new Map<string, UserBalance>()
  for (const b of (balances ?? []) as {
    user_id: string
    total_earned: number
    total_paid: number
    pending_withdrawals: number
    adjustments_net: number
  }[]) {
    const totalEarned = Number(b.total_earned)
    const totalPaid = Number(b.total_paid)
    const pendingWithdrawals = Number(b.pending_withdrawals)
    const adjustmentsNet = Number(b.adjustments_net)
    balanceMap.set(b.user_id, {
      totalEarned,
      totalPaid,
      pendingWithdrawals,
      adjustmentsNet,
      availableBalance:
        totalEarned + adjustmentsNet - totalPaid - pendingWithdrawals,
    })
  }

  const zero: UserBalance = {
    totalEarned: 0,
    totalPaid: 0,
    pendingWithdrawals: 0,
    adjustmentsNet: 0,
    availableBalance: 0,
  }

  return ((profiles ?? []) as Profile[]).map((p) => ({
    ...p,
    balance: balanceMap.get(p.id) ?? zero,
    artist_names: namesByUser.get(p.id) ?? [],
  }))
}

/** All withdrawal requests with the requester's profile + bank details (admin). */
export async function getAllWithdrawalsDetailed(): Promise<
  (WithdrawalRequest & { profile: Pick<Profile, 'name' | 'email'> | null })[]
> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('withdrawal_requests')
    .select(
      'id, user_id, amount_thb, status, payee_name, bank_name, bank_account_number, requested_at, processed_at, reject_reason, payment_reference, processed_by',
    )
    .order('requested_at', { ascending: false })

  const rows = (data ?? []) as WithdrawalRequest[]
  if (rows.length === 0) return []

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

/** Recent balance adjustments across all users (admin). */
export async function getRecentAdjustments(
  limit = 20,
): Promise<(BalanceAdjustment & { profile: Pick<Profile, 'name' | 'email'> | null })[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('balance_adjustments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  const rows = (data ?? []) as BalanceAdjustment[]
  if (rows.length === 0) return []

  const userIds = Array.from(new Set(rows.map((r) => r.user_id)))
  const { data: profileRows } = await supabase
    .from('profiles')
    .select('id, name, email')
    .in('id', userIds)

  const profileMap = new Map(
    (profileRows ?? []).map((p) => [p.id, { name: p.name, email: p.email }]),
  )

  return rows.map((a) => ({
    ...a,
    amount_thb: Number(a.amount_thb),
    profile: profileMap.get(a.user_id) ?? null,
  }))
}

/** Map of user_id → payout profile, for surfacing bank details in the queue. */
export async function getPayoutProfilesByUser(
  userIds: string[],
): Promise<Map<string, PayoutProfile>> {
  if (userIds.length === 0) return new Map()
  const supabase = await createClient()
  const { data } = await supabase
    .from('payout_profiles')
    .select('*')
    .in('user_id', userIds)
  return new Map(((data ?? []) as PayoutProfile[]).map((p) => [p.user_id, p]))
}
