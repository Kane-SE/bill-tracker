/** Fixed order: bit i of a chart's `sk` mask is SKILLS[i]; `cov` holds the first five. */
export const SKILLS = ['half', 'run', 'twist', 'bracket', 'drill', 'gimmick']
export const COMPUTED_SKILLS = ['half', 'run', 'twist', 'bracket', 'drill']

/**
 * piucenter coverage columns (PIU Scores `pc:badge_fraction:*`) and top-3 badge
 * names behind each computed skill. Gimmick comes only from the title lists.
 */
export const SKILL_SOURCES = {
  half: { columns: ['mid6_doubles'], badges: [], doubleOnly: true },
  run: { columns: ['run', 'anchor_run'], badges: ['Runs', 'Anchor Runs', 'Runs Without Twists'] },
  twist: { columns: ['twist_90', 'twist_over90', 'twist_close', 'twist_far'], badges: ['Twists'] },
  bracket: {
    columns: ['bracket', 'staggered_bracket', 'bracket_run', 'bracket_drill', 'bracket_jump', 'bracket_twist'],
    badges: ['Brackets', 'Staggered Brackets', 'Bracket Runs', 'Bracket Drills', 'Bracket Jumps', 'Bracket Twists'],
  },
  drill: { columns: ['drill', 'bracket_drill'], badges: ['Drills', 'Bracket Drills'] },
}

/**
 * Share of a skill's title charts its threshold must still tag. Lowering it
 * raises every threshold, so fewer charts get tagged (spec §Data → Rules).
 */
export const TITLE_HIT_TARGET = 0.9

export function skillScore(coverage, skill) {
  return Math.max(0, ...SKILL_SOURCES[skill].columns.map((c) => coverage[c] ?? 0))
}

export function pickThreshold(scores, target = TITLE_HIT_TARGET) {
  if (scores.length === 0) return Infinity
  const sorted = [...scores].sort((a, b) => b - a)
  return sorted[Math.max(1, Math.ceil(sorted.length * target)) - 1]
}

export function tagSkills({ mode, coverage, badges }, thresholds) {
  const out = new Set()
  for (const skill of COMPUTED_SKILLS) {
    const src = SKILL_SOURCES[skill]
    if (src.doubleOnly && mode !== 'D') continue
    const byScore = skillScore(coverage, skill) >= thresholds[skill]
    const byBadge = badges.some((b) => src.badges.includes(b))
    if (byScore || byBadge) out.add(skill)
  }
  return out
}

export function computeThresholds(charts, byChart, forced, target = TITLE_HIT_TARGET) {
  const mode = new Map(charts.map((c) => [c.id, c.mode]))
  const out = {}
  for (const skill of COMPUTED_SKILLS) {
    const scores = []
    for (const [id, skills] of forced) {
      const row = byChart.get(id)
      if (!row || !skills.has(skill)) continue
      if (SKILL_SOURCES[skill].doubleOnly && mode.get(id) !== 'D') continue
      scores.push(skillScore(row.coverage, skill))
    }
    out[skill] = pickThreshold(scores, target)
  }
  return out
}

export function skillsFor(chart, row, thresholds, forcedSet) {
  const out = row ? tagSkills({ mode: chart.mode, coverage: row.coverage, badges: row.badges }, thresholds) : new Set()
  for (const s of forcedSet ?? []) out.add(s)
  return out
}

/** Per skill: threshold, how many of its title charts it tags before forcing, and how many charts end up tagged. */
export function skillStats(charts, byChart, thresholds, forced, skillsById) {
  const byId = new Map(charts.map((c) => [c.id, c]))
  return SKILLS.map((skill) => {
    const titleIds = [...forced].filter(([, s]) => s.has(skill)).map(([id]) => id)
    const hits = titleIds.filter((id) => {
      const row = byChart.get(id)
      const c = byId.get(id)
      return row && c && skill !== 'gimmick' && tagSkills({ mode: c.mode, coverage: row.coverage, badges: row.badges }, thresholds).has(skill)
    }).length
    const tagged = charts.filter((c) => skillsById.get(c.id)?.has(skill)).length
    return { skill, threshold: thresholds[skill] ?? null, titleHit: hits, titleCount: titleIds.length, tagged }
  })
}
