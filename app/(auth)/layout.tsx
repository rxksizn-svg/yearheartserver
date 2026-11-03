import Image from 'next/image'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-svh flex-col lg:flex-row">
      <aside className="bg-sidebar text-sidebar-foreground relative hidden overflow-hidden lg:flex lg:w-[46%] lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden
          className="from-primary/20 via-accent-2/5 pointer-events-none absolute inset-0 bg-gradient-to-b to-transparent"
        />

        <Image
          src="/yearheart-logo.png"
          alt="Yearheart Entertainment"
          width={640}
          height={210}
          priority
          className="relative h-9 w-auto"
        />

        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold tracking-tight text-balance">
            เพลงของคุณ อยู่บนทุกเวทีที่สำคัญ
          </h2>
          <p className="text-sidebar-foreground/70 mt-4 text-pretty leading-relaxed">
            จัดจำหน่ายไปยัง Spotify, Apple Music, YouTube Music, TikTok และอีกมากมาย
            ติดตามการนำส่งและดูรายได้เติบโต พร้อมเบิกถอนค่าลิขสิทธิ์ ครบในพอร์ทัลเดียว
          </p>
        </div>

        <p className="text-sidebar-foreground/50 relative text-xs">
          &copy; {new Date().getFullYear()} Yearheart Entertainment สงวนลิขสิทธิ์
        </p>
      </aside>

      <main className="flex flex-1 items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <Image
            src="/yearheart-logo.png"
            alt="Yearheart Entertainment"
            width={640}
            height={210}
            priority
            className="mb-8 h-7 w-auto dark:brightness-100 brightness-0 lg:hidden"
          />
          {children}
        </div>
      </main>
    </div>
  )
}
