import { test } from 'node:test'
import assert from 'node:assert/strict'
import { replay } from '../../text-game/src/engine.ts'
import { clock, menu, place } from '../../text-game/src/story.ts'
import { seasonOn } from '../../text-game/src/queries.ts'
import type { Game } from './prologue.ts'
import { available, focus, interact, press } from './prologue.ts'
import { startFrom } from './start.ts'
import { wait, walk } from './drive.ts'
import { propsIn, solids, spaces } from './levels.ts'
import { lighting } from './lighting.ts'
import { soundscapes } from './soundscape.ts'
import { FLAP_AT, JOAN_AT, SPAWN, bodyIn, dressing } from './hospital.ts'
import { blocked } from './world.ts'

// St. Joseph's after the water (#115): Barnette's ruling and Joan's clue at the help tent, where the hospital's
// patients went, played in the engine build's logic headless and checked against the text build on the same
// `--choices` path, through to the land office.

// `node src/cli.ts --choices <TO_RULING>` ends on a1_ruling, An Accident.
const TO_RULING = Array.from({ length: 16 }, () => 1)
const hash = (path: readonly number[]): string => `#path=${path.join(',')}`
const textBuild = (g: Game) => replay(g.path).at(-1)!

const ruling = startFrom(hash(TO_RULING), '')
const tent = spaces.helpTent

// Walks up to a spot, short of it on Wade's side, and uses it.
const use = (g: Game, at: { x: number; z: number }): Game => interact(walk(g, [[at.x, at.z + 0.9]]))

const toJoan = (g: Game): Game => use(g, JOAN_AT)

test('the path to the ruling puts Wade at the help tent flap, with no menu open, in the text build state', () => {
  assert.equal(ruling.story.scene, 'a1_ruling')
  assert.equal(place(ruling.story), 'helpTent')
  assert.equal(ruling.space, 'helpTent')
  assert.equal(ruling.panel, undefined)
  assert.deepEqual(ruling.pos, SPAWN)
  assert.deepEqual(ruling.story, textBuild(ruling))
})

test("the tent's place id has a spawn point, clear of every solid and figure", () => {
  assert.equal(tent.place, 'helpTent')
  assert.equal(tent.act, 'Act 1: Flood')
  assert.equal(blocked(tent.spawn, solids(tent)), false)
})

test('the body comes in from the boat: sending the body mission walks Wade into the tent', () => {
  const body = interact(wait(startFrom(hash(TO_RULING.slice(0, -1)), ''), (g) => focus(g)?.id === 'knot'))
  assert.equal(body.space, 'cabin')
  assert.equal(body.panel?.kind, 'story')
  const note = body.panel!.buttons.find((b) => b.id.startsWith('note:'))!
  const inTent = press(body, note.id)
  assert.equal(inTent.story.scene, 'a1_ruling')
  assert.equal(inTent.space, 'helpTent')
  assert.equal(inTent.panel, undefined)
})

test("Joan at the tarp is the one to talk to, and she opens the ruling's own menu with both answers", () => {
  assert.deepEqual(available(ruling).map((i) => i.id), ['joan'])
  const asked = toJoan(ruling)
  assert.equal(asked.panel?.title, menu(ruling.story).title)
  assert.equal(asked.panel?.text, menu(ruling.story).text, "Barnette's ruling is the scene's own text")
  assert.deepEqual(
    asked.panel?.buttons.filter((b) => b.id.startsWith('note:')).map((b) => b.id),
    menu(ruling.story).options.map((o) => `note:${o.note}`),
  )
  assert.equal(focus({ ...press(asked, 'close') })?.id, 'joan', 'stepping back leaves her there to ask again')
})

