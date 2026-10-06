/** Network plumbing shared by the GitHub client and the token calls. */

/** How long a GitHub or token request may take before it counts as offline. */
export const REQUEST_TIMEOUT_MS = 15_000

/** A signal that aborts after `ms`. iOS before 16 has no AbortSignal.timeout; a timer does the same job there. */
export function timeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal.timeout === 'function') return AbortSignal.timeout(ms)
  const controller = new AbortController()
  setTimeout(() => controller.abort(), ms)
  return controller.signal
}

/**
 * A timed-out or aborted request becomes the TypeError fetch throws without a network, so callers that check
 * `instanceof TypeError` treat a dead connection as offline. Everything else passes through unchanged.
 */
export function asNetworkError(error: unknown): unknown {
  if (error instanceof DOMException && (error.name === 'TimeoutError' || error.name === 'AbortError')) return new TypeError('Request timed out')
  return error
}
