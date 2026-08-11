/**
 * Currency + date formatting. Money is stored as integer VND everywhere;
 * these helpers are the only place formatting rules live.
 */

const vnd = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
})

const plain = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 })

/** e.g. 300000 -> "300.000 ₫" */
export function formatMoney(amount: number): string {
  return vnd.format(Math.round(amount || 0))
}

/** e.g. 300000 -> "300.000" (no symbol, for inputs/compact display) */
export function formatNumber(amount: number): string {
  return plain.format(Math.round(amount || 0))
}

/** Parse user input like "300.000", "300,000" or "300000" -> 300000. */
export function parseMoney(input: string): number {
  if (!input) return 0
  const digits = input.replace(/[^\d]/g, '')
  if (!digits) return 0
  const n = Number(digits)
  return Number.isFinite(n) ? n : 0
}

const dateFmt = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

export function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return dateFmt.format(d)
}
