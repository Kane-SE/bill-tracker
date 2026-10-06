import { describe, expect, it } from 'vitest'
import bill from './__fixtures__/now-bill-splitter.md?raw'
import idle from './__fixtures__/now-idle-farming.md?raw'
import ideasMd from './__fixtures__/ideas.md?raw'
import { parseNowNote } from './parse-now'
import { parseIdeas } from './ideas'
import { ageLabel, nowOrder, quietDays, staleDays, waitingDays } from './needs-you'

const today = new Date(2026, 9, 5)
const wip = [parseNowNote('now/bill-splitter.md', bill), parseNowNote('now/idle-farming.md', idle)]
const ideas = parseIdeas(ideasMd)
const card = (project: string, lastWorked: string | null, waitingOnMe: string | null = null, waitingSince: string | null = null) => ({
  ...wip[0],
  file: `now/${project}.md`,
  project,
  lastWorked,
  waitingOnMe,
  waitingSince,
})

describe('needs-you', () => {
  it('orders projects waiting on you first (longest wait first), then by most recent work', () => {
    const quiet = card('quiet', '2026-08-30')
    const recent = card('recent', '2026-10-04')
    const undated = card('undated', null)
    const waitingLong = card('waiting-long', '2026-09-30', 'a', '2026-08-17')
    const waitingShort = card('waiting-short', '2026-09-12', 'b', '2026-09-12')
    expect(nowOrder([quiet, undated, waitingShort, recent, waitingLong], today).map((c) => c.project)).toEqual([
      'waiting-long',
      'waiting-short',
      'recent',
      'quiet',
      'undated',
    ])
  })

  it('does not reorder the input and breaks ties by project name', () => {
    const input = [card('b', '2026-10-01'), card('a', '2026-10-01')]
    expect(nowOrder(input, today).map((c) => c.project)).toEqual(['a', 'b'])
    expect(input.map((c) => c.project)).toEqual(['b', 'a'])
  })

  it('never calls shipped or dropped ideas quiet', () => {
    const shipped = ideas.find((i) => i.stage === 'shipped')!
    expect(quietDays(shipped, new Date(2027, 0, 1))).toBeNull()
  })

  it('uses Added when an idea has no progress lines', () => {
    expect(quietDays({ id: 'x', title: 'x', stage: 'idea', added: '2026-09-01', note: null, progress: [] }, today)).toBe(34)
  })

  it('flags a NOW note last worked 14+ days ago', () => {
    expect(staleDays(wip[0], today)).toBeNull()
    expect(staleDays(wip[1], today)).toBe(23)
  })

  it('never reports negative waiting days for a date in the future', () => {
    expect(waitingDays({ ...wip[0], waitingSince: '2026-12-01' }, today)).toBe(0)
  })

  it('labels ages in days, then weeks', () => {
    expect(ageLabel(0)).toBe('today')
    expect(ageLabel(1)).toBe('1 day')
    expect(ageLabel(13)).toBe('13 days')
    expect(ageLabel(49)).toBe('7 weeks')
  })
})
