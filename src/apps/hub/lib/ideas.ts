import { STAGES, type Idea, type Stage } from '@/apps/hub/lib/types'
import { slugify, splitLines } from '@/apps/hub/lib/text'
import { isIsoDate } from '@/apps/hub/lib/dates'

/** `- 2026-09-02 — text`; also accepts ` - ` and ` – ` separators and `*` bullets. */
export const PROGRESS_LINE = /^\s*[-*]\s+(\d{4}-\d{2}-\d{2})\s+[—–-]\s+(.*)$/
export const STAGE_LINE = /^Stage:\s*(.*)$/i
const ADDED_LINE = /^Added:\s*(.*)$/i
const HEADING = /^##\s+(.+?)\s*$/
const FENCE = /^\s*(```|~~~)/

export interface Block {
  id: string
  title: string
  /** Index of the `## ` heading line. */
  start: number
  /** Index one past the block's last line. */
  end: number
}

/** Locate every `## ` idea block, skipping headings inside code fences. */
export function findBlocks(lines: string[]): Block[] {
  const blocks: Block[] = []
  const seen = new Map<string, number>()
  let inFence = false
  const close = (at: number) => {
    const last = blocks[blocks.length - 1]
    if (last && last.end === -1) last.end = at
  }
  for (let i = 0; i < lines.length; i++) {
    if (FENCE.test(lines[i])) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    const heading = lines[i].match(HEADING)
    if (heading || /^#\s/.test(lines[i])) close(i)
    if (heading) {
      const title = heading[1].trim()
      const base = slugify(title)
      const n = (seen.get(base) ?? 0) + 1
      seen.set(base, n)
      blocks.push({ id: n === 1 ? base : `${base}-${n}`, title, start: i, end: -1 })
    }
  }
  close(lines.length)
  return blocks
}

export function toStage(value: string): Stage {
  const s = value.trim().toLowerCase()
  return (STAGES as string[]).includes(s) ? (s as Stage) : 'idea'
}

/** Parse `ideas.md`. Never throws: unknown content inside a block is ignored. */
export function parseIdeas(text: string | null): Idea[] {
  if (!text) return []
  const { lines } = splitLines(text)
  return findBlocks(lines).map((block) => {
    let stage: Stage | null = null
    let added: string | null = null
    const progress: Idea['progress'] = []
    const paragraph: string[] = []
    let paragraphDone = false
    let inFence = false

    for (const raw of lines.slice(block.start + 1, block.end)) {
      if (FENCE.test(raw)) {
        inFence = !inFence
        if (paragraph.length) paragraphDone = true
        continue
      }
      if (inFence) continue
      const line = raw.trim()
      const stageMatch = line.match(STAGE_LINE)
      if (stageMatch) {
        stage ??= toStage(stageMatch[1])
        continue
      }
      const addedMatch = line.match(ADDED_LINE)
      if (addedMatch) {
        const value = addedMatch[1].trim()
        added = isIsoDate(value) ? value : null
        continue
      }
      const progressMatch = raw.match(PROGRESS_LINE)
      if (progressMatch) {
        progress.push({ date: progressMatch[1], text: progressMatch[2].trim() })
        if (paragraph.length) paragraphDone = true
        continue
      }
      if (line === '') {
        if (paragraph.length) paragraphDone = true
        continue
      }
      if (!paragraphDone && !/^[-*]\s/.test(line) && !line.startsWith('<!--')) paragraph.push(line)
    }

    return {
      id: block.id,
      title: block.title,
      stage: stage ?? 'idea',
      added,
      note: paragraph.length ? paragraph.join(' ') : null,
      progress,
    }
  })
}
