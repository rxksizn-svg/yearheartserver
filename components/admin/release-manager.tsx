'use client'

import * as React from 'react'
import {
  Loader2,
  FileDown,
  Eye,
  ImageIcon,
  Music4,
  CheckCircle2,
  AlertCircle,
  SlidersHorizontal,
} from 'lucide-react'

import {
  updateReleaseStatus,
  getReleaseAssetUrls,
} from '@/app/actions/releases'
import {
  RELEASE_STATUS_LABELS,
  RELEASE_STATUS_ORDER,
  type ReleaseStatus,
  type ReleaseWithProfile,
} from '@/lib/types'
import { formatThaiDate, formatTrackNo } from '@/lib/format'
import { matchesSearch } from '@/lib/search'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ReleaseStatusBadge } from '@/components/dashboard/release-status-badge'
import { ReleaseCover } from '@/components/dashboard/release-cover'
import {
  ListPagination,
  usePagination,
} from '@/components/dashboard/list-pagination'

const selectClass =
  'border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 rounded-lg border px-2 text-sm shadow-sm outline-none focus-visible:ring-[3px] dark:bg-input/30'

const FILTERS: { value: ReleaseStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'ทั้งหมด' },
  ...RELEASE_STATUS_ORDER.map((s) => ({ value: s, label: RELEASE_STATUS_LABELS[s] })),
]

function yesNo(v: boolean) {
  return v ? 'ใช่' : 'ไม่ใช่'
}

/** Build a CSV (with UTF-8 BOM for Excel/Thai) from the release rows. */
function toCsv(rows: ReleaseWithProfile[]): string {
  const headers = [
    'track_no',
    'id',
    'created_at',
    'status',
    'account_email',
    'account_name',
    'track_type',
    'album_name',
    'song_title',
    'artist_name',
    'composer',
    'producer',
    'genre',
    'upc_ean_isrc',
    'isrc',
    'is_explicit',
    'is_ai_generated',
    'submitter_name',
    'submitter_email',
    'submitter_phone',
    'cover_path',
    'audio_path',
    'cover_url',
    'audio_url',
    'audio_filename',
    'consent_content_id',
    'consent_terms',
    'consent_copyright',
    'admin_note',
  ]
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v)
    return `"${s.replace(/"/g, '""')}"`
  }
  const lines = rows.map((r) =>
    [
      formatTrackNo(r.track_no),
      r.id,
      r.created_at,
      RELEASE_STATUS_LABELS[r.status],
      r.profile?.email ?? '',
      r.profile?.name ?? '',
      r.track_type,
      r.album_name ?? '',
      r.song_title,
      r.artist_name,
      r.composer,
      r.producer,
      r.genre,
      r.upc_ean_isrc ?? '',
      r.isrc ?? '',
      r.is_explicit,
      r.is_ai_generated,
      r.submitter_name,
      r.submitter_email,
      r.submitter_phone,
      r.cover_path ?? '',
      r.audio_path ?? '',
      r.cover_url ?? '',
      r.audio_url ?? '',
      r.audio_filename ?? '',
      r.consent_content_id,
      r.consent_terms,
      r.consent_copyright,
      r.admin_note ?? '',
    ]
      .map(esc)
      .join(','),
  )
  return '\uFEFF' + [headers.join(','), ...lines].join('\n')
}

