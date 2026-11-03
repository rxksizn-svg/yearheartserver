import { createServiceClient } from '@/lib/supabase/admin'
import { RELEASE_STATUS_LABELS, type ReleaseStatus } from '@/lib/types'

type WebhookChannel = 'release' | 'takedown' | 'status'

const WEBHOOK_ENV: Record<WebhookChannel, string> = {
  release: 'DISCORD_RELEASE_WEBHOOK_URL',
  takedown: 'DISCORD_TAKEDOWN_WEBHOOK_URL',
  status: 'DISCORD_STATUS_WEBHOOK_URL',
}

const COLORS = {
  release: 0x3b82f6,
  status: 0x10b981,
  takedown: 0xef4444,
  takedownRejected: 0xf59e0b,
} as const

export type DiscordReleaseInfo = {
  id?: string | null
  song_title: string
  artist_name: string
  status: ReleaseStatus | string
  track_type?: string | null
  album_name?: string | null
  submitter_name?: string | null
  submitter_email?: string | null
  cover_path?: string | null
  cover_url?: string | null
}

type EmbedField = { name: string; value: string; inline?: boolean }

const COVER_URL_TTL_SECONDS = 60 * 60 * 24 * 7

async function resolveCoverUrl(release: DiscordReleaseInfo) {
  if (release.cover_path) {
    try {
      const { data } = await createServiceClient()
        .storage.from('release-assets')
        .createSignedUrl(release.cover_path, COVER_URL_TTL_SECONDS)
      if (data?.signedUrl) return data.signedUrl
    } catch (err) {
      console.log('[v0] Discord cover sign failed:', (err as Error).message)
    }
  }
  if (release.cover_url && /^https?:\/\//i.test(release.cover_url)) {
    return release.cover_url
  }
  return null
}

function statusLabel(status: string) {
  return RELEASE_STATUS_LABELS[status as ReleaseStatus] ?? status
}

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value
}

async function postToDiscord(
  channel: WebhookChannel,
  embed: Record<string, unknown>,
) {
  const url = process.env[WEBHOOK_ENV[channel]]
  if (!url) {
    console.log(`[v0] ${WEBHOOK_ENV[channel]} is not set; skipping Discord notification`)
    return
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed], allowed_mentions: { parse: [] } }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) {
      console.log('[v0] Discord webhook failed:', res.status, await res.text())
    }
  } catch (err) {
    console.log('[v0] Discord webhook error:', (err as Error).message)
  }
}

function baseFields(release: DiscordReleaseInfo): EmbedField[] {
  const fields: EmbedField[] = [
    { name: 'ชื่อเพลง', value: truncate(release.song_title, 1024), inline: true },
    { name: 'ศิลปิน', value: truncate(release.artist_name, 1024), inline: true },
    { name: 'สถานะ', value: statusLabel(release.status), inline: true },
  ]
  if (release.track_type) {
    fields.push({ name: 'ประเภท', value: release.track_type, inline: true })
  }
  if (release.album_name) {
    fields.push({ name: 'อัลบั้ม', value: truncate(release.album_name, 1024), inline: true })
  }
  const submitter = [release.submitter_name, release.submitter_email]
    .filter(Boolean)
    .join(' · ')
  if (submitter) {
    fields.push({ name: 'ผู้ส่ง', value: truncate(submitter, 1024) })
  }
  return fields
}

export async function notifyReleaseSubmitted(
  release: DiscordReleaseInfo,
  kind: 'new' | 'revised' = 'new',
) {
  const cover = await resolveCoverUrl(release)
  await postToDiscord('release', {
    title: truncate(
      kind === 'revised'
        ? `ลูกค้าส่งแก้ไขผลงาน: ${release.song_title}`
        : `ผลงานใหม่ส่งเข้าระบบ: ${release.song_title}`,
      256,
    ),
    color: COLORS.release,
    fields: baseFields(release),
    ...(cover ? { thumbnail: { url: cover } } : {}),
    footer: release.id ? { text: `Release ID: ${release.id}` } : undefined,
    timestamp: new Date().toISOString(),
  })
}

export async function notifyReleaseStatusChanged(
  release: DiscordReleaseInfo,
  previousStatus: string,
  adminNote?: string | null,
) {
  const fields = baseFields(release)
  fields.splice(2, 1, {
    name: 'สถานะ',
    value: `${statusLabel(previousStatus)} → **${statusLabel(release.status)}**`,
    inline: true,
  })
  if (adminNote) {
    fields.push({ name: 'หมายเหตุแอดมิน', value: truncate(adminNote, 1024) })
  }

  const cover = await resolveCoverUrl(release)
  await postToDiscord('status', {
    title: truncate(`อัปเดตสถานะ: ${release.song_title}`, 256),
    color: COLORS.status,
    fields,
    ...(cover ? { thumbnail: { url: cover } } : {}),
    footer: release.id ? { text: `Release ID: ${release.id}` } : undefined,
    timestamp: new Date().toISOString(),
  })
}

export async function notifyTakedown(
  release: DiscordReleaseInfo,
  event: 'requested' | 'completed' | 'rejected',
  extra?: { reason?: string | null; adminNote?: string | null },
) {
  const titles = {
    requested: 'มีคำขอ TakeDown ใหม่',
    completed: 'TakeDown สำเร็จ',
    rejected: 'ไม่สามารถ TakeDown ได้',
  }
  const fields = baseFields(release)
  if (extra?.reason) {
    fields.push({ name: 'เหตุผลที่ขอลบ', value: truncate(extra.reason, 1024) })
  }
  if (extra?.adminNote) {
    fields.push({ name: 'หมายเหตุแอดมิน', value: truncate(extra.adminNote, 1024) })
  }

  const cover = await resolveCoverUrl(release)
  await postToDiscord('takedown', {
    title: truncate(`${titles[event]}: ${release.song_title}`, 256),
    color: event === 'rejected' ? COLORS.takedownRejected : COLORS.takedown,
    fields,
    ...(cover ? { thumbnail: { url: cover } } : {}),
    footer: release.id ? { text: `Release ID: ${release.id}` } : undefined,
    timestamp: new Date().toISOString(),
  })
}
