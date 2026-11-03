'use client'

import * as React from 'react'
import { ImagePlus, Loader2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

const BUCKET = 'site-media'
const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

export function publicMediaUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`
}

export function ImageUploadField({
  folder,
  value,
  onChange,
  label = 'แนบภาพ',
}: {
  folder: 'announcements' | 'posts'
  value: string | null
  onChange: (path: string | null) => void
  label?: string
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function handleFile(file: File) {
    setError(null)
    if (!ALLOWED.includes(file.type)) return setError('รองรับเฉพาะไฟล์ PNG, JPG, WEBP หรือ GIF')
    if (file.size > MAX_BYTES) return setError('ไฟล์ต้องมีขนาดไม่เกิน 5MB')

    setUploading(true)
    const ext = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1]
    const path = `${folder}/${crypto.randomUUID()}.${ext}`
    const { error: upErr } = await createClient()
      .storage.from(BUCKET)
      .upload(path, file, { contentType: file.type })
    setUploading(false)
    if (upErr) return setError('อัปโหลดภาพไม่สำเร็จ กรุณาลองใหม่')
    onChange(path)
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      {value ? (
        <div className="border-border/60 relative overflow-hidden rounded-xl border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={publicMediaUrl(value)} alt="ภาพที่แนบ" className="max-h-56 w-full object-cover" />
          <Button
            type="button"
            size="icon-sm"
            variant="secondary"
            className="absolute top-2 right-2"
            onClick={() => onChange(null)}
            aria-label="ลบภาพ"
          >
            <X />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="border-border hover:border-primary/60 hover:bg-primary/5 text-muted-foreground flex h-32 flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-sm transition-colors disabled:opacity-60"
        >
          {uploading ? (
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
          ) : (
            <ImagePlus className="size-5" aria-hidden="true" />
          )}
          {uploading ? 'กำลังอัปโหลด...' : 'คลิกเพื่อเลือกภาพ (ไม่เกิน 5MB)'}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED.join(',')}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) void handleFile(file)
        }}
      />
      {error ? (
        <p role="alert" className="text-destructive text-xs">
          {error}
        </p>
      ) : null}
    </div>
  )
}
