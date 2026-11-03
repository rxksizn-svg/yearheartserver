import path from 'node:path'
import { readFileSync } from 'node:fs'
import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text as PdfText,
  View,
  renderToBuffer,
} from '@react-pdf/renderer'
import { Children, type ComponentProps } from 'react'

import { WHT_RATE } from '@/lib/withdrawal-calc'

// Force Latin (Arabic) digits so the document never falls back to Thai numerals.
const AMOUNT = new Intl.NumberFormat('th-TH-u-nu-latn', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const DATE = new Intl.DateTimeFormat('th-TH-u-nu-latn', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

function formatTHB(value: number): string {
  return AMOUNT.format(value)
}

function formatThaiDate(iso: string | null): string {
  return iso ? DATE.format(new Date(iso)) : '-'
}

export const COMPANY = {
  name: 'บริษัท เยียร์ฮาร์ท เอนเตอร์เทนเม้นท์ จำกัด',
  taxId: '0505567011186',
  address:
    'เลขที่ 55 อาคาร 1 ชั้น 1 หมู่ที่ 2 ซอย 1 อำเภอเชียงดาว จังหวัดเชียงใหม่ 50170',
  phone: '02-1147169',
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'รอดำเนินการ',
  processing: 'กำลังโอน',
  paid: 'จ่ายแล้ว',
  rejected: 'ปฏิเสธ',
}

export type WithdrawalDocumentData = {
  id: string
  status: string
  requestedAt: string
  processedAt: string | null
  paymentReference: string | null
  rejectReason: string | null
  gross: number
  wht: number
  fee: number
  net: number
  customer: {
    fullName: string
    email: string
    phone: string
    address: string
    nationalId: string
    artistName: string
  }
  bank: { name: string; accountNumber: string; accountName: string }
}

const fontDir = path.join(process.cwd(), 'assets', 'fonts')
Font.register({
  family: 'Sarabun',
  fonts: [
    { src: path.join(fontDir, 'Sarabun-Regular.ttf') },
    { src: path.join(fontDir, 'Sarabun-Bold.ttf'), fontWeight: 'bold' },
  ],
})

// Thai has no spaces between words, so react-pdf can't find line breaks on its
// own. Split Thai runs into dictionary words as hyphenation points; react-pdf
// only inserts a visible hyphen when the part ends in a Latin letter.
const segmenter = new Intl.Segmenter('th', { granularity: 'word' })
Font.registerHyphenationCallback((word) =>
  false && /[\u0E00-\u0E7F]/.test(word)
    ? Array.from(segmenter.segment(word), (s) => s.segment)
    : [word],
)

// react-pdf drops one trailing character per SARA AM (U+0E33) on a line because
// the font shapes it into two glyphs. Its canonical NIKHAHIT + SARA AA pair
// renders identically and keeps glyph and character counts aligned.
function fixThai(node: unknown): unknown {
  return typeof node === 'string' ? node.replace(/\u0E33/g, '\u0E4D\u0E32') : node
}

type TextProps = {
  children?: React.ReactNode
  style?: ComponentProps<typeof View>['style']
  fixed?: boolean
}

function Text({ children, style, fixed }: TextProps) {
  return (
    <PdfText style={style} fixed={fixed}>
      {Children.map(children, (child) => fixThai(child) as React.ReactNode)}
    </PdfText>
  )
}

const logo = readFileSync(path.join(process.cwd(), 'public', 'yearheart-logo.png'))

const BLUE = '#1d4ed8'
const INK = '#0f172a'
const MUTED = '#64748b'
const LINE = '#e2e8f0'

const s = StyleSheet.create({
  page: {
    fontFamily: 'Sarabun',
    fontSize: 10,
    color: INK,
    paddingTop: 36,
    paddingBottom: 56,
    paddingHorizontal: 40,
    lineHeight: 1.45,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: BLUE,
  },
  logoTile: {
    backgroundColor: BLUE,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  logo: { width: 130, height: 40, objectFit: 'contain' },
  company: { width: 300, alignItems: 'flex-end' },
  companyName: { fontSize: 12, fontWeight: 'bold' },
  companyLine: { fontSize: 9, color: MUTED, textAlign: 'right' },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 18,
    marginBottom: 14,
  },
  title: { fontSize: 16, fontWeight: 'bold', color: BLUE, lineHeight: 1.6, marginBottom: 2 },
  subtitle: { fontSize: 9, color: MUTED },
  meta: { alignItems: 'flex-end' },
  metaLine: { fontSize: 9 },
  status: {
    marginTop: 2,
    color: BLUE,
    fontSize: 9,
    fontWeight: 'bold',
  },
  columns: { flexDirection: 'row', gap: 24 },
  box: { flex: 1 },
  boxTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: BLUE,
    paddingBottom: 4,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: BLUE,
  },
  field: { flexDirection: 'row', marginBottom: 3 },
  label: { width: 88, color: MUTED, fontSize: 9 },
  value: { flex: 1, fontSize: 9.5 },
  table: { marginTop: 18 },
  th: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 2,
    borderTopWidth: 1.5,
    borderTopColor: BLUE,
    borderBottomWidth: 1,
    borderBottomColor: BLUE,
  },
  thText: { fontWeight: 'bold', fontSize: 9.5, color: BLUE },
  tr: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 2,
    borderBottomWidth: 0.75,
    borderBottomColor: LINE,
  },
  cellDesc: { flex: 1 },
  cellAmount: { width: 120, textAlign: 'right' },
  total: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 2,
    color: BLUE,
    borderTopWidth: 1,
    borderTopColor: BLUE,
    borderBottomWidth: 2.5,
    borderBottomColor: BLUE,
  },
  totalText: { fontWeight: 'bold', fontSize: 11 },
  notes: { marginTop: 14, fontSize: 9, color: MUTED },
  signRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 40,
  },
  sign: { width: 200, alignItems: 'center' },
  signLine: {
    width: 180,
    borderBottomWidth: 1,
    borderBottomColor: MUTED,
    marginBottom: 4,
    height: 24,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 8,
    color: MUTED,
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: LINE,
    paddingTop: 6,
  },
})

