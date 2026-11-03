'use client'

import * as React from 'react'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import {
  Loader2,
  Pencil,
  Wallet,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
} from 'lucide-react'

import {
  updateUserProfile,
  adjustBalance,
  deleteUser,
  type ActionState,
} from '@/app/actions/admin'
import type { AdminUserRow } from '@/lib/data/admin'
import {
  ROLE_LABELS,
  ACCOUNT_STATUS_LABELS,
  type AccountStatus,
  type UserRole,
} from '@/lib/types'
import { formatTHB } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { matchesSearch } from '@/lib/search'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { ArtistNamesEditor } from '@/components/admin/artist-names-editor'

const initial: ActionState = { status: 'idle' }

const STATUS_VARIANT: Record<AccountStatus, 'success' | 'warning' | 'destructive'> = {
  active: 'success',
  pending: 'warning',
  suspended: 'destructive',
}

const ROLE_VARIANT: Record<UserRole, 'brand' | 'info' | 'secondary' | 'success'> = {
  admin: 'brand',
  label: 'info',
  label_artist: 'success',
  artist: 'secondary',
}

const selectClass =
  'border-input bg-background focus-visible:ring-ring h-9 rounded-md border px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1'

function Banner({ state }: { state: ActionState }) {
  if (state.status === 'idle' || !state.message) return null
  const ok = state.status === 'success'
  return (
    <div
      role="status"
      className={
        ok
          ? 'border-success/30 bg-success/10 text-success flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm'
          : 'border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm'
      }
    >
      {ok ? (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
      ) : (
        <AlertCircle className="mt-0.5 size-4 shrink-0" />
      )}
      <span>{state.message}</span>
    </div>
  )
}

function SubmitButton({
  label,
  variant,
  icon: Icon,
}: {
  label: string
  variant?: 'default' | 'outline' | 'destructive'
  icon?: typeof Pencil
}) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant={variant} disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : Icon ? <Icon /> : null}
      {label}
    </Button>
  )
}

/** Closes the dialog once its action succeeds. */
function useCloseOnSuccess(status: ActionState['status'], onClose: () => void) {
  React.useEffect(() => {
    if (status === 'success') {
      const t = setTimeout(onClose, 600)
      return () => clearTimeout(t)
    }
  }, [status, onClose])
}

