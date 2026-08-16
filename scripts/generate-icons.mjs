// Generates PWA PNG icons from a simple vector "split-coin" design.
// Pure Node (zlib) PNG encoder — no external deps. Run: `node scripts/generate-icons.mjs`.
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(__dirname, '../public/icons')
mkdirSync(outDir, { recursive: true })

const BRAND = [0x47, 0x53, 0x69] // #475369
const WHITE = [0xff, 0xff, 0xff]

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function encodePNG(size, pixels) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  const stride = size * 4
  const raw = Buffer.alloc((stride + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0 // filter none
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function drawIcon(size, { maskable = false } = {}) {
  const px = Buffer.alloc(size * size * 4)
  const set = (x, y, [r, g, b], a = 255) => {
    const i = (y * size + x) * 4
    px[i] = r
    px[i + 1] = g
    px[i + 2] = b
    px[i + 3] = a
  }
  const cx = size / 2
  const cy = size / 2
  const radius = size * (maskable ? 0.28 : 0.3)
  const cornerR = size * 0.22
  const barHalf = size * 0.035

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Rounded-rect brand background (full-bleed square for maskable).
      let bg = true
      if (!maskable) {
        const dx = Math.max(cornerR - x, x - (size - cornerR), 0)
        const dy = Math.max(cornerR - y, y - (size - cornerR), 0)
        if (dx * dx + dy * dy > cornerR * cornerR) bg = false
      }
      if (!bg) {
        set(x, y, BRAND, 0)
        continue
      }
      set(x, y, BRAND)

      // White coin.
      const d = Math.hypot(x - cx, y - cy)
      if (d <= radius) {
        set(x, y, WHITE)
        // Brand split bar down the middle.
        if (Math.abs(x - cx) <= barHalf) set(x, y, BRAND)
      }
    }
  }
  return px
}

const targets = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'icon-512-maskable.png', size: 512, maskable: true },
]

for (const t of targets) {
  const png = encodePNG(t.size, drawIcon(t.size, { maskable: t.maskable }))
  writeFileSync(resolve(outDir, t.name), png)
  console.log('wrote', t.name)
}

// Apple touch icon (180x180, non-maskable) at public root.
writeFileSync(
  resolve(__dirname, '../public/apple-touch-icon.png'),
  encodePNG(180, drawIcon(180)),
)
console.log('wrote apple-touch-icon.png')
