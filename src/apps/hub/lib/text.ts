/** Text plumbing for markdown files fetched from GitHub. Pure, no DOM. */

export type Eol = '\n' | '\r\n'

export function encodeBase64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binary)
}

/** GitHub wraps base64 content at 60 columns; whitespace is ignored. */
export function decodeBase64Utf8(b64: string): string {
  const binary = atob(b64.replace(/\s/g, ''))
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export interface Lines {
  lines: string[]
  eol: Eol
  trailingNewline: boolean
}

/** Split into lines, remembering the file's line ending and whether it ended with one. */
export function splitLines(text: string): Lines {
  const eol: Eol = text.includes('\r\n') ? '\r\n' : '\n'
  if (text === '') return { lines: [], eol, trailingNewline: false }
  const lines = text.split(/\r?\n/)
  const trailingNewline = lines[lines.length - 1] === ''
  if (trailingNewline) lines.pop()
  return { lines, eol, trailingNewline }
}

export function joinLines(lines: string[], eol: Eol, trailingNewline: boolean): string {
  if (lines.length === 0) return ''
  return lines.join(eol) + (trailingNewline ? eol : '')
}

/** User input that must fit on one markdown line. */
export function oneLine(text: string): string {
  return text.replace(/\s*\r?\n\s*/g, ' ').trim()
}

/** Stable id for an idea heading. */
export function slugify(title: string): string {
  const slug = title
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'idea'
}

/** The anchor GitHub generates for a markdown heading (first occurrence). */
export function githubAnchor(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s/g, '-')
}
