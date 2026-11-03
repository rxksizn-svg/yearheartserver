'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle2, AlertCircle, ClipboardList } from 'lucide-react'

import { resolveTakedownRequest } from '@/app/actions/takedown'
import {
  RELEASE_STATUS_LABELS,
  TAKEDOWN_STATUS_LABELS,
  type ReleaseStatus,
  type TakedownRequestWithRefs,
  type TakedownStatus,
} from '@/lib/types'
import { formatThaiDate, formatTrackNo } from '@/lib/format'
import { cn } from '@/lib/utils'
import { matchesSearch } from '@/lib/search'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { ReleaseCover } from '@/components/dashboard/release-cover'
import { ReleaseStatusBadge } from '@/components/dashboard/release-status-badge'
import { TakedownStatusBadge } from '@/components/takedown/takedown-status-badge'
import {
  ListPagination,
  usePagination,
} from '@/components/dashboard/list-pagination'

type Filter = TakedownStatus | 'all'
const FILTERS: Filter[] = ['pending', 'completed', 'rejected', 'all']

const SNAPSHOT_FIELDS: { key: string; label: string }[] = [
  { key: 'track_no', label: 'รหัส Track' },
  { key: 'song_title', label: 'ชื่อเพลง' },
  { key: 'artist_name', label: 'ศิลปิน' },
  { key: 'album_name', label: 'ชื่ออัลบั้ม' },
  { key: 'track_type', label: 'รูปแบบ Track' },
  { key: 'genre', label: 'แนวเพลง' },
  { key: 'composer', label: 'ผู้แต่ง/ผู้ประพันธ์' },
  { key: 'producer', label: 'Producer' },
  { key: 'upc_ean_isrc', label: 'UPC/EAN' },
  { key: 'isrc', label: 'ISRC' },
  { key: 'submitter_name', label: 'ชื่อผู้ส่ง' },
  { key: 'submitter_email', label: 'อีเมลผู้ส่ง' },
  { key: 'submitter_phone', label: 'เบอร์โทรผู้ส่ง' },
  { key: 'status', label: 'สถานะก่อน TakeDown' },
  { key: 'created_at', label: 'วันที่ส่งผลงาน' },
]

function formatSnapshotValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '-'
  if (key === 'track_no') return formatTrackNo(Number(value))
  if (key === 'status') return RELEASE_STATUS_LABELS[value as ReleaseStatus] ?? String(value)
  if (key === 'created_at') return formatThaiDate(String(value))
  return String(value)
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-3">
      <dt className="text-muted-foreground shrink-0 text-xs sm:w-36 sm:text-sm">{label}</dt>
      <dd className="min-w-0 text-sm break-words">{value || '-'}</dd>
    </div>
  )
}

