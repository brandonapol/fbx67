import { test } from 'node:test'
import assert from 'node:assert/strict'
import { replay } from '../../text-game/src/engine.ts'
import { menu, place } from '../../text-game/src/story.ts'
import type { Game } from './prologue.ts'
import { CIGARETTE, available, canLight, focus, interact, press, shows, start } from './prologue.ts'
import { startFrom } from './start.ts'
import { hold, officeReach, walk } from './drive.ts'
import { solids, spaces } from './levels.ts'
import { spaceFor } from './router.ts'
import { SPAWN, takesIt } from './landoffice.ts'
import { blocked, distance } from './world.ts'
import { engineSenders, walk as walkStory } from './notesRatchet.ts'
import { lighting } from './lighting.ts'

// The land office (#116): Wade comes in behind Eli, carries wet ledgers for Lucy, maybe lights a cigarette she puts
// out, and answers her ask about Owen's aerial photographs. Played headless in the engine build's logic and checked
// against the text build on the same `--choices` path.

// `node src/cli.ts --choices <TO_LUCY>` ends on the land office, with Lucy's ask.
const TO_LUCY = Array.from({ length: 18 }, () => 1)
const hash = (path: readonly number[]): string => `#path=${path.join(',')}`

const textBuild = (g: Game) => replay(g.path).at(-1)!

const office = startFrom(hash(TO_LUCY), '')

const notes = menu(office.story).options.map((o) => o.note)

const ids = (g: Game): readonly string[] => available(g).map((i) => i.id).sort()

const lit = hold(office)

test('the path to the land office puts Wade inside its door, in the water, with no menu open', () => {
  assert.equal(place(office.story), 'landOffice')
  assert.equal(office.space, 'office')
  assert.equal(office.panel, undefined)
  assert.deepEqual(office.pos, SPAWN)
  assert.deepEqual(office.story, textBuild(office))
})

test("the land office's place id has a spawn point clear of every solid, and opens from the story's place, not a scene id", () => {
  assert.equal(spaces.office.place, 'landOffice')
  assert.equal(spaceFor('Act 1: Flood', 'landOffice'), 'office')
  assert.equal(spaceFor('Prologue', 'landOffice'), undefined, 'locked to Owen in the prologue')
  assert.equal(blocked(spaces.office.spawn, solids(spaces.office)), false)
  const laughed = startFrom(hash([...TO_LUCY.slice(0, 16), 2, 1]), '')
  assert.equal(laughed.space, 'office', 'the other way in, past Joan laughing, lands in the same room')
})

test('Lucy at the foot of the stair asks with every answer the story offers', () => {
  assert.deepEqual(ids(office), ['ledgers', 'lucy'])
  const asked = officeReach(office, 'lucy')
  assert.equal(asked.panel?.title, menu(office.story).title)
  assert.equal(asked.panel?.text, menu(office.story).text, "the scene's own text")
  assert.deepEqual(asked.panel?.buttons.map((b) => b.id), [...notes.map((n) => `note:${n}`), 'close'])
  assert.deepEqual(asked.story, office.story)
})

test('carrying ledgers: one off the pile, handed up to Lucy, and she talks again once his hands are empty', () => {
  const carrying = officeReach(office, 'ledgers')
  assert.equal(carrying.carrying, 'ledger')
  assert.deepEqual(ids(carrying), ['handLedger'], 'nothing else while his hands are full')
  const handed = officeReach(carrying, 'lucy')
  assert.equal(handed.carrying, undefined)
  assert.equal(handed.panel, undefined)
  assert.deepEqual(ids(handed), ['ledgers', 'lucy'])
  const again = officeReach(officeReach(handed, 'ledgers'), 'lucy')
  assert.equal(again.carrying, undefined)
  assert.deepEqual(again.story, office.story, 'the ledgers change nothing the story keeps')
  assert.deepEqual(again.path, office.path)
  assert.equal(interact(again).panel?.title, menu(office.story).title)
})

test('smoking is a held action: holding interact with nothing in front of Wade lights one', () => {
  assert.equal(focus(office), undefined)
  assert.ok(canLight(office))
  assert.equal(interact(office).holding?.id, CIGARETTE)
  assert.equal(lit.lit, true)
  assert.deepEqual(lit.story, office.story)
  assert.equal(canLight(lit), false, 'one at a time')
  assert.equal(canLight(press(start(), 'close')), false, 'Owen does not smoke')
})

test('if Wade lit one, Lucy takes it out of his mouth and drops it in the water as he comes up to her', () => {
  const near = walk(lit, [[2.6, -2.4]])
  assert.ok(!takesIt(near.pos))
  assert.equal(near.lit, true, 'not until he is near her')
  const there = walk(near, [[3.4, -2.4]])
  assert.equal(there.lit, undefined)
  assert.equal(there.doused, true)
  assert.ok(shows(there, 'doused'), 'the cigarette in the puddle is drawn')
  assert.deepEqual(there.story, office.story)
})

test('if he did not, there is no cigarette in the water', () => {
  const there = officeReach(office, 'lucy')
  assert.equal(there.doused, undefined)
  assert.ok(!shows(there, 'doused'))
})

const smoked = officeReach(lit, 'lucy')

notes.forEach((note, i) =>
  [
    ['without a cigarette', officeReach(office, 'lucy')],
    ['with one', smoked],
  ].forEach(([how, asked]) =>
    test(`${note}, ${how}: parity with the text build at Saturday at the Silver Pan`, () => {
      const g = asked as Game
      assert.ok(distance(g.pos, spaces.office.figures.find((f) => f.id === 'lucy')!.at) < 1.6)
      const next = press(g, `note:${note}`)
      assert.deepEqual(next.path, [...TO_LUCY, i + 1], 'the same --choices path as the text build')
      assert.deepEqual(next.story, textBuild(next))
      assert.deepEqual(next.story, startFrom(hash(next.path), '').story)
      assert.equal(next.panel?.title, menu(next.story).title, 'the barfight plays as its menu until its space is built')
    }),
  ),
)

test("the engine sends both of Lucy's notes from Lucy", () => {
  const sent = engineSenders(walkStory()).filter((s) => s.space === 'office')
  assert.deepEqual([...new Set(sent.map((s) => `${s.key}@${s.spot}`))].sort(), ['a1_lucy:noIdea@lucy', 'a1_lucy:offerPhotos@lucy'])
})

test('no rain falls inside the land office in the flood: it is lit as an interior', () => {
  ;(['clear', 'dusk', 'night'] as const).forEach((w) => assert.equal(lighting('office', 'flood', w).rain, false, w))
  assert.ok(lighting('office', 'flood', 'clear').lamp, 'the window light off Second')
})
