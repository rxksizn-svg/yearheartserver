/**
 * Shared column-mapping engine for royalty statement imports (module 6).
 * Maps varied spreadsheet header names (Thai / English / ADA-style) onto the
 * canonical royalty_line_items shape. Safe to run on the client for preview
 * and re-validated on the server before insert.
 */

export type CanonicalField =
  | 'dsp'
  | 'isrc'
  | 'catalogue_title'
  | 'revenue_type_desc'
  | 'sales'
  | 'revenue_thb'
  | 'period'
  | 'artist_name'
  | 'country'
  | 'gross_income_thb'
  | 'net_income_thb'

export type ParsedRow = {
  dsp: string
  isrc: string
  catalogue_title: string
  revenue_type_desc: string
  sales: number
  revenue_thb: number
  period: string | null
  artist_name: string | null
  country: string | null
  gross_income_thb: number | null
  net_income_thb: number | null
}

/** Canonical template headers, in order, used for the downloadable template. */
export const TEMPLATE_HEADERS: { key: CanonicalField; label: string }[] = [
  { key: 'dsp', label: 'DSP / แพลตฟอร์ม' },
  { key: 'catalogue_title', label: 'ชื่อเพลง' },
  { key: 'isrc', label: 'ISRC' },
  { key: 'artist_name', label: 'ชื่อศิลปิน' },
  { key: 'revenue_type_desc', label: 'ประเภทรายได้' },
  { key: 'country', label: 'ประเทศ' },
  { key: 'sales', label: 'ยอดสตรีม/ยอดขาย' },
  { key: 'gross_income_thb', label: 'รายได้รวม (บาท)' },
  { key: 'net_income_thb', label: 'รายได้สุทธิ (บาท)' },
  { key: 'revenue_thb', label: 'รายได้ที่จ่าย (บาท)' },
  { key: 'period', label: 'งวด (YYYY-MM)' },
]

/** Header aliases → canonical field. Keys are normalized (lowercased, trimmed). */
const HEADER_ALIASES: Record<string, CanonicalField> = {
  // dsp
  dsp: 'dsp',
  'dsp / แพลตฟอร์ม': 'dsp',
  แพลตฟอร์ม: 'dsp',
  platform: 'dsp',
  store: 'dsp',
  retailer: 'dsp',
  'sales channel': 'dsp',
  channel: 'dsp',
  // title
  catalogue_title: 'catalogue_title',
  'catalog title': 'catalogue_title',
  'catalogue title': 'catalogue_title',
  ชื่อเพลง: 'catalogue_title',
  title: 'catalogue_title',
  'track title': 'catalogue_title',
  'song title': 'catalogue_title',
  'release title': 'catalogue_title',
  // isrc
  isrc: 'isrc',
  'isrc code': 'isrc',
  // artist
  artist_name: 'artist_name',
  ชื่อศิลปิน: 'artist_name',
  artist: 'artist_name',
  'artist name': 'artist_name',
  'primary artist': 'artist_name',
  // revenue type
  revenue_type_desc: 'revenue_type_desc',
  ประเภทรายได้: 'revenue_type_desc',
  'revenue type': 'revenue_type_desc',
  'revenue type description': 'revenue_type_desc',
  'sale type': 'revenue_type_desc',
  type: 'revenue_type_desc',
  // country
  country: 'country',
  ประเทศ: 'country',
  territory: 'country',
  region: 'country',
  // sales / units
  sales: 'sales',
  'ยอดสตรีม/ยอดขาย': 'sales',
  ยอดสตรีม: 'sales',
  ยอดขาย: 'sales',
  units: 'sales',
  quantity: 'sales',
  streams: 'sales',
  qty: 'sales',
  // gross
  gross_income_thb: 'gross_income_thb',
  'รายได้รวม (บาท)': 'gross_income_thb',
  รายได้รวม: 'gross_income_thb',
  gross: 'gross_income_thb',
  'gross income': 'gross_income_thb',
  'gross revenue': 'gross_income_thb',
  // net
  net_income_thb: 'net_income_thb',
  'รายได้สุทธิ (บาท)': 'net_income_thb',
  รายได้สุทธิ: 'net_income_thb',
  net: 'net_income_thb',
  'net income': 'net_income_thb',
  // payable revenue (what we credit)
  revenue_thb: 'revenue_thb',
  'รายได้ที่จ่าย (บาท)': 'revenue_thb',
  รายได้ที่จ่าย: 'revenue_thb',
  'รายได้ (บาท)': 'revenue_thb',
  รายได้: 'revenue_thb',
  payable: 'revenue_thb',
  'payable amount': 'revenue_thb',
  earnings: 'revenue_thb',
  amount: 'revenue_thb',
  // period
  period: 'period',
  'งวด (yyyy-mm)': 'period',
  งวด: 'period',
  month: 'period',
  'reporting period': 'period',
  'accounting period': 'period',
}

