export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-in flex flex-col gap-6">{children}</div>
}
