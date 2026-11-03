'use client'

import * as React from 'react'
import {
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Download,
  Upload,
  DatabaseZap,
  Pencil,
  Sparkles,
} from 'lucide-react'

import {
  upsertReleasesBulk,
  deleteAllReleases,
  type CatalogUpdateState,
} from '@/app/actions/releases'
import type { ReleaseWithProfile } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'

export type EmailOption = { email: string; name: string | null }

// CSV template columns — order matters and header names must match on import.
// `id` drives the overlay: filled => update that release, blank => create new.
const CSV_COLUMNS = [
  'id',
  'submitter_email',
  'submitter_name',
  'submitter_phone',
  'song_title',
  'artist_name',
  'track_type',
  'album_name',
  'composer',
  'producer',
  'genre',
  'upc_ean_isrc',
  'isrc',
  'is_explicit',
  'is_ai_generated',
  'cover_url',
  'audio_url',
] as const

const CSV_SAMPLE_ROW = [
  '',
  'artist@email.com',
  'ชื่อผู้ส่ง',
  '0812345678',
  'ชื่อเพลงตัวอย่าง',
  'ชื่อศิลปิน',
  'Single',
  '',
  'ชื่อผู้แต่ง/ผู้ประพันธ์',
  'ชื่อ Producer',
  'Pop',
  '',
  'no',
  'no',
  'https://drive.google.com/...',
  'https://drive.google.com/...',
]

/** Serialize a single CSV cell, quoting when it contains a comma, quote, or newline. */
function csvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/** Minimal RFC-4180 CSV parser: handles quoted fields, escaped quotes, CRLF. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (char !== '\r') {
      field += char
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows
}

type Row = {
  key: string
  /** Existing release id when editing; empty for a new row. */
  id: string
  submitter_email: string
  submitter_name: string
  submitter_phone: string
  song_title: string
  artist_name: string
  track_type: 'Single' | 'EP' | 'Album'
  album_name: string
  composer: string
  producer: string
  genre: string
  upc_ean_isrc: string
  isrc: string
  is_explicit: boolean
  is_ai_generated: boolean
  cover_url: string
  audio_url: string
}

const selectClass =
  'border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-lg border px-2 text-sm shadow-sm outline-none focus-visible:ring-[3px] dark:bg-input/30'

function emptyRow(): Row {
  return {
    key: crypto.randomUUID(),
    id: '',
    submitter_email: '',
    submitter_name: '',
    submitter_phone: '',
    song_title: '',
    artist_name: '',
    track_type: 'Single',
    album_name: '',
    composer: '',
    producer: '',
    genre: '',
    upc_ean_isrc: '',
    isrc: '',
    is_explicit: false,
    is_ai_generated: false,
    cover_url: '',
    audio_url: '',
  }
}

function normalizeType(v: string): Row['track_type'] {
  const t = v.trim().toLowerCase()
  if (t === 'ep') return 'EP'
  if (t === 'album') return 'Album'
  return 'Single'
}

// Map an existing catalog release into an editable row (keeps its id).
function releaseToRow(r: ReleaseWithProfile): Row {
  return {
    key: crypto.randomUUID(),
    id: r.id,
    submitter_email: r.submitter_email || r.profile?.email || '',
    submitter_name: r.submitter_name || r.profile?.name || '',
    submitter_phone: r.submitter_phone || '',
    song_title: r.song_title,
    artist_name: r.artist_name,
    track_type: normalizeType(r.track_type),
    album_name: r.album_name ?? '',
    composer: r.composer === '-' ? '' : r.composer,
    producer: r.producer === '-' ? '' : r.producer,
    genre: r.genre === '-' ? '' : r.genre,
    upc_ean_isrc: r.upc_ean_isrc ?? '',
    isrc: r.isrc ?? '',
    is_explicit: r.is_explicit,
    is_ai_generated: r.is_ai_generated,
    cover_url: r.cover_url ?? '',
    audio_url: r.audio_url ?? '',
  }
}

