'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ExternalLink, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { ImageUploadField, publicMediaUrl } from '@/components/admin/image-upload-field'
import { deletePost, savePost } from '@/app/actions/news'
import type { Post } from '@/lib/data/news'

type Draft = {
  title: string
  slug: string
  excerpt: string
  content: string
  cover_path: string | null
  is_published: boolean
}

const EMPTY: Draft = {
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  cover_path: null,
  is_published: true,
}

const dateFormat = new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium' })

export function PostManager({ posts }: { posts: Post[] }) {
  const router = useRouter()
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [open, setOpen] = React.useState(false)
  const [draft, setDraft] = React.useState<Draft>(EMPTY)
  const [error, setError] = React.useState<string | null>(null)
  const [notice, setNotice] = React.useState<string | null>(null)
  const [pending, startTransition] = React.useTransition()

  function openNew() {
    setEditingId(null)
    setDraft(EMPTY)
    setError(null)
    setOpen(true)
  }

  function openEdit(post: Post) {
    setEditingId(post.id)
    setDraft({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      cover_path: post.cover_path,
      is_published: post.is_published,
    })
    setError(null)
    setOpen(true)
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    startTransition(async () => {
      const result = await savePost(editingId, draft)
      if (result.status === 'error') {
        setError(result.message)
        return
      }
      setOpen(false)
      setNotice(result.message ?? 'บันทึกแล้ว')
      router.refresh()
    })
  }

  function remove(post: Post) {
    if (!window.confirm(`ลบบทความ "${post.title}" ?`)) return
    startTransition(async () => {
      const result = await deletePost(post.id)
      setNotice(result.message ?? null)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {notice ?? `ทั้งหมด ${posts.length.toLocaleString('th-TH')} บทความ`}
        </p>
        <Button onClick={openNew} className="h-11">
          <Plus aria-hidden="true" />
          เขียนบทความ
        </Button>
      </div>

      {posts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          ยังไม่มีบทความ
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border/60">
          {posts.map((post) => (
            <li key={post.id} className="flex items-center gap-3 py-3">
              {post.cover_path ? (
                <img
                  src={publicMediaUrl(post.cover_path) || '/placeholder.svg'}
                  alt=""
                  className="h-12 w-16 shrink-0 rounded-lg object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="h-12 w-16 shrink-0 rounded-lg bg-muted" aria-hidden="true" />
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="truncate text-sm font-medium">{post.title}</p>
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <Badge variant={post.is_published ? 'default' : 'secondary'}>
                    {post.is_published ? 'เผยแพร่' : 'ฉบับร่าง'}
                  </Badge>
                  <span>{dateFormat.format(new Date(post.published_at ?? post.created_at))}</span>
                </div>
              </div>
              {post.is_published && (
                <Link
                  href={`/news/${post.slug}`}
                  aria-label={`เปิดดู ${post.title}`}
                  className="hidden size-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:inline-flex"
                >
                  <ExternalLink className="size-4" aria-hidden="true" />
                </Link>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="size-11"
                onClick={() => openEdit(post)}
                aria-label={`แก้ไข ${post.title}`}
              >
                <Pencil aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="size-11 text-destructive"
                onClick={() => remove(post)}
                disabled={pending}
                aria-label={`ลบ ${post.title}`}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="sm:max-w-2xl"
          title={editingId ? 'แก้ไขบทความ' : 'เขียนบทความ'}
          description="บทความที่เผยแพร่จะแสดงในหน้าข่าวสาร ขึ้นบรรทัดใหม่สองครั้งเพื่อแบ่งย่อหน้า"
        >
          <form onSubmit={submit} className="flex flex-col gap-4">

            <div className="flex flex-col gap-2">
              <Label htmlFor="post-title">หัวข้อ</Label>
              <Input
                id="post-title"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                maxLength={200}
                required
                className="h-11 text-base"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="post-slug">ลิงก์บทความ (ไม่บังคับ)</Label>
              <Input
                id="post-slug"
                value={draft.slug}
                onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                maxLength={80}
                placeholder="เว้นว่างเพื่อสร้างอัตโนมัติ"
                className="h-11 text-base"
              />
            </div>

            <ImageUploadField
              folder="posts"
              label="ภาพปกบทความ"
              value={draft.cover_path}
              onChange={(path) => setDraft({ ...draft, cover_path: path })}
            />

            <div className="flex flex-col gap-2">
              <Label htmlFor="post-excerpt">คำโปรย</Label>
              <Textarea
                id="post-excerpt"
                value={draft.excerpt}
                onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })}
                maxLength={500}
                rows={2}
                className="text-base"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="post-content">เนื้อหา</Label>
              <Textarea
                id="post-content"
                value={draft.content}
                onChange={(e) => setDraft({ ...draft, content: e.target.value })}
                maxLength={50000}
                rows={12}
                required
                className="text-base leading-relaxed"
              />
            </div>

            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input
                type="checkbox"
                className="size-5 accent-primary"
                checked={draft.is_published}
                onChange={(e) => setDraft({ ...draft, is_published: e.target.checked })}
              />
              เผยแพร่ให้ลูกค้าอ่าน (ไม่เลือก = บันทึกเป็นฉบับร่าง)
            </label>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <DialogFooter>
              <Button type="submit" disabled={pending} className="h-11 w-full sm:w-auto">
                {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
                {draft.is_published ? 'เผยแพร่' : 'บันทึกฉบับร่าง'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