function EditUserDialog({
  user,
  open,
  onOpenChange,
}: {
  user: AdminUserRow
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [state, action] = useActionState(updateUserProfile, initial)
  useCloseOnSuccess(state.status, () => onOpenChange(false))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="แก้ไขข้อมูลผู้ใช้" description={user.email}>
        <ArtistNamesEditor userId={user.id} role={user.role} names={user.artist_names} />
        <div className="bg-border h-px" role="separator" />
        <form action={action} className="flex flex-col gap-4">
          <Banner state={state} />
          <input type="hidden" name="userId" value={user.id} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`name-${user.id}`}>ชื่อ</Label>
            <Input
              id={`name-${user.id}`}
              name="name"
              defaultValue={user.name ?? ''}
              placeholder="ชื่อ-นามสกุล"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`role-${user.id}`}>บทบาท</Label>
              <select
                id={`role-${user.id}`}
                name="role"
                defaultValue={user.role}
                className={selectClass}
              >
                <option value="artist">ศิลปิน</option>
                <option value="label">ค่ายเพลง</option>
                <option value="label_artist">ศิลปินในสังกัด (ถอนรายเดือน)</option>
                <option value="admin">ผู้ดูแลระบบ</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`status-${user.id}`}>สถานะบัญชี</Label>
              <select
                id={`status-${user.id}`}
                name="accountStatus"
                defaultValue={user.status}
                className={selectClass}
              >
                <option value="active">ใช้งานอยู่</option>
                <option value="pending">รอตรวจสอบ</option>
                <option value="suspended">ระงับการใช้งาน</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`label-${user.id}`}>ชื่อค่ายเพลง</Label>
              <Input
                id={`label-${user.id}`}
                name="labelName"
                defaultValue={user.label_name ?? ''}
                placeholder="เช่น Yearheart"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <SubmitButton label="บันทึก" />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function AdjustBalanceDialog({
  user,
  open,
  onOpenChange,
}: {
  user: AdminUserRow
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [state, action] = useActionState(adjustBalance, initial)
  const [type, setType] = React.useState<'credit' | 'debit'>('credit')
  useCloseOnSuccess(state.status, () => onOpenChange(false))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="ปรับยอดเงิน"
        description={`ยอดคงเหลือปัจจุบัน ${formatTHB(user.balance.availableBalance)}`}
      >
        <form action={action} className="flex flex-col gap-4">
          <Banner state={state} />
          <input type="hidden" name="userId" value={user.id} />
          <input type="hidden" name="type" value={type} />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType('credit')}
              className={
                'flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ' +
                (type === 'credit'
                  ? 'border-success bg-success/10 text-success'
                  : 'border-input text-muted-foreground hover:bg-muted')
              }
            >
              <Plus className="size-4" /> เติมเงิน
            </button>
            <button
              type="button"
              onClick={() => setType('debit')}
              className={
                'flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ' +
                (type === 'debit'
                  ? 'border-destructive bg-destructive/10 text-destructive'
                  : 'border-input text-muted-foreground hover:bg-muted')
              }
            >
              <Minus className="size-4" /> หักเงิน
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`amount-${user.id}`}>จำนวนเงิน (บาท)</Label>
            <Input
              id={`amount-${user.id}`}
              name="amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`note-${user.id}`}>หมายเหตุ</Label>
            <Input
              id={`note-${user.id}`}
              name="note"
              placeholder="เหตุผลในการปรับยอด"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <SubmitButton label="ยืนยัน" />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeleteUserDialog({
  user,
  open,
  onOpenChange,
}: {
  user: AdminUserRow
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [state, action] = useActionState(deleteUser, initial)
  useCloseOnSuccess(state.status, () => onOpenChange(false))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="ลบบัญชีผู้ใช้"
        description="การลบจะลบข้อมูลรายได้ คำขอถอนเงิน และโปรไฟล์ทั้งหมดอย่างถาวร"
      >
        <form action={action} className="flex flex-col gap-4">
          <Banner state={state} />
          <input type="hidden" name="userId" value={user.id} />
          <p className="text-sm">
            ยืนยันการลบบัญชี{' '}
            <span className="font-semibold">{user.name || user.email}</span>?
            การกระทำนี้ไม่สามารถย้อนกลับได้
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ยกเลิก
            </Button>
            <SubmitButton label="ลบถาวร" variant="destructive" icon={Trash2} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function UserRowActions({ user }: { user: AdminUserRow }) {
  const [dialog, setDialog] = React.useState<'edit' | 'balance' | 'delete' | null>(
    null,
  )
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        size="icon"
        variant="ghost"
        aria-label="แก้ไข"
        onClick={() => setDialog('edit')}
      >
        <Pencil className="size-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        aria-label="ปรับยอดเงิน"
        onClick={() => setDialog('balance')}
      >
        <Wallet className="size-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        aria-label="ลบ"
        className="text-destructive hover:text-destructive"
        onClick={() => setDialog('delete')}
      >
        <Trash2 className="size-4" />
      </Button>
      <EditUserDialog
        user={user}
        open={dialog === 'edit'}
        onOpenChange={(v) => setDialog(v ? 'edit' : null)}
      />
      <AdjustBalanceDialog
        user={user}
        open={dialog === 'balance'}
        onOpenChange={(v) => setDialog(v ? 'balance' : null)}
      />
      <DeleteUserDialog
        user={user}
        open={dialog === 'delete'}
        onOpenChange={(v) => setDialog(v ? 'delete' : null)}
      />
    </div>
  )
}

export function UserTable({
  users,
  initialQuery = '',
}: {
  users: AdminUserRow[]
  initialQuery?: string
}) {
  const [query, setQuery] = React.useState(initialQuery)
  const filtered = React.useMemo(
    () =>
      users.filter((u) => matchesSearch(query, [u.name, u.email, u.artist_name, u.label_name])),
    [users, query],
  )

  return (
    <div className="flex flex-col gap-4">
      <Input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="ค้นหาชื่อ, อีเมล, ชื่อศิลปิน..."
        aria-label="ค้นหาผู้ใช้"
        className="h-11 text-base sm:max-w-sm"
      />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="text-muted-foreground border-border border-b text-left text-xs">
              <th className="px-3 py-2 font-medium">ผู้ใช้</th>
              <th className="px-3 py-2 font-medium">บทบาท</th>
              <th className="px-3 py-2 font-medium">สถานะ</th>
              <th className="px-3 py-2 text-right font-medium">ยอดคงเหลือ</th>
              <th className="px-3 py-2 text-right font-medium">รอถอน</th>
              <th className="px-3 py-2 text-right font-medium">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {filtered.map((u) => (
              <tr key={u.id} className="hover:bg-muted/40">
                <td className="px-3 py-3">
                  <div className="font-medium">{u.name || u.artist_name || 'ไม่ระบุชื่อ'}</div>
                  <div className="text-muted-foreground text-xs">{u.email}</div>
                </td>
                <td className="px-3 py-3">
                  <Badge variant={ROLE_VARIANT[u.role]}>{ROLE_LABELS[u.role]}</Badge>
                </td>
                <td className="px-3 py-3">
                  <Badge variant={STATUS_VARIANT[u.status]}>
                    {ACCOUNT_STATUS_LABELS[u.status]}
                  </Badge>
                </td>
                <td className="px-3 py-3 text-right font-semibold tabular-nums">
                  {formatTHB(u.balance.availableBalance)}
                </td>
                <td className="text-muted-foreground px-3 py-3 text-right tabular-nums">
                  {u.balance.pendingWithdrawals > 0
                    ? formatTHB(u.balance.pendingWithdrawals)
                    : '—'}
                </td>
                <td className="px-3 py-3">
                  <UserRowActions user={u} />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="text-muted-foreground px-3 py-10 text-center"
                >
                  ไม่พบผู้ใช้ที่ตรงกับการค้นหา
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
