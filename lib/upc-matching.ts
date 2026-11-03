export type UpcCatalogRelease = {
  id: string
  track_no: number | null
  song_title: string
  artist_name: string
  album_name: string | null
  track_type: string | null
  upc_ean_isrc: string | null
  isrc: string | null
  owner_email: string | null
}

export type UpcSourceRow = {
  rowNumber: number
  songTitle: string
  artistName: string
  albumName: string
  rawUpc: string
  rawIsrc: string
  /** Optional owner email; lowercased after matching, '' when not given. */
  email: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * exact     — ISRC already on a release, or title + artist match exactly one release
 * fuzzy     — matched after dropping feat./prod./brackets; admin should eyeball
 * ambiguous — several releases fit; admin must pick one (or add as new)
 * none      — nothing in the catalog fits; will be added as a new release
 * invalid   — missing title/artist, no code, or a code in the wrong format
 */
export type UpcMatchKind = 'exact' | 'fuzzy' | 'ambiguous' | 'none' | 'invalid'

export type UpcMatchResult = UpcSourceRow & {
  upc: string | null
  isrc: string | null
  invalidReason: string | null
  kind: UpcMatchKind
  candidates: UpcCatalogRelease[]
}

/** UPC-A (12), EAN-13 (13), EAN-8 (8), GTIN-14 (14). */
export const UPC_PATTERN = /^(?:\d{8}|\d{12,14})$/
/** ISRC: CC-XXX-YY-NNNNN without separators. */
export const ISRC_PATTERN = /^[A-Z]{2}[A-Z0-9]{3}\d{7}$/

function stripCode(raw: string): string {
  return raw.replace(/[\s\-_.]/g, '').toUpperCase()
}

/** Returns '' for an empty cell, null for an invalid one. */
export function normalizeUpc(raw: string): string | null {
  const cleaned = stripCode(raw)
  if (!cleaned) return ''
  // Excel drops the leading zero of 12-digit UPCs that start with 0.
  const padded = /^\d{11}$/.test(cleaned) ? `0${cleaned}` : cleaned
  return UPC_PATTERN.test(padded) ? padded : null
}

/** Returns '' for an empty cell, null for an invalid one. */
export function normalizeIsrc(raw: string): string | null {
  const cleaned = stripCode(raw)
  if (!cleaned) return ''
  return ISRC_PATTERN.test(cleaned) ? cleaned : null
}

/** Lowercase and drop everything except letters, combining marks (Thai vowels/tones) and digits. */
export function normalizeText(value: string | null | undefined): string {
  return (value ?? '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, '')
}

const FEATURE_SPLIT = /\s*(?:\(|\[|\bfeat\.?|\bft\.?|\bprod\.?|\bfeaturing\b)/i

/** "SAYDAT feat. KxwSkrrt (Remix)" -> "saydat" */
function coreTitle(title: string): string {
  return normalizeText(title.split(FEATURE_SPLIT)[0] ?? title)
}

/** "Ssy, Infectus & Lil fame" -> ["ssy", "infectus", "lilfame"] */
function artistTokens(artist: string): string[] {
  return artist
    .split(/\s*(?:,|&|\+|\/|\bx\b|\band\b|\bfeat\.?|\bft\.?)\s*/i)
    .map(normalizeText)
    .filter(Boolean)
}

function sharesArtist(a: string[], b: string[]): boolean {
  return a.some((token) => b.includes(token))
}

export function songKey(title: string, artist: string): string {
  return `${normalizeText(title)}|${normalizeText(artist)}`
}

export function matchUpcRows(
  rows: UpcSourceRow[],
  catalog: UpcCatalogRelease[],
): UpcMatchResult[] {
  const prepared = catalog.map((release) => ({
    release,
    title: normalizeText(release.song_title),
    core: coreTitle(release.song_title),
    artist: normalizeText(release.artist_name),
    tokens: artistTokens(release.artist_name),
  }))
  const byIsrc = new Map<string, UpcCatalogRelease>()
  for (const r of catalog) if (r.isrc) byIsrc.set(r.isrc, r)

  return rows.map((row): UpcMatchResult => {
    const upc = normalizeUpc(row.rawUpc)
    const isrc = normalizeIsrc(row.rawIsrc)
    const email = row.email.trim().toLowerCase()
    const base = { ...row, email, upc: upc || null, isrc: isrc || null, invalidReason: null }

    const invalidReason =
      !row.songTitle || !row.artistName
        ? 'ไม่มีชื่อเพลงหรือชื่อศิลปิน'
        : email && !EMAIL_PATTERN.test(email)
          ? 'อีเมลไม่ถูกต้อง'
          : upc === null
          ? 'UPC ไม่ถูกต้อง'
          : isrc === null
            ? 'ISRC ไม่ถูกต้อง'
            : !upc && !isrc
              ? 'ไม่มี UPC และ ISRC'
              : null
    if (invalidReason) return { ...base, invalidReason, kind: 'invalid', candidates: [] }

    // An ISRC identifies exactly one recording, so it beats any name match.
    const isrcHit = isrc ? byIsrc.get(isrc) : undefined
    if (isrcHit) return { ...base, kind: 'exact', candidates: [isrcHit] }

    const title = normalizeText(row.songTitle)
    const artist = normalizeText(row.artistName)
    const tokens = artistTokens(row.artistName)

    const exact = prepared.filter((p) => p.title === title && p.artist === artist)
    if (exact.length === 1) return { ...base, kind: 'exact', candidates: [exact[0].release] }
    if (exact.length > 1) {
      return { ...base, kind: 'ambiguous', candidates: exact.map((p) => p.release) }
    }

    const core = coreTitle(row.songTitle)
    const fuzzy = prepared.filter(
      (p) => core.length > 0 && p.core === core && sharesArtist(tokens, p.tokens),
    )
    if (fuzzy.length === 1) return { ...base, kind: 'fuzzy', candidates: [fuzzy[0].release] }
    if (fuzzy.length > 1) {
      return { ...base, kind: 'ambiguous', candidates: fuzzy.map((p) => p.release) }
    }

    // Same title, artist spelled differently: surface as a choice, never auto-apply.
    const titleOnly = prepared.filter((p) => p.title === title || (core && p.core === core))
    if (titleOnly.length > 0) {
      return { ...base, kind: 'ambiguous', candidates: titleOnly.map((p) => p.release) }
    }

    return { ...base, kind: 'none', candidates: [] }
  })
}

/* ------------------------------------------------------------------ */
/* Duplicate rules, shared by the preview and the server action.       */
/* ------------------------------------------------------------------ */

export type UpcSkipReason =
  | 'invalid'
  | 'pending'
  | 'same'
  | 'isrc-taken'
  | 'upc-taken'
  | 'exists'
  | 'file-duplicate'

export const SKIP_LABEL: Record<UpcSkipReason, string> = {
  invalid: 'ข้อมูลไม่ถูกต้อง',
  pending: 'รอเลือกเพลง',
  same: 'ซ้ำ — มีรหัสนี้อยู่แล้ว',
  'isrc-taken': 'ซ้ำ — ISRC เป็นของเพลงอื่น',
  'upc-taken': 'ซ้ำ — UPC เป็นของอัลบั้มอื่น',
  exists: 'ซ้ำ — มีเพลงนี้ในระบบแล้ว',
  'file-duplicate': 'ซ้ำในไฟล์',
}

type IndexedCode = { id: string; album: string }

/** Mutable lookup of codes already in use; batch writes are added as they are planned. */
export class CodeIndex {
  private isrc = new Map<string, string>()
  private upc = new Map<string, IndexedCode[]>()
  private songs = new Set<string>()

  constructor(catalog: Pick<UpcCatalogRelease, 'id' | 'song_title' | 'artist_name' | 'album_name' | 'upc_ean_isrc' | 'isrc'>[]) {
    for (const r of catalog) this.add(r.id, r.song_title, r.artist_name, r.album_name, r.upc_ean_isrc, r.isrc)
  }

  add(id: string, title: string, artist: string, album: string | null, upc: string | null, isrc: string | null) {
    this.songs.add(songKey(title, artist))
    if (isrc) this.isrc.set(isrc, id)
    if (upc) {
      const list = this.upc.get(upc) ?? []
      list.push({ id, album: normalizeText(album) })
      this.upc.set(upc, list)
    }
  }

  isrcTaken(isrc: string, selfId: string | null): boolean {
    const owner = this.isrc.get(isrc)
    return !!owner && owner !== selfId
  }

  /** One UPC covers a whole album, so other tracks of the same album may share it. */
  upcTaken(upc: string, selfId: string | null, album: string | null): boolean {
    const albumKey = normalizeText(album)
    return (this.upc.get(upc) ?? []).some(
      (o) => o.id !== selfId && !(albumKey && o.album === albumKey),
    )
  }

  songExists(title: string, artist: string): boolean {
    return this.songs.has(songKey(title, artist))
  }
}

export type UpcUpdatePlan = {
  action: 'update'
  set: { upc_ean_isrc?: string; isrc?: string }
  overwrite: boolean
}
export type UpcCreatePlan = { action: 'create' }
export type UpcSkipPlan = { action: 'skip'; reason: UpcSkipReason }
export type UpcPlan = UpcUpdatePlan | UpcCreatePlan | UpcSkipPlan

export function planUpdate(
  target: Pick<UpcCatalogRelease, 'id' | 'album_name' | 'upc_ean_isrc' | 'isrc'>,
  upc: string | null,
  isrc: string | null,
  index: CodeIndex,
): UpcUpdatePlan | UpcSkipPlan {
  const set: UpcUpdatePlan['set'] = {}
  if (isrc && isrc !== target.isrc) {
    if (index.isrcTaken(isrc, target.id)) return { action: 'skip', reason: 'isrc-taken' }
    set.isrc = isrc
  }
  if (upc && upc !== target.upc_ean_isrc) {
    if (index.upcTaken(upc, target.id, target.album_name)) return { action: 'skip', reason: 'upc-taken' }
    set.upc_ean_isrc = upc
  }
  if (!set.isrc && !set.upc_ean_isrc) return { action: 'skip', reason: 'same' }
  const overwrite = (!!set.isrc && !!target.isrc) || (!!set.upc_ean_isrc && !!target.upc_ean_isrc)
  return { action: 'update', set, overwrite }
}

export function planCreate(
  row: { songTitle: string; artistName: string; albumName: string; upc: string | null; isrc: string | null },
  index: CodeIndex,
): UpcCreatePlan | UpcSkipPlan {
  if (index.songExists(row.songTitle, row.artistName)) return { action: 'skip', reason: 'exists' }
  if (row.isrc && index.isrcTaken(row.isrc, null)) return { action: 'skip', reason: 'isrc-taken' }
  if (row.upc && index.upcTaken(row.upc, null, row.albumName || null)) {
    return { action: 'skip', reason: 'upc-taken' }
  }
  return { action: 'create' }
}

/* ------------------------------------------------------------------ */
/* File columns                                                        */
/* ------------------------------------------------------------------ */

const HEADER_ALIASES = {
  songTitle: ['songtitle', 'title', 'song', 'track', 'tracktitle', 'trackname', 'songname', 'releasetitle', 'ชื่อเพลง', 'เพลง'],
  artistName: ['artistname', 'artist', 'artists', 'primaryartist', 'ชื่อศิลปิน', 'ศิลปิน'],
  albumName: ['album', 'albumname', 'albumtitle', 'release', 'ชื่ออัลบั้ม', 'อัลบั้ม'],
  rawUpc: ['upc', 'ean', 'upcean', 'upceanisrc', 'barcode', 'รหัสupc', 'บาร์โค้ด'],
  rawIsrc: ['isrc', 'isrccode', 'รหัสisrc'],
  email: ['email', 'emailaddress', 'artistemail', 'owneremail', 'อีเมล', 'อีเมลศิลปิน', 'อีเมลเจ้าของ'],
} as const

export type UpcColumnKey = keyof typeof HEADER_ALIASES

function headerKey(header: string): string {
  return header.normalize('NFKC').toLowerCase().replace(/[\s_\-/.]/g, '')
}

/** Finds each column by header name. Returns null for a missing column. */
export function detectColumns(headers: string[]): Record<UpcColumnKey, string | null> {
  const find = (aliases: readonly string[]) =>
    headers.find((h) => aliases.includes(headerKey(h))) ?? null
  return {
    songTitle: find(HEADER_ALIASES.songTitle),
    artistName: find(HEADER_ALIASES.artistName),
    albumName: find(HEADER_ALIASES.albumName),
    rawUpc: find(HEADER_ALIASES.rawUpc),
    rawIsrc: find(HEADER_ALIASES.rawIsrc),
    email: find(HEADER_ALIASES.email),
  }
}

export const UPC_TEMPLATE_HEADERS = ['ชื่อเพลง', 'ชื่อศิลปิน', 'ชื่ออัลบั้ม', 'UPC', 'ISRC', 'อีเมล']
