import { describe, expect, it } from 'vitest'
import fixture from './__fixtures__/ideas.md?raw'
import { addIdeaText, addNoteText, moveStageText, IdeaNotFoundError, parseIdeas } from './ideas'

export const MESSY = [
  '# Ideas',
  '',
  'Free text the app must not touch.',
  '',
  '## Photo-tagging for Nomnoms',
  'Stage: exploring',
  'Added: 2026-08-17',
  '',
  'Tag people on the receipt photo.',
  'Second line of the same paragraph.',
  '',
  '- 2026-08-17 — Idea captured',
  '  - a hand-written sub-bullet',
  '- 2026-09-02 - Grilled the design',
  '',
  '<!-- private comment -->',
  '',
  '## Đặt món nhóm 🍜',
  'Added: 2026-09-01',
  '',
  'Ghi chú tiếng Việt.',
  '',
  '```',
  '## not a heading inside a code fence',
  '```',
  '',
  '## Photo-tagging for Nomnoms',
  'Stage: idea',
  '',
].join('\n')

describe('parseIdeas', () => {
  it('reads the fixture', () => {
    const ideas = parseIdeas(fixture)
    expect(ideas.map((i) => [i.id, i.stage])).toEqual([
      ['hub-dashboard-in-nook', 'building'],
      ['photo-tagging-for-nomnoms', 'exploring'],
      ['receipt-ocr-to-pre-fill-nomnom-items', 'idea'],
      ['nook-launcher-rebrand', 'shipped'],
    ])
    expect(ideas[1]).toEqual({
      id: 'photo-tagging-for-nomnoms',
      title: 'Photo-tagging for Nomnoms',
      stage: 'exploring',
      added: '2026-08-17',
      note: 'Tag people on the receipt photo so items split themselves.',
      progress: [
        { date: '2026-08-17', text: 'Idea captured' },
        { date: '2026-09-02', text: 'Grilled the design, rounds 1–4' },
      ],
    })
  })

  it('copes with hand-written content, hyphen separators, missing Stage, code fences and duplicates', () => {
    const ideas = parseIdeas(MESSY)
    expect(ideas.map((i) => i.id)).toEqual(['photo-tagging-for-nomnoms', 'dat-mon-nhom', 'photo-tagging-for-nomnoms-2'])
    expect(ideas[0].note).toBe('Tag people on the receipt photo. Second line of the same paragraph.')
    expect(ideas[0].progress).toEqual([
      { date: '2026-08-17', text: 'Idea captured' },
      { date: '2026-09-02', text: 'Grilled the design' },
    ])
    expect(ideas[1]).toMatchObject({ title: 'Đặt món nhóm 🍜', stage: 'idea', added: '2026-09-01', note: 'Ghi chú tiếng Việt.' })
  })

  it('treats an unknown stage as idea and a missing file as no ideas', () => {
    expect(parseIdeas('## X\nStage: someday\n')[0].stage).toBe('idea')
    expect(parseIdeas(null)).toEqual([])
    expect(parseIdeas('')).toEqual([])
  })
})

const TODAY = '2026-10-05'
const lines = (text: string) => text.split('\n')

describe('addNoteText', () => {
  it('inserts one line after the last progress line and changes nothing else', () => {
    const out = addNoteText(MESSY, 'photo-tagging-for-nomnoms', 'Round 5 answered', TODAY)
    const expected = lines(MESSY)
    expected.splice(expected.indexOf('- 2026-09-02 - Grilled the design') + 1, 0, '- 2026-10-05 — Round 5 answered')
    expect(out).toBe(expected.join('\n'))
  })

  it('starts a list after the last content line when the idea has no progress yet', () => {
    const out = addNoteText(MESSY, 'dat-mon-nhom', 'First note', TODAY)
    const expected = lines(MESSY)
    // after the closing fence, which is the block's last non-blank line
    expected.splice(expected.indexOf('## not a heading inside a code fence') + 2, 0, '', '- 2026-10-05 — First note')
    expect(out).toBe(expected.join('\n'))
  })

  it('targets the right duplicate', () => {
    const out = addNoteText(MESSY, 'photo-tagging-for-nomnoms-2', 'Second one', TODAY)
    expect(lines(out).slice(-4)).toEqual(['Stage: idea', '', '- 2026-10-05 — Second one', ''])
  })

  it('flattens a multi-line note', () => {
    const out = addNoteText(MESSY, 'photo-tagging-for-nomnoms', 'one\ntwo', TODAY)
    expect(out).toContain('- 2026-10-05 — one two')
  })

  it('keeps CRLF endings and a missing trailing newline', () => {
    const crlf = MESSY.replace(/\n/g, '\r\n').replace(/\r\n$/, '')
    const out = addNoteText(crlf, 'photo-tagging-for-nomnoms', 'x', TODAY)
    expect(out.replace(/\r\n/g, '')).not.toContain('\n')
    expect(out.endsWith('\r\n')).toBe(false)
    expect(out).toContain('- 2026-10-05 — x\r\n')
  })

  it('throws IdeaNotFoundError for an unknown id', () => {
    expect(() => addNoteText(MESSY, 'nope', 'x', TODAY)).toThrow(IdeaNotFoundError)
  })
})

