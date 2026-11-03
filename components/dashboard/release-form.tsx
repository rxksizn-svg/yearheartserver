'use client'

import * as React from 'react'
import Image from 'next/image'
import {
  UploadCloud,
  ImageIcon,
  Music4,
  X,
  PartyPopper,
  Loader2,
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Lock,
} from 'lucide-react'
import { ARTIST_NAME_NOTICE } from '@/lib/artist-names'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { createRelease, updateRelease } from '@/app/actions/releases'
import type { Release } from '@/lib/types'

type Defaults = {
  submitterName?: string
  submitterEmail?: string
  artistName?: string
}

const selectClass =
  'border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full rounded-lg border px-3 text-sm shadow-sm outline-none focus-visible:ring-[3px] dark:bg-input/30'

function isValidUrl(value: string): boolean {
  try {
    const u = new URL(value.trim())
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

const STEPS = [
  'ตั้งค่าเบื้องต้น',
  'ชื่อเพลง',
  'อัพโหลด Asset',
  'ข้อมูลผู้สร้างสรรค์ผลงาน',
  'รายละเอียดผู้ส่งเพลง',
  'ยืนยันการอัพโหลดเพลงเข้าสู่ระบบ',
] as const

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="border-border/60 border-b pb-2 text-base font-semibold">
      {children}
    </h2>
  )
}

function Field({
  label,
  htmlFor,
  required,
  hint,
  children,
}: {
  label: string
  htmlFor?: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor} className="text-pretty leading-snug">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
      {children}
    </div>
  )
}

function ConsentCheck({
  id,
  checked,
  onChange,
  children,
}: {
  id: string
  checked: boolean
  onChange: (v: boolean) => void
  children: React.ReactNode
}) {
  return (
    <label
      htmlFor={id}
      className="border-input hover:bg-accent/40 flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-brand mt-0.5 size-4 shrink-0 rounded"
      />
      <span className="text-sm leading-relaxed text-pretty">{children}</span>
    </label>
  )
}

