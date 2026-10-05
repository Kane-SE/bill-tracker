import { describe, expect, it } from 'vitest'
import fixture from './__fixtures__/ideas.md?raw'
import { parseIdeas } from './ideas'

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
