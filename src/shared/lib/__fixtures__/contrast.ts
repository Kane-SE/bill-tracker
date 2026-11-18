import { contrastRatio } from '@/shared/lib/palette'

/** WCAG contrast ratio between two "H S% L%" tokens; fails loudly on a missing token. Test helper. */
export function contrast(a: string | undefined, b: string | undefined): number {
  if (a === undefined || b === undefined) throw new Error('Missing token')
  return contrastRatio(a, b)
}
