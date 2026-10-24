/**
 * Join key for song titles across sources: NFKD (so accents and full-width
 * forms fold), strip combining marks, lower-case, keep only letters and digits.
 */
export function fold(s) {
  return s
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')
}
