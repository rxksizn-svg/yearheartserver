'use client'

import * as React from 'react'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { Loader2, Plus, X } from 'lucide-react'

import { addArtistName, removeArtistName } from '@/app/actions/artist-names'
import type { ActionState } from '@/app/actions/admin'
import { MAX_ARTIST_NAMES, type ArtistNameEntry } from '@/lib/artist-names'
import type { UserRole } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const initial: ActionState = { status: 'idle' }

function AddButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={disabled || pending} className="h-11 shrink-0">
      {pending ? <Loader2 className="animate-spin" /> : <Plus />}
      เพิ่ม
    </Button>
  )
}

export function ArtistNamesEditor({
  userId,
  role,
  names,
}: {
  userId: string
  role: UserRole
  names: ArtistNameEntry[]
}) {
  const [state, action] = useActionState(addArtistName, initial)
  const [removeState, setRemoveState] = React.useState<ActionState>(initial)
  const [removingId, setRemovingId] = React.useState<string | null>(null)
  const [, startTransition] = React.useTransition()
  const formRef = React.useRef<HTMLFormElement>(null)

  React.useEffect(() => {
    if (state.status === 'success') formRef.current?.reset()
  }, [state])

  const full = names.length >= MAX_ARTIST_NAMES
  const message = removeState.status !== 'idle' ? removeState : state
  const isLabel = role === 'label' || role === 'label_artist'

  function handleRemove(id: string) {
    setRemovingId(id)
    startTransition(async () => {
      setRemoveState(await removeArtistName(id))
      setRemovingId(null)
    })
  }

  return (
    <section className="flex flex-col gap-3" aria-labelledby={`artist-names-${userId}`}>
      <div className="flex items-baseline justify-between gap-2">
        <Label id={`artist-names-${userId}`}>ชื่อศิลปินที่ใช้ส่งผลงานได้</Label>
        <span className="text-muted-foreground text-xs tabular-nums">
          {names.length}/{MAX_ARTIST_NAMES}
        </span>
      </div>
      <p className="text-muted-foreground text-xs leading-relaxed text-pretty">
        {isLabel
          ? `ค่ายเพลงเพิ่มชื่อศิลปินได้สูงสุด ${MAX_ARTIST_NAMES} ชื่อ`
          : `ศิลปินทั่วไปใช้ได้ 1 ชื่อ — เพิ่มชื่อมากกว่า 1 ได้สำหรับ Artist Pro (สูงสุด ${MAX_ARTIST_NAMES})`}
      </p>

      {names.length ? (
        <ul className="flex flex-wrap gap-2">
          {names.map((n) => (
            <li
              key={n.id}
              className="bg-secondary text-secondary-foreground flex items-center gap-1 rounded-full py-1 pr-1 pl-3 text-sm"
            >
              <span className="max-w-48 truncate">{n.name}</span>
              <button
                type="button"
                onClick={() => handleRemove(n.id)}
                disabled={removingId === n.id}
                aria-label={`ลบชื่อ ${n.name}`}
                className="hover:bg-background/60 text-muted-foreground hover:text-foreground flex size-8 items-center justify-center rounded-full transition-colors disabled:opacity-50"
              >
                {removingId === n.id ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <X className="size-3.5" />
                )}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">ยังไม่มีชื่อศิลปิน</p>
      )}

      <form
        ref={formRef}
        action={(fd) => {
          setRemoveState(initial)
          action(fd)
        }}
        className="flex gap-2"
      >
        <input type="hidden" name="userId" value={userId} />
        <Input
          name="name"
          placeholder={full ? 'ครบจำนวนสูงสุดแล้ว' : 'เพิ่มชื่อศิลปิน'}
          disabled={full}
          maxLength={200}
          aria-label="ชื่อศิลปินใหม่"
          className="h-11 text-base md:text-sm"
        />
        <AddButton disabled={full} />
      </form>

      {message.status !== 'idle' && message.message ? (
        <p
          role="status"
          className={
            message.status === 'success' ? 'text-success text-xs' : 'text-destructive text-xs'
          }
        >
          {message.message}
        </p>
      ) : null}
    </section>
  )
}
