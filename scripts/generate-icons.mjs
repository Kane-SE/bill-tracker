// Writes the PWA PNG icons for the Nook tile-grid logo (design + renderer in
// ./icon-render.mjs; keep public/favicon.svg in sync). Run: `node scripts/generate-icons.mjs`.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { encodePNG, renderIcon } from './icon-render.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(__dirname, '../public')
mkdirSync(resolve(publicDir, 'icons'), { recursive: true })

const targets = [
  { file: 'icons/icon-192.png', size: 192, variant: 'any' },
  { file: 'icons/icon-512.png', size: 512, variant: 'any' },
  { file: 'icons/icon-512-maskable.png', size: 512, variant: 'maskable' },
  { file: 'apple-touch-icon.png', size: 180, variant: 'apple' },
]

for (const t of targets) {
  writeFileSync(resolve(publicDir, t.file), encodePNG(t.size, renderIcon(t.size, t.variant)))
  console.log('wrote', t.file)
}
