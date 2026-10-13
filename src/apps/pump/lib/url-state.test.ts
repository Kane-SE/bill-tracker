import { describe, expect, it } from 'vitest'
import { defaultFilters, type Filters } from './filters'
import { hasFilterParams, mergeLiveFilters, paramsAfterClose, parseFilters, parseLevel, serializeFilters, withFilters } from './url-state'

const p = (s: string) => new URLSearchParams(s)
const full: Filters = {
  modes: ['S', 'D'], level: [18, 20], skills: ['twist', 'bracket'], skillsAll: true, types: ['SHORTCUT'],
  series: ['FIESTA~FIESTA 2', 'XX'], titleOnly: true, steamLink: true, hidePremium: true, q: 'vook',
}

describe('serializeFilters / parseFilters', () => {
  it('writes a canonical, readable query', () => {
    expect(serializeFilters({ ...full, skills: ['bracket', 'twist'], series: ['XX', 'FIESTA~FIESTA 2'] })).toBe(
      'm=S,D&lv=18-20&sk=twist,bracket&all=1&ty=shortcut&v=fiesta,xx&tc=1&sl=1&np=1&q=vook',
    )
    expect(serializeFilters(defaultFilters)).toBe('')
    expect(serializeFilters({ ...defaultFilters, level: [19, 19] })).toBe('lv=19')
  })
  it('round-trips', () => {
    expect(parseFilters(p(serializeFilters(full)))).toEqual(full)
  })
  it('keeps the search text as typed, but omits a blank one', () => {
    expect(parseFilters(p(serializeFilters({ ...defaultFilters, q: 'final ' }))).q).toBe('final ')
    expect(serializeFilters({ ...defaultFilters, q: '   ' })).toBe('')
  })
  it('drops unknown and malformed values instead of throwing', () => {
    expect(parseFilters(p('m=X,s&lv=abc&sk=jump,RUN&ty=nope&v=zzz&all=yes'))).toEqual({ ...defaultFilters, modes: ['S'], skills: ['run'] })
  })
  it('keeps the HD mode only while Steam Link is shown', () => {
    expect(parseFilters(p('m=HDB,D')).modes).toEqual(['D'])
    expect(parseFilters(p('m=HDB,D&sl=1')).modes).toEqual(['D', 'HDB'])
    expect(serializeFilters({ ...defaultFilters, modes: ['HDB'] })).toBe('')
  })
})

describe('parseLevel', () => {
  it('normalises ranges and rejects nonsense', () => {
    expect(parseLevel('29-18')).toEqual([18, 29])
    expect(parseLevel('19')).toEqual([19, 19])
    expect(parseLevel('0')).toBeNull()
    expect(parseLevel('abc')).toBeNull()
    expect(parseLevel('18-')).toBeNull()
    expect(parseLevel(null)).toBeNull()
  })
})

describe('params helpers', () => {
  it('replaces filter params and keeps UI params', () => {
    const next = withFilters(p('tab=titles&f=1&m=S&q=bee'), { ...defaultFilters, modes: ['D'] })
    expect(Object.fromEntries(next)).toEqual({ tab: 'titles', f: '1', m: 'D' })
  })
  it('knows when the URL carries filters', () => {
    expect(hasFilterParams(p('tab=titles'))).toBe(false)
    expect(hasFilterParams(p('lv=19'))).toBe(true)
  })
  it('re-applies live filters but keeps the current search text', () => {
    const next = mergeLiveFilters(p('m=S&q=bee&tab=titles&f=1'), 'm=D&lv=20')
    expect(Object.fromEntries(next)).toEqual({ q: 'bee', tab: 'titles', f: '1', m: 'D', lv: '20' })
  })
  it('after a sheet closes: live filters back, sheet params gone', () => {
    const next = paramsAfterClose(p('m=S&f=1&c=12&a=1'), 'sk=twist')
    expect(Object.fromEntries(next)).toEqual({ sk: 'twist' })
  })
})
