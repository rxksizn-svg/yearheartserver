'use client'

import * as React from 'react'
import * as XLSX from 'xlsx'
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Save,
  X,
} from 'lucide-react'

import { applyUpcUpdates, type UpcUpdateState } from '@/app/actions/upc'
import {
  CodeIndex,
  detectColumns,
  matchUpcRows,
  normalizeText,
  planCreate,
  planUpdate,
  SKIP_LABEL,
  songKey,
  UPC_TEMPLATE_HEADERS,
  type UpcCatalogRelease,
  type UpcMatchResult,
  type UpcPlan,
  type UpcSourceRow,
} from '@/lib/upc-matching'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const NEW = 'new'

/** target: release id, NEW to add as a new release, or null (not chosen yet). include: null = automatic. */
type RowState = { target: string | null; include: boolean | null }
type Filter = 'all' | 'update' | 'create' | 'review' | 'skipped'

const selectClass =
  'border-input bg-background focus-visible:ring-ring h-8 w-full min-w-52 rounded-md border px-2 text-xs focus-visible:outline-none focus-visible:ring-1'

const badge = 'rounded-full px-2 py-0.5 text-xs whitespace-nowrap'

function cellText(value: unknown): string {
  if (typeof value === 'number') return Number.isInteger(value) ? value.toFixed(0) : String(value)
  return String(value ?? '').trim()
}

function trackNo(r: UpcCatalogRelease): string {
  return r.track_no ? `#${String(r.track_no).padStart(5, '0')}` : ''
}

function releaseLabel(r: UpcCatalogRelease): string {
  const album = r.album_name ? ` · ${r.album_name}` : ''
  return `${trackNo(r)} ${r.song_title} — ${r.artist_name}${album}`.trim()
}

function initialState(result: UpcMatchResult): RowState {
  if (result.kind === 'exact' || result.kind === 'fuzzy') return { target: result.candidates[0].id, include: null }
  if (result.kind === 'none') return { target: NEW, include: null }
  return { target: null, include: null }
}

function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    UPC_TEMPLATE_HEADERS,
    ['ชื่อเพลงตัวอย่าง', 'ชื่อศิลปิน', '', '885012345678', 'THA012400001', 'artist@example.com'],
  ])
  ws['!cols'] = [{ wch: 32 }, { wch: 24 }, { wch: 24 }, { wch: 18 }, { wch: 16 }, { wch: 28 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'UPC-ISRC')
  XLSX.writeFile(wb, 'yearheart-upc-isrc-template.xlsx')
}

type ViewRow = {
  result: UpcMatchResult
  state: RowState
  index: number
  target: UpcCatalogRelease | null
  plan: UpcPlan
  included: boolean
  category: Exclude<Filter, 'all'>
}

function CodeCell({ next, current }: { next: string | null; current: string | null | undefined }) {
  if (!next) return <span className="text-muted-foreground">{current || '—'}</span>
  return (
    <div className="flex flex-col">
      <span>{next}</span>
      {current && current !== next && (
        <span className="text-muted-foreground line-through decoration-1">{current}</span>
      )}
    </div>
  )
}

