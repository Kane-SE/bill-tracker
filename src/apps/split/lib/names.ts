import type { Night } from '@/apps/split/types'

/** Names appearing as a participant in MORE THAN `threshold` distinct nights
 *  (case-insensitive), in first-seen display casing. */
export function frequentNames(nights: Night[], threshold = 2): string[] {
  const display = new Map<string, string>() // lowercase -> first-seen casing
  const counts = new Map<string, number>()
  for (const night of nights) {
    const seen = new Set<string>()
    for (const p of night.participants) {
      const key = p.trim().toLowerCase()
      if (!key || seen.has(key)) continue
      seen.add(key)
      if (!display.has(key)) display.set(key, p.trim())
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }
  const out: string[] = []
  for (const [key, count] of counts) {
    if (count > threshold) out.push(display.get(key)!)
  }
  return out
}
