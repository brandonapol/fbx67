import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { replay } from '../../text-game/src/engine.ts'
import { initialState } from '../../text-game/src/state.ts'
import { menu } from '../../text-game/src/story.ts'
import type { Game } from './prologue.ts'
import { handedOff, press, start, textBuildHash } from './prologue.ts'
import { pathParam, replayPath, startFrom } from './start.ts'
import { playPrologue } from './drive.ts'

const best = (
  JSON.parse(readFileSync(new URL('../../text-game/routes/golden.json', import.meta.url), 'utf8')) as readonly { ending: string; path: string }[]
).find((r) => r.ending === 'best')!.path

const major = [1, 1, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 2, 1, 1]

const from = (path: readonly number[]): Game => startFrom(`#path=${path.join(',')}`, '')

test('#path= starts at a2_major with the text build state, its menu as the panel over the story backdrop', () => {
  const g = from(major)
  assert.equal(g.story.scene, 'a2_major')
  assert.deepEqual(g.story, replay(major).at(-1))
  assert.equal(g.space, 'story')
  assert.equal(g.panel?.kind, 'story')
  assert.equal(g.panel?.title, menu(g.story).title)
  assert.deepEqual(
    g.panel?.buttons.map((b) => b.id),
    menu(g.story).options.map((o) => `note:${o.note}`),
  )
  assert.ok(!handedOff(g))
})

test('?from= reads the same path, and #path= wins when both are given', () => {
  assert.deepEqual(startFrom('', `?test=1&from=${major.join(',')}`).story, replay(major).at(-1))
  assert.equal(pathParam('#path=1,2', '?from=3'), '1,2')
  assert.equal(pathParam('', '?test=1'), undefined)
})

test('a game started from a path writes the same path back, and keeps playing as panels', () => {
  assert.equal(textBuildHash(from(major)), `#path=${major.join(',')}`)
  const next = press(from(major), from(major).panel!.buttons[0].id)
  assert.deepEqual(next.path, [...major, 1])
  assert.deepEqual(next.story, replay([...major, 1]).at(-1))
  assert.equal(next.space, 'story')
  assert.equal(next.panel?.title, menu(next.story).title)
})

test('a path into a scene with a space puts the player in it, with no panel', () => {
  const camp = from([1, 1, 1, 1])
  assert.equal(camp.space, 'camp')
  assert.equal(camp.panel, undefined)
  assert.deepEqual(camp.story, replay([1, 1, 1, 1]).at(-1))
})

test('a spaceless prologue scene shows its menu over the backdrop, and its note enters the next space', () => {
  const dock = from([1, 1, 1])
  assert.equal(dock.story.scene, 'p_dock')
  assert.equal(dock.space, 'story')
  assert.equal(press(dock, 'note:fly').space, 'camp')
})

test('no path, or an empty one, starts the prologue as before', () => {
  assert.deepEqual(startFrom('', ''), start())
  assert.deepEqual(startFrom('#path=', ''), start())
  assert.deepEqual(startFrom('#other', ''), start())
})

test('the path the prologue writes on its end card starts the engine at Act 1, as Wade on the sandbag line', () => {
  const end = playPrologue('round', 'marker')
  const g = startFrom(textBuildHash(end), '')
  assert.deepEqual(g.story, end.story)
  assert.equal(g.story.scene, 'a1_flood')
  assert.equal(g.space, 'line')
  assert.equal(g.panel, undefined)
  const played = press(end, 'continue')
  assert.deepEqual([g.space, g.pos, g.facing], [played.space, played.pos, played.facing])
})

const errorFor = (hash: string): string => {
  const g = startFrom(hash, '')
  assert.equal(g.panel?.kind, 'error', hash)
  assert.deepEqual(g.story, initialState)
  assert.deepEqual(g.path, [])
  return g.panel!.text
}

test('a step that is not a number shows the error panel naming it', () => {
  assert.match(errorFor('#path=1,1,x,1'), /^Step 3 of the path is "x", not a choice number\.$/)
  assert.match(errorFor('#path=1,,1'), /^Step 2 /)
  assert.match(errorFor('#path=1,-1'), /^Step 2 /)
})

test('a choice the menu does not have shows the error panel naming the step and the scene', () => {
  const text = errorFor('#path=1,1,9')
  const dock = replay([1, 1]).at(-1)!
  assert.equal(text, `Step 3 of the path is 9, but "${menu(dock).title}" has ${menu(dock).options.length} choices.`)
  assert.match(errorFor('#path=0'), /^Step 1 of the path is 0, but/)
})

test('a step past an ending shows the error panel', () => {
  const ending = replayPath(best)
  assert.ok('story' in ending && menu(ending.story).options.length === 0)
  const steps = best.split(',').length
  assert.match(errorFor(`#path=${best},1`), new RegExp(`^Step ${steps + 1} of the path goes past the end: ".+" is an ending\\.$`))
})

test('an ending reached by a path offers a way back to the start, not a dead panel', () => {
  const g = startFrom(`#path=${best}`, '')
  assert.equal(g.panel?.kind, 'story')
  assert.deepEqual(g.panel?.buttons.map((b) => b.id), ['restart'])
  assert.deepEqual(press(g, 'restart'), start())
})

test('the error panel starts over from the beginning', () => {
  assert.deepEqual(press(startFrom('#path=7', ''), 'restart'), start())
})
