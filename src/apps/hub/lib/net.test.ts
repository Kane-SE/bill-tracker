import { afterEach, describe, expect, it, vi } from 'vitest'
import { asNetworkError, timeoutSignal } from './net'

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('timeoutSignal', () => {
  it('uses AbortSignal.timeout where the browser has it, and that signal aborts once the time is up', async () => {
    const native = vi.spyOn(AbortSignal, 'timeout')
    const signal = timeoutSignal(20)
    expect(native).toHaveBeenCalledWith(20)
    expect(signal).toBeInstanceOf(AbortSignal)
    expect(signal.aborted).toBe(false)
    // Node runs AbortSignal.timeout on its own internal timers, which fake timers do not drive: wait for the real one.
    await new Promise((resolve) => signal.addEventListener('abort', resolve))
    expect(signal.aborted).toBe(true)
    expect((signal.reason as DOMException).name).toBe('TimeoutError')
  })

  it('falls back to a timer when AbortSignal.timeout is missing (iOS before 16)', () => {
    vi.useFakeTimers()
    const original = AbortSignal.timeout
    Object.defineProperty(AbortSignal, 'timeout', { value: undefined, configurable: true, writable: true })
    try {
      const signal = timeoutSignal(1_000)
      expect(signal).toBeInstanceOf(AbortSignal)
      vi.advanceTimersByTime(999)
      expect(signal.aborted).toBe(false)
      vi.advanceTimersByTime(1)
      expect(signal.aborted).toBe(true)
      expect(asNetworkError(signal.reason)).toBeInstanceOf(TypeError)
    } finally {
      Object.defineProperty(AbortSignal, 'timeout', { value: original, configurable: true, writable: true })
    }
  })
})

describe('asNetworkError', () => {
  it.each(['TimeoutError', 'AbortError'])('turns a %s into the TypeError an offline fetch throws', (name) => {
    const converted = asNetworkError(new DOMException('The operation timed out.', name))
    expect(converted).toBeInstanceOf(TypeError)
    expect((converted as TypeError).message).toBe('Request timed out')
  })

  it('leaves every other error untouched', () => {
    const offline = new TypeError('Failed to fetch')
    const otherDom = new DOMException('nope', 'NotAllowedError')
    const plain = new Error('boom')
    expect(asNetworkError(offline)).toBe(offline)
    expect(asNetworkError(otherDom)).toBe(otherDom)
    expect(asNetworkError(plain)).toBe(plain)
    expect(asNetworkError('text')).toBe('text')
    expect(asNetworkError(null)).toBeNull()
  })
})
