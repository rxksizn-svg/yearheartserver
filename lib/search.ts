type Searchable = string | number | null | undefined

/**
 * Case-insensitive match where every whitespace-separated term must appear
 * somewhere in the combined values, so "real fake" finds "REAL OR FAKE".
 */
export function matchesSearch(query: string, values: Searchable[]): boolean {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return true
  const haystack = values
    .filter((v) => v !== null && v !== undefined && v !== '')
    .map(String)
    .join(' ')
    .toLowerCase()
  return terms.every((term) => haystack.includes(term))
}
