import { describe, expect, it } from 'vitest'
import bill from './__fixtures__/now-bill-splitter.md?raw'
import idle from './__fixtures__/now-idle-farming.md?raw'
import ideasMd from './__fixtures__/ideas.md?raw'
import { parseNowNote } from './parse-now'
import { parseIdeas } from './ideas'
import { ageLabel, needsYou, quietDays, staleDays, waitingDays } from './needs-you'

const today = new Date(2026, 9, 5)
const wip = [parseNowNote('now/bill-splitter.md', bill), parseNowNote('now/idle-farming.md', idle)]
const ideas = parseIdeas(ideasMd)

describe('needs-you', () => {
  it('lists waiting items oldest first, then quiet active ideas oldest first', () => {
    expect(needsYou(wip, ideas, today)).toEqual([
      { kind: 'waiting', title: 'photo-tagging design grill, Round 5 (Q13–Q15) unanswered since 2026-08-17', context: 'bill-splitter', days: 49, target: { type: 'project', project: 'bill-splitter' } },
      { kind: 'waiting', title: 'Choose a working title', context: 'idle-farming', days: 23, target: { type: 'project', project: 'idle-farming' } },
      { kind: 'quiet', title: 'Photo-tagging for Nomnoms', context: 'Idea', days: 33, target: { type: 'idea', id: 'photo-tagging-for-nomnoms' } },
    ])
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