export function UpcUpdater({
  catalog,
  owners,
  accounts,
}: {
  catalog: UpcCatalogRelease[]
  owners: Record<string, string>
  /** Lowercased emails of registered accounts. */
  accounts: string[]
}) {
  const byId = React.useMemo(() => new Map(catalog.map((r) => [r.id, r])), [catalog])
  const accountSet = React.useMemo(() => new Set(accounts), [accounts])
  const [fileName, setFileName] = React.useState('')
  const [results, setResults] = React.useState<UpcMatchResult[]>([])
  const [rowState, setRowState] = React.useState<RowState[]>([])
  const [parseError, setParseError] = React.useState('')
  const [filter, setFilter] = React.useState<Filter>('all')
  const [saving, setSaving] = React.useState(false)
  const [outcome, setOutcome] = React.useState<UpcUpdateState | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  function reset() {
    setFileName('')
    setResults([])
    setRowState([])
    setParseError('')
    setOutcome(null)
    setFilter('all')
    if (inputRef.current) inputRef.current.value = ''
  }

  async function handleFile(file: File) {
    reset()
    setFileName(file.name)
    try {
      const wb = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '', raw: true })
      if (raw.length === 0) {
        setParseError('ไม่พบข้อมูลในไฟล์')
        return
      }
      const columns = detectColumns(Object.keys(raw[0]))
      const missing = [
        !columns.songTitle && 'ชื่อเพลง',
        !columns.artistName && 'ชื่อศิลปิน',
        !columns.rawUpc && !columns.rawIsrc && 'UPC หรือ ISRC',
      ].filter(Boolean)
      if (missing.length > 0) {
        setParseError(`ไม่พบคอลัมน์: ${missing.join(', ')} — ดาวน์โหลดเทมเพลตเพื่อดูรูปแบบที่ถูกต้อง`)
        return
      }

      const read = (r: Record<string, unknown>, col: string | null) => (col ? cellText(r[col]) : '')
      const rows: UpcSourceRow[] = raw
        .map((r, i) => ({
          rowNumber: i + 2,
          songTitle: read(r, columns.songTitle),
          artistName: read(r, columns.artistName),
          albumName: read(r, columns.albumName),
          rawUpc: read(r, columns.rawUpc),
          rawIsrc: read(r, columns.rawIsrc),
          email: read(r, columns.email),
        }))
        .filter((r) => r.songTitle || r.artistName || r.rawUpc || r.rawIsrc)

      const matched = matchUpcRows(rows, catalog)
      setResults(matched)
      setRowState(matched.map(initialState))
    } catch {
      setParseError('ไม่สามารถอ่านไฟล์ได้ กรุณาใช้ไฟล์ .xlsx, .xls หรือ .csv')
    }
  }

  function updateRow(index: number, patch: Partial<RowState>) {
    setOutcome(null)
    setRowState((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  // Rows are planned in file order so the first occurrence wins and later duplicates are skipped.
  const view = React.useMemo<ViewRow[]>(() => {
    const index = new CodeIndex(catalog)
    const usedTargets = new Set<string>()
    const usedSongs = new Set<string>()

    return results.map((result, i) => {
      const state = rowState[i] ?? { target: null, include: null }
      const target = state.target && state.target !== NEW ? byId.get(state.target) ?? null : null
      let plan: UpcPlan

      if (result.kind === 'invalid') plan = { action: 'skip', reason: 'invalid' }
      else if (state.target === NEW) {
        plan = usedSongs.has(songKey(result.songTitle, result.artistName))
          ? { action: 'skip', reason: 'file-duplicate' }
          : planCreate(result, index)
      } else if (!target) plan = { action: 'skip', reason: 'pending' }
      else if (usedTargets.has(target.id)) plan = { action: 'skip', reason: 'file-duplicate' }
      else plan = planUpdate(target, result.upc, result.isrc, index)

      const overwrite = plan.action === 'update' && plan.overwrite
      const included = plan.action !== 'skip' && (state.include ?? !overwrite)

      if (included && plan.action === 'update' && target) {
        usedTargets.add(target.id)
        index.add(target.id, target.song_title, target.artist_name, target.album_name, plan.set.upc_ean_isrc ?? null, plan.set.isrc ?? null)
      } else if (included && plan.action === 'create') {
        usedSongs.add(songKey(result.songTitle, result.artistName))
        index.add(`new-${i}`, result.songTitle, result.artistName, result.albumName || null, result.upc, result.isrc)
      }

      const needsReview =
        result.kind === 'fuzzy' || result.kind === 'ambiguous' || overwrite || (plan.action === 'skip' && plan.reason === 'pending')
      const category: ViewRow['category'] = included
        ? needsReview
          ? 'review'
          : plan.action === 'create'
            ? 'create'
            : 'update'
        : needsReview && plan.action !== 'skip'
          ? 'review'
          : plan.action === 'skip' && plan.reason === 'pending'
            ? 'review'
            : 'skipped'

      return { result, state, index: i, target, plan, included, category }
    })
  }, [results, rowState, byId, catalog])

  const totals = React.useMemo(() => {
    const t = { all: view.length, update: 0, create: 0, review: 0, skipped: 0, saveUpdate: 0, saveCreate: 0 }
    for (const v of view) {
      t[v.category]++
      if (v.included && v.plan.action === 'update') t.saveUpdate++
      if (v.included && v.plan.action === 'create') t.saveCreate++
    }
    return t
  }, [view])
  const toSave = totals.saveUpdate + totals.saveCreate

  const visible = filter === 'all' ? view : view.filter((v) => v.category === filter)

  async function handleSave() {
    const included = view.filter((v) => v.included)
    const ops = included.map((v) =>
      v.plan.action === 'update'
        ? {
            type: 'update' as const,
            id: v.target!.id,
            upc: v.plan.set.upc_ean_isrc ?? null,
            isrc: v.plan.set.isrc ?? null,
          }
        : {
            type: 'create' as const,
            songTitle: v.result.songTitle,
            artistName: v.result.artistName,
            albumName: v.result.albumName,
            email: v.result.email,
            upc: v.result.upc,
            isrc: v.result.isrc,
          },
    )
    if (ops.length === 0) return
    setSaving(true)
    const res = await applyUpcUpdates({ ops })
    setSaving(false)
    setOutcome(res)
    // The refreshed catalog marks saved rows as duplicates; clear manual overrides so they re-plan.
    const done = new Set((res.doneIndexes ?? []).map((opIndex) => included[opIndex]?.index))
    setRowState((prev) => prev.map((s, i) => (done.has(i) ? { ...s, include: null } : s)))
  }

  function exportSkipped() {
    const rows = view
      .filter((v) => !v.included)
      .map((v) => [
        v.result.songTitle,
        v.result.artistName,
        v.result.albumName,
        v.result.rawUpc,
        v.result.rawIsrc,
        v.result.email,
        v.plan.action === 'skip'
          ? v.plan.reason === 'invalid'
            ? v.result.invalidReason ?? SKIP_LABEL.invalid
            : SKIP_LABEL[v.plan.reason]
          : 'ไม่ได้เลือก',
      ])
    const ws = XLSX.utils.aoa_to_sheet([[...UPC_TEMPLATE_HEADERS, 'สถานะ'], ...rows])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Skipped')
    XLSX.writeFile(wb, 'upc-isrc-skipped.xlsx')
  }

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'ทั้งหมด' },
    { key: 'update', label: 'อัพเดท' },
    { key: 'create', label: 'เพิ่มเพลงใหม่' },
    { key: 'review', label: 'ต้องตรวจสอบ' },
    { key: 'skipped', label: 'ข้าม' },
  ]

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-sm leading-relaxed text-pretty">
          คอลัมน์ที่ต้องมี: ชื่อเพลง, ชื่อศิลปิน และ UPC หรือ ISRC (ชื่ออัลบั้มและอีเมลไม่บังคับ) · จับคู่กับผลงานในระบบ{' '}
          {catalog.length.toLocaleString('en-US')} รายการ · เพลงที่ไม่พบจะเพิ่มใหม่อัตโนมัติ · รายการซ้ำจะถูกข้าม ·
          เพลงที่ยังไม่มีเจ้าของจะผูกกับบัญชี Admin และโอนให้อัตโนมัติเมื่อมีการสมัครด้วยอีเมลที่ระบุ
        </p>
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          <Download />
          ดาวน์โหลดเทมเพลต
        </Button>
      </div>

      {results.length === 0 ? (
        <label
          htmlFor="upc-file"
          className="border-border/70 hover:border-primary/50 hover:bg-primary/5 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-12 text-center transition-colors"
        >
          <FileSpreadsheet className="text-primary size-8" aria-hidden />
          <span className="text-sm font-medium">{fileName || 'เลือกไฟล์ UPC / ISRC เพื่ออัปโหลด'}</span>
          <span className="text-muted-foreground text-xs">รองรับ .xlsx, .xls และ .csv</span>
          <input
            ref={inputRef}
            id="upc-file"
            type="file"
            accept=".xlsx,.xls,.csv"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleFile(file)
            }}
          />
        </label>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <FileSpreadsheet className="text-primary size-4 shrink-0" aria-hidden />
            <span className="truncate font-medium">{fileName}</span>
            <button
              type="button"
              onClick={reset}
              className="text-muted-foreground hover:text-foreground rounded p-1"
              aria-label="ล้างไฟล์"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="กรองรายการ">
            {filters.map((f) => (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={filter === f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs transition-colors',
                  filter === f.key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground',
                )}
              >
                {f.label} <span className="tabular-nums opacity-80">{totals[f.key]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {parseError && (
        <p role="alert" className="text-destructive flex items-center gap-2 text-sm">
          <AlertCircle className="size-4 shrink-0" />
          {parseError}
        </p>
      )}

      {results.length > 0 && (
        <>
          <div className="border-border/60 overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[1080px] text-sm">
              <thead className="text-muted-foreground bg-muted/40 text-left text-xs">
                <tr>
                  <th className="w-10 px-3 py-2.5 font-medium">
                    <span className="sr-only">เลือก</span>
                  </th>
                  <th className="px-3 py-2.5 font-medium">แถว</th>
                  <th className="px-3 py-2.5 font-medium">ข้อมูลจากไฟล์</th>
                  <th className="px-3 py-2.5 font-medium">UPC</th>
                  <th className="px-3 py-2.5 font-medium">ISRC</th>
                  <th className="px-3 py-2.5 font-medium">จับคู่กับผลงานในระบบ</th>
                  <th className="px-3 py-2.5 font-medium">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-border/50 divide-y">
                {visible.map(({ result, state, index, target, plan, included }) => {
                  const selectable = plan.action !== 'skip'
                  const showSelect = result.kind === 'fuzzy' || result.kind === 'ambiguous'
                  const emailAccount = result.email && accountSet.has(result.email) ? result.email : null
                  const owner = emailAccount ?? owners[normalizeText(result.artistName)]
                  const ownerLabel = owner
                    ? `เจ้าของ: ${owner}`
                    : result.email
                      ? `ผูกกับ Admin · โอนให้ ${result.email} เมื่อสมัคร`
                      : 'ผูกกับบัญชี Admin'
                  return (
                    <tr key={index} className={cn(!included && 'opacity-70')}>
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={included}
                          disabled={!selectable}
                          onChange={(e) => updateRow(index, { include: e.target.checked })}
                          className="accent-primary size-4"
                          aria-label={`บันทึกแถว ${result.rowNumber}`}
                        />
                      </td>
                      <td className="text-muted-foreground px-3 py-2.5 tabular-nums">{result.rowNumber}</td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium">{result.songTitle || '—'}</div>
                        <div className="text-muted-foreground text-xs">
                          {result.artistName || '—'}
                          {result.albumName ? ` · ${result.albumName}` : ''}
                        </div>
                        {result.email && (
                          <div className="text-muted-foreground text-xs break-all">{result.email}</div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs">
                        {result.rawUpc && !result.upc ? (
                          <span className="text-destructive">{result.rawUpc}</span>
                        ) : (
                          <CodeCell next={result.upc} current={target?.upc_ean_isrc} />
                        )}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs">
                        {result.rawIsrc && !result.isrc ? (
                          <span className="text-destructive">{result.rawIsrc}</span>
                        ) : (
                          <CodeCell next={result.isrc} current={target?.isrc} />
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        {showSelect ? (
                          <select
                            className={selectClass}
                            value={state.target ?? ''}
                            aria-label={`เลือกผลงานสำหรับแถว ${result.rowNumber}`}
                            onChange={(e) => updateRow(index, { target: e.target.value || null, include: null })}
                          >
                            <option value="">— เลือกผลงาน ({result.candidates.length}) —</option>
                            {result.candidates.map((c) => (
                              <option key={c.id} value={c.id}>
                                {releaseLabel(c)}
                              </option>
                            ))}
                            <option value={NEW}>+ เพิ่มเป็นเพลงใหม่</option>
                          </select>
                        ) : target ? (
                          <div>
                            <div className="font-medium">{target.song_title}</div>
                            <div className="text-muted-foreground text-xs">
                              {target.artist_name}
                              {target.track_no ? ` · ${trackNo(target)}` : ''}
                            </div>
                          </div>
                        ) : state.target === NEW && result.kind !== 'invalid' ? (
                          <div>
                            <div className="text-primary text-xs font-medium">เพลงใหม่</div>
                            <div className="text-muted-foreground text-xs break-all">{ownerLabel}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {plan.action === 'update' && (
                            <span className={cn(badge, 'bg-primary/15 text-primary')}>
                              {result.kind === 'fuzzy' ? 'อัพเดท (ใกล้เคียง)' : 'อัพเดท'}
                            </span>
                          )}
                          {plan.action === 'update' && plan.overwrite && (
                            <span className={cn(badge, 'bg-chart-4/15 text-chart-4')}>เขียนทับรหัสเดิม</span>
                          )}
                          {plan.action === 'create' && (
                            <span className={cn(badge, 'bg-primary/15 text-primary')}>เพิ่มเพลงใหม่</span>
                          )}
                          {plan.action === 'skip' && (
                            <span
                              className={cn(
                                badge,
                                plan.reason === 'invalid'
                                  ? 'bg-destructive/15 text-destructive'
                                  : plan.reason === 'pending'
                                    ? 'bg-chart-4/15 text-chart-4'
                                    : 'bg-muted text-muted-foreground',
                              )}
                            >
                              {plan.reason === 'invalid'
                                ? result.invalidReason ?? SKIP_LABEL.invalid
                                : SKIP_LABEL[plan.reason]}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {visible.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-muted-foreground px-3 py-10 text-center text-sm">
                      ไม่มีรายการในหมวดนี้
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm" aria-live="polite">
              {outcome ? (
                <span
                  className={cn(
                    'flex items-center gap-2',
                    outcome.status === 'success' ? 'text-primary' : 'text-destructive',
                  )}
                >
                  {outcome.status === 'success' ? <CheckCircle2 className="size-4" /> : <AlertCircle className="size-4" />}
                  {outcome.message}
                </span>
              ) : (
                <span className="text-muted-foreground">
                  อัพเดท {totals.saveUpdate.toLocaleString('en-US')} · เพิ่มใหม่{' '}
                  {totals.saveCreate.toLocaleString('en-US')} · ข้าม {totals.skipped.toLocaleString('en-US')}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportSkipped} disabled={view.length === toSave}>
                <Download />
                ส่งออกรายการที่ข้าม
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving || toSave === 0}>
                {saving ? <Loader2 className="animate-spin" /> : <Save />}
                บันทึก ({toSave})
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
