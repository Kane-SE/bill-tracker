import { describe, expect, it } from 'vitest'
import bill from './__fixtures__/now-bill-splitter.md?raw'
import idle from './__fixtures__/now-idle-farming.md?raw'
import { parseNowNote } from './parse-now'

describe('parseNowNote', () => {
  it('reads every field of a real NOW note', () => {
    expect(parseNowNote('now/bill-splitter.md', bill)).toEqual({
      file: 'now/bill-splitter.md',
      project: 'bill-splitter',
      lastWorked: '2026-09-30',
      machine: 'pc',
      nextAction:
        'Decide whether the Vercel SPA-rewrite fix is still needed (the app uses HashRouter, so probably not), then open a PR or delete the branch (branch feat/nomnom-launcher)',
      waitingOnMe: 'photo-tagging design grill, Round 5 (Q13–Q15) unanswered since 2026-08-17',
      waitingSince: '2026-08-17',
      waitingOnOthers: null,
      inFlight: ['main = PR #2 merged 2026-09-30', 'main auto-deploys on Vercel, so changes go through a branch + PR'],
      plans: 'bill-splitter/DEPLOY.md · bill-splitter/docs/superpowers/specs/',
    })
  })

  it('leaves plans empty when the note has no Plans & decisions line', () => {
    expect(parseNowNote('now/calendar.md', 'Next action: Fix the week view\n').plans).toBeNull()
  })

  it('falls back to the last-worked date when the waiting text has no date', () => {
    const card = parseNowNote('now/idle-farming.md', idle)
    expect(card.waitingSince).toBe('2026-09-12')
    expect(card.inFlight).toEqual([])
  })

  it('uses the file name when the title is missing and ignores unknown keys', () => {
    const card = parseNowNote('now/calendar.md', 'Mood: sleepy\nNext action: Fix the week view\n')
    expect(card.project).toBe('calendar')
    expect(card.nextAction).toBe('Fix the week view')
    expect(card.lastWorked).toBeNull()
  })

  it('keeps a machine description that is not a short name', () => {
    const card = parseNowNote('now/x.md', 'Last worked: 2026-09-30 · another machine (commits authored "X")\n')
    expect(card.machine).toBe('another machine (commits authored "X")')
  })

  it('handles CRLF files', () => {
    expect(parseNowNote('now/b.md', bill.replace(/\n/g, '\r\n')).machine).toBe('pc')
  })
})
