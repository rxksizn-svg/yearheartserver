import { AppShell } from '@/components/layout/app-shell'
import { requireProfile } from '@/lib/auth'
import { getActiveAnnouncements } from '@/lib/data/news'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [profile, announcements] = await Promise.all([
    requireProfile(),
    getActiveAnnouncements(20),
  ])
  const tickerItems = announcements
    .filter((a) => a.show_in_ticker)
    .map((a) => ({ id: a.id, title: a.title }))

  return (
    <AppShell profile={profile} tickerItems={tickerItems}>
      {children}
    </AppShell>
  )
}