export function documentNumber(id: string, requestedAt: string): string {
  const d = new Date(requestedAt)
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  return `WD-${ymd}-${id.slice(0, 8).toUpperCase()}`
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.value}>{value || '-'}</Text>
    </View>
  )
}

function Row({ desc, amount }: { desc: string; amount: string }) {
  return (
    <View style={s.tr}>
      <Text style={s.cellDesc}>{desc}</Text>
      <Text style={s.cellAmount}>{amount}</Text>
    </View>
  )
}

function WithdrawalDocument({ data }: { data: WithdrawalDocumentData }) {
  const docNo = documentNumber(data.id, data.requestedAt)
  const taxable = data.wht > 0
  return (
    <Document
      title={`ใบแจ้งรายละเอียดการถอนเงิน ${docNo}`}
      author={COMPANY.name}
      language="th"
    >
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt prop */}
          <View style={s.logoTile}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt prop */}
            <Image src={{ data: logo, format: 'png' }} style={s.logo} />
          </View>
          <View style={s.company}>
            <Text style={s.companyName}>{COMPANY.name}</Text>
            <Text style={s.companyLine}>{COMPANY.address}</Text>
            <Text style={s.companyLine}>
              เลขประจำตัวผู้เสียภาษี {COMPANY.taxId} · โทร {COMPANY.phone}
            </Text>
          </View>
        </View>

        <View style={s.titleRow}>
          <View>
            <Text style={s.title}>ใบแจ้งรายละเอียดการถอนเงิน</Text>
            <Text style={s.subtitle}>Withdrawal Statement</Text>
          </View>
          <View style={s.meta}>
            <Text style={s.metaLine}>เลขที่เอกสาร: {docNo}</Text>
            <Text style={s.metaLine}>
              วันที่ออกเอกสาร: {formatThaiDate(new Date().toISOString())}
            </Text>
            <Text style={s.status}>
              สถานะ: {STATUS_LABEL[data.status] ?? data.status}
            </Text>
          </View>
        </View>

        <View style={s.columns}>
          <View style={s.box}>
            <Text style={s.boxTitle}>ข้อมูลผู้รับเงิน</Text>
            <Field label="ชื่อ-นามสกุล" value={data.customer.fullName} />
            {data.customer.artistName ? (
              <Field label="ชื่อศิลปิน/ค่าย" value={data.customer.artistName} />
            ) : null}
            <Field label="อีเมล" value={data.customer.email} />
            <Field label="เบอร์โทรศัพท์" value={data.customer.phone} />
            <Field label="เลขผู้เสียภาษี" value={data.customer.nationalId} />
            <Field label="ที่อยู่" value={data.customer.address} />
          </View>
          <View style={s.box}>
            <Text style={s.boxTitle}>บัญชีรับเงิน</Text>
            <Field label="ธนาคาร" value={data.bank.name} />
            <Field label="เลขที่บัญชี" value={data.bank.accountNumber} />
            <Field label="ชื่อบัญชี" value={data.bank.accountName} />
            <Text style={[s.boxTitle, { marginTop: 8 }]}>รายละเอียดคำขอ</Text>
            <Field label="วันที่ขอถอน" value={formatThaiDate(data.requestedAt)} />
            <Field
              label="วันที่ดำเนินการ"
              value={data.processedAt ? formatThaiDate(data.processedAt) : ''}
            />
            <Field label="เลขอ้างอิงการโอน" value={data.paymentReference ?? ''} />
          </View>
        </View>

        <View style={s.table}>
          <View style={s.th}>
            <Text style={[s.cellDesc, s.thText]}>รายการ</Text>
            <Text style={[s.cellAmount, s.thText]}>จำนวนเงิน (บาท)</Text>
          </View>
          <Row desc="ยอดเงินที่ขอถอน" amount={formatTHB(data.gross)} />
          <Row
            desc={`หัก ภาษีหัก ณ ที่จ่าย ${Math.round(WHT_RATE * 100)}%${taxable ? '' : ' (ไม่ถึงเกณฑ์)'}`}
            amount={taxable ? `- ${formatTHB(data.wht)}` : formatTHB(0)}
          />
          <Row desc="หัก ค่าธรรมเนียมการถอน" amount={`- ${formatTHB(data.fee)}`} />
          <View style={s.total}>
            <Text style={[s.cellDesc, s.totalText]}>ยอดโอนสุทธิ</Text>
            <Text style={[s.cellAmount, s.totalText]}>{formatTHB(data.net)}</Text>
          </View>
        </View>

        {data.status === 'rejected' && data.rejectReason ? (
          <Text style={[s.notes, { color: '#b91c1c' }]}>
            เหตุผลที่ปฏิเสธ: {data.rejectReason}
          </Text>
        ) : null}
        <Text style={s.notes}>
          หมายเหตุ: ยอดโอนสุทธิคำนวณจากยอดที่ขอถอน หักภาษีหัก ณ ที่จ่ายตามกฎหมาย
          และค่าธรรมเนียมการถอน หากข้อมูลไม่ถูกต้องกรุณาติดต่อ {COMPANY.phone}
        </Text>

        <View style={s.signRow}>
          <View style={s.sign}>
            <View style={s.signLine} />
            <Text style={s.subtitle}>ผู้รับเงิน</Text>
          </View>
          <View style={s.sign}>
            <View style={s.signLine} />
            <Text style={s.subtitle}>ผู้มีอำนาจลงนาม {COMPANY.name}</Text>
          </View>
        </View>

        <Text style={s.footer} fixed>
          {COMPANY.name} · {docNo} · เอกสารนี้ออกโดยระบบ Yearheart Artist Portal
        </Text>
      </Page>
    </Document>
  )
}

export function renderWithdrawalPdf(data: WithdrawalDocumentData) {
  return renderToBuffer(<WithdrawalDocument data={data} />)
}
