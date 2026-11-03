import { createClient } from '@/lib/supabase/server'

export const SITE_MEDIA_BUCKET = 'site-media'

export type Announcement = {
  id: string
  title: string
  body: string
  image_path: string | null
  is_active: boolean
  show_in_ticker: boolean
  created_at: string
  updated_at: string
}

export type Post = {
  id: string
  slug: string
  title: string
  excerpt: string
  content: string
  cover_path: string | null
  is_published: boolean
  published_at: string | null
  created_at: string
  updated_at: string
}

const ANNOUNCEMENT_COLUMNS =
  'id, title, body, image_path, is_active, show_in_ticker, created_at, updated_at'
const POST_COLUMNS =
  'id, slug, title, excerpt, content, cover_path, is_published, published_at, created_at, updated_at'

export function siteMediaUrl(path: string | null): string | null {
  if (!path) return null
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${SITE_MEDIA_BUCKET}/${path}`
}

/** Active announcements for users; RLS hides inactive ones from non-admins. */
export async function getActiveAnnouncements(limit = 50): Promise<Announcement[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('announcements')
    .select(ANNOUNCEMENT_COLUMNS)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data as Announcement[] | null) ?? []
}

export async function getAllAnnouncements(): Promise<Announcement[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('announcements')
    .select(ANNOUNCEMENT_COLUMNS)
    .order('created_at', { ascending: false })
  return (data as Announcement[] | null) ?? []
}

export async function getPublishedPosts(limit = 100): Promise<Post[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('posts')
    .select(POST_COLUMNS)
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(limit)
  return (data as Post[] | null) ?? []
}

export async function getAllPosts(): Promise<Post[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('posts')
    .select(POST_COLUMNS)
    .order('created_at', { ascending: false })
  return (data as Post[] | null) ?? []
}

/** Admins can preview drafts by slug; everyone else only sees published posts. */
export async function getPostBySlug(slug: string): Promise<Post | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('posts')
    .select(POST_COLUMNS)
    .eq('slug', slug)
    .maybeSingle()
  return (data as Post | null) ?? null
}
