import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { contrast } from './__fixtures__/contrast'

const css = readFileSync('src/index.css', 'utf8')

/** The custom properties declared in one `[data-theme='name'] { … }` block of index.css. */
function themeTokens(name: string): Record<string, string> {
  const block = new RegExp(`\\[data-theme='${name}'\\]\\s*\\{([^}]*)\\}`).exec(css)?.[1]
  if (!block) throw new Error(`No [data-theme='${name}'] block in index.css`)
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]))
}

describe.each(['light', 'dark', 'coffee', 'coffee-dark'])('the %s theme', (name) => {
  const t = themeTokens(name)
  it('has a gold "new" border that stands out from the card (3:1)', () => {
    expect(contrast(t.new, t.card)).toBeGreaterThanOrEqual(3)
  })
  it('has readable NEW tag text on the gold (4.5:1)', () => {
    expect(contrast(t['new-foreground'], t.new)).toBeGreaterThanOrEqual(4.5)
  })
})
