/**
 * Search form of a string: NFKD (folds accents, full-width forms and Korean
 * compatibility jamo), combining marks stripped, lower-cased. Hangul stays
 * decomposed, so a half-typed syllable is a prefix of the full one.
 */
export function fold(s: string): string {
  return s.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
}

/** Folded, whitespace-separated search tokens; tokens with no letter or digit are dropped. */
export function tokens(query: string): string[] {
  return fold(query)
    .split(/\s+/)
    .filter((t) => /[\p{L}\p{N}]/u.test(t))
}
