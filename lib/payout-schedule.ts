const TZ = 'Asia/Bangkok'

export type Quarter = {
  id: 'Q1' | 'Q2' | 'Q3' | 'Q4'
  /** Months whose revenue this payout covers, e.g. "ต.ค. – ธ.ค." */
  coveredLabel: string
  /** Full covered-month description, e.g. "ตุลาคม – ธันวาคม" */
  coveredFull: string
  /** Day the revenue statement is delivered, e.g. "16 มีนาคม" */
  deliveryLabel: string
  /** Payment deadline, e.g. "ภายใน 31 มีนาคม" */
  paymentLabel: string
  /** 1-based month of the withdrawal window (when funds can be requested). */
  windowMonth: number
  /** Last day of the withdrawal window (payment deadline day). */
  windowEndDay: number
}

/**
 * Quarterly payout cycle. Revenue is delivered on the 16th and paid out by the
 * end of that month, so the withdrawal window for each quarter runs from the
 * 16th to the last day of the listed month. Numbering follows the company's
 * own convention (Q1 covers Oct–Dec).
 */
export const PAYOUT_QUARTERS: Quarter[] = [
  {
    id: 'Q1',
    coveredLabel: 'ต.ค. – ธ.ค.',
    coveredFull: 'ตุลาคม – ธันวาคม',
    deliveryLabel: '16 มีนาคม',
    paymentLabel: 'ภายใน 31 มีนาคม',
    windowMonth: 3,
    windowEndDay: 31,
  },
  {
    id: 'Q2',
    coveredLabel: 'ม.ค. – มี.ค.',
    coveredFull: 'มกราคม – มีนาคม',
    deliveryLabel: '16 มิถุนายน',
    paymentLabel: 'ภายใน 30 มิถุนายน',
    windowMonth: 6,
    windowEndDay: 30,
  },
  {
    id: 'Q3',
    coveredLabel: 'เม.ย. – มิ.ย.',
    coveredFull: 'เมษายน – มิถุนายน',
    deliveryLabel: '16 กันยายน',
    paymentLabel: 'ภายใน 30 กันยายน',
    windowMonth: 9,
    windowEndDay: 30,
  },
  {
    id: 'Q4',
    coveredLabel: 'ก.ค. – ก.ย.',
    coveredFull: 'กรกฎาคม – กันยายน',
    deliveryLabel: '16 ธันวาคม',
    paymentLabel: 'ภายใน 31 ธันวาคม',
    windowMonth: 12,
    windowEndDay: 31,
  },
]

export type PayoutFrequency = 'quarterly' | 'monthly'

export type WithdrawalWindow = {
  /** How often this account may withdraw. */
  frequency: PayoutFrequency
  /** Whether withdrawals can be requested right now. */
  isOpen: boolean
  /** The quarter whose window is currently open (quarterly only, when isOpen). */
  activeQuarter: Quarter | null
  /** ISO date the current window closes (only when isOpen). */
  closesOnISO: string | null
  /** The next quarter window that will open (quarterly only). */
  nextQuarter: Quarter | null
  /** ISO date the next window opens. */
  nextOpensOnISO: string
  /** Full Thai name of the current month (monthly only), e.g. "กันยายน". */
  monthLabelFull?: string
}

export const THAI_MONTHS = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
]

function bangkokParts(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
  const [year, month, day] = parts.split('-').map(Number)
  return { year, month, day }
}

/** Noon Bangkok time, so day-of-month never drifts across time zones. */
function isoDate(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${year}-${mm}-${dd}T12:00:00+07:00`
}

/**
 * Determine the withdrawal window relative to `now` (defaults to the current
 * time), evaluated in the Asia/Bangkok time zone.
 */
export function getWithdrawalWindow(now: Date = new Date()): WithdrawalWindow {
  const { year, month, day } = bangkokParts(now)

  const active = PAYOUT_QUARTERS.find(
    (q) => q.windowMonth === month && day >= 16 && day <= q.windowEndDay,
  )
  if (active) {
    return {
      frequency: 'quarterly',
      isOpen: true,
      activeQuarter: active,
      closesOnISO: isoDate(year, active.windowMonth, active.windowEndDay),
      nextQuarter: active,
      nextOpensOnISO: isoDate(year, active.windowMonth, 16),
    }
  }

  const nowKey = year * 10000 + month * 100 + day
  const next = [year, year + 1]
    .flatMap((y) => PAYOUT_QUARTERS.map((q) => ({ q, y })))
    .map((c) => ({ ...c, key: c.y * 10000 + c.q.windowMonth * 100 + 16 }))
    .sort((a, b) => a.key - b.key)
    .find((c) => c.key > nowKey)!

  return {
    frequency: 'quarterly',
    isOpen: false,
    activeQuarter: null,
    closesOnISO: null,
    nextQuarter: next.q,
    nextOpensOnISO: isoDate(next.y, next.q.windowMonth, 16),
  }
}

/**
 * Monthly payout window for signed label artists (YearHeart Records). Funds can
 * be withdrawn any day of the month; the window "closes" on the last day of the
 * current month and reopens on the 1st of the next.
 */
export function getMonthlyWindow(now: Date = new Date()): WithdrawalWindow {
  const { year, month } = bangkokParts(now)
  const lastDay = new Date(year, month, 0).getDate()
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  return {
    frequency: 'monthly',
    isOpen: true,
    activeQuarter: null,
    closesOnISO: isoDate(year, month, lastDay),
    nextQuarter: null,
    nextOpensOnISO: isoDate(nextYear, nextMonth, 1),
    monthLabelFull: THAI_MONTHS[month - 1],
  }
}

/**
 * Roles that are paid monthly rather than on the quarterly cycle.
 */
export function isMonthlyPayoutRole(role: string): boolean {
  return role === 'label_artist'
}

/**
 * Resolve the correct withdrawal window for a given account role.
 */
export function getWithdrawalWindowForRole(
  role: string,
  now: Date = new Date(),
): WithdrawalWindow {
  return isMonthlyPayoutRole(role) ? getMonthlyWindow(now) : getWithdrawalWindow(now)
}
