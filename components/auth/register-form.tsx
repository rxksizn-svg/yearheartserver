'use client'

import * as React from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertCircle, CheckCircle2, Loader2, Mic2, Building2 } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { mapSignUpError } from '@/lib/auth-errors'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GoogleIcon } from '@/components/auth/google-icon'

const schema = z
  .object({
    name: z.string().min(2, 'กรุณากรอกชื่อของคุณ'),
    email: z.string().email('กรุณากรอกอีเมลให้ถูกต้อง'),
    password: z
      .string()
      .min(8, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
      .regex(/[a-zA-Z]/, 'ต้องมีตัวอักษรอย่างน้อย 1 ตัว')
      .regex(/[0-9]/, 'ต้องมีตัวเลขอย่างน้อย 1 ตัว'),
    role: z.enum(['artist', 'label']),
    artistName: z.string().optional(),
    labelName: z.string().optional(),
  })
  .refine((v) => v.role !== 'artist' || (v.artistName?.trim().length ?? 0) >= 1, {
    message: 'กรุณากรอกชื่อศิลปิน / ชื่อในวงการ',
    path: ['artistName'],
  })
  .refine((v) => v.role !== 'label' || (v.labelName?.trim().length ?? 0) >= 1, {
    message: 'กรุณากรอกชื่อค่ายเพลง',
    path: ['labelName'],
  })

type FormValues = z.infer<typeof schema>

const ROLE_OPTIONS = [
  {
    value: 'artist' as const,
    label: 'ศิลปิน',
    description: 'นักดนตรีอิสระ',
    icon: Mic2,
  },
  {
    value: 'label' as const,
    label: 'ค่ายเพลง',
    description: 'จัดการศิลปินหลายคน',
    icon: Building2,
  },
]

export function RegisterForm() {
  const [formError, setFormError] = React.useState<string | null>(null)
  const [submitted, setSubmitted] = React.useState(false)
  const [oauthLoading, setOauthLoading] = React.useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'artist',
      artistName: '',
      labelName: '',
    },
  })

  const role = watch('role')

  async function onSubmit(values: FormValues) {
    setFormError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo:
          process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
          `${window.location.origin}/auth/callback`,
        data: {
          name: values.name,
          role: values.role,
          artist_name: values.role === 'artist' ? values.artistName : null,
          label_name: values.role === 'label' ? values.labelName : null,
        },
      },
    })

    if (error) {
      setFormError(mapSignUpError(error))
      return
    }

    setSubmitted(true)
  }

  async function signUpWithGoogle() {
    setFormError(null)
    setOauthLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo:
          process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
          `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setOauthLoading(false)
      setFormError('ไม่สามารถเริ่มการสมัครด้วย Google กรุณาลองใหม่อีกครั้ง')
    }
  }

  if (submitted) {
    return (
      <div className="text-center">
        <div className="bg-success/10 text-success mx-auto flex size-12 items-center justify-center rounded-full">
          <CheckCircle2 className="size-6" />
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-balance">
          ตรวจสอบอีเมลของคุณ
        </h1>
        <p className="text-muted-foreground mt-2 text-sm text-pretty">
          เราได้ส่งลิงก์ยืนยันไปยังกล่องจดหมายของคุณแล้ว
          กรุณายืนยันอีเมลเพื่อเปิดใช้งานบัญชีและเข้าสู่ระบบ
        </p>
        <Button
          nativeButton={false}
          render={<Link href="/login" />}
          variant="outline"
          className="mt-6 w-full"
        >
          กลับไปหน้าเข้าสู่ระบบ
        </Button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          สร้างบัญชีของคุณ
        </h1>
        <p className="text-muted-foreground mt-1.5 text-sm">
          เริ่มจัดจำหน่ายเพลงของคุณกับ Yearheart
        </p>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={signUpWithGoogle}
        disabled={oauthLoading || isSubmitting}
      >
        {oauthLoading ? (
          <Loader2 className="animate-spin" />
        ) : (
          <GoogleIcon className="size-4" />
        )}
        ดำเนินการต่อด้วย Google
      </Button>

      <div className="my-6 flex items-center gap-3">
        <div className="bg-border h-px flex-1" />
        <span className="text-muted-foreground text-xs uppercase tracking-wide">
          หรือ
        </span>
        <div className="bg-border h-px flex-1" />
      </div>

      {formError && (
        <div
          role="alert"
          className="border-destructive/30 bg-destructive/10 text-destructive mb-4 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label>ฉันสมัครในฐานะ</Label>
          <div className="grid grid-cols-2 gap-2">
            {ROLE_OPTIONS.map((option) => {
              const Icon = option.icon
              const active = role === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    setValue('role', option.value, { shouldValidate: true })
                  }
                  aria-pressed={active}
                  className={cn(
                    'flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors',
                    active
                      ? 'border-brand bg-brand/5 ring-brand/30 ring-1'
                      : 'border-border hover:bg-accent',
                  )}
                >
                  <Icon
                    className={cn(
                      'size-5',
                      active ? 'text-brand' : 'text-muted-foreground',
                    )}
                  />
                  <span className="text-sm font-medium">{option.label}</span>
                  <span className="text-muted-foreground text-xs">
                    {option.description}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">ชื่อ-นามสกุล</Label>
          <Input
            id="name"
            autoComplete="name"
            placeholder="เช่น สมชาย ใจดี"
            aria-invalid={!!errors.name}
            {...register('name')}
          />
          {errors.name && (
            <p className="text-destructive text-xs">{errors.name.message}</p>
          )}
        </div>

        {role === 'artist' ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="artistName">ชื่อศิลปิน / ชื่อในวงการ</Label>
            <Input
              id="artistName"
              placeholder="เช่น Mira Solace"
              aria-invalid={!!errors.artistName}
              {...register('artistName')}
            />
            {errors.artistName && (
              <p className="text-destructive text-xs">
                {errors.artistName.message}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="labelName">ชื่อค่ายเพลง</Label>
            <Input
              id="labelName"
              placeholder="เช่น Northbound Records"
              aria-invalid={!!errors.labelName}
              {...register('labelName')}
            />
            {errors.labelName && (
              <p className="text-destructive text-xs">
                {errors.labelName.message}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">อีเมล</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={!!errors.email}
            {...register('email')}
          />
          {errors.email && (
            <p className="text-destructive text-xs">{errors.email.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">รหัสผ่าน</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="อย่างน้อย 8 ตัวอักษร"
            aria-invalid={!!errors.password}
            {...register('password')}
          />
          {errors.password && (
            <p className="text-destructive text-xs">
              {errors.password.message}
            </p>
          )}
        </div>

        <Button type="submit" className="mt-1 w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />}
          สร้างบัญชี
        </Button>
      </form>

      <p className="text-muted-foreground mt-6 text-center text-sm">
        มีบัญชีอยู่แล้ว?{' '}
        <Link
          href="/login"
          className="text-foreground font-medium underline-offset-4 hover:underline"
        >
          เข้าสู่ระบบ
        </Link>
      </p>
    </div>
  )
}