function downloadCsv(rows: ReleaseWithProfile[]) {
  const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `releases-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-1.5">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="col-span-2 text-sm break-words">{value || '-'}</dd>
    </div>
  )
}

function ReleaseDetailDialog({
  release,
  open,
  onOpenChange,
}: {
  release: ReleaseWithProfile
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [assets, setAssets] = React.useState<{
    coverUrl: string | null
    audioUrl: string | null
  } | null>(null)
  const [loadingAssets, setLoadingAssets] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setLoadingAssets(true)
    getReleaseAssetUrls(release.id)
      .then(setAssets)
      .finally(() => setLoadingAssets(false))
  }, [open, release.id])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={release.song_title}
        description={`${release.artist_name} · ${release.track_type}`}
        className="sm:max-w-2xl"
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <ReleaseCover
              releaseId={release.id}
              title={release.song_title}
              className="size-28 rounded-lg"
            />
            <div className="flex flex-col gap-2">
              <ReleaseStatusBadge status={release.status} />
              <span className="text-muted-foreground text-xs">
                ส่งเมื่อ {formatThaiDate(release.created_at)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {loadingAssets ? (
              <span className="text-muted-foreground flex items-center gap-2 text-sm">
                <Loader2 className="size-4 animate-spin" /> กำลังโหลดไฟล์...
              </span>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!assets?.coverUrl}
                  nativeButton={false}
                  render={
                    <a
                      href={assets?.coverUrl ?? '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  }
                >
                  <ImageIcon />
                  ดูไฟล์ปก
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!assets?.audioUrl}
                  nativeButton={false}
                  render={
                    <a
                      href={assets?.audioUrl ?? '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  }
                >
                  <Music4 />
                  ดาวน์โหลดไฟล์เสียง
                </Button>
              </>
            )}
          </div>

          <dl className="divide-border divide-y">
            <DetailRow
              label="รหัส Track"
              value={
                <span className="font-mono tabular-nums">
                  {formatTrackNo(release.track_no)}
                </span>
              }
            />
            <DetailRow label="บัญชีผู้ส่ง" value={`${release.profile?.name ?? '-'} (${release.profile?.email ?? '-'})`} />
            <DetailRow label="รูปแบบ Track" value={release.track_type} />
            <DetailRow label="ชื่ออัลบั้ม" value={release.album_name} />
            <DetailRow label="ชื่อเพลง" value={release.song_title} />
            <DetailRow label="ศิลปิน" value={release.artist_name} />
            <DetailRow label="ผู้แต่ง/ผู้ประพันธ์" value={release.composer} />
            <DetailRow label="Producer/ผู้ทำดนตรี" value={release.producer} />
            <DetailRow label="แนวเพลง" value={release.genre} />
            <DetailRow label="UPC/EAN" value={release.upc_ean_isrc} />
            <DetailRow label="ISRC" value={release.isrc} />
            <DetailRow label="มีคำหยาบ (Explicit)" value={yesNo(release.is_explicit)} />
            <DetailRow label="สร้างจาก AI" value={yesNo(release.is_ai_generated)} />
            <DetailRow label="ชื่อ-สกุลผู้ส่ง" value={release.submitter_name} />
            <DetailRow label="อีเมลผู้ส่ง" value={release.submitter_email} />
            <DetailRow label="เบอร์โทรผู้ส่ง" value={release.submitter_phone} />
            <DetailRow label="ไฟล์เสียง" value={release.audio_filename} />
            <DetailRow
              label="แหล่งไฟล์ปก"
              value={release.cover_url ? 'ลิงก์ Google Drive' : 'อัพ���หลดในระบบ'}
            />
            <DetailRow
              label="แหล่งไฟล์เสียง"
              value={release.audio_url ? 'ลิงก์ Google Drive' : 'อัพโหลดในระบบ'}
            />
            <DetailRow
              label="การยอมรับเงื่อนไข"
              value={`Content ID: ${yesNo(release.consent_content_id)} · ข้อกำหนด: ${yesNo(release.consent_terms)} · ลิขสิทธิ์: ${yesNo(release.consent_copyright)}`}
            />
          </dl>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function StatusDialog({
  release,
  open,
  onOpenChange,
}: {
  release: ReleaseWithProfile
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [status, setStatus] = React.useState<ReleaseStatus>(release.status)
  const [note, setNote] = React.useState(release.admin_note ?? '')
  const [saving, setSaving] = React.useState(false)
  const [result, setResult] = React.useState<
    { ok: boolean; message: string } | null
  >(null)

  async function handleSave() {
    setSaving(true)
    setResult(null)
    const res = await updateReleaseStatus({
      releaseId: release.id,
      status,
      admin_note: note,
    })
    setSaving(false)
    setResult({
      ok: res.status === 'success',
      message: res.message ?? '',
    })
    if (res.status === 'success') {
      setTimeout(() => onOpenChange(false), 700)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="อัปเดตสถานะผลงาน"
        description={`${release.song_title} — ${release.artist_name}`}
      >
        <div className="flex flex-col gap-4">
          {result ? (
            <div
              className={
                result.ok
                  ? 'border-success/30 bg-success/10 text-success flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm'
                  : 'border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm'
              }
            >
              {result.ok ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              ) : (
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
              )}
              <span>{result.message}</span>
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`status-${release.id}`}>สถานะ</Label>
            <select
              id={`status-${release.id}`}
              className={selectClass + ' h-10 w-full'}
              value={status}
              onChange={(e) => setStatus(e.target.value as ReleaseStatus)}
            >
              {RELEASE_STATUS_ORDER.map((s) => (
                <option key={s} value={s}>
                  {RELEASE_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`note-${release.id}`}>หมายเหตุถึงศิลปิน (ไม่บังคับ)</Label>
            <Textarea
              id={`note-${release.id}`}
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="เช่น ไฟล์ปกความละเอียดต่ำ กรุณาอัพโหลดใหม่"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              ยกเลิก
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="animate-spin" />}
              บันทึกสถานะ
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ReleaseRow({ release }: { release: ReleaseWithProfile }) {
  const [dialog, setDialog] = React.useState<'detail' | 'status' | null>(null)
  return (
    <TableRow>
      <TableCell className="text-muted-foreground hidden font-mono text-xs tabular-nums whitespace-nowrap md:table-cell">
        {formatTrackNo(release.track_no)}
      </TableCell>
      <TableCell className="py-3 pr-1 pl-3 md:p-4">
        <div className="flex min-w-0 items-center gap-3">
          <ReleaseCover releaseId={release.id} title={release.song_title} />
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="truncate font-medium">{release.song_title}</p>
            <p className="text-muted-foreground truncate text-xs">
              {release.artist_name} · {release.track_type} · {release.genre}
            </p>
            <p className="text-muted-foreground truncate text-xs md:hidden">
              {release.profile?.email ?? release.submitter_email ?? '-'}
            </p>
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 pt-1 md:hidden">
              <ReleaseStatusBadge status={release.status} />
              <span className="text-muted-foreground font-mono text-xs tabular-nums">
                {formatTrackNo(release.track_no)}
              </span>
              <span className="text-muted-foreground text-xs">
                {formatThaiDate(release.created_at)}
              </span>
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground hidden max-w-56 text-sm lg:table-cell">
        <p className="truncate">{release.profile?.name ?? '-'}</p>
        <p className="text-muted-foreground truncate text-xs">
          {release.profile?.email ?? '-'}
        </p>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <ReleaseStatusBadge status={release.status} />
      </TableCell>
      <TableCell className="text-muted-foreground hidden text-sm whitespace-nowrap md:table-cell">
        {formatThaiDate(release.created_at)}
      </TableCell>
      <TableCell className="py-3 pr-3 pl-0 text-right md:p-4">
        <div className="flex flex-col items-end gap-1 md:flex-row md:justify-end md:gap-2">
          <Button
            size="sm"
            variant="outline"
            className="size-11 p-0 md:h-8 md:w-auto md:px-3"
            onClick={() => setDialog('detail')}
            aria-label={`ดูข้อมูล ${release.song_title}`}
          >
            <Eye />
            <span className="hidden md:inline">ดูข้อมูล</span>
          </Button>
          <Button
            size="sm"
            className="size-11 p-0 md:h-8 md:w-auto md:px-3"
            onClick={() => setDialog('status')}
            aria-label={`จัดการสถานะ ${release.song_title}`}
          >
            <SlidersHorizontal />
            <span className="hidden md:inline">จัด��ารสถานะ</span>
          </Button>
        </div>
      </TableCell>

      <ReleaseDetailDialog
        release={release}
        open={dialog === 'detail'}
        onOpenChange={(v) => setDialog(v ? 'detail' : null)}
      />
      <StatusDialog
        release={release}
        open={dialog === 'status'}
        onOpenChange={(v) => setDialog(v ? 'status' : null)}
      />
    </TableRow>
  )
}

export function ReleaseManager({
  releases: allReleases,
  initialQuery = '',
}: {
  releases: ReleaseWithProfile[]
  initialQuery?: string
}) {
  const [filter, setFilter] = React.useState<ReleaseStatus | 'all'>('all')
  const [query, setQuery] = React.useState(initialQuery)
  const releases = React.useMemo(
    () =>
      allReleases.filter((r) =>
        matchesSearch(query, [
          formatTrackNo(r.track_no),
          r.track_no,
          r.song_title,
          r.artist_name,
          r.album_name,
          r.genre,
          r.upc_ean_isrc,
          r.isrc,
          r.submitter_name,
          r.submitter_email,
          r.submitter_phone,
          r.profile?.email,
          r.profile?.name,
        ]),
      ),
    [allReleases, query],
  )
  const filtered =
    filter === 'all' ? releases : releases.filter((r) => r.status === filter)
  const { page, setPage, totalPages, pageItems } = usePagination(filtered)

  return (
    <div className="flex flex-col gap-4">
      <Input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setPage(1)
        }}
        placeholder="ค้นหารหัส, ชื่อเพลง, ศิลปิน, อีเมล, ISRC..."
        aria-label="ค้นหาผลงานเพลง"
        className="h-11 text-base sm:max-w-sm"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => {
            const count =
              f.value === 'all'
                ? releases.length
                : releases.filter((r) => r.status === f.value).length
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => {
                  setFilter(f.value)
                  setPage(1)
                }}
                className={
                  'min-h-9 rounded-full border px-3 py-1 text-xs font-medium transition-colors ' +
                  (filter === f.value
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input text-muted-foreground hover:bg-muted')
                }
              >
                {f.label} ({count})
              </button>
            )
          })}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => downloadCsv(filtered)}
          disabled={filtered.length === 0}
        >
          <FileDown />
          Export CSV ({filtered.length})
        </Button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground py-10 text-center text-sm">
          ยังไม่มีผลงานในหมวดนี้
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <Table className="table-fixed md:table-auto">
            <TableHeader>
              <TableRow>
                <TableHead className="hidden md:table-cell">รหัส</TableHead>
                <TableHead>ผลงาน</TableHead>
                <TableHead className="hidden lg:table-cell">บัญชีผู้ส่ง</TableHead>
                <TableHead className="hidden md:table-cell">สถานะ</TableHead>
                <TableHead className="hidden md:table-cell">วันที่ส่ง</TableHead>
                <TableHead className="w-14 text-right md:w-auto">
                  <span className="sr-only md:not-sr-only">จัดการ</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((r) => (
                <ReleaseRow key={r.id} release={r} />
              ))}
            </TableBody>
          </Table>
          <ListPagination
            page={page}
            totalPages={totalPages}
            totalItems={filtered.length}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  )
}
