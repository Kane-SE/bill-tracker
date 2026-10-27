#!/usr/bin/env node
// Builds src/apps/pump/data/charts.json. Run with `npm run piu:data`; see README.md.
import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import initSqlJs from 'sql.js'
import { PIUSCORES, PUMPOUT } from './sources.mjs'
import { fetchCached } from './cache.mjs'
import { readPumpout } from './pumpout.mjs'
import { readPiuScores } from './piuscores.mjs'
import { joinCoverage } from './join.mjs'
import { resolveLadders } from './titles.mjs'
import { computeThresholds, skillStats, skillsFor } from './skills.mjs'
import { encodeCatalog, stringifyCatalog } from './encode.mjs'
import { checkCatalog, diffCatalogs, renderReport } from './report.mjs'

const OUT = 'src/apps/pump/data/charts.json'
const today = new Date().toLocaleDateString('sv-SE') // YYYY-MM-DD in local time

const SQL = await initSqlJs()
const db = new SQL.Database(await fetchCached(PUMPOUT.url, `pumpout-${PUMPOUT.commit.slice(0, 7)}.db`))
const { songs, charts } = readPumpout(db, PUMPOUT)

const csv = await fetchCached(PIUSCORES.url, `piuscores-${today}.csv`, { refresh: true })
const rows = readPiuScores(csv.toString('utf8'))
const { byChart, unmatched } = joinCoverage(charts, songs, rows)

const ladders = JSON.parse(await readFile(new URL('./ladders.json', import.meta.url), 'utf8'))
const { titles, forced, gimmickFrom, missing } = resolveLadders(ladders, new Set(charts.map((c) => c.id)))

const thresholds = computeThresholds(charts, byChart, forced)
const skillsById = new Map(charts.map((c) => [c.id, skillsFor(c, byChart.get(c.id), thresholds, forced.get(c.id))]))

const { file, warnings } = encodeCatalog({
  songs, charts, byChart, skillsById, gimmickFrom, titles,
  meta: {
    game: 'PHOENIX 2',
    patch: PUMPOUT.patch,
    builtAt: today,
    imgHosts: PUMPOUT.imgHosts,
    sources: [
      { name: PUMPOUT.name, url: PUMPOUT.repo, ref: PUMPOUT.commit },
      { name: PIUSCORES.name, url: PIUSCORES.site, ref: `chart export ${today}` },
      { name: 'Song art (Andamiro), via Pump Out', url: 'https://pumpout.anyhowstep.com', ref: 'songCard paths' },
      { name: 'piucenter.com', url: 'https://www.piucenter.com', ref: 'skill analysis, via PIU Scores' },
    ],
  },
})
const text = stringifyCatalog(file)
const prev = existsSync(OUT) ? JSON.parse(await readFile(OUT, 'utf8')) : null
const sd = charts.filter((c) => c.mode !== 'HDB')
const errors = checkCatalog(file, {
  missingTitles: missing,
  unmatched,
  sdCount: sd.length,
  sdWithSkills: sd.filter((c) => byChart.has(c.id)).length,
  bytes: Buffer.byteLength(text),
})

console.log(renderReport({
  file, diff: diffCatalogs(prev, file),
  stats: skillStats(charts, byChart, thresholds, forced, skillsById),
  unmatched, warnings, errors,
}))
if (errors.length) {
  console.error(`\n${errors.length} check(s) failed — ${OUT} was not written.`)
  process.exit(1)
}
await writeFile(OUT, text)
console.log(`\nWrote ${OUT} (${Buffer.byteLength(text)} bytes).`)
