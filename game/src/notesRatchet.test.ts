import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { missions } from '../../text-game/src/missions.ts'
import { ACTS, LETTER, NIGHT, TRAIL, engineSenders, failures, keyAct, parseAllowlist, storyNotes, walk } from './notesRatchet.ts'

const ALLOWLIST = 'game/notes-allowlist.txt'

const allowed = parseAllowlist(readFileSync(new URL('../notes-allowlist.txt', import.meta.url), 'utf8'))

const stops = walk()
const story = storyNotes(stops)
const sent = new Set(engineSenders(stops).map((s) => s.key))

const git = (...args: readonly string[]): string | undefined => {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return undefined
  }
}

// main's allowlist: at the merge base with origin/main, or origin/main's tip in a shallow checkout (make check/game
// fetches it there). `null` when main has no allowlist yet; `undefined` when there is no origin/main to read.
const mainAllowlist = (): readonly string[] | null | undefined => {
  const ref = git('merge-base', 'HEAD', 'origin/main') ?? git('rev-parse', '-q', '--verify', 'origin/main')
  if (ref === undefined) return undefined
  const text = git('show', `${ref}:${ALLOWLIST}`)
  return text === undefined ? null : parseAllowlist(text)
}

// The scene ids and mission ids main's story had, read from its source at the same ref as its allowlist.
const quoted = (text: string, pattern: RegExp): readonly string[] => [...text.matchAll(pattern)].map((m) => m[1])
const mainMenus = (): ReadonlySet<string> | undefined => {
  const ref = git('merge-base', 'HEAD', 'origin/main') ?? git('rev-parse', '-q', '--verify', 'origin/main')
  if (ref === undefined) return undefined
  const ids = git('show', `${ref}:text-game/src/sceneIds.ts`)
  const ms = git('show', `${ref}:text-game/src/missions.ts`)
  if (ids === undefined || ms === undefined) return undefined
  return new Set([...quoted(ids, /^\s*'([a-z0-9_]+)',$/gm), ...quoted(ms, /^\s*id: '([A-Za-z0-9]+)',$/gm)])
}

// The acts main's ratchet covered, read from its notesRatchet.ts at the same ref.
const mainActs = (): ReadonlySet<string> | undefined => {
  const ref = git('merge-base', 'HEAD', 'origin/main') ?? git('rev-parse', '-q', '--verify', 'origin/main')
  const text = ref === undefined ? undefined : git('show', `${ref}:game/src/notesRatchet.ts`)
  const line = text?.match(/^export const ACTS\b.*$/m)?.[0]
  return line === undefined ? undefined : new Set(quoted(line, /'([^']+)'/g).filter((a) => a.startsWith('Act ')))
}

test('the walk reaches every Act 1-4 menu, missions as their notes', () => {
  assert.ok(story.has('a1_flood:findEli'))
  assert.ok(story.has('theBarfight:gotUp.shove.stoodWithEli.clean'), 'a mission is its ending notes')
  missions.forEach((m) => assert.ok(![...story].some((k) => k.startsWith(`${m.start}:`)), `${m.id} sends its note, not its first menu's`))
  assert.ok([...story].some((k) => k.startsWith('a4_')), 'Act 4 is walked')
  assert.ok(![...story].some((k) => /^(p|ep)_/.test(k)), 'Acts 1 to 4, no prologue or epilogue key')
})

test('the engine sends the sandbag line notes from the woman from Minto', () => {
  const woman = engineSenders(stops).filter((s) => s.space === 'line' && s.spot === 'woman')
  assert.deepEqual([...new Set(woman.map((s) => s.key))].sort(), ['a1_flood:findEli', 'a1_flood:stayOnLine'])
})

test('every Act 1-4 note has an engine sender or is on the allowlist, and every listed note is still unbuilt', () => {
  assert.deepEqual(failures({ story, sent, allowed }), [])
})

test('the allowlist only shrinks against main', (t) => {
  const base = mainAllowlist()
  if (base === undefined) return t.skip('no origin/main to compare with')
  if (base === null) return t.diagnostic(`main has no ${ALLOWLIST} yet`)
  assert.deepEqual(failures({ story, sent, allowed, base, baseMenus: mainMenus(), baseActs: mainActs() }), [])
})

test('main\'s ratchet acts are read from its source', (t) => {
  const acts = mainActs()
  if (acts === undefined) return t.skip('no origin/main to compare with')
  assert.ok(acts.has('Act 1: Flood') && acts.has('Act 3: Deep Winter'))
  assert.ok([...acts].every((a) => ACTS.includes(a as (typeof ACTS)[number])))
})

test('an act new to the ratchet may start on the allowlist; an act main covers may not be re-added', () => {
  const story = new Set(['a3_old:x', 'a4_new:y'])
  const actOf = (k: string): string => (k.startsWith('a3_') ? 'Act 3: Deep Winter' : 'Act 4: Breakup')
  const menus = new Set(['a3_old', 'a4_new'])
  const ratchet = { story, sent: new Set<string>(), allowed: ['a3_old:x', 'a4_new:y'], base: [], baseMenus: menus, actOf }
  const shrinks = (k: string): string => `${k}: not on main's allowlist, which may only shrink`
  assert.deepEqual(failures({ ...ratchet, baseActs: new Set(['Act 3: Deep Winter']) }), [shrinks('a3_old:x')], 'Act 4 new to ACTS')
  assert.deepEqual(failures({ ...ratchet, baseActs: new Set(['Act 3: Deep Winter', 'Act 4: Breakup']) }), [shrinks('a3_old:x'), shrinks('a4_new:y')], 'Act 4 on main')
})

