#!/usr/bin/env node
// Builds src/apps/pump/data/videos.json from NEVSISTER's uploads.
// Run with `npm run piu:videos` after `npm run piu:data`; see README.md.
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { CACHE_DIR } from './cache.mjs'
import { NEVSISTER } from './sources.mjs'
import { listPlaylist } from './youtube.mjs'
import { applyOverrides, checkVideos, encodeVideos, matchVideos, stringifyVideos, videoCoverage } from './video-match.mjs'

const CHARTS = 'src/apps/pump/data/charts.json'
const OUT = 'src/apps/pump/data/videos.json'
const MODE_SHORT = { S: 'S', D: 'D', HDB: 'HD' }
const today = new Date().toLocaleDateString('sv-SE') // YYYY-MM-DD in local time

const file = JSON.parse(await readFile(CHARTS, 'utf8'))

// 1. NEVSISTER's uploads, once a day
const cached = path.join(CACHE_DIR, `nevsister-${today}.json`)
let videos
if (existsSync(cached)) {
  videos = JSON.parse(await readFile(cached, 'utf8'))
  console.log(`Read ${videos.length} videos from ${path.relative('.', cached)}`)
} else {
  console.log(`Listing ${NEVSISTER.name}'s uploads (about two minutes)…`)
  videos = await listPlaylist(NEVSISTER.uploads, {
    onPage: (page, count) => page % 20 === 0 && console.log(`  page ${page}: ${count} videos`),
  })
  await mkdir(CACHE_DIR, { recursive: true })
  await writeFile(cached, JSON.stringify(videos))
  console.log(`Listed ${videos.length} videos → ${path.relative('.', cached)}`)
}

// 2. match, 3. overrides, 4. check and write
const { picks: matched, unknownSongs, parsed } = matchVideos(file, videos)
const overrides = JSON.parse(await readFile(new URL('./video-overrides.json', import.meta.url), 'utf8'))
const { picks, applied } = applyOverrides(matched, overrides)
const coverage = videoCoverage(file, picks)
const errors = checkVideos({ listed: videos.length, coverage })

const pct = ({ yes, total }) => `${yes}/${total} (${((yes / total) * 100).toFixed(1)} %)`
const missing = new Map()
for (const c of file.charts) {
  if (c.m === 'HDB' || picks.has(c.id)) continue
  const s = file.songs[c.s]
  const key = s.y === 'ARCADE' ? s.t : `${s.t} [${s.y}]`
  missing.set(key, [...(missing.get(key) ?? []), `${MODE_SHORT[c.m]}${c.lv}`])
}
const byMix = {}
for (const p of picks.values()) byMix[p.mix] = (byMix[p.mix] ?? 0) + 1
const top = [...unknownSongs].sort((a, b) => b[1] - a[1]).slice(0, 20)

console.log([
  '',
  `# Pump chart videos — ${NEVSISTER.name} (${today})`,
  '',
  `Listed ${videos.length} · usable titles ${parsed} · picks ${picks.size} (${new Set([...picks.values()].map((p) => p.v)).size} distinct videos) · overrides applied ${applied}`,
  `Coverage: S ${pct(coverage.S)} · D ${pct(coverage.D)} · HD ${pct(coverage.HDB)}`,
  `Picks by mix: ${Object.entries(byMix).map(([m, n]) => `${m} ${n}`).join(' · ')} (XX picks are older footage; spot-check them)`,
  '',
  `## Singles and doubles with no video (${[...missing.values()].flat().length} charts, ${missing.size} songs)`,
  ...[...missing].map(([song, codes]) => `- ${song}: ${codes.join(' ')}`),
  '',
  `## Video songs not in Pump (${unknownSongs.size}; top 20, mostly songs Pump doesn't carry)`,
  ...top.map(([song, n]) => `- ${n} × ${song}`),
].join('\n'))

if (errors.length) {
  console.error(`\n${errors.map((e) => `✗ ${e}`).join('\n')}\n${OUT} was not written.`)
  process.exit(1)
}
await writeFile(OUT, stringifyVideos(encodeVideos(picks, { builtAt: today, listed: videos.length })))
console.log(`\nWrote ${OUT} (${picks.size} charts).`)
