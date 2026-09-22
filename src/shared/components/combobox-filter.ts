/** Case-insensitive substring filter, preserving the original order. */
export function filterSuggestions(suggestions: string[], query: string): string[] {
  const q = query.trim().toLowerCase()
  if (!q) return suggestions
  return suggestions.filter((s) => s.toLowerCase().includes(q))
}
