export type UserRole = 'artist' | 'label' | 'label_artist' | 'admin'

export type AccountStatus = 'active' | 'pending' | 'suspended'

export type Profile = {
  id: string
  email: string
  name: string | null
  role: UserRole
  status: AccountStatus
  artist_name: string | null
  label_name: string | null
  payout_info: string | null
  created_at: string
  updated_at: string
}

export const ROLE_LABELS: Record<UserRole, string> = {
  artist: 'ศิลปิน',
  label: 'ค่ายเพลง',
  label_artist: 'ศิลปินในสังกัด',
  admin: 'ผู้ดูแลระบบ',
}

export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  active: 'ใช้งานอยู่',
  pending: 'รอตรวจสอบ',
  suspended: 'ระงับการใช้งาน',
}

export type BalanceAdjustment = {
  id: string
  user_id: string
  admin_id: string | null
  amount_thb: number
  type: 'credit' | 'debit'
  note: string | null
  created_at: string
}

export type RoyaltyLineItem = {
  id: string
  user_id: string
  dsp: string
  isrc: string
  catalogue_title: string
  revenue_type_desc: string
  sales: number
  revenue_thb: number
  period: string | null
  status: 'approved' | 'pending'
  created_at: string
  artist_name: string | null
  country: string | null
  gross_income_thb: number | null
  net_income_thb: number | null
}

export type PayoutProfile = {
  user_id: string
  full_name: string
  artist_label_name: string
  address: string
  national_id: string
  phone: string
  email: string
  bank_name: string
  bank_account_number: string
  created_at: string
  updated_at: string
}

export type WithdrawalStatus = 'pending' | 'processing' | 'paid' | 'rejected'

export type WithdrawalRequest = {
  id: string
  user_id: string
  amount_thb: number
  /** Withholding tax withheld (3% when amount_thb >= 1000, else 0). */
  wht_thb: number
  /** Flat withdrawal fee charged per withdrawal. */
  fee_thb: number
  /** Net amount transferred to the payee after tax and fee. */
  net_amount_thb: number
  status: WithdrawalStatus
  payee_name: string | null
  bank_name: string | null
  bank_account_number: string | null
  requested_at: string
  processed_at: string | null
  reject_reason?: string | null
  payment_reference?: string | null
  processed_by?: string | null
}

export type UserBalance = {
  totalEarned: number
  totalPaid: number
  pendingWithdrawals: number
  adjustmentsNet: number
  availableBalance: number
}

export const WITHDRAWAL_STATUS_LABELS: Record<WithdrawalStatus, string> = {
  pending: 'รอดำเนินการ',
  processing: 'กำลังโอน',
  paid: 'จ่ายแล้ว',
  rejected: 'ปฏิเสธ',
}

export type EarningsSummary = {
  totalEarned: number
  totalWithdrawn: number
  pendingWithdrawals: number
  /** Net of admin credits/debits (e.g. top-ups) applied to this user. */
  adjustmentsNet: number
  availableBalance: number
  totalStreams: number
}

export type ReleaseStatus =
  | 'submitted'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'revised'
  | 'delivered'
  | 'live'
  | 'takedown'

export const RELEASE_STATUS_LABELS: Record<ReleaseStatus, string> = {
  submitted: 'ส่งเข้าระบบแล้ว',
  in_review: 'กำลังตรวจสอบ',
  approved: 'อนุมัติแล้ว',
  rejected: 'ปฏิเสธ',
  revised: 'ลูกค้าส่งแก้ไข',
  delivered: 'ส่งขึ้นแพลตฟอร์มแล้ว',
  live: 'เผยแพร่แล้ว',
  takedown: 'ส่ง Takedown',
}

export const RELEASE_STATUS_ORDER: ReleaseStatus[] = [
  'submitted',
  'in_review',
  'approved',
  'rejected',
  'revised',
  'delivered',
  'live',
  'takedown',
]

export type TakedownStatus = 'pending' | 'completed' | 'rejected'

export const TAKEDOWN_STATUS_LABELS: Record<TakedownStatus, string> = {
  pending: 'รอตรวจสอบ',
  completed: 'TakeDown สำเร็จ',
  rejected: 'ไม่สามารถ TakeDown ได้',
}

/**
 * A snapshot of a release captured at the moment an admin completes a takedown,
 * so the original data is preserved even if the release is later edited.
 */
export type ReleaseSnapshot = Record<string, unknown>

export type TakedownRequest = {
  id: string
  user_id: string
  release_id: string | null
  song_title: string
  artist_name: string
  reason: string
  contact_name: string
  contact_email: string
  contact_phone: string
  status: TakedownStatus
  release_snapshot: ReleaseSnapshot | null
  admin_id: string | null
  admin_note: string | null
  created_at: string
  processed_at: string | null
}

/** A takedown request joined with the requester profile and the target release. */
export type TakedownRequestWithRefs = TakedownRequest & {
  profile: { name: string | null; email: string; artist_name: string | null } | null
  release: Release | null
}

export type TrackType = 'Single' | 'EP' | 'Album'

export type Release = {
  id: string
  user_id: string
  track_no: number
  track_type: TrackType
  album_name: string | null
  song_title: string
  artist_name: string
  cover_path: string | null
  audio_path: string | null
  audio_filename: string | null
  cover_url: string | null
  audio_url: string | null
  composer: string
  producer: string
  genre: string
  upc_ean_isrc: string | null
  isrc: string | null
  is_explicit: boolean
  is_ai_generated: boolean
  submitter_name: string
  submitter_email: string
  submitter_phone: string
  consent_content_id: boolean
  consent_terms: boolean
  consent_copyright: boolean
  status: ReleaseStatus
  admin_note: string | null
  created_at: string
  updated_at: string
}

/** A release row joined with the submitting account's profile (admin views). */
export type ReleaseWithProfile = Release & {
  profile: { name: string | null; email: string; artist_name: string | null } | null
}

export type TicketStatus = 'open' | 'closed'

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'กำลังสนทนา',
  closed: 'ปิดแล้ว',
}

export type TicketMessage = {
  id: string
  ticket_id: string
  sender_id: string
  sender_role: 'user' | 'admin'
  body: string
  created_at: string
}

/** One entry in a saved transcript snapshot. */
export type TranscriptEntry = {
  sender_role: 'user' | 'admin'
  sender_name: string
  body: string
  created_at: string
}

export type SupportTicket = {
  id: string
  user_id: string
  subject: string
  status: TicketStatus
  transcript: TranscriptEntry[] | null
  transcript_saved_at: string | null
  last_message_at: string
  created_at: string
  closed_at: string | null
}

/** A ticket joined with the owner's profile (admin views). */
export type SupportTicketWithProfile = SupportTicket & {
  profile: { name: string | null; email: string; artist_name: string | null } | null
}
