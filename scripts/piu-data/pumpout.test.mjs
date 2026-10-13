import { beforeAll, describe, expect, it } from 'vitest'
import initSqlJs from 'sql.js'
import { readPumpout } from './pumpout.mjs'

// The subset of pumpout's schema that readPumpout reads.
const DDL = `
CREATE TABLE mix (mixId INT, internalTitle TEXT, sortOrder INT);
CREATE TABLE version (versionId INT, mixId INT, sortOrder INT);
CREATE TABLE _derived_versionAncestor (versionId INT, ancestorId INT, ancestorSortOrder INT);
CREATE TABLE operation (operationId INT, internalTitle TEXT);
CREATE TABLE cut (cutId INT, internalTitle TEXT);
CREATE TABLE song (songId INT, cutId INT, internalTitle TEXT);
CREATE TABLE language (languageId INT, code TEXT);
CREATE TABLE songTitle (songTitleId INT, songId INT, languageId INT, title TEXT);
CREATE TABLE songVersion (songId INT, versionId INT, operationId INT);
CREATE TABLE chart (chartId INT, songId INT);
CREATE TABLE chartVersion (chartId INT, versionId INT, operationId INT);
CREATE TABLE mode (modeId INT, internalAbbreviation TEXT);
CREATE TABLE difficulty (difficultyId INT, value INT);
CREATE TABLE chartRating (chartRatingId INT, chartId INT, modeId INT, difficultyId INT);
CREATE TABLE chartRatingVersion (chartRatingId INT, chartId INT, versionId INT);
CREATE TABLE label (labelId INT, internalTitle TEXT);
CREATE TABLE chartLabel (chartLabelId INT, chartId INT, labelId INT);
CREATE TABLE chartLabelVersion (chartLabelId INT, versionId INT, operationId INT);
CREATE TABLE stepmaker (stepmakerId INT, internalTitle TEXT);
CREATE TABLE chartStepmaker (chartId INT, stepmakerId INT, sortOrder INT);
CREATE TABLE artist (artistId INT, internalTitle TEXT);
CREATE TABLE songArtist (songId INT, artistId INT, sortOrder INT);
CREATE TABLE songBpm (songBpmId INT, songId INT, bpmMin REAL, bpmMax REAL);
CREATE TABLE category (categoryId INT, internalTitle TEXT);
CREATE TABLE songCategory (songCategoryId INT, songId INT, categoryId INT);
CREATE TABLE songCategoryVersion (songCategoryId INT, songId INT, versionId INT);
`