test('askJoan: she lowers her voice at the cot, and Continue reaches the land office on the text build path', () => {
  const asked = press(toJoan(ruling), 'note:askJoan')
  assert.equal(asked.story.scene, 'a1_joan_ask')
  assert.equal(asked.space, 'helpTent')
  assert.equal(asked.panel?.text, menu(asked.story).text, "Joan's answer, straight from the story")
  assert.ok(asked.story.evidence.includes('bruising'))
  assert.deepEqual(asked.story, textBuild(asked))
  const lucy = press(asked, 'note:continue')
  assert.equal(lucy.story.scene, 'a1_lucy')
  assert.deepEqual(lucy.path, [...TO_RULING, 1, 1], 'the same --choices path as the text build')
  assert.deepEqual(lucy.story, textBuild(lucy))
})

test('makeLaugh: she catches his sleeve at the flap, and Continue reaches the land office on the text build path', () => {
  const laughed = press(toJoan(ruling), 'note:makeLaugh')
  assert.equal(laughed.story.scene, 'a1_joan_laugh')
  assert.equal(laughed.panel, undefined, 'her line waits for Wade on his way out')
  assert.deepEqual(available(laughed).map((i) => i.id), ['flap'])
  assert.ok(laughed.story.evidence.includes('bruising'))
  assert.deepEqual(laughed.story, textBuild(laughed))
  const caught = use(laughed, { x: FLAP_AT.x, z: FLAP_AT.z - 1.6 })
  assert.equal(caught.panel?.title, menu(laughed.story).title)
  assert.equal(caught.panel?.text, menu(laughed.story).text)
  const lucy = press(caught, 'note:continue')
  assert.equal(lucy.story.scene, 'a1_lucy')
  assert.deepEqual(lucy.path, [...TO_RULING, 2, 1], 'the same --choices path as the text build')
  assert.deepEqual(lucy.story, textBuild(lucy))
})

test('both Joan paths land the bruising, with the joan counter the text build gives each', () => {
  const ask = startFrom(hash([...TO_RULING, 1, 1]), '').story
  const laugh = startFrom(hash([...TO_RULING, 2, 1]), '').story
  assert.ok(ask.evidence.includes('bruising') && laugh.evidence.includes('bruising'))
  assert.equal(laugh.joan - ask.joan, 1, 'making her laugh counts one more with Joan')
})

test('the morning errand plays at the same tent: Joan and the pills, with no body on the last cot yet', () => {
  const errand = startFrom(hash(TO_RULING.slice(0, 10)), '')
  assert.equal(errand.story.scene, 'a1_errand')
  assert.equal(errand.space, 'helpTent')
  assert.deepEqual(available(errand).map((i) => i.id), ['joan'])
  const pills = toJoan(errand)
  assert.equal(pills.panel?.text, menu(errand.story).text)
  const back = press(pills, `note:${menu(errand.story).options[0]!.note}`)
  assert.deepEqual(back.story, textBuild(back))
  assert.notEqual(back.space, 'helpTent', 'back out on the flooded street')
  assert.equal(bodyIn('flood', clock(errand.story)), false)
  assert.equal(bodyIn('flood', clock(ruling.story)), true)
  assert.ok(propsIn(tent, 'flood', clock(ruling.story)).length > propsIn(tent, 'flood', clock(errand.story)).length)
})

test("the dressing is chosen by the story's season, as data, with a winter hook that is empty for now", () => {
  assert.equal(seasonOn(clock(ruling.story)!), 'flood')
  assert.ok(propsIn(tent, 'flood').length > tent.props.length, 'August dresses the tent with the flood')
  assert.deepEqual(dressing.winter, [])
  assert.equal(propsIn(tent, 'winter', '1968-01-20T12:00'), tent.props, 'no body and no dressing in winter')
  assert.ok(propsIn(tent, 'winter').every((p) => Number.isFinite(p.box.x + p.box.z + p.box.w + p.box.d + p.h)))
  assert.ok(lighting('helpTent', 'winter', 'clear').lamp, 'the tent is lit in winter too')
  assert.ok(soundscapes.helpTent)
  assert.ok(Object.values(dressing).flat().every((p) => !p.solid), 'season layers add nothing solid')
})
