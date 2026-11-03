'use client'

import Link from 'next/link'
import { Bell, Menu, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { HeaderSearch } from '@/components/layout/header-search'
import { ThemeToggle } from '@/components/theme-toggle'
import { UserMenu } from '@/components/layout/user-menu'
import type { Profile } from '@/lib/types'

export function Header({
  profile,
  onMenuClick,
}: {
  profile: Profile
  onMenuClick: () => void
}) {
  return (
    <header className="bg-background/55 border-border/50 sticky top-0 z-30 flex h-16 items-center gap-3 border-b px-4 backdrop-blur-xl backdrop-saturate-150 lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
        aria-label="เปิดเมนู"
      >
        <Menu />
      </Button>

      <div className="hidden max-w-sm flex-1 md:block">
        <HeaderSearch isAdmin={profile.role === 'admin'} />
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <Button
          nativeButton={false}
          render={<Link href="/releases/new" />}
          size="sm"
          className="hidden sm:inline-flex"
        >
          <Plus />
          อัปโหลดผลงานใหม่
        </Button>
        <Button
          nativeButton={false}
          render={<Link href="/releases/new" />}
          size="icon"
          className="sm:hidden"
          aria-label="อัปโหลดผลงานใหม่"
        >
          <Plus />
        </Button>

        <ThemeToggle />

        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="การแจ้งเตือน"
        >
          <Bell />
          <span className="bg-brand absolute right-2 top-2 size-2 rounded-full ring-2 ring-background" />
        </Button>

        <UserMenu profile={profile} />
      </div>
    </header>
  )
}