export function mapHeader(raw: string): CanonicalField | null {
  const key = raw.toLowerCase().trim()
  return HEADER_ALIASES[key] ?? null
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : Number.NaN
  const cleaned = String(value ?? '')
    .replace(/[,฿$\s]/g, '')
    .trim()
  if (cleaned === '') return 0
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : Number.NaN
}

/** Normalize a period cell into YYYY-MM, tolerating Excel dates and common formats. */
function normalizePeriod(value: unknown): string | null {
  if (value == null || value === '') return null
  // Excel may hand us a Date object.
  if (value instanceof Date) {
    const y = value.getFullYear()
    const m = String(value.getMonth() + 1).padStart(2, '0')
    return `${y}-${m}`
  }
  const s = String(value).trim()
  const isoMatch = s.match(/(\d{4})[-/](\d{1,2})/)
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}`
  }
  const monthYear = s.match(/(\d{1,2})[-/](\d{4})/)
  if (monthYear) {
    return `${monthYear[2]}-${monthYear[1].padStart(2, '0')}`
  }
  return s
}

export type NormalizeResult = {
  rows: ParsedRow[]
  errors: string[]
  mappedFields: CanonicalField[]
  unmappedHeaders: string[]
}

/**
 * Given raw rows keyed by their original headers, remap onto canonical fields
 * and validate. Returns valid rows plus human-readable errors for the preview.
 */
export function normalizeRows(rawRows: Record<string, unknown>[]): NormalizeResult {
  const errors: string[] = []
  const rows: ParsedRow[] = []

  if (rawRows.length === 0) {
    return { rows, errors: ['ไม่พบข้อมูลในไฟล์'], mappedFields: [], unmappedHeaders: [] }
  }

  const headers = Object.keys(rawRows[0])
  const headerMap = new Map<string, CanonicalField>()
  const unmappedHeaders: string[] = []
  for (const h of headers) {
    const field = mapHeader(h)
    if (field) headerMap.set(h, field)
    else if (h.trim()) unmappedHeaders.push(h)
  }

  const mappedFields = Array.from(new Set(headerMap.values()))
  const required: CanonicalField[] = ['dsp', 'catalogue_title', 'sales']
  const missing = required.filter((f) => !mappedFields.includes(f))
  if (missing.length > 0) {
    const labelMap: Record<string, string> = {
      dsp: 'DSP',
      catalogue_title: 'ชื่อเพลง',
      sales: 'ยอดสตรีม/ยอดขาย',
    }
    errors.push(
      `ไม่พบคอลัมน์ที่จำเป็น: ${missing.map((m) => labelMap[m] ?? m).join(', ')}`,
    )
  }
  if (!mappedFields.includes('revenue_thb') && !mappedFields.includes('net_income_thb')) {
    errors.push('ต้องมีคอลัมน์รายได้ที่จ่าย หรือ รายได้สุทธิ อย่างน้อยหนึ่งคอลัมน์')
  }
  if (errors.length > 0) return { rows, errors, mappedFields, unmappedHeaders }

  rawRows.forEach((raw, i) => {
    const rowNo = i + 2 // account for header row in the sheet
    const get = (field: CanonicalField): unknown => {
      for (const [h, f] of headerMap) if (f === field) return raw[h]
      return undefined
    }

    const dsp = String(get('dsp') ?? '').trim()
    const title = String(get('catalogue_title') ?? '').trim()
    if (!dsp && !title) return // skip fully blank rows silently

    const sales = toNumber(get('sales'))
    const net = mappedFields.includes('net_income_thb') ? toNumber(get('net_income_thb')) : Number.NaN
    const gross = mappedFields.includes('gross_income_thb') ? toNumber(get('gross_income_thb')) : Number.NaN
    const payableRaw = mappedFields.includes('revenue_thb') ? toNumber(get('revenue_thb')) : Number.NaN
    const revenue = Number.isFinite(payableRaw) ? payableRaw : net

    if (!dsp || !title) {
      errors.push(`แถวที่ ${rowNo}: DSP และชื่อเพลงห้ามว่าง`)
      return
    }
    if (!Number.isFinite(sales) || !Number.isFinite(revenue)) {
      errors.push(`แถวที่ ${rowNo}: ยอดสตรีมหรือรายได้ไม่ถูกต้อง`)
      return
    }

    rows.push({
      dsp,
      isrc: String(get('isrc') ?? '').trim(),
      catalogue_title: title,
      revenue_type_desc: String(get('revenue_type_desc') ?? '').trim() || 'Stream Revenue',
      sales: Math.max(0, Math.round(sales)),
      revenue_thb: Math.round(revenue * 100) / 100,
      period: normalizePeriod(get('period')),
      artist_name: String(get('artist_name') ?? '').trim() || null,
      country: String(get('country') ?? '').trim() || null,
      gross_income_thb: Number.isFinite(gross) ? Math.round(gross * 100) / 100 : null,
      net_income_thb: Number.isFinite(net) ? Math.round(net * 100) / 100 : null,
    })
  })

  return { rows, errors, mappedFields, unmappedHeaders }
}
