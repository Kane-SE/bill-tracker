import { STAGES, type Idea, type Stage } from '@/apps/hub/lib/types'
import { joinLines, oneLine, slugify, splitLines } from '@/apps/hub/lib/text'
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

export class IdeaNotFoundError extends Error {
  readonly id: string
  constructor(id: string) {
    super(`Idea "${id}" not found`)
    this.name = 'IdeaNotFoundError'
    this.id = id
  }
}

/**
 * Find the block for `id`. A slug alone can name another idea after an edit elsewhere ("C#" added above "C++": both
 * slug to `c`), so when the caller knows the title it saw, a block with another title counts as not found.
 */
function locate(text: string, id: string, expectedTitle?: string) {
  const parts = splitLines(text)
  const block = findBlocks(parts.lines).find((b) => b.id === id)
  if (!block || (expectedTitle !== undefined && block.title !== expectedTitle)) throw new IdeaNotFoundError(id)
  return { ...parts, block }
}

/** Indexes of the block's lines outside code fences (fence lines themselves excluded), as parseIdeas reads them. */
function plainLineIndexes(lines: string[], block: Block): number[] {
  const indexes: number[] = []
  let inFence = false
  for (let i = block.start + 1; i < block.end; i++) {
    if (FENCE.test(lines[i])) {
      inFence = !inFence
      continue
    }
    if (!inFence) indexes.push(i)
  }
  return indexes
}

/** Insert a progress line after the block's last progress line, or start a list after its last content line. */
function insertProgress(lines: string[], block: Block, entry: string): void {
  let lastProgress = -1
  for (const i of plainLineIndexes(lines, block)) if (PROGRESS_LINE.test(lines[i])) lastProgress = i
  if (lastProgress >= 0) {
    // Keep the entry's own indented sub-bullets and continuation lines above the new entry.
    let at = lastProgress + 1
    while (at < block.end && lines[at].trim() !== '' && /^\s/.test(lines[at]) && !FENCE.test(lines[at])) at++
    lines.splice(at, 0, entry)
    return
  }
  let last = block.end - 1
  while (last > block.start && lines[last].trim() === '') last--
  lines.splice(last + 1, 0, '', entry)
}

export function addNoteText(text: string, id: string, note: string, today: string, expectedTitle?: string): string {
  const { lines, eol, trailingNewline, block } = locate(text, id, expectedTitle)
  insertProgress(lines, block, `- ${today} — ${oneLine(note)}`)
  return joinLines(lines, eol, trailingNewline)
}

export function moveStageText(text: string, id: string, stage: Stage, today: string, why?: string, expectedTitle?: string): string {
  const { lines, eol, trailingNewline, block } = locate(text, id, expectedTitle)
  const stageAt = plainLineIndexes(lines, block).find((i) => STAGE_LINE.test(lines[i].trim())) ?? -1
  if (stageAt >= 0) {
    lines[stageAt] = `Stage: ${stage}`
  } else {
    lines.splice(block.start + 1, 0, `Stage: ${stage}`)
    block.end++
  }
  const reason = why ? oneLine(why) : ''
  insertProgress(lines, block, `- ${today} — Moved to ${stage}${reason ? ` · ${reason}` : ''}`)
  return joinLines(lines, eol, trailingNewline)
}

/** A note sits on a line of its own, so a leading block marker would become file structure; escape it. */
const BLOCK_MARKER = /^(#|`|~|[-*+>]|<!--|\d+[.)]|(Stage|Added):)/i

function escapeBlockMarker(note: string): string {
  return BLOCK_MARKER.test(note) ? `\\${note}` : note
}

export function addIdeaText(text: string | null, input: { title: string; note?: string }, today: string): string {
  const title = oneLine(input.title)
  if (!title) throw new Error('Title is required')
  const note = input.note ? escapeBlockMarker(oneLine(input.note)) : ''
  const block = [`## ${title}`, 'Stage: idea', `Added: ${today}`, '']
  if (note) block.push(note, '')
  block.push(`- ${today} — Idea captured`)

  if (!text || !text.trim()) return `${['# Ideas', '', ...block].join('\n')}\n`
  const { lines, eol } = splitLines(text)
  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop()
  lines.push('', ...block)
  return joinLines(lines, eol, true)
}
