import {
  LayoutDashboard,
  Disc3,
  LineChart,
  Wallet,
  BanknoteArrowDown,
  LifeBuoy,
  Trash2,
  Activity,
  Users,
  FileUp,
  MessagesSquare,
  ClipboardList,
  Megaphone,
  Newspaper,
  Barcode,
  type LucideIcon,
} from 'lucide-react'
import type { UserRole } from '@/lib/types'

export type NavGroup = 'main' | 'services' | 'admin'

export const NAV_GROUP_LABELS: Record<NavGroup, string> = {
  main: 'เมนูหลัก',
  services: 'บริการเสริม',
  admin: 'ผู้ดูแลระบบ',
}

export const NAV_GROUP_ORDER: NavGroup[] = ['main', 'services', 'admin']

export type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  badge?: string
  adminOnly?: boolean
  group?: NavGroup
  /** Only highlight on the exact path, not on nested routes. */
  exact?: boolean
}

export const navItems: NavItem[] = [
  { label: 'แดชบอร์ด', href: '/', icon: LayoutDashboard, exact: true },
  { label: 'ผลงานเพลง', href: '/releases', icon: Disc3 },
  { label: 'การวิเคราะห์', href: '/analytics', icon: LineChart },
  { label: 'รายได้ & ค่าลิขสิทธิ์', href: '/earnings', icon: Wallet },
  { label: 'การถอนเงิน', href: '/withdrawals', icon: BanknoteArrowDown },
  { label: 'ประกาศ', href: '/announcements', icon: Megaphone },
  { label: 'ข่าวสาร', href: '/news', icon: Newspaper },
  { label: 'ช่วยเหลือ & แชทสด', href: '/support', icon: LifeBuoy },
  { label: 'TakeDown', href: '/takedown', icon: Trash2, group: 'services' },
  { label: 'ภาพรวมระบบ', href: '/admin', icon: Activity, group: 'admin', adminOnly: true, exact: true },
  { label: 'จัดการผู้ใช้', href: '/admin/users', icon: Users, group: 'admin', adminOnly: true },
  { label: 'จัดการผลงานเพลง', href: '/admin/releases', icon: Disc3, group: 'admin', adminOnly: true },
  { label: 'อัพเดท UPC', href: '/admin/upc', icon: Barcode, group: 'admin', adminOnly: true },
  { label: 'TakeDown Admin', href: '/admin/takedown', icon: ClipboardList, group: 'admin', adminOnly: true },
  { label: 'คำขอถอนเงิน', href: '/admin/payouts', icon: BanknoteArrowDown, group: 'admin', adminOnly: true },
  { label: 'นำเข้ารายได้', href: '/admin/revenue', icon: FileUp, group: 'admin', adminOnly: true },
  { label: 'แชทสดกับผู้ใช้', href: '/admin/support', icon: MessagesSquare, group: 'admin', adminOnly: true },
  { label: 'จัดการประกาศ', href: '/admin/announcements', icon: Megaphone, group: 'admin', adminOnly: true },
  { label: 'จัดการข่าวสาร', href: '/admin/news', icon: Newspaper, group: 'admin', adminOnly: true },
]

export function navItemsForRole(role: UserRole): NavItem[] {
  return navItems.filter((item) => !item.adminOnly || role === 'admin')
}

/** Groups the role-visible nav items by their section, preserving order. */
export function groupedNavItemsForRole(
  role: UserRole,
): { group: NavGroup; items: NavItem[] }[] {
  const items = navItemsForRole(role)
  return NAV_GROUP_ORDER.map((group) => ({
    group,
    items: items.filter((item) => (item.group ?? 'main') === group),
  })).filter((section) => section.items.length > 0)
}
