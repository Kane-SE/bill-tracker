import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

export const CACHE_DIR = path.resolve('.cache/piu-data')

/**
 * Download `url` into .cache/piu-data/<name> once; later calls read the cached
 * copy unless `refresh` is set. Throws on a non-2xx response.
 */
export async function fetchCached(url, name, { refresh = false } = {}) {
  const file = path.join(CACHE_DIR, name)
  if (!refresh && existsSync(file)) return readFile(file)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`GET ${url} → HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  await mkdir(CACHE_DIR, { recursive: true })
  await writeFile(file, buf)
  return buf
}
