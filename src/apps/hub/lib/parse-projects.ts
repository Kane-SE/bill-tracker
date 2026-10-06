import type { Project, ProjectStatus } from '@/apps/hub/lib/types'
import { splitLines } from '@/apps/hub/lib/text'

const STATUSES: ProjectStatus[] = ['active', 'paused', 'archived']

interface Draft extends Project {
  paragraph: string[]
  paragraphDone: boolean
}

/** Parse `projects.md`: one `## name` block per project with Status/Stack/Link lines and a summary paragraph. */
export function parseProjects(text: string | null): Project[] {
  if (!text) return []
  const out: Project[] = []
  let cur: Draft | null = null

  const flush = () => {
    if (!cur) return
    const c: Draft = cur
    out.push({ name: c.name, status: c.status, stack: c.stack, link: c.link, summary: c.paragraph.length ? c.paragraph.join(' ') : null })
    cur = null
  }

  for (const raw of splitLines(text).lines) {
    const heading = raw.match(/^##\s+(.+?)\s*$/)
    if (heading) {
      flush()
      cur = { name: heading[1], status: 'active', stack: null, link: null, summary: null, paragraph: [], paragraphDone: false }
      continue
    }
    if (/^#\s/.test(raw)) {
      flush()
      continue
    }
    if (!cur) continue
    const line = raw.trim()
    const field = line.match(/^(Status|Stack|Link):\s*(.*)$/i)
    if (field) {
      const key = field[1].toLowerCase()
      const value = field[2].trim()
      if (key === 'status') cur.status = STATUSES.find((s) => s === value.toLowerCase()) ?? 'active'
      else if (key === 'stack') cur.stack = value || null
      else cur.link = value || null
      continue
    }
    if (line === '') {
      if (cur.paragraph.length) cur.paragraphDone = true
      continue
    }
    if (!cur.paragraphDone && !/^[-*]\s/.test(line)) cur.paragraph.push(line)
  }
  flush()
  return out
}
