'use client'

import * as React from 'react'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import * as XLSX from 'xlsx'
import {
  Download,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react'

import { importRoyaltyRows, type ActionState } from '@/app/actions/admin'
import {
  normalizeRows,
  TEMPLATE_HEADERS,
  type ParsedRow,
} from '@/lib/royalty-import'
import type { ArtistOption } from '@/components/admin/import-panel'
import { formatTHB, formatNumber, formatPeriod } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

const initial: ActionState = { status: 'idle' }

const selectClass =
  'border-input bg-background focus-visible:ring-ring h-9 rounded-md border px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1'

function downloadTemplate() {
  const headerRow = TEMPLATE_HEADERS.map((h) => h.label)
  const example = [
    'Spotify',
    'Golden Hour',
    'THA012400001',
    'มิรา',
    'Stream Revenue',
    'ไทย',
    184203,
    72190.5,
    64821.45,
    64821.45,
    '2025-06',
  ]
  const ws = XLSX.utils.aoa_to_sheet([headerRow, example])
  ws['!cols'] = headerRow.map(() => ({ wch: 18 }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Royalties')
  XLSX.writeFile(wb, 'yearheart-royalty-template.xlsx')
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={disabled || pending}>
      {pending ? <Loader2 className="animate-spin" /> : <Upload />}
      นำเข้าข้อมูล
    </Button>
  )
}

export function XlsxImport({ artists }: { artists: ArtistOption[] }) {
  const [state, action] = useActionState(importRoyaltyRows, initial)
  const [fileName, setFileName] = React.useState('')
  const [rows, setRows] = React.useState<ParsedRow[]>([])
  const [errors, setErrors] = React.useState<string[]>([])
  const [parsing, setParsing] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const reset = React.useCallback(() => {
    setFileName('')
    setRows([])
    setErrors([])
    if (inputRef.current) inputRef.current.value = ''
  }, [])

  async function handleFile(file: File) {
    setParsing(true)
    setErrors([])
    setRows([])
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(new Uint8Array(buf), { type: 'array', cellDates: true })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
        defval: '',
        raw: true,
      })
      const result = normalizeRows(raw)
      setRows(result.rows)
      setErrors(result.errors)
      setFileName(file.name)
    } catch {
      setErrors(['ไม่สามารถอ่านไฟล์ได้ กรุณาตรวจสอบรูปแบบไฟล์ (.xlsx หรือ .csv)'])
      setFileName(file.name)
    } finally {
      setParsing(false)
    }
  }

  const totalRevenue = rows.reduce((s, r) => s + r.revenue_thb, 0)
  const canSubmit = rows.length > 0 && errors.length === 0

  // Clear the staged file once the import succeeds.
  React.useEffect(() => {
    if (state.status === 'success') reset()
  }, [state.status, reset])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          อัปโหลดรายงานรายได้ (.xlsx / .csv) ระบบจะจับคู่คอลัมน์ให้อัตโนมัติ
        </p>
        <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
          <Download />
          ดาวน์โหลดเทมเพลต
        </Button>
      </div>

      <label
        htmlFor="xlsx-file"
        className="border-input hover:bg-muted/40 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center transition-colors"
      >
        <FileSpreadsheet className="text-muted-foreground size-7" />
        <span className="text-sm font-medium">
          คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่
        </span>
        <span className="text-muted-foreground text-xs">
          รองรับ .xlsx, .xls และ .csv
        </span>
        <input
          ref={inputRef}
          id="xlsx-file"
          type="file"
          accept=".xlsx,.xls,.csv"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />
      </label>

      {parsing && (
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="size-4 animate-spin" /> กำลังอ่านไฟล์...
        </p>
      )}

      {fileName && !parsing && (
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="flex items-center gap-2 truncate">
            <FileSpreadsheet className="text-muted-foreground size-4 shrink-0" />
            <span className="truncate">{fileName}</span>
          </span>
          <button
            type="button"
            onClick={reset}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
          >
            <X className="size-3.5" /> ล้าง
          </button>
        </div>
      )}

      {errors.length > 0 && (
        <div className="border-destructive/30 bg-destructive/10 text-destructive flex flex-col gap-1 rounded-lg border px-3 py-2.5 text-sm">
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle className="size-4" /> พบข้อผิดพลาด
          </div>
          <ul className="ml-6 list-disc space-y-0.5 text-xs">
            {errors.slice(0, 6).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
            {errors.length > 6 && <li>และอีก {errors.length - 6} รายการ</li>}
          </ul>
        </div>
      )}

      {rows.length > 0 && errors.length === 0 && (
        <div className="flex flex-col gap-3">
          <div className="border-success/30 bg-success/10 text-success flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm">
            <CheckCircle2 className="size-4" />
            พร้อมนำเข้า {formatNumber(rows.length)} รายการ · รวม {formatTHB(totalRevenue)}
          </div>
          <div className="border-border overflow-hidden rounded-lg border">
            <div className="max-h-64 overflow-auto">
              <table className="w-full min-w-[560px] text-xs">
                <thead className="bg-muted/60 text-muted-foreground sticky top-0">
                  <tr className="text-left">
                    <th className="px-3 py-2 font-medium">DSP</th>
                    <th className="px-3 py-2 font-medium">ชื่อเพลง</th>
                    <th className="px-3 py-2 text-right font-medium">ยอดสตรีม</th>
                    <th className="px-3 py-2 text-right font-medium">รายได้</th>
                    <th className="px-3 py-2 font-medium">งวด</th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {rows.slice(0, 50).map((r, i) => (
                    <tr key={i}>
                      <td className="px-3 py-1.5">{r.dsp}</td>
                      <td className="max-w-[160px] truncate px-3 py-1.5">
                        {r.catalogue_title}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums">
                        {formatNumber(r.sales)}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums">
                        {formatTHB(r.revenue_thb)}
                      </td>
                      <td className="px-3 py-1.5">{formatPeriod(r.period)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > 50 && (
              <p className="text-muted-foreground bg-muted/30 px-3 py-1.5 text-center text-xs">
                แสดง 50 จาก {formatNumber(rows.length)} รายการ
              </p>
            )}
          </div>
        </div>
      )}

      {state.status !== 'idle' && state.message && (
        <div
          role="status"
          className={
            state.status === 'success'
              ? 'border-success/30 bg-success/10 text-success flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm'
              : 'border-destructive/30 bg-destructive/10 text-destructive flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm'
          }
        >
          {state.status === 'success' ? (
            <CheckCircle2 className="size-4" />
          ) : (
            <AlertCircle className="size-4" />
          )}
          {state.message}
        </div>
      )}

      <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="xlsx-userId">ผูกกับศิลปิน / ค่ายเพลง</Label>
          <select
            id="xlsx-userId"
            name="userId"
            required
            defaultValue=""
            className={selectClass}
          >
            <option value="" disabled>
              เลือกบัญชีผู้รับรายได้
            </option>
            {artists.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
        <input type="hidden" name="rows" value={JSON.stringify(rows)} />
        <SubmitButton disabled={!canSubmit} />
      </form>
    </div>
  )
}
