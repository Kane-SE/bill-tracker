import { describe, expect, it } from 'vitest'
import { fold, tokens } from './normalize'

describe('fold', () => {
  it('ignores case, accents and full-width forms', () => {
    expect(fold('Café')).toBe('cafe')
    expect(fold('ＢＥＥ')).toBe('bee')
  })
})

describe('tokens', () => {
  it('splits on whitespace and drops punctuation-only tokens', () => {
    expect(tokens('  Final   Audition ')).toEqual(['final', 'audition'])
    expect(tokens(' - ')).toEqual([])
    expect(tokens('8 6')).toEqual(['8', '6'])
  })
})

describe('half-typed Korean (research-ui §3.3)', () => {
  const hay = fold('사랑 한글')
  it.each(['ㅅ', '사', '사라', '사랑', '하', '한', '한ㄱ', '한그', '한글'])('matches %s', (q) => {
    expect(tokens(q).every((t) => hay.includes(t))).toBe(true)
  })
})
