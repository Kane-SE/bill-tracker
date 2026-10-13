import { describe, expect, it } from 'vitest'
import { fold } from './fold.mjs'

describe('fold', () => {
  it('ignores case, spaces and punctuation', () => {
    expect(fold('Love is a Danger Zone(Cranky Mix)')).toBe(fold('love is a danger zone (cranky mix)'))
    expect(fold('Phalanx "RS2018 edit"')).toBe('phalanxrs2018edit')
    expect(fold('WI-EX-DOC-VA')).toBe('wiexdocva')
  })
  it('strips accents', () => {
    expect(fold('Café')).toBe('cafe')
  })
  it('keeps Korean and Japanese text', () => {
    expect(fold('사랑 했다')).toBe(fold('사랑했다'))
    expect(fold('사랑')).not.toBe('')
    expect(fold('ナナヒラ')).not.toBe('')
  })
})
