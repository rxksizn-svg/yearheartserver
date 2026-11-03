'use client'

import Link from 'next/link'
import { Disc3, Plus, Sparkles, ShieldAlert, Pencil } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { formatThaiDate, formatTrackNo } from '@/lib/format'
import type { Release } from '@/lib/types'

export function MyReleases({ releases }: { releases: Release[] }) {
  const { page, setPage, totalPages, pageItems } = usePagination(releases)

  if (releases.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <span className="bg-brand/10 text-brand flex size-14 items-center justify-center rounded-full">
            <Disc3 className="size-7" />
          </span>
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">ยังไม่มีผลงานที่ส่งเข้าระบบ</h2>
            <p className="text-muted-foreground max-w-md text-sm text-pretty">
              เริ่มส่งผลงานเพลงชิ้นแรกของคุณเพื่อจัดจำหน่ายผ่าน YearHeart Artist Service
            </p>
          </div>
          <Button nativeButton={false} render={<Link href="/releases/new" />}>
            <Plus />
            ส่งผลงานใหม่
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="px-0">
          <Table className="table-fixed md:table-auto">
            <TableHeader>
              <TableRow>
                <TableHead className="hidden md:table-cell">รหัส</TableHead>
                <TableHead>ผลงาน</TableHead>
                <TableHead className="hidden md:table-cell">รูปแบบ</TableHead>
                <TableHead className="hidden md:table-cell">สถานะ</TableHead>
                <TableHead className="hidden md:table-cell">วันที่ส่ง</TableHead>
                <TableHead className="w-14 text-right md:w-auto">
                  <span className="sr-only md:not-sr-only">จัดการ</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-muted-foreground hidden font-mono text-xs tabular-nums whitespace-nowrap md:table-cell">
                    {formatTrackNo(r.track_no)}
                  </TableCell>
                  <TableCell className="py-3 pr-1 pl-4 md:p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <ReleaseCover releaseId={r.id} title={r.song_title} />
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <p className="flex min-w-0 items-center gap-1.5 font-medium">
                          <span className="truncate">{r.song_title}</span>
                          {r.is_ai_generated ? (
                            <Sparkles
                              className="text-muted-foreground size-3.5 shrink-0"
                              aria-label="สร้างจาก AI"
                            />
                          ) : null}
                          {r.is_explicit ? (
                            <ShieldAlert
                              className="text-warning size-3.5 shrink-0"
                              aria-label="มีคำหยาบ"
                            />
                          ) : null}
                        </p>
                        <p className="text-muted-foreground truncate text-xs">
                          {r.artist_name}
                          {r.album_name ? ` · ${r.album_name}` : ''} · {r.genre}
                        </p>
                        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 pt-1 md:hidden">
                          <ReleaseStatusBadge status={r.status} />
                          <span className="text-muted-foreground font-mono text-xs tabular-nums">
                            {formatTrackNo(r.track_no)}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {formatThaiDate(r.created_at)}
                          </span>
                        </div>
                        {r.status === 'rejected' && r.admin_note ? (
                          <p className="text-destructive text-xs text-pretty md:hidden">
                            {r.admin_note}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden text-sm md:table-cell">
                    {r.track_type}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <ReleaseStatusBadge status={r.status} />
                    {r.status === 'rejected' && r.admin_note ? (
                      <p className="text-destructive mt-1 max-w-xs text-xs text-pretty">
                        {r.admin_note}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden text-sm whitespace-nowrap md:table-cell">
                    {formatThaiDate(r.created_at)}
                  </TableCell>
                  <TableCell className="py-3 pr-3 pl-0 text-right md:p-4">
                    {r.status === 'rejected' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="size-11 p-0 md:h-8 md:w-auto md:px-3"
                        nativeButton={false}
                        render={<Link href={`/releases/${r.id}/edit`} />}
                        aria-label={`แก้ไข ${r.song_title}`}
                      >
                        <Pencil />
                        <span className="hidden md:inline">แก้ไข</span>
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <ListPagination
        page={page}
        totalPages={totalPages}
        totalItems={releases.length}
        onPageChange={setPage}
      />
    </div>
  )
}
