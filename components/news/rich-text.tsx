import { cn } from '@/lib/utils'

/**
 * Renders plain text written by admins: blank lines start a new paragraph,
 * lines starting with "## " become subheadings. No HTML is interpreted.
 */
export function RichText({ text, className }: { text: string; className?: string }) {
  const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean)

  return (
    <div className={cn('flex flex-col gap-4 text-sm leading-relaxed', className)}>
      {blocks.map((block, i) =>
        block.startsWith('## ') ? (
          <h2 key={i} className="text-foreground pt-2 text-lg font-semibold text-balance">
            {block.slice(3)}
          </h2>
        ) : (
          <p key={i} className="whitespace-pre-line text-pretty">
            {block}
          </p>
        ),
      )}
    </div>
  )
}
