import type { PlatformId } from '@/lib/platforms'

export const USD_TO_THB = 36.5

export function formatUSD(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value)
}

export function formatTHB(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatCompact(value: number) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

export type ReleaseStatus =
  | 'processing'
  | 'delivered'
  | 'live'
  | 'action_required'

export const STATUS_LABEL: Record<ReleaseStatus, string> = {
  processing: 'Processing',
  delivered: 'Delivered to Stores',
  live: 'Live',
  action_required: 'Action Required',
}

export type Release = {
  id: string
  title: string
  artist: string
  type: 'Single' | 'EP' | 'Album'
  cover: string
  releaseDate: string
  tracks: number
  status: ReleaseStatus
  platforms: PlatformId[]
  streams: number
  revenue: number
}

export const releases: Release[] = [
  {
    id: 'REL-2041',
    title: 'Neon Skyline',
    artist: 'Aurora Wave',
    type: 'Album',
    cover: '/covers/neon-skyline.png',
    releaseDate: '2026-08-14',
    tracks: 11,
    status: 'live',
    platforms: ['spotify', 'apple', 'youtube', 'tiktok', 'amazon', 'deezer', 'tidal'],
    streams: 4820500,
    revenue: 18240.55,
  },
  {
    id: 'REL-2038',
    title: 'Midnight Frequencies',
    artist: 'Kilo Echo',
    type: 'EP',
    cover: '/covers/midnight-frequencies.png',
    releaseDate: '2026-09-02',
    tracks: 5,
    status: 'delivered',
    platforms: ['spotify', 'apple', 'youtube', 'amazon'],
    streams: 1204300,
    revenue: 5120.12,
  },
  {
    id: 'REL-2035',
    title: 'Golden Hour',
    artist: 'Mira Solace',
    type: 'Single',
    cover: '/covers/golden-hour.png',
    releaseDate: '2026-09-10',
    tracks: 1,
    status: 'processing',
    platforms: ['spotify', 'apple', 'tiktok'],
    streams: 0,
    revenue: 0,
  },
  {
    id: 'REL-2031',
    title: 'Paper Planes',
    artist: 'The Hollow Coast',
    type: 'Single',
    cover: '/covers/paper-planes.png',
    releaseDate: '2026-07-22',
    tracks: 1,
    status: 'action_required',
    platforms: ['spotify', 'apple', 'youtube'],
    streams: 302100,
    revenue: 980.4,
  },
  {
    id: 'REL-2027',
    title: 'Static Bloom',
    artist: 'Aurora Wave',
    type: 'EP',
    cover: '/covers/static-bloom.png',
    releaseDate: '2026-06-05',
    tracks: 6,
    status: 'live',
    platforms: ['spotify', 'apple', 'youtube', 'tiktok', 'amazon'],
    streams: 2680900,
    revenue: 9870.3,
  },
  {
    id: 'REL-2019',
    title: 'Coastlines',
    artist: 'Mira Solace',
    type: 'Album',
    cover: '/covers/coastlines.png',
    releaseDate: '2026-04-18',
    tracks: 9,
    status: 'live',
    platforms: ['spotify', 'apple', 'youtube', 'amazon', 'deezer'],
    streams: 3410200,
    revenue: 12450.9,
  },
]

export const overviewStats = {
  totalStreams: releases.reduce((sum, r) => sum + r.streams, 0),
  totalRevenue: releases.reduce((sum, r) => sum + r.revenue, 0),
  activeReleases: releases.filter((r) => r.status === 'live').length,
  pendingApprovals: releases.filter(
    (r) => r.status === 'processing' || r.status === 'action_required',
  ).length,
  streamsChange: 12.4,
  revenueChange: 8.9,
  releasesChange: 2,
  approvalsChange: -1,
}

export type MonthlyPoint = {
  month: string
  revenue: number
  streams: number
}

export const monthlyRevenue: MonthlyPoint[] = [
  { month: 'Jan', revenue: 3120, streams: 820000 },
  { month: 'Feb', revenue: 3980, streams: 1010000 },
  { month: 'Mar', revenue: 4210, streams: 1120000 },
  { month: 'Apr', revenue: 5320, streams: 1380000 },
  { month: 'May', revenue: 4890, streams: 1290000 },
  { month: 'Jun', revenue: 6140, streams: 1610000 },
  { month: 'Jul', revenue: 7250, streams: 1890000 },
  { month: 'Aug', revenue: 8420, streams: 2210000 },
  { month: 'Sep', revenue: 9310, streams: 2480000 },
]

export type PlatformRevenue = {
  id: PlatformId
  streams: number
  revenue: number
  change: number
}

export const platformRevenue: PlatformRevenue[] = [
  { id: 'spotify', streams: 6120000, revenue: 24180.4, change: 9.2 },
  { id: 'apple', streams: 3210000, revenue: 15320.8, change: 6.1 },
  { id: 'youtube', streams: 2840000, revenue: 7420.15, change: 14.7 },
  { id: 'tiktok', streams: 1920000, revenue: 3110.6, change: 22.3 },
  { id: 'amazon', streams: 1240000, revenue: 4980.2, change: 4.4 },
  { id: 'deezer', streams: 620000, revenue: 1820.9, change: -2.1 },
  { id: 'tidal', streams: 310000, revenue: 1210.35, change: 1.8 },
]

export type Payout = {
  id: string
  date: string
  method: string
  amount: number
  status: 'Paid' | 'Pending' | 'Processing'
}

export const payouts: Payout[] = [
  { id: 'PO-9921', date: '2026-09-01', method: 'Bank Transfer •••• 4821', amount: 6420.5, status: 'Paid' },
  { id: 'PO-9834', date: '2026-08-01', method: 'PayPal • mira@studio.co', amount: 5810.2, status: 'Paid' },
  { id: 'PO-9740', date: '2026-07-01', method: 'Bank Transfer •••• 4821', amount: 4980.9, status: 'Paid' },
  { id: 'PO-9655', date: '2026-06-01', method: 'Wise • USD Balance', amount: 3120.75, status: 'Paid' },
  { id: 'PO-9990', date: '2026-09-15', method: 'Bank Transfer •••• 4821', amount: 7240.3, status: 'Processing' },
]

export const availableBalance = 8320.45
export const pendingBalance = 2140.6

export type Activity = {
  id: string
  title: string
  description: string
  time: string
  type: 'live' | 'revenue' | 'processing' | 'action'
}

export const recentActivity: Activity[] = [
  { id: 'a1', title: 'Neon Skyline is now live', description: 'Available on all 7 platforms', time: '2h ago', type: 'live' },
  { id: 'a2', title: 'Payout processed', description: '$6,420.50 sent to Bank Transfer', time: '5h ago', type: 'revenue' },
  { id: 'a3', title: 'Action required: Paper Planes', description: 'Cover art does not meet Apple Music specs', time: '1d ago', type: 'action' },
  { id: 'a4', title: 'Midnight Frequencies delivered', description: 'Delivered to 4 stores, awaiting go-live', time: '2d ago', type: 'processing' },
  { id: 'a5', title: 'Golden Hour submitted', description: 'Processing for 3 platforms', time: '3d ago', type: 'processing' },
]
