const PAGE_SIZE = 1000

type PageResult<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>

/**
 * Supabase caps every response at 1,000 rows, so large lists are read page by
 * page with `.range()` until a short page signals the end. The builder must
 * apply a deterministic order (include a unique column such as `id`) so rows
 * never shift between pages.
 */
export async function fetchAllRows<T>(
  buildPage: (from: number, to: number) => PageResult<T>,
): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await buildPage(from, from + PAGE_SIZE - 1)
    if (error) {
      console.error('fetchAllRows page failed:', error.message)
      break
    }
    const page = data ?? []
    rows.push(...page)
    if (page.length < PAGE_SIZE) break
  }
  return rows
}
