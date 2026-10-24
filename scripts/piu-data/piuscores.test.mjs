import { describe, expect, it } from 'vitest'
import { parseCsv, readPiuScores } from './piuscores.mjs'

const HEADER =
  'ChartId,Song,Type,Level,SongType,Badges,pc:badge_fraction:run,pc:badge_fraction:twist_90,pc:badge_fraction:mid6_doubles'

describe('parseCsv', () => {
  it('handles quoted fields with commas and doubled quotes', () => {
    expect(parseCsv('a,"b, c","say ""hi"""\n1,2,3\n')).toEqual([
      ['a', 'b, c', 'say "hi"'],
      ['1', '2', '3'],
    ])
  })
  it('handles CRLF, a BOM and a missing final newline', () => {
    expect(parseCsv('﻿x,y\r\n1,2')).toEqual([
      ['x', 'y'],
      ['1', '2'],
    ])
  })
})

describe('readPiuScores', () => {
  it('reads S/D rows with badges and coverage, skipping Co-Op', () => {
    const text = [
      HEADER,
      'g1,"Conflict",D,25,Arcade,Anchor Runs; Runs; Sustained,0.5,,0.25',
      'g2,"Love is a Danger Zone(Cranky Mix)",S,21,Arcade,Twists,,0.7143,',
      'g3,Some Co-op,CoOp,2,Arcade,,,,',
    ].join('\n')
    expect(readPiuScores(text)).toEqual([
      {
        song: 'Conflict',
        mode: 'D',
        level: 25,
        songType: 'Arcade',
        badges: ['Anchor Runs', 'Runs', 'Sustained'],
        coverage: { run: 0.5, mid6_doubles: 0.25 },
      },
      {
        song: 'Love is a Danger Zone(Cranky Mix)',
        mode: 'S',
        level: 21,
        songType: 'Arcade',
        badges: ['Twists'],
        coverage: { twist_90: 0.7143 },
      },
    ])
  })
  it('names the missing columns when the export changes shape', () => {
    expect(() => readPiuScores('ChartId,Song,Level\n1,x,2')).toThrow(/missing columns: Type, SongType, Badges/)
  })
  it('refuses an export without SkillEmphasis coverage', () => {
    expect(() => readPiuScores('Song,Type,Level,SongType,Badges\nx,S,2,Arcade,')).toThrow(/coverage/)
  })
})
