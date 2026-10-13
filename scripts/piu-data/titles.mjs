/** Which skill each ladder track proves. SLOW counts as gimmick (decisions.md, round 2). */
export const TRACK_SKILL = {
  'TWIST S': 'twist', 'TWIST D': 'twist', TWIST: 'twist',
  'RUN S': 'run', 'RUN D': 'run', RUN: 'run',
  DRILL: 'drill', HALF: 'half', BRACKET: 'bracket',
  GIMMICK: 'gimmick', SLOW: 'gimmick',
}
const GAME = { P2: 'PHOENIX 2', P1: 'PHOENIX', XX: 'XX' }

/**
 * @param ladders parsed ladders.json
 * @param present chart ids that exist in the PHOENIX 2 catalog
 */
export function resolveLadders(ladders, present) {
  const titles = []
  const forced = new Map()
  const gimmickFrom = new Map()
  const missing = []
  for (const game of ['P2', 'P1', 'XX']) {
    for (const e of ladders[game]) {
      if (!present.has(e.chart)) {
        if (game === 'P2') missing.push(e)
        continue
      }
      const skill = TRACK_SKILL[e.track]
      if (!skill) throw new Error(`Unknown ladder track "${e.track}" in ${game}`)
      if (!forced.has(e.chart)) forced.set(e.chart, new Set())
      forced.get(e.chart).add(skill)
      if (skill === 'gimmick') {
        gimmickFrom.set(e.chart, [...(gimmickFrom.get(e.chart) ?? []), `${GAME[game]} ${e.track} Lv.${e.lv}`])
      }
      if (game === 'P2') titles.push({ id: `${e.track.replace(/ /g, '_')}_${e.lv}`, track: e.track, lv: e.lv, chart: e.chart })
    }
  }
  return { titles, forced, gimmickFrom, missing }
}
