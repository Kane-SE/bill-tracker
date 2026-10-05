import { describe, expect, it } from 'vitest'
import { daysBetween, formatDay, isIsoDate, localDate, relativeTime } from './dates'

const today = new Date(2026, 9, 5, 15, 30) // 5 Oct 2026, local time

describe('dates', () => {
  it('formats a local date as YYYY-MM-DD', () => {
    expect(localDate(new Date(2026, 0, 3, 23, 59))).toBe('2026-01-03')
  })
  it('validates ISO dates', () => {
    expect(isIsoDate('2026-10-05')).toBe(true)
    expect(isIsoDate('2026-13-05')).toBe(false)
    expect(isIsoDate('5 Oct')).toBe(false)
  })
  it('counts whole local days between a date and now', () => {
    expect(daysBetween('2026-10-05', today)).toBe(0)
    expect(daysBetween('2026-10-04', today)).toBe(1)
    expect(daysBetween('2026-08-17', today)).toBe(49)
  })
  it('formats days relative to today', () => {
    expect(formatDay('2026-10-05', today)).toBe('Today')
    expect(formatDay('2026-10-04', today)).toBe('Yesterday')
    expect(formatDay('2026-09-30', today)).toBe('30 Sep')
    expect(formatDay('2025-12-30', today)).toBe('30 Dec 2025')
  })
  it('describes how long ago something was fetched', () => {
    const now = today.getTime()
    expect(relativeTime(now - 20_000, now)).toBe('just now')
    expect(relativeTime(now - 5 * 60_000, now)).toBe('5 min ago')
    expect(relativeTime(now - 2 * 3_600_000, now)).toBe('2h ago')
  })
})
