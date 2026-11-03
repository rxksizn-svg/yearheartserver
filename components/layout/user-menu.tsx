'use client'

import * as React from 'react'
import Link from 'next/link'
import { LogOut, Settings, ChevronsUpDown } from 'lucide-react'

import { signOut } from '@/app/actions/auth'
import { cn } from '@/lib/utils'
import { ROLE_LABELS, type Profile } from '@/lib/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

function initials(profile: Profile) {
  const source =
    profile.artist_name || profile.label_name || profile.name || profile.email
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

function displayName(profile: Profile) {
  return (
    profile.artist_name ||
    profile.label_name ||
    profile.name ||
    profile.email.split('@')[0]
  )
}

export function UserMenu({ profile }: { profile: Profile }) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="hover:bg-accent ml-1 flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors"
      >
        <Avatar>
          <AvatarImage src="/avatar.png" alt="" />
          <AvatarFallback>{initials(profile)}</AvatarFallback>
        </Avatar>
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-sm font-medium">
            {displayName(profile)}
          </span>
          <span className="text-muted-foreground block text-xs">
            {ROLE_LABELS[profile.role]}
          </span>
        </span>
        <ChevronsUpDown className="text-muted-foreground hidden size-4 sm:block" />
      </button>

      {open && (
        <div
          role="menu"
          className="bg-popover text-popover-foreground absolute right-0 top-[calc(100%+0.5rem)] z-50 w-60 overflow-hidden rounded-xl border p-1 shadow-lg"
        >
          <div className="px-3 py-2.5">
            <p className="truncate text-sm font-medium">
              {displayName(profile)}
            </p>
            <p className="text-muted-foreground truncate text-xs">
              {profile.email}
            </p>
          </div>
          <div className="bg-border my-1 h-px" />
          <Link
            href="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className={cn(
              'hover:bg-accent flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
            )}
          >
            <Settings className="size-4" />
            ตั้งค่าบัญชี
          </Link>
          <div className="bg-border my-1 h-px" />
          <form action={signOut}>
            <button
              type="submit"
              role="menuitem"
              className="text-destructive hover:bg-destructive/10 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
            >
              <LogOut className="size-4" />
              ออกจากระบบ
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
