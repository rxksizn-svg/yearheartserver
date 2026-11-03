const THB = new Intl.NumberFormat('th-TH', {
  style: 'currency',
  currency: 'THB',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const THB_COMPACT = new Intl.NumberFormat('th-TH', {
  style: 'currency',
  currency: 'THB',
  notation: 'compact',
  maximumFractionDigits: 1,
})

const NUM = new Intl.NumberFormat('th-TH')

const NUM_COMPACT = new Intl.NumberFormat('th-TH', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

/** Format a THB amount, e.g. ฿1,234.50 */
export function formatTHB(value: number): string {
  return THB.format(value)
}

/** Compact THB amount for tight spaces, e.g. ฿1.2M */
export function formatTHBCompact(value: number): string {
  return THB_COMPACT.format(value)
}

/** Format an integer count with Thai grouping, e.g. 1,234,567 */
export function formatNumber(value: number): string {
  return NUM.format(value)
}

/** Compact count, e.g. 1.2M */
export function formatNumberCompact(value: number): string {
  return NUM_COMPACT.format(value)
}

/** Format a running track number as a zero-padded ID, e.g. 1 -> "00001" */
export function formatTrackNo(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-'
  return String(value).padStart(5, '0')
}

/** Format an ISO date string in Thai Buddhist-era style, e.g. 16 ก.ย. 2569 */
export function formatThaiDate(iso: string | null): string {
  if (!iso) return '-'
  return new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso))
}

/** Format an ISO timestamp as Thai date + time, e.g. 16 ก.ย. 2569 14:05 น. */
export function formatThaiDateTime(iso: string | null): string {
  if (!iso) return '-'
  const d = new Date(iso)
  const date = new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d)
  const time = new Intl.DateTimeFormat('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
  return `${date} ${time} น.`
}

/** Format an ISO timestamp as Thai time only, e.g. 14:05 น. */
export function formatThaiTime(iso: string): string {
  const time = new Intl.DateTimeFormat('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
  return `${time} น.`
}

/** Format a YYYY-MM period string into a Thai month label, e.g. มิ.ย. 2568 */
export function formatPeriod(period: string | null): string {
  if (!period) return '-'
  const [year, month] = period.split('-').map(Number)
  if (!year || !month) return period
  return new Intl.DateTimeFormat('th-TH', {
    month: 'short',
    year: 'numeric',
  }).format(new Date(year, month - 1, 1))
}
