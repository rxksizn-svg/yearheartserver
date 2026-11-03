import type { SVGProps } from 'react'

export type PlatformId =
  | 'spotify'
  | 'apple'
  | 'youtube'
  | 'tiktok'
  | 'amazon'
  | 'deezer'
  | 'tidal'

type PlatformIcon = (props: SVGProps<SVGSVGElement>) => JSX.Element

export type Platform = {
  id: PlatformId
  name: string
  color: string
  Icon: PlatformIcon
}

const SpotifyIcon: PlatformIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.5 17.32a.75.75 0 0 1-1.03.25c-2.82-1.72-6.37-2.11-10.55-1.16a.75.75 0 1 1-.33-1.46c4.57-1.03 8.5-.58 11.66 1.34.36.22.47.68.25 1.03zm1.47-3.27a.94.94 0 0 1-1.29.31c-3.23-1.98-8.16-2.56-11.98-1.4a.94.94 0 1 1-.54-1.8c4.37-1.32 9.8-.68 13.5 1.6.44.27.58.85.31 1.29zm.13-3.4C15.72 8.27 8.84 8.05 5.05 9.2a1.13 1.13 0 1 1-.65-2.16c4.35-1.32 11.95-1.06 16.17 1.44a1.13 1.13 0 0 1-1.15 1.94z" />
  </svg>
)

const AppleMusicIcon: PlatformIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M23.99 6.12c0-.51-.05-1.03-.16-1.53a4.9 4.9 0 0 0-1.5-2.61A4.9 4.9 0 0 0 19.4.29c-.5-.11-1.02-.16-1.53-.17C17.64.1 17.4.1 15.6.1H8.4C6.6.1 6.36.1 6.13.12c-.51.01-1.03.06-1.53.17a4.9 4.9 0 0 0-2.6 1.5 4.9 4.9 0 0 0-1.3 2.8C.1 5.3.1 5.54.1 7.34v9.32c0 1.8 0 2.04.02 2.27.01.51.06 1.03.17 1.53a4.9 4.9 0 0 0 1.5 2.61 4.9 4.9 0 0 0 2.6 1.3c.5.1 1.02.15 1.53.16.23.02.47.02 2.27.02h7.62c1.8 0 2.04 0 2.27-.02a8.3 8.3 0 0 0 1.53-.16 4.9 4.9 0 0 0 2.61-1.5 4.9 4.9 0 0 0 1.3-2.6c.11-.5.16-1.02.17-1.53.02-.23.02-.47.02-2.27V7.34c0-.4 0-.82-.01-1.22zM17.3 8.6v6.68c0 .43-.02.86-.2 1.26-.28.63-.79 1-1.45 1.15-.36.08-.73.1-1.1.05a1.9 1.9 0 0 1-1.63-2.06c.07-.79.6-1.4 1.4-1.58.3-.06.6-.07.9-.13.32-.06.53-.26.58-.58.01-.07.02-.15.02-.22V9.3c0-.35-.16-.47-.5-.4l-4.3.87c-.3.06-.42.2-.42.5v6.28c0 .43-.03.85-.2 1.25-.28.63-.79 1-1.45 1.15-.37.08-.74.1-1.1.05a1.9 1.9 0 0 1-1.64-2.06c.08-.79.6-1.4 1.4-1.58.3-.06.6-.07.9-.13.33-.06.54-.26.59-.58V7.83c0-.45.2-.72.64-.81l6.02-1.22c.4-.08.6.08.6.5v2.3z" />
  </svg>
)

const YouTubeMusicIcon: PlatformIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm0 18.66A6.66 6.66 0 1 1 18.66 12 6.67 6.67 0 0 1 12 18.66zm-2.4-9.9v6.48L15.6 12z" />
  </svg>
)

const TikTokIcon: PlatformIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.9 2.9 0 0 1-5.2 1.74 2.9 2.9 0 0 1 2.9-4.55V9.4a6.33 6.33 0 0 0-5.4 10.98 6.33 6.33 0 0 0 10.86-4.4V8.56a8.16 8.16 0 0 0 4.06 1.1V6.69z" />
  </svg>
)

const AmazonMusicIcon: PlatformIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 4.5a2 2 0 0 1 2 2v4.03a3.5 3.5 0 1 1-1.5-2.87V8.5a.5.5 0 0 0-.5-.5.5.5 0 0 0-.5.5v6a.5.5 0 0 1-1 0v-6a2 2 0 0 1 1.5-1.94V6.5zm-1 6.5a2 2 0 1 0 0 .01z" />
  </svg>
)

const DeezerIcon: PlatformIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M18.8 5.2H24v3.03h-5.2zM12.4 9.1H24v3.03H12.4zM18.8 13H24v3.02h-5.2zM0 16.98h5.2V20H0zm6.4 0h5.2V20H6.4zm6.4 0H24V20H12.8zM6.4 13h5.2v3.02H6.4zm0-3.9h5.2v3.03H6.4zM0 13h5.2v3.02H0z" />
  </svg>
)

const TidalIcon: PlatformIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M12.01 3.99 8.02 7.98 4.03 3.99 0 8.02l4 4 4-4-3.99-4.03zm7.98 0-3.99 3.99 4 4 3.99-4zm-7.98 8.03-4 4 4 4 4-4zm0 0" />
  </svg>
)

export const PLATFORMS: Record<PlatformId, Platform> = {
  spotify: { id: 'spotify', name: 'Spotify', color: '#1DB954', Icon: SpotifyIcon },
  apple: { id: 'apple', name: 'Apple Music', color: '#FA57C1', Icon: AppleMusicIcon },
  youtube: { id: 'youtube', name: 'YouTube Music', color: '#FF0000', Icon: YouTubeMusicIcon },
  tiktok: { id: 'tiktok', name: 'TikTok', color: '#25F4EE', Icon: TikTokIcon },
  amazon: { id: 'amazon', name: 'Amazon Music', color: '#25D1DA', Icon: AmazonMusicIcon },
  deezer: { id: 'deezer', name: 'Deezer', color: '#A238FF', Icon: DeezerIcon },
  tidal: { id: 'tidal', name: 'Tidal', color: '#8DB8CC', Icon: TidalIcon },
}

export const PLATFORM_LIST: Platform[] = Object.values(PLATFORMS)

const DSP_ALIASES: Record<string, PlatformId> = {
  spotify: 'spotify',
  'apple music': 'apple',
  apple: 'apple',
  itunes: 'apple',
  'youtube music': 'youtube',
  youtube: 'youtube',
  'youtube content id': 'youtube',
  tiktok: 'tiktok',
  'amazon music': 'amazon',
  amazon: 'amazon',
  deezer: 'deezer',
  tidal: 'tidal',
  joox: 'tidal',
}

/**
 * Resolve a free-text DSP name (as it appears in royalty statements) to a known
 * platform for icon and color. Falls back to Spotify styling for unknown DSPs.
 */
export function dspToPlatform(dsp: string): Platform {
  const id = DSP_ALIASES[dsp.trim().toLowerCase()]
  return id ? PLATFORMS[id] : PLATFORMS.spotify
}

/** A stable brand color for any DSP name, for charts. */
export function dspColor(dsp: string): string {
  return dspToPlatform(dsp).color
}
