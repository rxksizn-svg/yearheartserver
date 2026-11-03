/**
 * Support business hours: Monday–Friday, 10:00–22:00 (Asia/Bangkok),
 * excluding Thai public holidays. All checks are computed in the Bangkok
 * timezone so they are correct regardless of the viewer's device timezone.
 */

export const BUSINESS_TZ = 'Asia/Bangkok'
export const BUSINESS_OPEN_HOUR = 10
export const BUSINESS_CLOSE_HOUR = 22
export const BUSINESS_HOURS_LABEL = 'จันทร์–ศุกร์ 10:00–22:00 น.'
export const BUSINESS_HOURS_NOTE = 'ไม่รวมวันหยุดนักขัตฤกษ์'

/**
 * Thai public holidays (YYYY-MM-DD). Update yearly. Dates for lunar/observed
 * holidays are the officially announced calendar days.
 */
export const THAI_PUBLIC_HOLIDAYS: readonly string[] = [
  // 2026 / พ.ศ. 2569
  '2026-01-01', // วันขึ้นปีใหม่
  '2026-03-03', // วันมาฆบูชา
  '2026-04-06', // วันจักรี
  '2026-04-13', // วันสงกรานต์
  '2026-04-14', // วันสงกรานต์
  '2026-04-15', // วันสงกรานต์
  '2026-05-01', // วันแรงงานแห่งชาติ
  '2026-05-04', // วันฉัตรมงคล
  '2026-06-01', // วันวิสาขบูชา (ชดเชย)
  '2026-06-03', // วันเฉลิมพระชนมพรรษาสมเด็จพระราชินี
  '2026-07-28', // วันเฉลิมพระชนมพรรษา ร.10
  '2026-07-29', // วันอาสาฬหบูชา
  '2026-07-30', // วันเข้าพรรษา
  '2026-08-12', // วันแม่แห่งชาติ
  '2026-10-13', // วันคล้ายวันสวรรคต ร.9
  '2026-10-23', // วันปิยมหาราช
  '2026-12-07', // วันชาติ/วันพ่อ (ชดเชย)
  '2026-12-10', // วันรัฐธรรมนูญ
  '2026-12-31', // วันสิ้นปี
  // 2027 / พ.ศ. 2570 (ต้นปี)
  '2027-01-01', // วันขึ้นปีใหม่
]

export type BangkokParts = {
  /** Short weekday in English, e.g. "Mon". */
  weekday: string
  hour: number
  minute: number
  /** Calendar date in Bangkok as YYYY-MM-DD. */
  dateKey: string
}

/** Extract Bangkok-local date/time parts from a Date. */
export function getBangkokParts(date: Date = new Date()): BangkokParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS_TZ,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const map: Record<string, string> = {}
  for (const p of parts) map[p.type] = p.value

  let hour = Number.parseInt(map.hour ?? '0', 10)
  if (hour === 24) hour = 0 // some engines report midnight as 24

  return {
    weekday: map.weekday ?? '',
    hour,
    minute: Number.parseInt(map.minute ?? '0', 10),
    dateKey: `${map.year}-${map.month}-${map.day}`,
  }
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

/** True when the given moment falls within support business hours. */
export function isBusinessOpen(date: Date = new Date()): boolean {
  const { weekday, hour, minute, dateKey } = getBangkokParts(date)
  if (!WEEKDAYS.includes(weekday)) return false
  if (THAI_PUBLIC_HOLIDAYS.includes(dateKey)) return false
  const minutes = hour * 60 + minute
  return minutes >= BUSINESS_OPEN_HOUR * 60 && minutes < BUSINESS_CLOSE_HOUR * 60
}

/** True when the given date (Bangkok) is a listed Thai public holiday. */
export function isThaiHoliday(date: Date = new Date()): boolean {
  return THAI_PUBLIC_HOLIDAYS.includes(getBangkokParts(date).dateKey)
}