describe('moveStageText', () => {
  it('rewrites only the Stage line and logs the move with the reason', () => {
    const out = moveStageText(MESSY, 'photo-tagging-for-nomnoms', 'building', TODAY, 'Spec approved')
    const expected = lines(MESSY)
    expected[expected.indexOf('Stage: exploring')] = 'Stage: building'
    expected.splice(expected.indexOf('- 2026-09-02 - Grilled the design') + 1, 0, '- 2026-10-05 — Moved to building · Spec approved')
    expect(out).toBe(expected.join('\n'))
  })

  it('inserts a Stage line under the heading when the idea has none', () => {
    const out = moveStageText(MESSY, 'dat-mon-nhom', 'exploring', TODAY)
    const outLines = lines(out)
    const at = outLines.indexOf('## Đặt món nhóm 🍜')
    expect(outLines[at + 1]).toBe('Stage: exploring')
    expect(outLines[at + 2]).toBe('Added: 2026-09-01')
    expect(out).toContain('- 2026-10-05 — Moved to exploring')
  })
})

describe('an edit aimed at an idea by slug also checks its title', () => {
  // "C#" added above "C++" elsewhere: both slug to `c`, so `c` now names C# and C++ became `c-2`.
  const RENAMED = ['# Ideas', '', '## C#', 'Stage: idea', '', '## C++', 'Stage: exploring', '', '- 2026-09-01 — Idea captured', ''].join('\n')

  it('addNoteText refuses a block whose title is not the expected one', () => {
    expect(() => addNoteText(RENAMED, 'c', 'x', TODAY, 'C++')).toThrow(IdeaNotFoundError)
  })

  it('moveStageText refuses a block whose title is not the expected one', () => {
    expect(() => moveStageText(RENAMED, 'c', 'dropped', TODAY, 'no longer needed', 'C++')).toThrow(IdeaNotFoundError)
    expect(() => moveStageText(RENAMED, 'c', 'dropped', TODAY, undefined, 'C++')).toThrow(IdeaNotFoundError)
  })

  it('writes exactly as before when the title matches', () => {
    expect(addNoteText(MESSY, 'photo-tagging-for-nomnoms', 'Round 5', TODAY, 'Photo-tagging for Nomnoms')).toBe(addNoteText(MESSY, 'photo-tagging-for-nomnoms', 'Round 5', TODAY))
    expect(moveStageText(MESSY, 'dat-mon-nhom', 'building', TODAY, 'go', 'Đặt món nhóm 🍜')).toBe(moveStageText(MESSY, 'dat-mon-nhom', 'building', TODAY, 'go'))
    expect(addNoteText(RENAMED, 'c-2', 'x', TODAY, 'C++')).toContain('- 2026-10-05 — x')
  })
})

describe('addIdeaText', () => {
  it('appends a block at the end of the file, after one blank line', () => {
    const out = addIdeaText('# Ideas\n\n## Old\nStage: idea\n\n\n', { title: 'New one', note: 'Why\nit matters' }, TODAY)
    expect(out).toBe(
      '# Ideas\n\n## Old\nStage: idea\n\n## New one\nStage: idea\nAdded: 2026-10-05\n\nWhy it matters\n\n- 2026-10-05 — Idea captured\n',
    )
  })

  it('creates the file when it does not exist yet', () => {
    expect(addIdeaText(null, { title: 'First' }, TODAY)).toBe(
      '# Ideas\n\n## First\nStage: idea\nAdded: 2026-10-05\n\n- 2026-10-05 — Idea captured\n',
    )
  })

  it('keeps CRLF endings', () => {
    const out = addIdeaText('# Ideas\r\n', { title: 'X' }, TODAY)
    expect(out.replace(/\r\n/g, '')).not.toContain('\n')
  })

  it('rejects an empty title', () => {
    expect(() => addIdeaText(null, { title: '   ' }, TODAY)).toThrow('Title is required')
  })
})