// Versions: 1 = XX, 2 = PHOENIX, 3 = PHOENIX 2. Operations: 1 INSERT, 2 DELETE.
const DATA = `
INSERT INTO mix VALUES (34,'XX',550),(35,'Phoenix',560),(36,'Phoenix 2',570);
INSERT INTO version VALUES (1,34,10),(2,35,20),(3,36,30);
INSERT INTO _derived_versionAncestor VALUES (1,1,10),(2,1,10),(2,2,20),(3,1,10),(3,2,20),(3,3,30);
INSERT INTO cut VALUES (1,'Short Cut'),(2,'Arcade');
INSERT INTO song VALUES (10,2,'Bee'),(11,2,'Gone Song'),(12,2,'Seoul Song');
INSERT INTO language VALUES (22,'en'),(24,'kr');
INSERT INTO songTitle VALUES (1,10,22,'Bee'),(2,12,22,'Seoul Song'),(3,12,24,'서울 노래');
INSERT INTO songVersion VALUES (10,1,1),(11,1,1),(11,3,2),(12,3,1);
INSERT INTO chart VALUES (100,10),(101,10),(102,10),(103,10),(104,11),(105,10),(106,12),(107,10);
INSERT INTO chartVersion VALUES (100,1,1),(101,1,1),(102,1,1),(103,1,1),(104,1,1),(105,2,1),(106,3,1),(107,1,1),(107,3,2);
INSERT INTO mode VALUES (1,'S'),(2,'D'),(5,'C'),(7,'HDB');
INSERT INTO difficulty VALUES (12,12),(18,18),(19,19),(20,20),(50,NULL);
INSERT INTO chartRating VALUES (1,100,1,18),(2,100,1,19),(3,101,2,20),(4,102,5,12),(5,103,1,12),(6,104,1,12),(7,105,2,50),(8,106,7,20),(9,107,1,12);
INSERT INTO chartRatingVersion VALUES (1,100,1),(2,100,3),(3,101,1),(4,102,1),(5,103,1),(6,104,1),(7,105,2),(8,106,3),(9,107,1);
INSERT INTO label VALUES (1,'UCS'),(40,'PREMIUM MODE EXCLUSIVE'),(41,'STEAM LINK EXCLUSIVE');
INSERT INTO chartLabel VALUES (1,100,40),(2,101,40),(3,103,1),(4,106,41);
INSERT INTO chartLabelVersion VALUES (1,1,1),(1,2,2),(2,3,1),(3,1,1),(4,3,1);
INSERT INTO stepmaker VALUES (1,'BanYa'),(2,'FEFEMZ');
INSERT INTO chartStepmaker VALUES (100,2,1),(100,1,0);
INSERT INTO artist VALUES (1,'BanYa'),(2,'Guest');
INSERT INTO songArtist VALUES (10,1,0),(12,2,1),(12,1,0);
INSERT INTO songBpm VALUES (1,10,140,140),(2,10,147,147),(3,12,90,180);
INSERT INTO category VALUES (2,'WORLD MUSIC'),(3,'ORIGINAL'),(4,'J-MUSIC');
INSERT INTO songCategory VALUES (1,10,3),(2,12,4);
INSERT INTO songCategoryVersion VALUES (1,10,1),(2,12,3);
`

let read
beforeAll(async () => {
  const SQL = await initSqlJs()
  const db = new SQL.Database()
  db.run(DDL)
  db.run(DATA)
  read = readPumpout(db, { version: 3, prevVersion: 2 })
})

describe('readPumpout', () => {
  it('keeps live S, D and HDB charts only (no Co-Op, UCS, deleted charts or charts of deleted songs)', () => {
    expect(read.charts.map((c) => c.id).sort()).toEqual([100, 101, 105, 106])
  })
  it('uses the latest rating and reports the previous version level only when it changed', () => {
    const c100 = read.charts.find((c) => c.id === 100)
    expect(c100).toMatchObject({ mode: 'S', level: 19, prevLevel: 18 })
    expect(read.charts.find((c) => c.id === 101)).toMatchObject({ level: 20, prevLevel: null })
  })
  it('keeps an unrated ("??") chart with a null level', () => {
    expect(read.charts.find((c) => c.id === 105)).toMatchObject({ mode: 'D', level: null })
  })
  it('reads only labels that are live in the version', () => {
    expect(read.charts.find((c) => c.id === 100).premium).toBe(false) // removed at v2
    expect(read.charts.find((c) => c.id === 101).premium).toBe(true)
    expect(read.charts.find((c) => c.id === 106)).toMatchObject({ mode: 'HDB', steamLink: true })
  })
  it('joins step artists in their sort order', () => {
    expect(read.charts.find((c) => c.id === 100).stepArtist).toBe('BanYa & FEFEMZ')
  })
  it('describes each song: names, Korean title, artists, cut, channel, series, bpm', () => {
    expect(read.songs.get(10)).toMatchObject({
      title: 'Bee', titleKo: null, artist: 'BanYa', cut: 'ARCADE', channel: 'ORIGINAL', series: 'XX', bpm: [147, 147],
    })
    expect(read.songs.get(12)).toMatchObject({
      titleKo: '서울 노래', artist: 'BanYa & Guest', channel: 'WORLD MUSIC', series: 'PHOENIX 2', bpm: [90, 180],
    })
    expect(read.songs.get(12).names).toEqual(['Seoul Song', 'Seoul Song', '서울 노래'])
    expect(read.songs.has(11)).toBe(false)
  })
})
