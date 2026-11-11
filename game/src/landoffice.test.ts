import { test } from 'node:test'
import assert from 'node:assert/strict'
import { replay } from '../../text-game/src/engine.ts'
import { menu, place } from '../../text-game/src/story.ts'
import type { Game } from './prologue.ts'
import { CIGARETTE, available, canLight, focus, interact, press, shows, start } from './prologue.ts'
import { startFrom } from './start.ts'
import { hold, officeReach, officeStands, walk } from './drive.ts'
import { solids, spaces } from './levels.ts'
import { spaceFor } from './router.ts'
import { LUCY_AT, LUCY_REACH, PILE_AT, SPAWN, STAIR_X, pieces, takesIt } from './landoffice.ts'
import type { Vec } from './world.ts'
import { RADIUS, blocked, distance, hits, vec } from './world.ts'
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
      assert.equal(next.space, 'pan', 'on to the Silver Pan')
      assert.equal(next.panel?.title, menu(next.story).title, "Hank's speech opens on arrival")
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

// The dressing (#174): wet ledgers, a 1967 government office after the water, at the art guide's interior density.
const room = spaces.office

test('the office is dressed with everything on the list, inside its walls, at 1.5 props a square meter', () => {
  const list = [
    'sandbags', 'bench', 'rug', 'ashStand', 'chairs', 'coatTree', 'mapCase', 'radiator', 'bulletin', 'clock', 'plats', 'cooler',
    'flags', 'extinguisher', 'mop', 'floating', 'waterline', 'counter', 'shelfLedgers', 'silt', 'clerkDesk', 'secondDesk',
    'platTable', 'cabinets', 'safe', 'dryingLine', 'southWall', 'boxes', 'lights', 'fan', 'carried', 'boots',
  ]
  assert.deepEqual(Object.keys(pieces).sort(), [...list].sort())
  for (const id of list) assert.ok(pieces[id]?.length, `${id} is in the office`)
  const dressing = Object.values(pieces).flat()
  for (const p of dressing) assert.ok(room.props.includes(p), 'every piece is drawn')
  const { w, d } = room.size
  for (const p of dressing) {
    assert.ok(Math.abs(p.box.x) + p.box.w / 2 <= w / 2 - 0.15 && Math.abs(p.box.z) + p.box.d / 2 <= d / 2 - 0.15, `inside the walls at ${p.box.x}, ${p.box.z}`)
    assert.ok([p.box.w, p.box.d, p.h].every((n) => Number.isFinite(n) && n > 0), 'a size to draw')
  }
  // docs/art/README.md#density: a prop is its own mesh at least about 15 cm in its largest dimension; flat decals
  // (the water, the papers on it, the high-water line) do not count.
  const counted = room.props.filter((p) => !p.flat && !p.while && Math.max(p.box.w, p.box.d, p.h) >= 0.15).length
  assert.ok(counted >= 1.5 * w * d, `${counted} props on ${w * d} square meters`)
})

// Every way Wade walks in the office: in at the door; to the ledger pile and to Lucy at the stair, as officeReach
// walks them; the smoke run's straight walk at Lucy, stopping inside her reach (game/smoke/act1Plan.ts); the
// cigarette walk; and the ways levels.test.ts walks into the pile and the side of the stair.
const smokeStop = vec(LUCY_AT.x + (SPAWN.x - LUCY_AT.x) * ((LUCY_REACH * 0.8) / distance(SPAWN, LUCY_AT)), LUCY_AT.z + (SPAWN.z - LUCY_AT.z) * ((LUCY_REACH * 0.8) / distance(SPAWN, LUCY_AT)))
const DOOR_AT = vec(0, -4.6)
const lanes: readonly (readonly [Vec, Vec])[] = [
  [DOOR_AT, SPAWN],
  [SPAWN, officeStands.ledgers],
  [SPAWN, officeStands.lucy],
  [officeStands.ledgers, officeStands.lucy],
  [officeStands.lucy, DOOR_AT],
  [SPAWN, smokeStop],
  [SPAWN, vec(2.6, -2.4)],
  [officeStands.ledgers, vec(-3.5, -3.0)],
  [SPAWN, vec(3.0, -1.0)],
  [vec(3.0, -1.0), vec(3.0, 0.5)],
  [vec(3.0, 0.5), vec(STAIR_X - 1.05, 0.5)],
]
const along = ([a, b]: readonly [Vec, Vec]): readonly Vec[] =>
  Array.from({ length: 41 }, (_, i) => vec(a.x + ((b.x - a.x) * i) / 40, a.z + ((b.z - a.z) * i) / 40))

test('the dressing leaves every way Wade walks clear: nothing standing in his path', () => {
  const standing = Object.values(pieces).flat().filter((p) => !p.flat && (p.y ?? 0) < 1.9 && p.h > 0.03)
  for (const lane of lanes)
    for (const at of along(lane)) assert.deepEqual(standing.filter((p) => hits(at, p.box)).map((p) => p.box), [], `${at.x.toFixed(2)}, ${at.z.toFixed(2)}`)
})

test('collision: the furniture is solid, and Wade still walks to the ledgers, the door and the stair', () => {
  const solid = solids(room)
  assert.ok(Object.values(pieces).flat().filter((p) => p.solid).length >= 10, 'the bench, cabinets, desks, safe and table stop him')
  for (const lane of lanes) for (const at of along(lane)) assert.equal(blocked(at, solid), false, `${at.x.toFixed(2)}, ${at.z.toFixed(2)}`)
  const atPile = walk(office, [[officeStands.ledgers.x, officeStands.ledgers.z]])
  assert.ok(distance(atPile.pos, officeStands.ledgers) < 0.2, 'reaches the ledgers')
  assert.ok(distance(atPile.pos, PILE_AT) < 1.5)
  const atDoor = walk(atPile, [[DOOR_AT.x, DOOR_AT.z]])
  assert.ok(distance(atDoor.pos, DOOR_AT) < 0.2, 'back to the door')
  const atStair = walk(atDoor, [[officeStands.lucy.x, officeStands.lucy.z]])
  assert.ok(distance(atStair.pos, officeStands.lucy) < 0.2, 'and to the foot of the stair')
  assert.equal(officeReach(officeReach(office, 'ledgers'), 'lucy').carrying, undefined, 'the ledger still goes up to Lucy')
  // Nothing solid stands on Lucy or Eli.
  for (const f of room.figures) assert.deepEqual(room.props.filter((p) => p.solid && hits(f.at, p.box, RADIUS / 2)).map((p) => p.box), [], f.id)
})
