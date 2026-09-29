// Pure renderer for the Nook app icon (see public/favicon.svg — same design,
// same 96-unit coordinates). No deps: shapes are rounded rects, anti-aliased by
// 4x4 supersampling, encoded with a tiny zlib-based PNG writer.
import { deflateSync } from 'node:zlib'

export const BG = [0x4a, 0x34, 0x26] // espresso #4A3426
// Tiles, top-left -> bottom-right: FFFBE9, E3CAA5, CEAB93, AD8B73 (Coffee palette).
export const TILE_COLORS = [
  [0xff, 0xfb, 0xe9],
  [0xe3, 0xca, 0xa5],
  [0xce, 0xab, 0x93],
  [0xad, 0x8b, 0x73],
]
const TILES = [
  { x: 22, y: 22, w: 23, h: 23, r: 7 },
  { x: 51, y: 22, w: 23, h: 23, r: 7 },
  { x: 22, y: 51, w: 23, h: 23, r: 7 },
  { x: 51, y: 51, w: 23, h: 23, r: 11.5 },
]

function inRoundRect(px, py, { x, y, w, h, r }) {
  if (px < x || py < y || px > x + w || py > y + h) return false
  const dx = Math.max(x + r - px, px - (x + w - r), 0)
  const dy = Math.max(y + r - py, py - (y + h - r), 0)
  return dx * dx + dy * dy <= r * r
}

/**
 * Render the icon as an RGBA buffer.
 * - 'any':      rounded-corner background, transparent corners (Android/desktop).
 * - 'maskable': full-bleed background, tiles shrunk into the 40%-radius safe zone.
 * - 'apple':    full-bleed, fully opaque square (iOS rounds it and blackens alpha).
 */
export function renderIcon(size, variant = 'any') {
  const px = Buffer.alloc(size * size * 4)
  const unit = size / 96
  const tileScale = variant === 'maskable' ? 0.9 : 1
  const SS = 4
  const bgShape = { x: 0, y: 0, w: 96, h: 96, r: variant === 'any' ? 22 : 0 }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          // Sample point in 96-unit design space.
          const ux = (x + (sx + 0.5) / SS) / unit
          const uy = (y + (sy + 0.5) / SS) / unit
          if (!inRoundRect(ux, uy, bgShape)) continue
          // Tiles are laid out around the centre so they can be scaled for 'maskable'.
          const tx = 48 + (ux - 48) / tileScale
          const ty = 48 + (uy - 48) / tileScale
          const i = TILES.findIndex((t) => inRoundRect(tx, ty, t))
          const [cr, cg, cb] = i === -1 ? BG : TILE_COLORS[i]
          r += cr; g += cg; b += cb; a += 1
        }
      }
      const o = (y * size + x) * 4
      if (a > 0) {
        px[o] = Math.round(r / a)
        px[o + 1] = Math.round(g / a)
        px[o + 2] = Math.round(b / a)
      }
      px[o + 3] = Math.round((a / (SS * SS)) * 255)
    }
  }
  return px
}

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

/** Encode a size x size RGBA buffer as a PNG. */
export function encodePNG(size, pixels) {
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
