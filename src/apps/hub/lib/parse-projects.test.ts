import { describe, expect, it } from 'vitest'
import projects from './__fixtures__/projects.md?raw'
import { parseProjects } from './parse-projects'

describe('parseProjects', () => {
  it('reads each ## block in file order', () => {
    expect(parseProjects(projects)).toEqual([
      { name: 'bill-splitter', status: 'active', stack: 'Vite · React · PWA', link: 'https://github.com/Kane-SE/bill-splitter', summary: 'Nook: little offline tools (Split, Hub).' },
      { name: 'automation-app', status: 'active', stack: 'Electron · Playwright', link: null, summary: null },
      { name: 'calendar', status: 'paused', stack: 'Vanilla JS', link: null, summary: 'Standalone calendar widget.' },
      { name: 'test', status: 'archived', stack: null, link: null, summary: null },
    ])
  })

  it('treats a missing or unknown status as active', () => {
    const out = parseProjects('## a\nStatus: someday\n\n## b\n')
    expect(out.map((p) => p.status)).toEqual(['active', 'active'])
  })

  it('returns nothing for a missing file', () => {
    expect(parseProjects(null)).toEqual([])
  })
})