describe('addIdeaText keeps a note that starts with block markdown from becoming file structure', () => {
  it.each(['```js', '## Why', '# Context', '- 2026-01-01 — x', 'Stage: building', 'Added: nope'])(
    'neutralises a leading marker in %j',
    (note) => {
      const first = addIdeaText(null, { title: 'First', note }, TODAY)
      const both = addIdeaText(first, { title: 'Second' }, TODAY)
      const ideas = parseIdeas(both)
      expect(ideas.map((i) => i.id)).toEqual(['first', 'second'])
      expect(ideas[0]).toMatchObject({ stage: 'idea', added: TODAY, note: '\\' + note })
      expect(ideas[0].progress).toEqual([{ date: TODAY, text: 'Idea captured' }])
      expect(ideas[1].progress).toEqual([{ date: TODAY, text: 'Idea captured' }])

      const noted = parseIdeas(addNoteText(both, 'second', 'later', TODAY))
      expect(noted[1].progress.map((p) => p.text)).toEqual(['Idea captured', 'later'])
    },
  )
})

describe('code fences inside an idea are never treated as progress or Stage lines', () => {
  it('adds a note after the real last progress line, outside a fenced example', () => {
    const text = [
      '## Gamma',
      'Stage: idea',
      '',
      '- 2026-09-01 — real',
      '',
      '```',
      '- 2026-01-01 — example',
      '```',
      '',
    ].join('\n')
    const out = addNoteText(text, 'gamma', 'new', TODAY)
    const expected = lines(text)
    expected.splice(expected.indexOf('- 2026-09-01 — real') + 1, 0, '- 2026-10-05 — new')
    expect(out).toBe(expected.join('\n'))
    expect(parseIdeas(out)[0].progress.map((p) => p.text)).toEqual(['real', 'new'])
  })

  it('leaves a fenced "Stage:" line alone and inserts a real Stage line under the heading', () => {
    const text = ['## Delta', 'Added: 2026-09-01', '', '```', 'Stage: building', '```', ''].join('\n')
    const out = moveStageText(text, 'delta', 'exploring', TODAY)
    const outLines = lines(out)
    expect(outLines.filter((l) => l === 'Stage: building')).toHaveLength(1)
    expect(outLines.indexOf('```') + 1).toBe(outLines.indexOf('Stage: building'))
    expect(outLines[outLines.indexOf('## Delta') + 1]).toBe('Stage: exploring')
    expect(parseIdeas(out)[0].stage).toBe('exploring')
  })

  it('does not insert a note inside an indented fence that follows the last progress line', () => {
    const text = ['## Eps', 'Stage: idea', '', '- 2026-09-01 — with code', '  ```', '  - 2026-01-01 — inside', '', '  more', '  ```', ''].join('\n')
    const out = addNoteText(text, 'eps', 'new', TODAY)
    const expected = lines(text)
    expected.splice(expected.indexOf('- 2026-09-01 — with code') + 1, 0, '- 2026-10-05 — new')
    expect(out).toBe(expected.join('\n'))
    expect(parseIdeas(out)[0].progress.map((p) => p.text)).toEqual(['with code', 'new'])
  })
})

describe('a new entry stays below the last entry\'s own indented sub-bullets and continuation lines', () => {
  const SUBBULLETS = [
    '# Ideas',
    '',
    '## Alpha',
    'Stage: idea',
    'Added: 2026-09-01',
    '',
    'Alpha note.',
    '',
    '- 2026-09-01 — first',
    '- 2026-09-02 — second',
    '  - detail of second',
    '  continuation of second',
    '',
    '## Beta',
    'Stage: idea',
    '',
  ].join('\n')

  it('addNoteText inserts after the indented lines', () => {
    const out = addNoteText(SUBBULLETS, 'alpha', 'new', TODAY)
    const expected = lines(SUBBULLETS)
    expected.splice(expected.indexOf('  continuation of second') + 1, 0, '- 2026-10-05 — new')
    expect(out).toBe(expected.join('\n'))
  })

  it('moveStageText inserts after the indented lines', () => {
    const out = moveStageText(SUBBULLETS, 'alpha', 'building', TODAY)
    const expected = lines(SUBBULLETS)
    expected[expected.indexOf('Stage: idea')] = 'Stage: building'
    expected.splice(expected.indexOf('  continuation of second') + 1, 0, '- 2026-10-05 — Moved to building')
    expect(out).toBe(expected.join('\n'))
  })
})
