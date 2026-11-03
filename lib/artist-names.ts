export const MAX_ARTIST_NAMES = 5

export const ARTIST_NAME_NOTICE =
  '1 User สามารถใช้ชื่อศิลปินได้แค่ 1 คนเท่านั้น หากต้องการเพิ่ม โปรดอัพเกรดเป็น Artist Pro'

export type ArtistNameEntry = { id: string; name: string }

export function sameArtistName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}
