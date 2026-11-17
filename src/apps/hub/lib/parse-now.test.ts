import { describe, expect, it } from 'vitest'
import bill from './__fixtures__/now-bill-splitter.md?raw'
import idle from './__fixtures__/now-idle-farming.md?raw'
import calendar from './__fixtures__/now-calendar.md?raw'
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
      forYou: null,
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

  describe('For you lines', () => {
    it('reads Next, Then and Blocked from the For you section', () => {
      expect(parseNowNote('now/calendar.md', calendar).forYou).toEqual({
        next: 'Check the week view on your phone after PR #4 deploys',
        then: ['Merge PR #4', 'Pick a colour for booked days'],
        blocked: null,
      })
    })

    it('still reads the For Claude fields below it', () => {
      const card = parseNowNote('now/calendar.md', calendar)
      expect(card.lastWorked).toBe('2026-11-16')
      expect(card.machine).toBe('fedora')
      expect(card.nextAction).toMatch(/^Check the week view on a phone/)
      expect(card.waitingSince).toBe('2026-11-16')
      expect(card.inFlight).toEqual(['PR #4 open (fix/week-scroll)', 'main deploys on push'])
    })

    it('keeps a blocker and drops an empty Then', () => {
      const note = "## For you\nNext: Ship it\nThen: —\nBlocked: the client's answer\n"
      expect(parseNowNote('now/x.md', note).forYou).toEqual({ next: 'Ship it', then: [], blocked: "the client's answer" })
    })

    it('does not take For you keys from other sections', () => {
      const note = '## For you\nNext: Ship it\n\n## For Claude\nThen: not a For you line\nBlocked: neither\n'
      expect(parseNowNote('now/x.md', note).forYou).toEqual({ next: 'Ship it', then: [], blocked: null })
    })

    it('is null for a note written before the For you section existed', () => {
      expect(parseNowNote('now/idle-farming.md', idle).forYou).toBeNull()
    })
  })
})
