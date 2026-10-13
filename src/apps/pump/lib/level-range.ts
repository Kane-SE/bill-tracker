export type LevelRange = [number, number] | null

/**
 * Level grid taps: first tap picks one level, the second makes the inclusive
 * range, a third starts over. Tapping the only selected level clears it. A
 * single level that is already selected (e.g. restored from the URL) counts
 * as the first tap.
 */
export function nextLevelRange(value: LevelRange, anchor: number | null, tapped: number): { value: LevelRange; anchor: number | null } {
  const first = anchor ?? (value && value[0] === value[1] ? value[0] : null)
  if (first !== null) {
    if (tapped === first) return { value: null, anchor: null }
    return { value: [Math.min(first, tapped), Math.max(first, tapped)], anchor: null }
  }
  return { value: [tapped, tapped], anchor: tapped }
}
