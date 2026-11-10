import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { replay } from '../../text-game/src/engine.ts'
import { sceneIds } from '../../text-game/src/sceneIds.ts'
import { menu, pov } from '../../text-game/src/story.ts'
import type { Game } from './prologue.ts'
import { available, focus, handedOff, inWorld, interact, playerBody, press, still, tick } from './prologue.ts'
import { jailTalk, officeReach, prologueSteps, walk } from './drive.ts'
import { bodies } from './cast.ts'
import { spaces } from './levels.ts'

const prologue = prologueSteps('round', 'marker')
const onLine = press(prologue.at(-1)!, 'continue')

// The state the text build reaches on the same path: `node src/cli.ts --choices <path>`.
const textBuild = (g: Game) => replay(g.path).at(-1)!

test('the player is Owen through the prologue and Wade from the end card on, by pov(state) alone', () => {
  prologue.slice(0, -1).forEach((g) => assert.equal(playerBody(g), bodies.owen, g.story.scene))
  assert.equal(pov(onLine.story), 'wade')
  assert.equal(playerBody(onLine), bodies.wade)
  assert.ok(inWorld(onLine))
})

test("Owen's figure is gone from the world after the prologue: no space past it has him", () => {
  Object.values(spaces)
    .filter((s) => s.act !== 'Prologue')
    .forEach((s) => assert.ok(!s.figures.some((f) => f.id === 'owen'), s.id))
})

test('Wade starts on the sandbag line with the woman from Minto in reach, no menu open', () => {
  assert.equal(onLine.space, 'line')
  assert.equal(onLine.panel, undefined)
  assert.deepEqual(onLine.pos, spaces.line.spawn)
  assert.equal(focus(onLine)?.id, 'woman')
})

test('hearing her out opens the scene menu; going after Eli matches the text build on the same path', () => {
  const heard = interact(onLine)
  assert.equal(heard.panel?.title, menu(onLine.story).title)
  assert.deepEqual(heard.panel?.buttons.map((b) => b.id), ['note:findEli', 'note:stayOnLine', 'close'])
  const go = press(heard, 'note:findEli')
  assert.deepEqual(go.story, textBuild(go))
  assert.equal(go.story.scene, 'a1_track')
  assert.equal(go.space, 'line')
  assert.deepEqual(go.panel?.buttons.map((b) => b.id), ['note:lacey'], 'a1_track has its menu, not a dead end')
  assert.equal(available(go).length, 0, 'the woman has said her piece')
  const stay = press(heard, 'note:stayOnLine')
  assert.deepEqual(stay.story, textBuild(stay))
  assert.equal(stay.story.scene, 'a1_body')
  assert.equal(stay.panel?.title, menu(stay.story).title)
})

// A letter home is written through the letter view (letters.ts): pick its first line and let the pen finish it.
const writeHome = (g: Game): Game => {
  let at = press(g, `note:${g.home!.choices[0].note}`)
  for (let i = 0; at.home?.writing && i < 10_000; i++) at = tick(at, still, 1 / 30)
  return at
}

test('from the line, every Act 1 menu moves on until Act 2 hands off to the text build, in step with it', () => {
  const play = (g: Game, n: number): Game => {
    if (handedOff(g)) return g
    assert.ok(n < 60, `no way out of ${g.story.scene}`)
    // In the jail Wade walks to whoever is in play: Barnette at the bars, then the man at the desk.
    if (g.space === 'jail' && !g.panel) return play(jailTalk(g, available(g)[0]!.id as 'barnette' | 'ashby'), n + 1)
    // At the help tent Wade walks to whoever is in play: Joan, or the flap on his way out.
    if (g.space === 'helpTent' && !g.panel) {
      const spot = available(g)[0]!
      return play(interact(walk(g, [[spot.x, spot.z + (spot.z > 0 ? -0.9 : 0.9)]])), n + 1)
    }
    if (g.home) {
      const next = writeHome(g)
      assert.deepEqual(next.story, textBuild(next), next.story.scene)
      return play(next, n + 1)
    }
    // In the land office Wade walks over to Lucy at the foot of the stair to talk.
    if (g.space === 'office' && !g.panel) return play(officeReach(g, 'lucy'), n + 1)
    assert.equal(g.panel?.kind, 'story', `${g.story.scene} in ${g.space} has no menu`)
    const note = g.panel.buttons.find((b) => b.id.startsWith('note:'))
    assert.ok(note, `${g.story.scene} offers no note`)
    const next = press(g, note.id)
    assert.deepEqual(next.story, textBuild(next), next.story.scene)
    return play(next, n + 1)
  }
  const last = play(interact(onLine), 0)
  assert.equal(menu(last.story).act, 'Act 2: Freeze-up')
})

test('the game picks its player by pov(state), never by the id of an act scene', () => {
  const later = sceneIds.filter((id) => /^a\d_/.test(id))
  const dir = new URL('./', import.meta.url)
  readdirSync(dir)
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
    .forEach((f) => {
      const src = readFileSync(new URL(f, dir), 'utf8')
      later.forEach((id) => assert.ok(!src.includes(`'${id}'`), `${f} names ${id}`))
    })
})