// Parse a CSV yes/no-style value into a boolean (yes/true/1/ใช่ = true).
function parseBool(v: string): boolean {
  const t = v.trim().toLowerCase()
  return t === 'yes' || t === 'true' || t === '1' || t === 'y' || t === 'ใช่'
}

export function CatalogUpdater({
  emailOptions,
  releases,
}: {
  emailOptions: EmailOption[]
  releases: ReleaseWithProfile[]
}) {
  const [rows, setRows] = React.useState<Row[]>([emptyRow()])
  const [submitting, setSubmitting] = React.useState(false)
  const [result, setResult] = React.useState<CatalogUpdateState | null>(null)
  const [wipeOpen, setWipeOpen] = React.useState(false)
  const [wiping, setWiping] = React.useState(false)

  const listId = React.useId()
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const editingCount = rows.filter((r) => r.id).length
  const newCount = rows.length - editingCount

  function update(key: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)))
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()])
  }

  function removeRow(key: string) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev))
  }

  // Load the whole existing catalog into the editor so admins can overlay it.
  function loadCurrentCatalog() {
    setResult(null)
    if (releases.length === 0) {
      setResult({ status: 'error', message: 'ยังไม่มีข้อมูลในแคทตาล็อค' })
      return
    }
    setRows(releases.map(releaseToRow))
    setResult({
      status: 'success',
      message: `โหลดข้อมูลปัจจุบัน ${releases.length} รายการมาแก้ไขแล้ว แก้ข้อมูลแล้วกด "บันทึกการอัปเดต" เพื่อบันทึกทับ`,
    })
  }

  function onEmailBlur(row: Row) {
    if (row.artist_name.trim()) return
    const match = emailOptions.find(
      (o) => o.email.toLowerCase() === row.submitter_email.trim().toLowerCase(),
    )
    if (match?.name) update(row.key, { artist_name: match.name })
  }

  // Download a CSV template. When the catalog has data we include every release
  // (with its id) so admins can edit in Excel and re-upload to overlay; empty
  // catalog falls back to a header + one sample row.
  function downloadTemplate() {
    const dataRows =
      releases.length > 0
        ? releases.map((r) => {
            const row = releaseToRow(r)
            return [
              row.id,
              row.submitter_email,
              row.submitter_name,
              row.submitter_phone,
              row.song_title,
              row.artist_name,
              row.track_type,
              row.album_name,
              row.composer,
              row.producer,
              row.genre,
              row.upc_ean_isrc,
              row.isrc,
              row.is_explicit ? 'yes' : 'no',
              row.is_ai_generated ? 'yes' : 'no',
              row.cover_url,
              row.audio_url,
            ]
          })
        : [CSV_SAMPLE_ROW]

    const csv = [
      CSV_COLUMNS.join(','),
      ...dataRows.map((cells) => cells.map(csvCell).join(',')),
    ].join('\r\n')
    // Prepend a BOM so Excel opens Thai text with the correct encoding.
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'catalog-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setResult(null)

    let text = ''
    try {
      text = await file.text()
    } catch {
      setResult({ status: 'error', message: 'อ่านไฟล์ไม่สำเร็จ กรุณาลองอีกครั้ง' })
      return
    }

    const grid = parseCsv(text.replace(/^\uFEFF/, ''))
    if (grid.length < 2) {
      setResult({ status: 'error', message: 'ไฟล์ CSV ไม่มีข้อมูล หรือมีแต่หัวคอลัมน์' })
      return
    }

    const header = grid[0].map((h) => h.trim().toLowerCase())
    const idx = (col: string) => header.indexOf(col)
    const get = (cells: string[], col: string) => {
      const i = idx(col)
      return i >= 0 ? (cells[i] ?? '').trim() : ''
    }

    const imported: Row[] = grid
      .slice(1)
      .filter((cells) => cells.some((c) => c.trim() !== ''))
      .map((cells) => ({
        key: crypto.randomUUID(),
        id: get(cells, 'id'),
        submitter_email: get(cells, 'submitter_email'),
        submitter_name: get(cells, 'submitter_name'),
        submitter_phone: get(cells, 'submitter_phone'),
        song_title: get(cells, 'song_title'),
        artist_name: get(cells, 'artist_name'),
        track_type: normalizeType(get(cells, 'track_type')),
        album_name: get(cells, 'album_name'),
        composer: get(cells, 'composer'),
        producer: get(cells, 'producer'),
        genre: get(cells, 'genre'),
        upc_ean_isrc: get(cells, 'upc_ean_isrc'),
        isrc: get(cells, 'isrc'),
        is_explicit: parseBool(get(cells, 'is_explicit')),
        is_ai_generated: parseBool(get(cells, 'is_ai_generated')),
        cover_url: get(cells, 'cover_url'),
        audio_url: get(cells, 'audio_url'),
      }))

    if (imported.length === 0) {
      setResult({ status: 'error', message: 'ไม่พบข้อมูลในไฟล์ CSV' })
      return
    }

    const editing = imported.filter((r) => r.id).length
    setRows(imported)
    setResult({
      status: 'success',
      message: `นำเข้า ${imported.length} รายการจาก CSV (แก้ไขข้อมูลเดิม ${editing}, เพิ่มใหม่ ${imported.length - editing}) ตรวจสอบแล้วกด "บันทึกการอัปเดต"`,
    })
  }

  async function handleSubmit() {
    setSubmitting(true)
    setResult(null)

    const filled = rows.filter(
      (r) => r.submitter_email.trim() && r.song_title.trim() && r.artist_name.trim(),
    )
    if (filled.length === 0) {
      setSubmitting(false)
      setResult({
        status: 'error',
        message: 'กรุณากรอกอีเมล ชื่อเพลง และชื่อศิลปิน อย่างน้อย 1 รายการ',
      })
      return
    }

    const res = await upsertReleasesBulk({
      rows: filled.map((r) => ({
        id: r.id.trim() || null,
        submitter_email: r.submitter_email.trim(),
        submitter_name: r.submitter_name.trim() || null,
        submitter_phone: r.submitter_phone.trim() || null,
        song_title: r.song_title.trim(),
        artist_name: r.artist_name.trim(),
        track_type: r.track_type,
        album_name: r.album_name.trim() || null,
        composer: r.composer.trim() || null,
        producer: r.producer.trim() || null,
        genre: r.genre.trim() || null,
        upc_ean_isrc: r.upc_ean_isrc.trim() || null,
        isrc: r.isrc.trim() || null,
        is_explicit: r.is_explicit,
        is_ai_generated: r.is_ai_generated,
        cover_url: r.cover_url.trim() || null,
        audio_url: r.audio_url.trim() || null,
      })),
    })
    setSubmitting(false)
    setResult(res)
    if (res.status === 'success') {
      setRows([emptyRow()])
    }
  }

  async function handleWipe() {
    setWiping(true)
    const res = await deleteAllReleases()
    setWiping(false)
    setWipeOpen(false)
    setResult(res)
    if (res.status === 'success') {
      setRows([emptyRow()])
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <datalist id={listId}>
        {emailOptions.map((o) => (
          <option key={o.email} value={o.email}>
            {o.name ?? o.email}
          </option>
        ))}
      </datalist>

      <div className="border-border bg-muted/30 flex flex-col gap-3 rounded-xl border border-dashed p-4">
        <div className="min-w-0">
          <p className="text-sm font-medium">อัปเดตแคทตาล็อคแบบกลุ่ม</p>
          <p className="text-muted-foreground text-xs text-pretty">
            โหลดข้อมูลปัจจุบันมาแก้ไข หรือดาวน์โหลด template (มีข้อมูลเดิมพร้อมคอลัมน์ id)
            ไปแก้ใน Excel แล้วอัปโหลดกลับ · แถวที่มี id จะบันทึกทับข้อมูลเดิม
            ส่วนแถวที่เว้น id ว่างจะเพิ่มเป็นผลงานใหม่
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={loadCurrentCatalog}>
            <DatabaseZap />
            โหลดข้อมูลปัจจุบัน ({releases.length})
          </Button>
          <Button type="button" variant="outline" onClick={downloadTemplate}>
            <Download />
            โหลด Template
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload />
            อัปโหลด CSV
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={handleFile}
          />
          <Button
            type="button"
            variant="destructive"
            className="sm:ml-auto"
            onClick={() => setWipeOpen(true)}
          >
            <Trash2 />
            ล้างแคทตาล็อคทั้งหมด
          </Button>
        </div>
      </div>

      {result ? (
        <div
          className={
            result.status === 'success'
              ? 'border-success/30 bg-success/10 text-success flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm'
              : 'border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm'
          }
        >
          {result.status === 'success' ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
          )}
          <span>{result.message}</span>
        </div>
      ) : null}

      <div className="flex flex-col gap-4">
        {rows.map((row, i) => (
          <div
            key={row.key}
            className="border-border bg-muted/30 relative rounded-xl border p-4"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs font-medium">
                  รายการที่ {i + 1}
                </span>
                {row.id ? (
                  <span className="border-primary/30 bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium">
                    <Pencil className="size-3" />
                    แก้ไขข้อมูลเดิม
                  </span>
                ) : (
                  <span className="border-success/30 bg-success/10 text-success inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium">
                    <Sparkles className="size-3" />
                    ��พิ่มใหม่
                  </span>
                )}
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => removeRow(row.key)}
                disabled={rows.length === 1}
                aria-label={`ลบรายการที่ ${i + 1}`}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`email-${row.key}`}>อีเมลเจ้าของ (ผูกบัญชี)</Label>
                <Input
                  id={`email-${row.key}`}
                  type="email"
                  list={listId}
                  value={row.submitter_email}
                  onChange={(e) => update(row.key, { submitter_email: e.target.value })}
                  onBlur={() => onEmailBlur(row)}
                  placeholder="artist@email.com"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`sname-${row.key}`}>ชื่อผู้ส่ง (ไม่บังคับ)</Label>
                <Input
                  id={`sname-${row.key}`}
                  value={row.submitter_name}
                  onChange={(e) => update(row.key, { submitter_name: e.target.value })}
                  placeholder="เว้นว่างจะใช้ชื่อศิลปิน"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`sphone-${row.key}`}>เบอร์โทรผู้ส่ง (ไม่บังคับ)</Label>
                <Input
                  id={`sphone-${row.key}`}
                  value={row.submitter_phone}
                  onChange={(e) => update(row.key, { submitter_phone: e.target.value })}
                  placeholder="08xxxxxxxx"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`song-${row.key}`}>ชื่อเพลง</Label>
                <Input
                  id={`song-${row.key}`}
                  value={row.song_title}
                  onChange={(e) => update(row.key, { song_title: e.target.value })}
                  placeholder="ชื่อผลงาน"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`artist-${row.key}`}>ชื่อศิลปิน</Label>
                <Input
                  id={`artist-${row.key}`}
                  value={row.artist_name}
                  onChange={(e) => update(row.key, { artist_name: e.target.value })}
                  placeholder="ชื่อศิลปิน"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`type-${row.key}`}>รูปแบบ Track</Label>
                <select
                  id={`type-${row.key}`}
                  className={selectClass}
                  value={row.track_type}
                  onChange={(e) =>
                    update(row.key, {
                      track_type: e.target.value as Row['track_type'],
                    })
                  }
                >
                  <option value="Single">Single</option>
                  <option value="EP">EP</option>
                  <option value="Album">Album</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`album-${row.key}`}>ชื่ออัลบั้ม (ไม่บังคับ)</Label>
                <Input
                  id={`album-${row.key}`}
                  value={row.album_name}
                  onChange={(e) => update(row.key, { album_name: e.target.value })}
                  placeholder="เฉพาะ EP/Album"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`composer-${row.key}`}>ผู้แต่ง/ผู้ประพันธ์ (ไม่บังคับ)</Label>
                <Input
                  id={`composer-${row.key}`}
                  value={row.composer}
                  onChange={(e) => update(row.key, { composer: e.target.value })}
                  placeholder="Composer"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`producer-${row.key}`}>Producer (ไม่บังคับ)</Label>
                <Input
                  id={`producer-${row.key}`}
                  value={row.producer}
                  onChange={(e) => update(row.key, { producer: e.target.value })}
                  placeholder="ผู้ทำดนตรี"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`genre-${row.key}`}>แนวเพลง (ไม่บังคับ)</Label>
                <Input
                  id={`genre-${row.key}`}
                  value={row.genre}
                  onChange={(e) => update(row.key, { genre: e.target.value })}
                  placeholder="เช่น Pop, Rock"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`upc-${row.key}`}>UPC/EAN (ไม่บังคับ)</Label>
                <Input
                  id={`upc-${row.key}`}
                  value={row.upc_ean_isrc}
                  onChange={(e) => update(row.key, { upc_ean_isrc: e.target.value })}
                  placeholder="รหัส (ถ้ามี)"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`isrc-${row.key}`}>ISRC (ไม่บังคับ)</Label>
                <Input
                  id={`isrc-${row.key}`}
                  value={row.isrc}
                  onChange={(e) => update(row.key, { isrc: e.target.value.toUpperCase() })}
                  placeholder="เช่น THA012400001"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`explicit-${row.key}`}>มีคำหยาบ (Explicit)</Label>
                <select
                  id={`explicit-${row.key}`}
                  className={selectClass}
                  value={row.is_explicit ? 'yes' : 'no'}
                  onChange={(e) =>
                    update(row.key, { is_explicit: e.target.value === 'yes' })
                  }
                >
                  <option value="no">ไม่มี</option>
                  <option value="yes">มี</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`ai-${row.key}`}>สร้างด้วย AI</Label>
                <select
                  id={`ai-${row.key}`}
                  className={selectClass}
                  value={row.is_ai_generated ? 'yes' : 'no'}
                  onChange={(e) =>
                    update(row.key, { is_ai_generated: e.target.value === 'yes' })
                  }
                >
                  <option value="no">ไม่ใช่</option>
                  <option value="yes">ใช่</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`cover-${row.key}`}>ลิงก์ปก Google Drive (ไม่บังคับ)</Label>
                <Input
                  id={`cover-${row.key}`}
                  type="url"
                  value={row.cover_url}
                  onChange={(e) => update(row.key, { cover_url: e.target.value })}
                  placeholder="https://drive.google.com/..."
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`audio-${row.key}`}>ลิงก์ไฟล์เสียง Google Drive (ไม่บั���คับ)</Label>
                <Input
                  id={`audio-${row.key}`}
                  type="url"
                  value={row.audio_url}
                  onChange={(e) => update(row.key, { audio_url: e.target.value })}
                  placeholder="https://drive.google.com/..."
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" onClick={addRow}>
            <Plus />
            เพิ่มแถว
          </Button>
          <span className="text-muted-foreground text-xs">
            แก้ไข {editingCount} · เพิ่มใหม่ {newCount}
          </span>
        </div>
        <Button type="button" onClick={handleSubmit} disabled={submitting}>
          {submitting ? <Loader2 className="animate-spin" /> : <DatabaseZap />}
          บันทึกการอัปเดต
        </Button>
      </div>

      <Dialog open={wipeOpen} onOpenChange={(o) => !wiping && setWipeOpen(o)}>
        <DialogContent
          title="ล้างแคทตาล็อคทั้งหมด?"
          description={`การดำเนินการนี้จะลบผลงาน (Release) ทั้งหมด ${releases.length} รายการ ออกจากฐานข้อมูลอย่างถาวร หากลบแล้วจะไม่สามารถแก้ไขหรือกู้คืนข้อมูลได้อีกต่อไป โปรดสำรอง (แบ็คอัพ) ข้อมูลในระบบของคุณก่อนดำเนินการ`}
        >
          <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>คำเตือน: การลบนี้ไม่สามารถย้อนกลับได้</span>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setWipeOpen(false)}
              disabled={wiping}
            >
              ยกเลิก
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleWipe}
              disabled={wiping}
            >
              {wiping ? <Loader2 className="animate-spin" /> : <Trash2 />}
              ยืนยันล้างทั้งหมด
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
