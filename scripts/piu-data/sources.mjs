/**
 * Every input of the Pump data build. Bump `PUMPOUT.commit` (and the version
 * IDs, file and patch if the game moved on) when Andamiro patches; see README.md.
 */
const PUMPOUT_REPO = 'aaaaaa2493/pumpout-db-updates'

export const PUMPOUT = {
  name: 'pumpout-db-updates',
  repo: `https://github.com/${PUMPOUT_REPO}`,
  commit: '68d8cc356e585244b1dafd73a23b8c3386e6e31f',
  file: 'db/pumpout-phoenix-2-1.02.db',
  get url() {
    return `https://raw.githubusercontent.com/${PUMPOUT_REPO}/${this.commit}/${this.file}`
  },
  /** Card image hosts: 0 = pumpout's site, 1 = the pinned GitHub commit */
  get imgHosts() {
    return ['https://pumpout.anyhowstep.com/img/card/', `https://raw.githubusercontent.com/${PUMPOUT_REPO}/${this.commit}/img/`]
  },
  /** `version.versionId` rows inside the .db */
  version: 202, // PHOENIX 2 v1.02.0
  prevVersion: 199, // PHOENIX v2.12.0 — for "was D20 in PHOENIX"
  patch: '1.02.0',
}

/** Chart videos: NEVSISTER's uploads, matched to charts by `npm run piu:videos`. */
export const NEVSISTER = {
  name: 'NEVSISTER',
  channelId: 'UCicVRsgv4iIhZGZcbx7xUkw',
  url: 'https://www.youtube.com/@NEVSISTER',
  /** the channel's uploads playlist: "UU" + the channel ID after "UC" */
  uploads: 'UUicVRsgv4iIhZGZcbx7xUkw',
}

export const PIUSCORES = {
  name: 'PIU Scores',
  site: 'https://piuscores.arroweclip.se',
  url: 'https://piuscores.arroweclip.se/Charts/Export.csv?mix=Phoenix2&Columns=ChartId,Song,Type,Level,SongType,Badges,SkillEmphasis',
}
