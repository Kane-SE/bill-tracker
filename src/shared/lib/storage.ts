import { appDataSchema, type AppData } from '@/apps/split/types'

/**
 * Export / import of the whole app dataset as a JSON file. Import is validated
 * with zod so a malformed or foreign file can never corrupt app state.
 */

export const STORAGE_KEY = 'bill-splitter-store'

export function downloadBackup(data: AppData): void {
  const payload = JSON.stringify(data, null, 2)
  const blob = new Blob([payload], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const stamp = new Date().toISOString().slice(0, 10)
  const a = document.createElement('a')
  a.href = url
  a.download = `split-backup-${stamp}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export type ImportResult =
  | { ok: true; data: AppData }
  | { ok: false; error: string }

export function parseBackup(text: string): ImportResult {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' }
  }
  const result = appDataSchema.safeParse(json)
  if (!result.success) {
    return { ok: false, error: 'This file is not a valid Split backup.' }
  }
  return { ok: true, data: result.data }
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Could not read the file.'))
    reader.readAsText(file)
  })
}