function ResolveDialog({
  request,
  open,
  onOpenChange,
}: {
  request: TakedownRequestWithRefs
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const router = useRouter()
  const isPending = request.status === 'pending'
  const [decision, setDecision] = React.useState<'completed' | 'rejected'>('completed')
  const [note, setNote] = React.useState(request.admin_note ?? '')
  const [saving, setSaving] = React.useState(false)
  const [result, setResult] = React.useState<{ ok: boolean; message: string } | null>(null)

  const release = request.release
  const snapshot = request.release_snapshot

  async function handleSave() {
    setSaving(true)
    setResult(null)
    const res = await resolveTakedownRequest({
      id: request.id,
      decision,
      admin_note: note,
    })
    setSaving(false)
    setResult({ ok: res.status === 'success', message: res.message ?? '' })
    if (res.status === 'success') router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="คำขอ TakeDown"
        description={`${request.song_title} — ${request.artist_name}`}
        className="sm:max-w-2xl"
      >
        <div className="flex flex-col gap-5">
          {result ? (
            <div
              role="status"
              className={cn(
                'flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm',
                result.ok
                  ? 'border-success/30 bg-success/10 text-success'
                  : 'border-destructive/30 bg-destructive/10 text-destructive',
              )}
            >
              {result.ok ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              ) : (
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
              )}
              <span>{result.message}</span>
            </div>
          ) : null}

          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">ผลงานที่ขอลบ</h3>
            {release ? (
              <div className="flex items-center gap-3">
                <ReleaseCover
                  releaseId={release.id}
                  title={release.song_title}
                  className="size-20 rounded-lg"
                />
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="truncate font-medium">{release.song_title}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {release.artist_name} · {release.track_type} · {formatTrackNo(release.track_no)}
                  </p>
                  <ReleaseStatusBadge status={release.status} />
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                ไม่ได้เลือกผลงานในระบบ (ระบุชื่อเพลงเอง)
              </p>
            )}
          </section>

          <dl className="divide-border divide-y border-y">
            <InfoRow label="ผู้ขอ" value={`${request.contact_name} (${request.contact_email})`} />
            <InfoRow label="เบอร์โทร" value={request.contact_phone} />
            <InfoRow label="บัญชี" value={request.profile?.email} />
            <InfoRow label="วันที่ขอ" value={formatThaiDate(request.created_at)} />
            <InfoRow
              label="เหตุผล"
              value={<span className="whitespace-pre-wrap">{request.reason}</span>}
            />
          </dl>

          {isPending ? (
            <>
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-sm font-semibold">ผลการดำเนินการ</legend>
                {(['completed', 'rejected'] as const).map((d) => (
                  <label
                    key={d}
                    className={cn(
                      'flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors',
                      decision === d
                        ? d === 'completed'
                          ? 'border-success bg-success/10'
                          : 'border-destructive bg-destructive/10'
                        : 'border-input',
                    )}
                  >
                    <input
                      type="radio"
                      name={`decision-${request.id}`}
                      value={d}
                      checked={decision === d}
                      onChange={() => setDecision(d)}
                      className="size-4"
                    />
                    <span className="flex flex-col">
                      <span className="font-medium">{TAKEDOWN_STATUS_LABELS[d]}</span>
                      <span className="text-muted-foreground text-xs">
                        {d === 'completed'
                          ? 'เปลี่ยนสถานะเพลงเป็น "ส่ง Takedown" และเก็บข้อมูล Release ไว้ (ไม่ลบ)'
                          : 'ไม่เปลี่ยนสถานะเพลง และแจ้งเหตุผลกลับไปยังผู้ขอ'}
                      </span>
                    </span>
                  </label>
                ))}
              </fieldset>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`td-note-${request.id}`}>หมายเหตุ (ไม่บังคับ)</Label>
                <Textarea
                  id={`td-note-${request.id}`}
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="text-base md:text-sm"
                  placeholder="เช่น ลบออกจากทุกแพลตฟอร์มแล้ว ภายใน 3-7 วันทำการ"
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  onClick={() => onOpenChange(false)}
                >
                  ปิด
                </Button>
                <Button
                  type="button"
                  className="min-h-11"
                  variant={decision === 'completed' ? 'default' : 'destructive'}
                  onClick={handleSave}
                  disabled={saving || result?.ok === true}
                >
                  {saving && <Loader2 className="animate-spin" />}
                  ยืนยันผล
                </Button>
              </DialogFooter>
            </>
          ) : (
            <section className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <TakedownStatusBadge status={request.status} />
                {request.processed_at ? (
                  <span className="text-muted-foreground text-xs">
                    ดำเนินการเมื่อ {formatThaiDate(request.processed_at)}
                  </span>
                ) : null}
              </div>
              {request.admin_note ? (
                <p className="text-sm text-pretty">หมายเหตุ: {request.admin_note}</p>
              ) : null}
              {snapshot ? (
                <div className="flex flex-col gap-2">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <ClipboardList className="size-4" />
                    ข้อมูล Release ที่บันทึกไว้ ณ วัน TakeDown
                  </h3>
                  <dl className="bg-muted/50 divide-border divide-y rounded-lg border px-3">
                    {SNAPSHOT_FIELDS.map((f) => (
                      <InfoRow
                        key={f.key}
                        label={f.label}
                        value={formatSnapshotValue(f.key, snapshot[f.key])}
                      />
                    ))}
                  </dl>
                </div>
              ) : null}
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function RequestRow({ request }: { request: TakedownRequestWithRefs }) {
  const [open, setOpen] = React.useState(false)
  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hover:bg-muted/50 flex w-full items-center gap-3 px-3 py-3 text-left transition-colors md:px-4"
      >
        {request.release ? (
          <ReleaseCover releaseId={request.release.id} title={request.song_title} />
        ) : (
          <ReleaseCover releaseId="none" title={request.song_title} />
        )}
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate font-medium">{request.song_title}</span>
          <span className="text-muted-foreground truncate text-xs">
            {request.artist_name} · {request.contact_email}
          </span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-1">
            <TakedownStatusBadge status={request.status} />
            <span className="text-muted-foreground text-xs">
              {formatThaiDate(request.created_at)}
            </span>
          </span>
        </span>
        <span className="text-primary hidden shrink-0 text-sm font-medium sm:inline">
          {request.status === 'pending' ? 'ตรวจสอบ' : 'ดูรายละเอียด'}
        </span>
      </button>
      <ResolveDialog request={request} open={open} onOpenChange={setOpen} />
    </li>
  )
}

export function TakedownManager({
  requests: allRequests,
  initialQuery = '',
}: {
  requests: TakedownRequestWithRefs[]
  initialQuery?: string
}) {
  const [query, setQuery] = React.useState(initialQuery)
  const [filter, setFilter] = React.useState<Filter>(initialQuery ? 'all' : 'pending')
  const requests = React.useMemo(
    () =>
      allRequests.filter((r) =>
        matchesSearch(query, [
          r.song_title,
          r.artist_name,
          r.contact_name,
          r.contact_email,
          r.contact_phone,
          r.reason,
          r.profile?.email,
        ]),
      ),
    [allRequests, query],
  )
  const filtered = filter === 'all' ? requests : requests.filter((r) => r.status === filter)
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
        placeholder="ค้นหาชื่อเพลง, ศิลปิน, ผู้ติดต่อ, อีเมล..."
        aria-label="ค้นหาคำขอ TakeDown"
        className="h-11 text-base sm:max-w-sm"
      />
      <div className="flex flex-wrap gap-1">
        {FILTERS.map((f) => {
          const count =
            f === 'all' ? requests.length : requests.filter((r) => r.status === f).length
          return (
            <button
              key={f}
              type="button"
              onClick={() => {
                setFilter(f)
                setPage(1)
              }}
              className={cn(
                'min-h-9 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                filter === f
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input text-muted-foreground hover:bg-muted',
              )}
            >
              {f === 'all' ? 'ทั้งหมด' : TAKEDOWN_STATUS_LABELS[f]} ({count})
            </button>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground py-10 text-center text-sm">
          ไม่มีคำขอในหมวดนี้
        </p>
      ) : (
        <>
          <ul className="divide-border -mx-3 divide-y border-y md:-mx-4">
            {pageItems.map((r) => (
              <RequestRow key={r.id} request={r} />
            ))}
          </ul>
          <ListPagination
            page={page}
            totalPages={totalPages}
            totalItems={filtered.length}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  )
}
