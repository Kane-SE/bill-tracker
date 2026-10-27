# Pump — data permission messages (drafts)

Two drafts for you to send yourself. Nothing has been sent. The Pump PR shouldn't merge until both maintainers have answered (spec §Licensing).

---

## 1. To aaaaaa2493 — pumpout-db-updates

**Where:** a new issue on <https://github.com/aaaaaa2493/pumpout-db-updates/issues>

**Title:** Permission to use pumpout data in a small offline chart-filter app

> Hi! Thanks for keeping Pump Out going through PHOENIX 2.
>
> I've built **Pump**, a free personal mini-app (part of a hobby PWA) for filtering PHOENIX 2 charts at the arcade by mode, level and skill. A build script reads `pumpout-phoenix-2-1.01.db` at commit `ed314a8` and ships only derived facts: song titles, artists, BPM range, song type, debut series, chart levels (current and PHOENIX), modes and the Premium/Steam Link flags. No step data.
>
> I'd also like to show each song's card art. The build would read the `songCard` paths from the same DB, and the app would load the images from `pumpout.anyhowstep.com/img/card/` and from this repo's `img/` folder (raw.githubusercontent.com, at the pinned commit) when someone views a song. No image files would be copied into my repo, and each phone keeps only the images it has already shown. If hotlinking either host is a problem (bandwidth, or the anyhowstep server isn't yours to offer), just say and I'll leave the art out.
>
> The app credits "Pump Out (Haru-kaze, AnyhowStep) and pumpout-db-updates (aaaaaa2493)" on its About screen, and the repo is public: <https://github.com/Kane-SE/bill-tracker>.
>
> Are you OK with this? I'm happy to change the credit or remove anything.

---

## 2. To DrMurloc — PIU Scores

**Where:** a new issue on <https://github.com/DrMurloc/PumpItUpScoreTracker/issues>, or the contact on <https://piuscores.arroweclip.se/About>

**Title:** Using the public chart export (skill coverage) in a small offline app

> Hi! PIU Scores is great, and thank you for the public chart export.
>
> I've built **Pump**, a free personal mini-app (part of a hobby PWA) for filtering PHOENIX 2 charts at the arcade by skill. At build time (not from users' phones), a script reads `Charts/Export.csv?mix=Phoenix2` with `SkillEmphasis`, and the app ships only derived facts: each chart's top-3 badge names and rounded coverage percentages for half, run, twist, bracket and drill. It also uses your scraped title lists to know which charts belong to each skill title.
>
> One more, for later: would you be OK with me using PIU Scores' song → official image mapping (the `song_img2` file each song uses), so the app can load the official art straight from piugame.com? I wouldn't load images from your `piuimages.arroweclip.se` CDN, so it wouldn't cost you bandwidth.
>
> The app credits "piucenter.com's step analysis (maxwshen), via PIU Scores (DrMurloc)" on its About screen, and the repo is public: <https://github.com/Kane-SE/bill-tracker>.
>
> Are you OK with this? I'm happy to change the credit or remove anything.