function AssetModeToggle({
  mode,
  onChange,
}: {
  mode: 'upload' | 'link'
  onChange: (m: 'upload' | 'link') => void
}) {
  return (
    <div className="border-input inline-flex rounded-lg border p-0.5 text-xs">
      {(['upload', 'link'] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={cn(
            'rounded-md px-3 py-1.5 font-medium transition-colors',
            mode === m
              ? 'bg-brand text-brand-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {m === 'upload' ? 'อัพโหลดไฟล์' : 'ใช้ลิงก์ Google Drive'}
        </button>
      ))}
    </div>
  )
}

function Stepper({
  current,
  onStepClick,
}: {
  current: number
  onStepClick: (index: number) => void
}) {
  return (
    <ol className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-0">
      {STEPS.map((label, index) => {
        const isDone = index < current
        const isActive = index === current
        return (
          <li
            key={label}
            className="flex items-center gap-3 sm:flex-1 sm:flex-col sm:gap-2 sm:text-center"
          >
            <div className="flex items-center gap-3 sm:w-full sm:flex-col sm:gap-2">
              <button
                type="button"
                onClick={() => (index <= current ? onStepClick(index) : undefined)}
                disabled={index > current}
                aria-current={isActive ? 'step' : undefined}
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors',
                  isActive && 'border-brand bg-brand text-brand-foreground',
                  isDone &&
                    'border-success bg-success/15 text-success cursor-pointer',
                  !isActive &&
                    !isDone &&
                    'border-input text-muted-foreground',
                )}
              >
                {isDone ? <Check className="size-4" /> : index + 1}
              </button>
              <span
                className={cn(
                  'text-xs leading-snug text-pretty',
                  isActive
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground',
                )}
              >
                {label}
              </span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export function ReleaseForm({
  userId,
  defaults,
  release,
  artistOptions,
}: {
  userId: string
  defaults?: Defaults
  /** When provided, the form edits this rejected release instead of creating one. */
  release?: Release
  /** Artist names an admin registered for this user — the only selectable values. */
  artistOptions: string[]
}) {
  const isEdit = Boolean(release)
  const [step, setStep] = React.useState(0)

  const [trackType, setTrackType] = React.useState<'Single' | 'EP' | 'Album'>(
    release?.track_type ?? 'Single',
  )
  const [albumName, setAlbumName] = React.useState(release?.album_name ?? '')
  const [songTitle, setSongTitle] = React.useState(release?.song_title ?? '')
  const [artistName, setArtistName] = React.useState(() => {
    const preferred = release?.artist_name ?? defaults?.artistName ?? ''
    return artistOptions.includes(preferred) ? preferred : (artistOptions[0] ?? '')
  })
  const [composer, setComposer] = React.useState(release?.composer ?? '')
  const [producer, setProducer] = React.useState(release?.producer ?? '')
  const [genre, setGenre] = React.useState(release?.genre ?? '')
  const [upc, setUpc] = React.useState(release?.upc_ean_isrc ?? '')
  const [isrc, setIsrc] = React.useState(release?.isrc ?? '')
  const [isExplicit, setIsExplicit] = React.useState<'' | 'yes' | 'no'>(
    release ? (release.is_explicit ? 'yes' : 'no') : '',
  )
  const [isAi, setIsAi] = React.useState<'' | 'yes' | 'no'>(
    release ? (release.is_ai_generated ? 'yes' : 'no') : '',
  )
  const [submitterName, setSubmitterName] = React.useState(
    release?.submitter_name ?? defaults?.submitterName ?? '',
  )
  const [submitterEmail, setSubmitterEmail] = React.useState(
    release?.submitter_email ?? defaults?.submitterEmail ?? '',
  )
  const [submitterPhone, setSubmitterPhone] = React.useState(
    release?.submitter_phone ?? '',
  )
  const [consentContent, setConsentContent] = React.useState(
    release?.consent_content_id ?? false,
  )
  const [consentTerms, setConsentTerms] = React.useState(
    release?.consent_terms ?? false,
  )
  const [consentCopyright, setConsentCopyright] = React.useState(
    release?.consent_copyright ?? false,
  )

  const [coverFile, setCoverFile] = React.useState<File | null>(null)
  const [coverPreview, setCoverPreview] = React.useState<string | null>(null)
  const [audioFile, setAudioFile] = React.useState<File | null>(null)

  // A previously uploaded asset kept when the user does not replace it on edit.
  const existingCoverPath = release?.cover_path ?? null
  const existingAudioPath = release?.audio_path ?? null
  const existingAudioFilename = release?.audio_filename ?? null

  // Fallback: use a public Google Drive link instead of uploading the file.
  // Default to link mode when the release already stores a Drive link.
  const [coverMode, setCoverMode] = React.useState<'upload' | 'link'>(
    release?.cover_url ? 'link' : 'upload',
  )
  const [audioMode, setAudioMode] = React.useState<'upload' | 'link'>(
    release?.audio_url ? 'link' : 'upload',
  )
  const [coverLink, setCoverLink] = React.useState(release?.cover_url ?? '')
  const [audioLink, setAudioLink] = React.useState(release?.audio_url ?? '')

  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [done, setDone] = React.useState(false)

  function handleCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setCoverFile(file)
    setCoverPreview(file ? URL.createObjectURL(file) : null)
  }

  /** Returns an error message if the given step is incomplete, otherwise null. */
  function validateStep(index: number): string | null {
    switch (index) {
      case 0:
        if (!trackType) return 'กรุณาเลือกรูปแบบ Track'
        return null
      case 1:
        if (!songTitle.trim()) return 'กรุณาระบุชื่อเพลง'
        if (!artistName.trim() || !artistOptions.includes(artistName)) {
          return artistOptions.length
            ? 'กรุณาเลือกชื่อศิลปินจากรายการ'
            : 'บัญชีของคุณยังไม่มีชื่อศิลปินในระบบ กรุณาติดต่อผู้ดูแลระบบ'
        }
        return null
      case 2:
        if (coverMode === 'upload' && !coverFile && !existingCoverPath)
          return 'กรุณาอัพโหลดไฟล์ปกเพลง หรือสลับไปใช้ลิงก์ Google Drive'
        if (coverMode === 'link' && !isValidUrl(coverLink))
          return 'กรุณาใส่ลิงก์ Google Drive ของไฟล์ปกให้ถูกต้อง'
        if (audioMode === 'upload' && !audioFile && !existingAudioPath)
          return 'กรุณาอัพโหลดไฟล์เสียง หรือสลับไปใช้ลิงก์ Google Drive'
        if (audioMode === 'link' && !isValidUrl(audioLink))
          return 'กรุณาใส่ลิงก์ Google Drive ของไฟล์เสียงให้ถูกต้อง'
        return null
      case 3:
        if (!composer.trim()) return 'กรุณาระบุชื่อผู้แต่ง / ผู้ประพันธ์'
        if (!producer.trim()) return 'กรุณาระบุชื่อ Producer / ผู้ทำดนตรี'
        if (!genre.trim()) return 'กรุณาระบุแนวเพลง'
        if (!isExplicit) return 'กรุณาระบุว่าเพลงมีคำหยาบหรือไม่'
        if (!isAi) return 'กรุณาระบุว่าเพลงถูกทำขึ้นจาก AI หรือไม่'
        return null
      case 4:
        if (!submitterName.trim()) return 'กรุณาระบุชื่อ-นามสกุล'
        if (!submitterEmail.trim()) return 'กรุณาระบุอีเมล'
        if (!submitterPhone.trim()) return 'กรุณาระบุเบอร์โทร��ัพท์'
        return null
      case 5:
        if (!consentContent)
          return 'กรุณายอมรับหลักเกณฑ์ด้านเนื้อหาและ Content ID'
        return null
      default:
        return null
    }
  }

  function goNext() {
    const message = validateStep(step)
    if (message) {
      setError(message)
      return
    }
    setError(null)
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  function goBack() {
    setError(null)
    setStep((s) => Math.max(s - 1, 0))
  }

  function goToStep(index: number) {
    if (index > step) return
    setError(null)
    setStep(index)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Re-validate every step so nothing was skipped.
    for (let i = 0; i < STEPS.length; i++) {
      const message = validateStep(i)
      if (message) {
        setStep(i)
        setError(message)
        return
      }
    }

    setSubmitting(true)
    try {
      const supabase = createClient()
      const folder = `${userId}/${crypto.randomUUID()}`

      // Resolve cover: upload a new file, keep the existing file, or use a link.
      let coverPath: string | null = null
      if (coverMode === 'upload') {
        if (coverFile) {
          const ext = coverFile.name.split('.').pop()?.toLowerCase() || 'jpg'
          const path = `${folder}/cover.${ext}`
          const up = await supabase.storage
            .from('release-assets')
            .upload(path, coverFile, { upsert: true })
          if (up.error) {
            throw new Error(
              'อัพโหลดไฟล์ปกไม่สำเร็จ — กรุณาสลับไปใช้ลิงก์ Google Drive (เปิด public) แทน',
            )
          }
          coverPath = path
        } else {
          coverPath = existingCoverPath
        }
      }

      let audioPath: string | null = null
      let audioFilename: string | null = null
      if (audioMode === 'upload') {
        if (audioFile) {
          const ext = audioFile.name.split('.').pop()?.toLowerCase() || 'wav'
          const path = `${folder}/audio.${ext}`
          const up = await supabase.storage
            .from('release-assets')
            .upload(path, audioFile, { upsert: true })
          if (up.error) {
            throw new Error(
              'อัพโหลดไฟล์เสียงไม่สำเร็จ — กรุณาสลับไปใช้ลิงก์ Google Drive (เปิด public) แทน',
            )
          }
          audioPath = path
          audioFilename = audioFile.name
        } else {
          audioPath = existingAudioPath
          audioFilename = existingAudioFilename
        }
      }

      const payload = {
        track_type: trackType,
        album_name: albumName,
        song_title: songTitle,
        artist_name: artistName,
        cover_path: coverPath,
        audio_path: audioPath,
        cover_url: coverMode === 'link' ? coverLink.trim() : null,
        audio_url: audioMode === 'link' ? audioLink.trim() : null,
        audio_filename: audioFilename,
        composer,
        producer,
        genre,
        upc_ean_isrc: upc,
        isrc,
        is_explicit: isExplicit === 'yes',
        is_ai_generated: isAi === 'yes',
        submitter_name: submitterName,
        submitter_email: submitterEmail,
        submitter_phone: submitterPhone,
        consent_content_id: consentContent,
        consent_terms: consentTerms,
        consent_copyright: consentCopyright,
      }

      const result =
        isEdit && release
          ? await updateRelease({ ...payload, releaseId: release.id })
          : await createRelease(payload)

      if (result.status === 'success') {
        setDone(true)
      } else {
        setError(result.message ?? 'ส่งผลงานไม่สำเร็จ')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <span className="bg-success/10 text-success flex size-14 items-center justify-center rounded-full">
            <PartyPopper className="size-7" />
          </span>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">
              {isEdit ? 'ส่งแก้ไขเรียบร้อย!' : 'ส่งเพลงเข้าระบบเรียบร้อย!'}
            </h2>
            <p className="text-muted-foreground max-w-md text-sm text-pretty">
              {isEdit
                ? 'ผลงานของคุณถูกอัปเดตและส่งกลับให้ทีมงานตรวจสอบอีกครั้งแล้ว สถานะจะแสดงเป็น "ลูกค้าส่งแก้ไข"'
                : 'ทีมงาน YearHeart จะตรวจสอบผลงานของคุณและอัปเดตสถานะให้ทราบ คุณสามารถติดตามสถานะได้ที่หน้าผลงานเพลง'}
            </p>
          </div>
          <Button
            nativeButton={false}
            render={<a href="/releases">ไปที่หน้าผลงานเพลง</a>}
          />
        </CardContent>
      </Card>
    )
  }

  const isLastStep = step === STEPS.length - 1

  return (
    <Card>
      <CardContent className="space-y-8 py-6">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-balance">
            ระบบส่งเพลงผ่านระบบ YearHeart Artist Service
          </h1>
          <p className="text-muted-foreground text-sm">
            ขั้นตอนที่ {step + 1} จาก {STEPS.length} · {STEPS[step]}
          </p>
        </div>

        <Stepper current={step} onStepClick={goToStep} />

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Step 1 — ตั้งค่าเบื้องต้น */}
          {step === 0 ? (
            <div className="space-y-5">
              <SectionTitle>ตั้งค่าเบื้องต้น</SectionTitle>
              <Field
                label="รูปแบบ Track"
                htmlFor="track_type"
                required
                hint="หากอัพโหลดหลายเพลง ควรเลือก EP หรือ Album — หากเพลงเดียวให้เลือก Single"
              >
                <select
                  id="track_type"
                  className={selectClass}
                  value={trackType}
                  onChange={(e) =>
                    setTrackType(e.target.value as 'Single' | 'EP' | 'Album')
                  }
                >
                  <option value="Single">Single (เพลงเดียว)</option>
                  <option value="EP">EP</option>
                  <option value="Album">Album (อัลบั้ม)</option>
                </select>
              </Field>
              <Field label="ชื่ออัลบั้ม (หากมี)" htmlFor="album_name">
                <Input
                  id="album_name"
                  value={albumName}
                  onChange={(e) => setAlbumName(e.target.value)}
                  placeholder="ระบุชื่ออัลบั้มหากมี"
                />
              </Field>
            </div>
          ) : null}

          {/* Step 2 — ชื่อเพลง */}
          {step === 1 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <SectionTitle>กรอกรายละเอียดของเพลง</SectionTitle>
              </div>
              <Field
                label="ชื่อผลงาน (ชื่อเพลง และ feat เท่านั้น)"
                htmlFor="song_title"
                required
              >
                <Input
                  id="song_title"
                  value={songTitle}
                  onChange={(e) => setSongTitle(e.target.value)}
                  placeholder="ระบุชื่อเพลง"
                />
              </Field>
              <Field label="ชื่อศิลปิน" htmlFor="artist_name" required>
                {artistOptions.length ? (
                  <select
                    id="artist_name"
                    value={artistName}
                    onChange={(e) => setArtistName(e.target.value)}
                    disabled={artistOptions.length === 1}
                    aria-describedby="artist_name_notice"
                    className={cn(
                      selectClass,
                      'h-11 text-base md:text-sm',
                      artistOptions.length === 1 && 'cursor-not-allowed opacity-80',
                    )}
                  >
                    {artistOptions.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border px-3 py-2.5 text-sm">
                    บัญชีของคุณยังไม่มีชื่อศิลปินในระบบ กรุณาติดต่อผู้ดูแลระบบเพื่อเพิ่มชื่อศิลปิน
                  </div>
                )}
                <p
                  id="artist_name_notice"
                  className="text-muted-foreground flex items-start gap-2 text-xs leading-relaxed"
                >
                  <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  <span className="text-pretty">{ARTIST_NAME_NOTICE}</span>
                </p>
              </Field>
            </div>
          ) : null}

          {/* Step 3 — อัพโหลด Asset */}
          {step === 2 ? (
            <div className="space-y-5">
              <SectionTitle>อัพโหลด Asset</SectionTitle>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Field
                  label="ไฟล์ปกเพลง ขนาด 1440x1440 - 3000x3000 (Jpeg/jpg เท่านั้น)"
                  required
                  hint="ไม่รองรับไฟล์ PNG และ HEVC"
                >
                  <AssetModeToggle mode={coverMode} onChange={setCoverMode} />
                  {coverMode === 'upload' && existingCoverPath && !coverFile ? (
                    <p className="text-muted-foreground mt-2 text-xs">
                      มีไฟล์ปกเดิมอยู่แล้ว — เลือกไฟล์ใหม่เฉพาะเมื่อต้องการแทนที่
                    </p>
                  ) : null}
                  {coverMode === 'upload' ? (
                    <label
                      htmlFor="cover"
                      className="border-input hover:border-brand/60 relative mt-2 flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-colors"
                    >
                      {coverPreview ? (
                        <>
                          <Image
                            src={coverPreview || '/placeholder.svg'}
                            alt="ตัวอย่างปกเพลง"
                            fill
                            className="object-cover"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault()
                              setCoverFile(null)
                              setCoverPreview(null)
                            }}
                            className="bg-background/80 absolute right-2 top-2 rounded-full p-1.5 backdrop-blur"
                            aria-label="ลบปกเพลง"
                          >
                            <X className="size-4" />
                          </button>
                        </>
                      ) : (
                        <div className="text-muted-foreground flex flex-col items-center gap-2 p-6 text-center">
                          <ImageIcon className="size-8" />
                          <p className="text-sm font-medium">อัพโหลดไฟล์ปกเพลง</p>
                          <p className="text-xs">JPEG/JPG · 1440–3000px</p>
                        </div>
                      )}
                      <input
                        id="cover"
                        type="file"
                        accept="image/jpeg,.jpg,.jpeg"
                        className="sr-only"
                        onChange={handleCover}
                      />
                    </label>
                  ) : (
                    <div className="mt-2 space-y-2">
                      <Input
                        id="cover_link"
                        type="url"
                        value={coverLink}
                        onChange={(e) => setCoverLink(e.target.value)}
                        placeholder="https://drive.google.com/..."
                      />
                      <p className="text-muted-foreground text-xs">
                        วางลิงก์ Google Drive ของไฟล์ปก และตั้งค่าการเข้าถึงเป็น
                        &quot;ทุกคนที่มีลิงก์ (public)&quot;
                      </p>
                    </div>
                  )}
                </Field>

                <Field
                  label="ไฟล์เพลง / ไฟล์เสียง (ต้องเป็นไฟล์ .wav 24 bit เท่านั้น)"
                  required
                  hint="ไม่รองรับไฟล์ MP3 และ OGG · Sample rate 44.1 / 48 / 96 / 192 kHz"
                >
                  <AssetModeToggle mode={audioMode} onChange={setAudioMode} />
                  {audioMode === 'upload' && existingAudioPath && !audioFile ? (
                    <p className="text-muted-foreground mt-2 text-xs">
                      มีไฟล์เสียงเดิม
                      {existingAudioFilename ? ` (${existingAudioFilename})` : ''}{' '}
                      อยู่แล้ว — เลือกไฟล์ใหม่เฉพาะเมื่อต้องการแทนที่
                    </p>
                  ) : null}
                  {audioMode === 'upload' ? (
                    <label
                      htmlFor="audio"
                      className="border-input hover:border-brand/60 mt-2 flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors"
                    >
                      <span className="bg-brand/10 text-brand flex size-12 items-center justify-center rounded-full">
                        <UploadCloud className="size-6" />
                      </span>
                      {audioFile ? (
                        <p className="text-sm font-medium break-all">
                          {audioFile.name}
                        </p>
                      ) : (
                        <>
                          <p className="text-sm font-medium">อัพโหลดไฟล์เสียง</p>
                          <p className="text-muted-foreground text-xs">
                            WAV 24bit เท่านั้น
                          </p>
                        </>
                      )}
                      <input
                        id="audio"
                        type="file"
                        accept="audio/wav,.wav"
                        className="sr-only"
                        onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
                      />
                    </label>
                  ) : (
                    <div className="mt-2 space-y-2">
                      <Input
                        id="audio_link"
                        type="url"
                        value={audioLink}
                        onChange={(e) => setAudioLink(e.target.value)}
                        placeholder="https://drive.google.com/..."
                      />
                      <p className="text-muted-foreground text-xs">
                        วางลิงก์ Google Drive ของไฟล์เสียง และตั้งค่าการเข้าถึงเป็น
                        &quot;ทุกคนที่มีลิงก์ (public)&quot;
                      </p>
                    </div>
                  )}
                </Field>
              </div>
            </div>
          ) : null}

          {/* Step 4 — ข้อมูลผู้สร้างสรรค์ผลงาน */}
          {step === 3 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <SectionTitle>ข้อมูลผู้สร้างสรรค์ผลงาน</SectionTitle>
              </div>
              <Field
                label="ชื่อจริง-สกุล ผู้แต่ง / ผู้ประพันธ์ (หลายคนใส่ , คั่น) (TH/EN)"
                htmlFor="composer"
                required
              >
                <Input
                  id="composer"
                  value={composer}
                  onChange={(e) => setComposer(e.target.value)}
                  placeholder="ระบุชื่อผู้แต่ง"
                />
              </Field>
              <Field
                label="ชื่อ Producer / ผู้ทำดนตรี (หลายคนใส่ , คั่น) (TH/EN)"
                htmlFor="producer"
                required
              >
                <Input
                  id="producer"
                  value={producer}
                  onChange={(e) => setProducer(e.target.value)}
                  placeholder="ระบุชื่อ Producer"
                />
              </Field>
              <Field label="แนวเพลง" htmlFor="genre" required>
                <Input
                  id="genre"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  placeholder="เช่น Pop, Hip-Hop, Rock"
                />
              </Field>
              <Field label="UPC/EAN" htmlFor="upc">
                <Input
                  id="upc"
                  value={upc}
                  onChange={(e) => setUpc(e.target.value)}
                  placeholder="หากมีอยู่แล้ว ให้ระบุที่นี่"
                  inputMode="numeric"
                />
              </Field>
              <Field label="ISRC" htmlFor="isrc">
                <Input
                  id="isrc"
                  value={isrc}
                  onChange={(e) => setIsrc(e.target.value.toUpperCase())}
                  placeholder="เช่น THA012400001"
                  maxLength={15}
                />
              </Field>
              <Field label="เพลงมีคำหยาบไหม?" htmlFor="explicit" required>
                <select
                  id="explicit"
                  className={selectClass}
                  value={isExplicit}
                  onChange={(e) =>
                    setIsExplicit(e.target.value as '' | 'yes' | 'no')
                  }
                >
                  <option value="">เลือกคำตอบ</option>
                  <option value="no">ไม่มีคำหยาบ</option>
                  <option value="yes">มีคำหยาบ (Explicit)</option>
                </select>
              </Field>
              <Field
                label="เพลงทั้งหมดถูกทำขึ้นจาก AI หรือไม่"
                htmlFor="ai"
                required
              >
                <select
                  id="ai"
                  className={selectClass}
                  value={isAi}
                  onChange={(e) => setIsAi(e.target.value as '' | 'yes' | 'no')}
                >
                  <option value="">เลือกคำตอบ</option>
                  <option value="no">ไม่ได้ทำจาก AI</option>
                  <option value="yes">ทำขึ้นจาก AI</option>
                </select>
              </Field>
            </div>
          ) : null}

          {/* Step 5 — รายละเอียดผู้ส่งเพลง */}
          {step === 4 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <SectionTitle>รายละเอียดผู้ส่งเพลง</SectionTitle>
              </div>
              <Field
                label="ชื่อ-นามสกุล (ภาษาไทย)"
                htmlFor="submitter_name"
                required
              >
                <Input
                  id="submitter_name"
                  value={submitterName}
                  onChange={(e) => setSubmitterName(e.target.value)}
                  placeholder="ระบุชื่อ-นามสกุล"
                />
              </Field>
              <Field label="อีเมล" htmlFor="submitter_email" required>
                <Input
                  id="submitter_email"
                  type="email"
                  value={submitterEmail}
                  onChange={(e) => setSubmitterEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </Field>
              <Field label="เบอร์โทรศัพท์" htmlFor="submitter_phone" required>
                <Input
                  id="submitter_phone"
                  type="tel"
                  value={submitterPhone}
                  onChange={(e) => setSubmitterPhone(e.target.value)}
                  placeholder="08xxxxxxxx"
                />
              </Field>
            </div>
          ) : null}

          {/* Step 6 — ยืนยันการอัพโหลดเพลงเข้าสู่ระบบ */}
          {step === 5 ? (
            <div className="space-y-3">
              <SectionTitle>ยืนยันการอัพโหลดเพลงเข้าสู่ระบบ</SectionTitle>
              <ConsentCheck
                id="consent-content"
                checked={consentContent}
                onChange={setConsentContent}
              >
                ฉันเข้าใจและยอมรับหลักเกณฑ์ด้านเนื้อหา และ Content ID ของ YouTube
                และจะนำส่งระบบให้ YearHeart Entertainment Co., Ltd
                เป็นผู้ดูแลสิทธิ์แทนผู้ให้บริการ
                <span className="text-destructive"> *</span>
              </ConsentCheck>
              <ConsentCheck
                id="consent-terms"
                checked={consentTerms}
                onChange={setConsentTerms}
              >
                ยืนยันการทำรายการ และข้าพเจ้าได้อ่านข้อกำหนดการให้บริการทุกข้อ
                และข้อมูลที่ส่งในระบบนั้นเป็นความจริง
              </ConsentCheck>
              <ConsentCheck
                id="consent-copyright"
                checked={consentCopyright}
                onChange={setConsentCopyright}
              >
                ฉั��เข้าใจและยอมรับว่าเพลงที่ส่งข้อมูลมาเป็นลิขสิทธิ์ของข้าพเจ้า 100%
              </ConsentCheck>
            </div>
          ) : null}

          {error ? (
            <div className="border-destructive/30 bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3 border-t pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              disabled={step === 0 || submitting}
            >
              <ChevronLeft />
              ย้อนกลับ
            </Button>

            {isLastStep ? (
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin" />
                    {isEdit ? 'กำลังบันทึกการแก้ไข...' : 'กำลังส่งเพลง...'}
                  </>
                ) : (
                  <>
                    <Music4 />
                    {isEdit ? 'บันทึกการแก้ไขและส่งใหม่' : 'ส่งเพลงเข้าระบบเลย'}
                  </>
                )}
              </Button>
            ) : (
              <Button type="button" onClick={goNext}>
                ถัดไป
                <ChevronRight />
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
