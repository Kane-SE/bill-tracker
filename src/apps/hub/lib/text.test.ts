import { describe, expect, it } from 'vitest'
import { decodeBase64Utf8, encodeBase64Utf8, githubAnchor, joinLines, oneLine, slugify, splitLines } from './text'

describe('base64 UTF-8', () => {
  it('round-trips Vietnamese text and emoji', () => {
    const text = 'Đặt món nhóm 🍜\nGhi chú tiếng Việt.\n'
    expect(decodeBase64Utf8(encodeBase64Utf8(text))).toBe(text)
  })
  it('decodes GitHub content that has line breaks inside the base64', () => {
    const b64 = encodeBase64Utf8('# Ideas\n')
    const wrapped = `${b64.slice(0, 4)}\n${b64.slice(4)}\n`
    expect(decodeBase64Utf8(wrapped)).toBe('# Ideas\n')
  })
})

describe('splitLines / joinLines', () => {
  it('keeps LF files byte-identical', () => {
    const text = 'a\nb\n\nc\n'
    const { lines, eol, trailingNewline } = splitLines(text)
    expect(lines).toEqual(['a', 'b', '', 'c'])
    expect(eol).toBe('\n')
    expect(joinLines(lines, eol, trailingNewline)).toBe(text)
  })
  it('keeps CRLF files byte-identical', () => {
    const text = 'a\r\nb\r\n'
    const parts = splitLines(text)
    expect(parts.eol).toBe('\r\n')
    expect(joinLines(parts.lines, parts.eol, parts.trailingNewline)).toBe(text)
  })
  it('remembers a missing trailing newline', () => {
    const parts = splitLines('a\nb')
    expect(parts.trailingNewline).toBe(false)
    expect(joinLines(parts.lines, parts.eol, parts.trailingNewline)).toBe('a\nb')
  })
  it('treats an empty string as no lines', () => {
    expect(splitLines('').lines).toEqual([])
  })
})

describe('oneLine', () => {
  it('collapses line breaks into single spaces and trims', () => {
    expect(oneLine('  first\r\n second \n')).toBe('first second')
  })
})

describe('slugify', () => {
  it('lowercases, strips accents and joins words with dashes', () => {
    expect(slugify('Photo-tagging for Nomnoms')).toBe('photo-tagging-for-nomnoms')
    expect(slugify('Đặt món nhóm 🍜')).toBe('dat-mon-nhom')
  })
  it('never returns an empty slug', () => {
    expect(slugify('🍜🍜')).toBe('idea')
  })
})

describe('githubAnchor', () => {
  it('matches GitHub heading anchors: lowercase, punctuation dropped, spaces to dashes', () => {
    expect(githubAnchor('Photo-tagging for Nomnoms!')).toBe('photo-tagging-for-nomnoms')
    expect(githubAnchor('Đặt món nhóm')).toBe('đặt-món-nhóm')
  })

  it('keeps underscores, as GitHub does', () => {
    expect(githubAnchor('my_idea')).toBe('my_idea')
  })

  it('keeps the tone marks of decomposed (NFD) Vietnamese text, as GitHub does', () => {
    const decomposed = 'Đặt món'.normalize('NFD')
    expect(decomposed).not.toBe('Đặt món')
    expect(githubAnchor(decomposed)).toBe('đặt-món'.normalize('NFD'))
  })
})
