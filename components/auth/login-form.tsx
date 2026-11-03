'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AlertCircle, Loader2 } from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import { mapSignInError } from '@/lib/auth-errors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GoogleIcon } from '@/components/auth/google-icon'

const schema = z.object({
  email: z.string().email('กรุณากรอกอีเมลให้ถูกต้อง'),
  password: z.string().min(1, 'กรุณากรอกรหัสผ่าน'),
})

type FormValues = z.infer<typeof schema>

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectedFrom = searchParams.get('redirectedFrom') || '/'

  const [formError, setFormError] = React.useState<string | null>(null)
  const [oauthLoading, setOauthLoading] = React.useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(values: FormValues) {
    setFormError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    })

    if (error) {
      setFormError(mapSignInError(error))
      return
    }

    router.push(redirectedFrom)
    router.refresh()
  }

  async function signInWithGoogle() {
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
      setFormError('ไม่สามารถเริ่มการเข้าสู่ระบบด้วย Google กรุณาลองใหม่อีกครั้ง')
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-balance">
          ยินดีต้อนรับกลับ
        </h1>
        <p className="text-muted-foreground mt-1.5 text-sm">
          เข้าสู่ระบบพอร์ทัลศิลปิน Yearheart ของคุณ
        </p>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={signInWithGoogle}
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
            autoComplete="current-password"
            placeholder="กรอกรหัสผ่านของคุณ"
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
          เข้าสู่ระบบ
        </Button>
      </form>

      <p className="text-muted-foreground mt-6 text-center text-sm">
        ยังไม่มีบัญชี?{' '}
        <Link
          href="/register"
          className="text-foreground font-medium underline-offset-4 hover:underline"
        >
          สมัครสมาชิก
        </Link>
      </p>
    </div>
  )
}
