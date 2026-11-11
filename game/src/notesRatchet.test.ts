import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { missions } from '../../text-game/src/missions.ts'
import { LETTER, engineSenders, failures, parseAllowlist, storyNotes, walk } from './notesRatchet.ts'

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

test('the walk reaches every Act 1-3 menu, missions as their notes', () => {
  assert.ok(story.has('a1_flood:findEli'))
  assert.ok(story.has('theBarfight:gotUp.shove.stoodWithEli.clean'), 'a mission is its ending notes')
  missions.forEach((m) => assert.ok(![...story].some((k) => k.startsWith(`${m.start}:`)), `${m.id} sends its note, not its first menu's`))
  assert.ok(![...story].some((k) => /^(p|a4|ep)_/.test(k)), 'only Acts 1 to 3')
})

test('the engine sends the sandbag line notes from the woman from Minto', () => {
  const woman = engineSenders(stops).filter((s) => s.space === 'line' && s.spot === 'woman')
  assert.deepEqual([...new Set(woman.map((s) => s.key))].sort(), ['a1_flood:findEli', 'a1_flood:stayOnLine'])
})

test('every Act 1-3 note has an engine sender or is on the allowlist, and every listed note is still unbuilt', () => {
  assert.deepEqual(failures({ story, sent, allowed }), [])
})

test('the allowlist only shrinks against main', (t) => {
  const base = mainAllowlist()
  if (base === undefined) return t.skip('no origin/main to compare with')
  if (base === null) return t.diagnostic(`main has no ${ALLOWLIST} yet`)
  assert.deepEqual(failures({ story, sent, allowed, base, baseMenus: mainMenus() }), [])
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
    'c:z: no Act 1-3 menu offers it; delete it from the allowlist',
    'b:y: listed twice',
  ])
})

test('the allowlist file reads one key per line and skips comments', () => {
  assert.deepEqual(parseAllowlist('# head\n\na:x\n  b:y  # why\n'), ['a:x', 'b:y'])
})

test('the engine sends every letter note through the letter view, and without the view each one fails', () => {
  const letterKeys = [...story].filter((k) => /^(a1_letter|a2_letter_work|a2_letter_friends|a3_joan):/.test(k)).sort()
  assert.equal(letterKeys.length, 12, 'three lines in each of the four letter scenes')
  const viaView = engineSenders(stops).filter((s) => s.spot === LETTER)
  assert.deepEqual([...new Set(viaView.map((s) => s.key))].sort(), letterKeys)
  const lost = new Set(engineSenders(stops, (_space, spot) => spot === LETTER).map((s) => s.key))
  assert.deepEqual([...failures({ story, sent: lost, allowed })].sort(), letterKeys.map((k) => `${k}: on a story menu, but no engine path sends it`).sort())
})