test('a key\'s act is its scene\'s, or its mission\'s first scene\'s', () => {
  assert.equal(keyAct('a4_offer:fake'), 'Act 4: Breakup')
  assert.equal(keyAct('theBarfight:gotUp.shove.stoodWithEli.clean'), 'Act 1: Flood')
  assert.equal(keyAct('nowhere:x'), undefined)
})

test('main\'s scenes and missions are read from its source', (t) => {
  const menus = mainMenus()
  if (menus === undefined) return t.skip('no origin/main to compare with')
  assert.ok(menus.has('a1_flood') && menus.has('a2_jake') && menus.has('theMajorsCabinet'))
})

test('a scene new since main may start on the allowlist; an old one may not be re-added', () => {
  const story = new Set(['old:x', 'new:y'])
  const ratchet = { story, sent: new Set<string>(), allowed: ['old:x', 'new:y'], base: [], baseMenus: new Set(['old']) }
  assert.deepEqual(failures(ratchet), ["old:x: not on main's allowlist, which may only shrink"])
  assert.deepEqual(failures({ ...ratchet, baseMenus: new Set(['old', 'new']) }), [
    "old:x: not on main's allowlist, which may only shrink",
    "new:y: not on main's allowlist, which may only shrink",
  ])
})

test('removing the engine sender for a built note fails, and listing the note to cover for it fails too', () => {
  const lost = new Set(engineSenders(stops, (space, spot) => space === 'line' && spot === 'woman').map((s) => s.key))
  assert.deepEqual(failures({ story, sent: lost, allowed }), [
    'a1_flood:findEli: on a story menu, but no engine path sends it',
    'a1_flood:stayOnLine: on a story menu, but no engine path sends it',
  ])
  assert.deepEqual(failures({ story, sent: lost, allowed: [...allowed, 'a1_flood:findEli', 'a1_flood:stayOnLine'], base: allowed }), [
    "a1_flood:findEli: not on main's allowlist, which may only shrink",
    "a1_flood:stayOnLine: not on main's allowlist, which may only shrink",
  ])
})

test('a listed note the engine sends, one no menu offers, or one listed twice fails', () => {
  const story = new Set(['a:x', 'b:y'])
  assert.deepEqual(failures({ story, sent: new Set(['a:x']), allowed: ['a:x', 'b:y', 'c:z', 'b:y'] }), [
    'a:x: the engine sends it now; delete it from the allowlist',
    'c:z: no Act 1-4 menu offers it; delete it from the allowlist',
    'b:y: listed twice',
  ])
})

test('the allowlist file reads one key per line and skips comments', () => {
  assert.deepEqual(parseAllowlist('# head\n\na:x\n  b:y  # why\n'), ['a:x', 'b:y'])
})

test('the engine sends every letter note through the letter view, and without the view each one fails', () => {
  const letterKeys = [...story].filter((k) => /^(a1_letter|a2_letter_work|a2_letter_friends|a3_curly|a3_joan):/.test(k)).sort()
  assert.equal(letterKeys.length, 13, 'three lines in each of four letter scenes, and the one line Wade goes on with at the hospital desk')
  const viaView = engineSenders(stops).filter((s) => s.spot === LETTER)
  assert.deepEqual([...new Set(viaView.map((s) => s.key))].sort(), letterKeys)
  const lost = new Set(engineSenders(stops, (_space, spot) => spot === LETTER).map((s) => s.key))
  assert.deepEqual([...failures({ story, sent: lost, allowed })].sort(), letterKeys.map((k) => `${k}: on a story menu, but no engine path sends it`).sort())
})

test('the engine sends both search for Eli notes by walking the trail, and without the walk each one fails', () => {
  const search = ['searchForEli:ranIt', 'searchForEli:skippedIt']
  const viaTrail = engineSenders(stops).filter((s) => s.spot === TRAIL)
  assert.deepEqual([...new Set(viaTrail.map((s) => s.key))].sort(), search)
  assert.ok(viaTrail.every((s) => s.space === 'line'), 'from the sandbag line')
  const lost = new Set(engineSenders(stops, (_space, spot) => spot === TRAIL).map((s) => s.key))
  assert.deepEqual([...failures({ story, sent: lost, allowed: allowed.filter((k) => !search.includes(k)) })].sort(), search.map((k) => `${k}: on a story menu, but no engine path sends it`))
})

// Regression (#140): once a3_crash routed to the wreck's hillside, the night's sender was asked only off the story
// backdrop, and the long night's six notes went unsent.
test('the engine sends the long night’s six notes on the wreck’s hillside, and without the night each one fails', () => {
  const night = [...story].filter((k) => k.startsWith('theLongNight:')).sort()
  assert.equal(night.length, 6, 'two orders by three signals')
  const viaNight = engineSenders(stops).filter((s) => s.spot === NIGHT)
  assert.deepEqual([...new Set(viaNight.map((s) => s.key))].sort(), night)
  assert.ok(viaNight.every((s) => s.space === 'wreck'), 'on the wreck’s hillside')
  const lost = new Set(engineSenders(stops, (_space, spot) => spot === NIGHT).map((s) => s.key))
  assert.deepEqual([...failures({ story, sent: lost, allowed })].sort(), night.map((k) => `${k}: on a story menu, but no engine path sends it`))
})
