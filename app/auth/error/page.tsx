import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="bg-destructive/10 text-destructive mx-auto flex size-12 items-center justify-center rounded-full">
          <AlertTriangle className="size-6" />
        </div>
        <h1 className="mt-4 text-xl font-semibold tracking-tight">
          เกิดข้อผิดพลาดในการเข้าสู่ระบบ
        </h1>
        <p className="text-muted-foreground mt-2 text-sm text-pretty">
          มีบางอย่างผิดพลาดขณะเข้าสู่ระบบ ลิงก์อาจหมดอายุหรือถูกใช้งานไปแล้ว
        </p>
        <Button
          nativeButton={false}
          render={<Link href="/login" />}
          className="mt-6"
        >
          กลับไปหน้าเข้าสู่ระบบ
        </Button>
      </div>
    </div>
  )
}
