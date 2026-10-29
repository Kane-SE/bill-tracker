export const MAX_BYTES = 600_000
const MAX_UNMATCHED = 50
const MIN_SKILL_SHARE = 0.97
const MIN_ART_SHARE = 0.95
const MODE_SHORT = { S: 'S', D: 'D', HDB: 'HD' }

const name = (file, c) => `${file.songs[c.s].t} ${MODE_SHORT[c.m]}${c.lv}`

export function diffCatalogs(prev, next) {
  const before = new Map((prev?.charts ?? []).map((c) => [c.id, c]))
  const after = new Map(next.charts.map((c) => [c.id, c]))
  const added = next.charts.filter((c) => !before.has(c.id)).map((c) => name(next, c))
  const removed = (prev?.charts ?? []).filter((c) => !after.has(c.id)).map((c) => name(prev, c))
  const rerated = next.charts
    .filter((c) => before.has(c.id) && before.get(c.id).lv !== c.lv)
    .map((c) => `${name(prev, before.get(c.id))} → ${MODE_SHORT[c.m]}${c.lv}`)
  return { added, removed, rerated }
}

export function checkCatalog(file, { missingTitles, unmatched, sdCount, sdWithSkills, bytes }) {
  const errors = []
  if (missingTitles.length) errors.push(`PHOENIX 2 title charts missing from the catalog: ${missingTitles.map((e) => e.label).join(', ')}`)
  const unrated = file.charts.filter((c) => !(c.lv >= 1))
  if (unrated.length) errors.push(`${unrated.length} chart(s) have no level: ${unrated.map((c) => c.id).join(', ')}`)
  if (sdWithSkills / sdCount < MIN_SKILL_SHARE) errors.push(`Only ${sdWithSkills}/${sdCount} S/D charts have skill data (need ≥ ${MIN_SKILL_SHARE * 100}%)`)
  const withArt = file.songs.filter((s) => s.i).length
  if (withArt / file.songs.length < MIN_ART_SHARE) errors.push(`Only ${withArt}/${file.songs.length} songs have song art (need ≥ ${MIN_ART_SHARE * 100}%)`)
  if (bytes > MAX_BYTES) errors.push(`charts.json would be ${bytes} bytes (budget ${MAX_BYTES})`)
  if (unmatched.length > MAX_UNMATCHED) errors.push(`${unmatched.length} PIU Scores rows did not join (max ${MAX_UNMATCHED}) — did the CSV change?`)
  return errors
}

export function renderReport({ file, diff, stats, unmatched, warnings, errors }) {
  const modes = {}
  for (const c of file.charts) modes[c.m] = (modes[c.m] ?? 0) + 1
  const lines = [
    `# Pump data — ${file.meta.game} ${file.meta.patch} (${file.meta.builtAt})`,
    '',
    `Songs ${file.songs.length} · Song art ${file.songs.filter((s) => s.i).length}/${file.songs.length} · charts ${file.charts.length} (${Object.entries(modes).map(([m, n]) => `${m} ${n}`).join(', ')}) · titles ${file.titles.length}`,
    '',
    '## Changes since the committed charts.json',
    `New (${diff.added.length}): ${diff.added.slice(0, 40).join(', ')}${diff.added.length > 40 ? ' …' : ''}`,
    `Removed (${diff.removed.length}): ${diff.removed.join(', ')}`,
    `Re-rated (${diff.rerated.length}): ${diff.rerated.join(', ')}`,
    '',
    '## Skills',
    ...stats.map(
      (s) =>
        `${s.skill.padEnd(8)} threshold ${s.threshold === null ? '—' : Number.isFinite(s.threshold) ? s.threshold.toFixed(3) : '∞'} · title charts tagged before forcing ${s.titleHit}/${s.titleCount} · charts tagged ${s.tagged} (${Math.round((s.tagged / file.charts.length) * 100)}%)`,
    ),
    '',
    `## Unmatched PIU Scores rows (${unmatched.length})`,
    ...unmatched.map((r) => `- ${r.song} ${r.mode}${r.level}`),
    '',
    `## Warnings (${warnings.length})`,
    ...warnings.map((w) => `- ${w}`),
  ]
  if (errors.length) lines.push('', `## FAILED CHECKS (${errors.length})`, ...errors.map((e) => `- ${e}`))
  return lines.join('\n')
}
