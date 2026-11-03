'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LifeBuoy, Settings, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  groupedNavItemsForRole,
  NAV_GROUP_LABELS,
} from '@/components/layout/nav-items'
import type { UserRole } from '@/lib/types'
import { useUnreadChats } from '@/components/support/use-unread-chats'

function isActive(pathname: string, href: string, exact = false) {
  if (href === '/' || exact) return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function SidebarContent({
  role,
  onNavigate,
}: {
  role: UserRole
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const sections = groupedNavItemsForRole(role)
  const unreadChats = useUnreadChats()
  const chatHref = role === 'admin' ? '/admin/support' : '/support'

  return (
    <div className="flex h-full flex-col gap-2">
      <Link
        href="/"
        onClick={onNavigate}
        className="flex h-20 items-center px-6"
        aria-label="หน้าแรก Yearheart Artist Portal"
      >
        <Image
          src="/yearheart-logo.png"
          alt="Yearheart Entertainment"
          width={640}
          height={210}
          priority
          className="h-11 w-auto brightness-0 dark:brightness-100"
        />
      </Link>

      <nav className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-3 py-2">
        {sections.map((section) => (
          <div key={section.group} className="space-y-1">
            <p className="text-muted-foreground px-3 pb-1 text-xs font-medium uppercase tracking-wide">
              {NAV_GROUP_LABELS[section.group]}
            </p>
            {section.items.map((item) => {
              const active = isActive(pathname, item.href, item.exact)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-brand/10 text-brand'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  <span className="relative shrink-0">
                    <item.icon className="size-4.5" />
                    {item.href === chatHref && unreadChats > 0 ? (
                      <span
                        aria-hidden="true"
                        className="bg-destructive ring-background absolute -right-0.5 -top-0.5 size-2 animate-pulse rounded-full ring-2"
                      />
                    ) : null}
                  </span>
                  <span className="flex-1">{item.label}</span>
                  {item.href === chatHref && unreadChats > 0 ? (
                    <span className="bg-destructive text-destructive-foreground flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold tabular-nums">
                      {unreadChats > 99 ? '99+' : unreadChats}
                      <span className="sr-only"> แชทที่ยังไม่ได้อ่าน</span>
                    </span>
                  ) : null}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="space-y-1 px-3 pb-2">
        <Link
          href="/settings"
          onClick={onNavigate}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            isActive(pathname, '/settings')
              ? 'bg-brand/10 text-brand'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
        >
          <Settings className="size-4.5 shrink-0" />
          ตั้งค่า
        </Link>
        <a
          href="mailto:support@yearheart.com"
          className="text-muted-foreground hover:bg-accent hover:text-foreground flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-300 hover:translate-x-0.5"
        >
          <LifeBuoy className="size-4.5 shrink-0" />
          ติดต่อฝ่ายสนับสนุน
        </a>
      </div>

      <div className="border-t p-3">
        <div className="from-brand/15 to-accent-2/10 rounded-xl bg-gradient-to-br p-4">
          <p className="text-sm font-semibold">แพ็กเกจ Pro</p>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            ปล่อยผลงานได้ไม่จำกัด และไม่หักค่าคอมมิชชันจากรายได้
          </p>
          <Button size="sm" className="mt-3 w-full">
            อัปเกรด
          </Button>
        </div>
      </div>
    </div>
  )
}

export function Sidebar({ role }: { role: UserRole }) {
  return (
    <aside className="glass border-border/50 hidden w-64 shrink-0 border-r lg:block">
      <div className="sticky top-0 h-screen">
        <SidebarContent role={role} />
      </div>
    </aside>
  )
}

export function MobileSidebar({
  role,
  open,
  onClose,
}: {
  role: UserRole
  open: boolean
  onClose: () => void
}) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-50 lg:hidden',
        open ? 'pointer-events-auto' : 'pointer-events-none',
      )}
      aria-hidden={!open}
    >
      <div
        className={cn(
          'absolute inset-0 bg-black/50 transition-opacity',
          open ? 'opacity-100' : 'opacity-0',
        )}
        onClick={onClose}
      />
      <div
        className={cn(
          'bg-card absolute inset-y-0 left-0 w-64 border-r shadow-xl transition-transform duration-300',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-3"
          onClick={onClose}
          aria-label="ปิดเมนู"
        >
          <X />
        </Button>
        <SidebarContent role={role} onNavigate={onClose} />
      </div>
    </div>
  )
}
