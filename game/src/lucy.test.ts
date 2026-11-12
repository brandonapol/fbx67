import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { replay } from '../../text-game/src/engine.ts'
import { initialState } from '../../text-game/src/state.ts'
import { sceneIds } from '../../text-game/src/sceneIds.ts'
import { menu, place, pov } from '../../text-game/src/story.ts'
import { N } from '../../text-game/src/names.ts'
import type { Pov } from '../../text-game/src/story.ts'
import type { Game } from './prologue.ts'
import { available, interact, label, playerBody, press } from './prologue.ts'
import { nightOut } from './nightBot.ts'
import { digOut, nextSpot } from './digBot.ts'
import type { CacheSpot } from '../../text-game/src/types.ts'
import { startFrom } from './start.ts'
import { starts } from '../smoke/starts.ts'
import { bodies } from './cast.ts'
import { lucy } from './lucy.ts'
import { bodyFor } from './pov.ts'
import { spaceFor } from './router.ts'
import { spaces } from './levels.ts'

// The engine start the smoke test opens for Lucy's first scene, by its pov rather than its id.
const lucyStart = starts.find((s) => pov(replay(s.path.split(',').map(Number)).at(-1)!) === 'lucy')!

// Plays on from a game by the first note on each menu until the story's pov is no longer `from`, keeping every step.
const playWhile = (g: Game, from: Pov, seen: readonly Game[] = []): readonly Game[] => {
  const all = [...seen, g]
  if (pov(g.story) !== from) return all
  assert.ok(all.length < 40, `no way out of ${from}'s scenes from ${g.story.scene}`)
  // The long night is played, not picked (survivalPlay.ts): its steady player presses on to first light.
  if (g.night) return playWhile(nightOut(g), from, all)
  // The crash before it is a cutscene (engineOut.ts): interact skips it to her coming to.
  if (g.crash !== undefined) return playWhile(interact(g), from, all)
  // So is the dig at Owen's camp (owensCamp.ts): its steady player digs the first choice's spot and goes home.
  if (g.space === 'owensCamp' && !g.panel) return playWhile(digOut(g, nextSpot(g) as CacheSpot), from, all)
  const note = g.panel?.buttons.find((b) => b.id.startsWith('note:'))
  assert.ok(note, `${g.story.scene} offers no note`)
  return playWhile(press(g, note.id), from, all)
}

const atLucy = startFrom(`#path=${lucyStart.path}`, '')
const night = playWhile(atLucy, 'lucy')
const lucys = night.slice(0, -1)
const after = night.at(-1)!

test("Lucy's body is her own: a lower eye than Wade's and a lighter, quicker step", () => {
  assert.equal(bodies.lucy, lucy)
  assert.ok(lucy.eye < bodies.wade.eye)
  assert.ok(lucy.tread.pitch > bodies.wade.tread.pitch)
  assert.ok(lucy.tread.weight < bodies.wade.tread.weight)
})

test('the player is Lucy in her scenes and Wade again after, driven by pov(state) alone', () => {
  assert.equal(pov(atLucy.story), 'lucy')
  assert.ok(lucys.length > 1, 'her night is more than one scene')
  lucys.forEach((g) => {
    assert.equal(playerBody(g), lucy, g.story.scene)
    assert.equal(playerBody(g).eye, lucy.eye, `${g.story.scene}: the camera hangs at her eye`)
    assert.equal(playerBody(g).tread, lucy.tread, `${g.story.scene}: her footsteps`)
  })
  assert.equal(pov(after.story), 'wade')
  assert.equal(playerBody(after), bodies.wade)
  assert.equal(after.story.scene, 'a3_search', 'the switch back lands where the search sets out')
  assert.deepEqual(after.story, replay(after.path).at(-1), 'the game stays in step with the text build')
})

test('the body follows pov(state) on every scene, whatever its id', () => {
  sceneIds.forEach((scene) => {
    const story = { ...initialState, scene }
    assert.equal(bodyFor(story, false), bodies[pov(story)], scene)
  })
})

test('no prompt the game shows in her scenes names Wade', () => {
  const wade = new RegExp(`\\b${N.wade}\\b`)
  lucys.forEach((g) => {
    available(g).forEach((i) => assert.doesNotMatch(label(g, i), wade, `${g.story.scene}: ${i.id}`))
    g.panel?.buttons
      .filter((b) => !b.id.startsWith('note:'))
      .forEach((b) => assert.doesNotMatch(b.label, wade, `${g.story.scene}: ${b.id}`))
  })
  // Any space a Lucy scene can stand in, now or once one is built for her place, has no prompt naming him.
  sceneIds
    .map((scene) => ({ ...initialState, scene }))
    .filter((s) => pov(s) === 'lucy')
    .map((s) => spaceFor(menu(s).act, place(s)))
    .filter((id) => id !== undefined)
    .forEach((id) => spaces[id].spots.forEach((i) => assert.doesNotMatch(i.prompt ?? '', wade, `${id}: ${i.id}`)))
})

test('the switch reads pov(state), never a scene id: lucy* and pov* name none', () => {
  const dir = new URL('./', import.meta.url)
  const files = readdirSync(dir).filter((f) => /^(lucy|pov).*\.ts$/.test(f) && !f.endsWith('.test.ts'))
  assert.deepEqual(files.sort(), ['lucy.ts', 'pov.ts'])
  files.forEach((f) => {
    const src = readFileSync(new URL(f, dir), 'utf8')
    sceneIds.forEach((id) => assert.ok(!src.includes(`'${id}'`), `${f} names ${id}`))
  })
})
