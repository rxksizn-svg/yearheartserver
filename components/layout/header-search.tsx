'use client'

import * as React from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'

import { Input } from '@/components/ui/input'

const SEARCHABLE_ADMIN_PATHS = ['/admin/users', '/admin/releases', '/admin/takedown']

function searchTarget(pathname: string, isAdmin: boolean) {
  if (SEARCHABLE_ADMIN_PATHS.includes(pathname)) return pathname
  if (pathname.startsWith('/admin') && isAdmin) return '/admin/releases'
  return '/releases'
}

function HeaderSearchInput({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const urlQuery = searchParams.get('q') ?? ''
  const [value, setValue] = React.useState(urlQuery)

  React.useEffect(() => {
    setValue(urlQuery)
  }, [urlQuery])

  const target = searchTarget(pathname, isAdmin)
  const placeholder =
    target === '/admin/users'
      ? 'ค้นหาผู้ใช้, อีเมล...'
      : target === '/admin/takedown'
        ? 'ค้นหาคำขอ TakeDown...'
        : 'ค้นหาผลงานเพลง, ศิลปิน, รหัส...'

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const q = value.trim()
    router.push(q ? `${target}?q=${encodeURIComponent(q)}` : target)
  }

  return (
    <form role="search" onSubmit={submit} className="relative w-full">
      <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
      <Input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="pl-9"
        aria-label="ค้นหา"
      />
    </form>
  )
}

export function HeaderSearch({ isAdmin }: { isAdmin: boolean }) {
  return (
    <React.Suspense
      fallback={
        <div className="relative w-full">
          <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
          <Input placeholder="ค้นหา..." className="pl-9" aria-label="ค้นหา" disabled />
        </div>
      }
    >
      <HeaderSearchInput isAdmin={isAdmin} />
    </React.Suspense>
  )
}
