'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'

import { Sidebar, MobileSidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { AnnouncementTicker, type TickerItem } from '@/components/news/announcement-ticker'
import type { Profile } from '@/lib/types'

export function AppShell({
  profile,
  tickerItems,
  children,
}: {
  profile: Profile
  tickerItems: TickerItem[]
  children: React.ReactNode
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const pathname = usePathname()

  React.useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  return (
    <div className="flex min-h-screen">
      <Sidebar role={profile.role} />
      <MobileSidebar
        role={profile.role}
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <AnnouncementTicker items={tickerItems} />
        <Header profile={profile} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  )
}
