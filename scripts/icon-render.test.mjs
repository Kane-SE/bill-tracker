import { describe, expect, it } from 'vitest'
import { BG, TILE_COLORS, encodePNG, renderIcon } from './icon-render.mjs'

const alphaAt = (px, size, x, y) => px[(y * size + x) * 4 + 3]
const rgbAt = (px, size, x, y) => {
  const i = (y * size + x) * 4
  return [px[i], px[i + 1], px[i + 2]]
}

describe('renderIcon', () => {
  it('returns an RGBA buffer of size x size', () => {
    expect(renderIcon(64, 'any').length).toBe(64 * 64 * 4)
  })

  it("'any' has transparent rounded corners and an opaque centre", () => {
    const px = renderIcon(192, 'any')
    expect(alphaAt(px, 192, 0, 0)).toBe(0)
    expect(alphaAt(px, 192, 96, 96)).toBe(255)
  })

  it("'apple' is fully opaque (iOS fills transparency with black)", () => {
    const px = renderIcon(180, 'apple')
    for (let i = 3; i < px.length; i += 4) expect(px[i]).toBe(255)
  })

  it("'maskable' keeps every tile inside the 40%-radius safe zone", () => {
    const size = 512
    const px = renderIcon(size, 'maskable')
    const tiles = TILE_COLORS.map((c) => c.join())
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2) <= size * 0.4) continue
        expect(alphaAt(px, size, x, y)).toBe(255)
        expect(tiles).not.toContain(rgbAt(px, size, x, y).join())
      }
    }
    expect(rgbAt(px, size, 0, 0)).toEqual(BG)
  })
})

describe('encodePNG', () => {
  it('writes a PNG signature and the right dimensions', () => {
    const png = encodePNG(32, renderIcon(32, 'any'))
    expect([...png.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47])
    expect(png.readUInt32BE(16)).toBe(32)
    expect(png.readUInt32BE(20)).toBe(32)
  })
})
