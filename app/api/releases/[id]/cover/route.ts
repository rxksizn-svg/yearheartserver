import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/admin'

const SIGNED_URL_TTL_SECONDS = 60 * 60
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Convert a Google Drive share link into a directly embeddable thumbnail URL. */
function driveThumbnail(url: string): string | null {
  const match =
    url.match(/\/file\/d\/([\w-]+)/) ??
    url.match(/[?&]id=([\w-]+)/) ??
    url.match(/\/d\/([\w-]+)/)
  return match ? `https://drive.google.com/thumbnail?id=${match[1]}&sz=w600` : null
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!UUID_RE.test(id)) return new NextResponse(null, { status: 404 })

  // RLS on the user's client decides access: owners see their own releases, admins see all.
  const supabase = await createClient()
  const { data: release } = await supabase
    .from('releases')
    .select('cover_path, cover_url')
    .eq('id', id)
    .maybeSingle()
  if (!release) return new NextResponse(null, { status: 404 })

  let target: string | null = null
  if (release.cover_path) {
    const { data } = await createServiceClient()
      .storage.from('release-assets')
      .createSignedUrl(release.cover_path, SIGNED_URL_TTL_SECONDS)
    target = data?.signedUrl ?? null
  }
  if (!target && release.cover_url && /^https?:\/\//i.test(release.cover_url)) {
    target = driveThumbnail(release.cover_url) ?? release.cover_url
  }
  if (!target) return new NextResponse(null, { status: 404 })

  const res = NextResponse.redirect(target, 302)
  res.headers.set('Cache-Control', 'private, max-age=1800')
  return res
}
