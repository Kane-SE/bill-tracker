import { describe, expect, it } from 'vitest'
import { computeThresholds, pickThreshold, skillScore, skillsFor, tagSkills } from './skills.mjs'

const TH = { half: 0.25, run: 0.3, twist: 0.4, bracket: 0.45, drill: 0.33 }

describe('skillScore', () => {
  it('takes the strongest coverage column of the skill', () => {
    expect(skillScore({ twist_90: 0.2, twist_far: 0.6 }, 'twist')).toBe(0.6)
    expect(skillScore({}, 'run')).toBe(0)
  })
})

describe('pickThreshold', () => {
  it('is the highest score that still tags the target share of title charts', () => {
    expect(pickThreshold([0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0.05], 0.9)).toBe(0.1)
    expect(pickThreshold([0.5, 0.4], 0.9)).toBe(0.4)
  })
  it('tags nothing when a skill has no title charts', () => {
    expect(pickThreshold([], 0.9)).toBe(Infinity)
  })
})

describe('tagSkills', () => {
  it('tags by coverage or by a top-3 badge', () => {
    const s = tagSkills({ mode: 'S', coverage: { run: 0.5, twist_90: 0.1 }, badges: ['Twists'] }, TH)
    expect([...s].sort()).toEqual(['run', 'twist'])
  })
  it('tags half only on Double charts', () => {
    expect(tagSkills({ mode: 'S', coverage: { mid6_doubles: 0.9 }, badges: [] }, TH).has('half')).toBe(false)
    expect(tagSkills({ mode: 'D', coverage: { mid6_doubles: 0.3 }, badges: [] }, TH).has('half')).toBe(true)
  })
})

describe('skillsFor', () => {
  it('adds forced ladder skills and keeps charts without coverage empty', () => {
    expect([...skillsFor({ mode: 'HDB' }, undefined, TH, undefined)]).toEqual([])
    expect([...skillsFor({ mode: 'S' }, undefined, TH, new Set(['gimmick']))]).toEqual(['gimmick'])
  })
})

describe('computeThresholds', () => {
  it('uses only title charts of each skill that have coverage', () => {
    const charts = [{ id: 1, mode: 'S' }, { id: 2, mode: 'S' }, { id: 3, mode: 'D' }]
    const byChart = new Map([
      [1, { coverage: { run: 0.6 } }],
      [2, { coverage: { run: 0.3 } }],
      [3, { coverage: { mid6_doubles: 0.4 } }],
    ])
    const forced = new Map([[1, new Set(['run'])], [2, new Set(['run'])], [3, new Set(['half'])]])
    const t = computeThresholds(charts, byChart, forced, 0.5)
    expect(t.run).toBe(0.6)
    expect(t.half).toBe(0.4)
    expect(t.twist).toBe(Infinity)
  })
})
