import { test } from 'node:test'
import assert from 'node:assert/strict'
import { replay } from '../../text-game/src/engine.ts'
import { menu, mission, notebook, place, sendMission, weather } from '../../text-game/src/story.ts'
import type { Game } from './prologue.ts'
import { available, focus, interact, label, press, still, tick } from './prologue.ts'
import { startFrom } from './start.ts'
import { posed, poses } from './probe.ts'
import { DT } from './drive.ts'
import { FOV } from './camera.ts'
import { cabin, cabinRide } from './cabinRide.ts'
import { KNOT_AT, KNOT_SHOT, KNOT_SPOT, LOOP_AT, LOOP_R, SAWHORSE_AT, TAIL_END, closeUp, knotProps, loop, tail } from './knot.ts'
import { engineSenders, walk } from './notesRatchet.ts'
import type { Vec } from './world.ts'
import { distance } from './world.ts'

// The knot close-up and the cut line at the cabin (#168): at the end of the ride Wade leans over the gunwale, the camera
// goes close on the backward bowline, and the scene's own menu offers showing Eli or cutting it and saying nothing.
// Played headless in the engine build's logic and checked against the text build on the same `--choices` path.

const hash = (path: readonly number[]): string => `#path=${path.join(',')}`
const textBuild = (g: Game) => replay(g.path).at(-1)!

// The search for Eli skipped (cabinRide.test.ts): a text-build path that ends on a1_body.
const SKIPPED = [1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1]

const rideOut = (g: Game): Game => (g.panel || (g.ride ?? 0) >= cabinRide.time ? g : rideOut(tick(g, still, DT)))

const boarded = startFrom(hash(SKIPPED), '')
const there = rideOut(boarded)
const looking = interact(there)

// Presses each panel's first button until the story leaves the cabin, checking parity with the text build on the way.
const ashore = (g: Game, n = 0): Game => {
  if (g.space !== 'cabin' || n > 4) return g
  const note = g.panel?.buttons[0]?.id ?? ''
  assert.ok(note.startsWith('note:'), `${g.story.scene} at the cabin offers a note`)
  const next = press(g, note)
  assert.deepEqual(next.story, textBuild(next), next.story.scene)
  return ashore(next, n + 1)
}

test('the bowline: its loop is closed round the top of the shirt and the tail sits outside it', () => {
  loop.forEach((p, i) => assert.ok(distance(p, loop[(i + 1) % loop.length]!) < 0.04, `a gap in the loop at bead ${i}`))
  loop.forEach((p) => assert.ok(Math.abs(distance(p, LOOP_AT) - LOOP_R) < 1e-9))
  assert.ok(Math.abs(distance(KNOT_AT, LOOP_AT) - LOOP_R) < 1e-9, 'the nip is on the loop')
  assert.deepEqual(tail[0], KNOT_AT, 'the tail comes out of the nip')
  tail.forEach((p) => assert.ok(distance(p, LOOP_AT) >= LOOP_R - 1e-9, `a tail bead inside the loop at ${p.x},${p.z}`))
  assert.ok(distance(TAIL_END, LOOP_AT) > LOOP_R + 0.1, 'well outside, not along it')
  assert.ok(SAWHORSE_AT.z < KNOT_AT.z && KNOT_AT.z < LOOP_AT.z, 'the standing part runs from the sawhorse to the knot, the loop beyond')
  knotProps.forEach((p) => assert.ok(cabin.props.includes(p), 'staged in the cabin'))
})

test('the ride ends with no menu: the knot is in front of Wade, to lean over and look at, and only at the body', () => {
  assert.equal(there.story.scene, 'a1_body')
  assert.equal(there.panel, undefined)
  assert.equal(there.ride, cabinRide.time)
  assert.deepEqual(available(there), [KNOT_SPOT])
  assert.equal(focus(there)?.id, 'knot', 'from the thwart where the boat stops')
  assert.equal(label(there, focus(there)!), KNOT_SPOT.prompt)
  assert.equal(focus(boarded), undefined, 'not from the start of the ride')
  assert.equal(closeUp(there.look, there.space), undefined, 'the follow camera until he looks')
})

test("looking goes close on the knot and brings up the scene's own menu, with no way to look away", () => {
  assert.equal(looking.look, 'knot')
  assert.deepEqual(closeUp(looking.look, looking.space), KNOT_SHOT)
  assert.equal(looking.panel?.kind, 'story')
  assert.equal(looking.panel?.title, menu(there.story).title)
  assert.equal(looking.panel?.text, menu(there.story).text, "the scene's own text")
  assert.deepEqual(looking.panel?.buttons.map((b) => b.id), menu(there.story).options.map((o) => `note:${o.note}`))
  assert.deepEqual(looking.story, there.story, 'looking sends nothing')
  assert.deepEqual(tick(looking, still, 5), { ...looking, t: looking.t + 5 }, 'nothing moves under the menu')
})

// The close-up's camera, as a pinhole: right and up on the image plane, over depth.
const project = (eye: readonly number[], at: readonly number[]) => {
  const f = norm([at[0]! - eye[0]!, at[1]! - eye[1]!, at[2]! - eye[2]!])
  const right = norm(cross(f, [0, 1, 0]))
  const up = cross(right, f)
  return (p: Vec, y: number): readonly [number, number] => {
    const d = [p.x - eye[0]!, y - eye[1]!, p.z - eye[2]!]
    const depth = dot(d, f)
    return [dot(d, right) / depth, dot(d, up) / depth]
  }
}
const dot = (a: readonly number[], b: readonly number[]): number => a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!
const cross = (a: readonly number[], b: readonly number[]): number[] => [a[1]! * b[2]! - a[2]! * b[1]!, a[2]! * b[0]! - a[0]! * b[2]!, a[0]! * b[1]! - a[1]! * b[0]!]
const norm = (a: readonly number[]): number[] => {
  const l = Math.hypot(a[0]!, a[1]!, a[2]!)
  return [a[0]! / l, a[1]! / l, a[2]! / l]
}
const inside = (p: readonly [number, number], poly: readonly (readonly [number, number])[]): boolean =>
  poly.reduce((odd, a, i) => {
    const b = poly[(i + 1) % poly.length]!
    return (a[1] > p[1]) !== (b[1] > p[1]) && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0] ? !odd : odd
  }, false)

test('in the close-up frame the whole knot is in view and the tail is drawn outside the loop', () => {
  const view = project(KNOT_SHOT.eye, KNOT_SHOT.at)
  const half = Math.tan((FOV * Math.PI) / 360)
  const ring = loop.map((p) => view(p, 0.05))
  ;[...ring, ...tail.map((p) => view(p, 0.05))].forEach(([x, y]) => assert.ok(Math.abs(x) < half && Math.abs(y) < half, `off frame at ${x},${y}`))
  assert.ok(KNOT_SHOT.eye[1] > 0.5, 'from above the water')
  tail.slice(2).forEach((p) => assert.equal(inside(view(p, 0.05), ring), false, `tail drawn inside the loop at ${p.x},${p.z}`))
  assert.equal(inside(view(LOOP_AT, 0.05), ring), true, 'the loop reads as a loop')
})

const NOTES = { pointOutKnot: 'pointedItOut', cutKnot: 'cutItSilently' } as const

Object.entries(NOTES).forEach(([note, ending]) =>
  test(`${note} from the close-up sends ${ending}: parity with the text build at a1_ruling, and the line in the notebook`, () => {
    const option = menu(there.story).options.find((o) => o.note === note)!
    const next = press(looking, `note:${note}`)
    assert.deepEqual(next.path, [...SKIPPED, option.n], 'the same --choices path as the text build')
    const tent = ashore(next)
    assert.equal(tent.story.scene, 'a1_ruling')
    assert.equal(place(tent.story), 'helpTent')
    assert.equal(tent.space, 'helpTent')
    assert.equal(tent.ride, undefined, 'out of the boat')
    assert.equal(tent.look, undefined, 'and the close-up is over')
    assert.deepEqual(tent.story, textBuild(tent), 'the state the text build has on the same path')
    assert.deepEqual(tent.story, startFrom(hash(tent.path), '').story)
    assert.equal(mission(there.story)?.id, 'theBody')
    assert.deepEqual(tent.story, sendMission(there.story, ending), "the mission's note")
    assert.ok(notebook(tent.story).some((e) => e.id === 'knot'), 'the cut piece is in the notebook')
    assert.ok(!notebook(there.story).some((e) => e.id === 'knot'), 'and was not before')
  }),
)

test('showing Eli keeps the close-up while he looks, still in the boat', () => {
  const eli = press(looking, 'note:pointOutKnot')
  assert.equal(eli.story.scene, 'a1_knot')
  assert.equal(eli.space, 'cabin')
  assert.equal(eli.look, 'knot')
  assert.deepEqual(eli.panel?.buttons.map((b) => b.id), menu(eli.story).options.map((o) => `note:${o.note}`))
  assert.deepEqual(available(eli), [], 'the knot is cut; nothing to lean to')
})

test('the cut piece stays in the notebook from then on, on both choices', () => {
  ;[1, 2].forEach((n) => {
    const later = replay([...SKIPPED, n, ...Array<number>(12).fill(1)])
    later.slice(SKIPPED.length + 1).forEach((s) => assert.ok(notebook(s).some((e) => e.id === 'knot'), `${s.scene} on choice ${n}`))
  })
})

test("the notes ratchet finds the engine sending both of the body's notes from the knot", () => {
  const stop = walk().filter((s) => s.state.scene === 'a1_body')
  const sent = engineSenders(stop)
  assert.deepEqual([...new Set(sent.map((s) => s.key))].sort(), ['theBody:cutItSilently', 'theBody:pointedItOut'])
  assert.ok(sent.every((s) => s.space === 'cabin' && s.spot === 'knot'))
})

test('the close-up capture poses hold the boat at the end of the ride, in each moral-weather band', () => {
  const ps = ['knot', 'knot_dusk', 'knot_night'].map((n) => poses[n]!)
  ps.forEach((p) => {
    assert.equal(p.space, 'cabin')
    assert.deepEqual(p.shot, KNOT_SHOT)
    assert.ok(p.ride! >= cabinRide.time)
  })
  assert.equal(new Set(ps.map((p) => weather(posed(boarded, p).story))).size, 3)
})

// Found when the help tent's test started from a link to Eli looking at the knot: the boat stopped, the knot was already
// cut, and nothing came up.
test('a link to Eli looking at the knot rides out and brings up its menu, since the knot is already cut', () => {
  const eli = rideOut(startFrom(hash([...SKIPPED, 1]), ''))
  assert.equal(eli.story.scene, 'a1_knot')
  assert.equal(eli.space, 'cabin')
  assert.deepEqual(eli.panel?.buttons.map((b) => b.id), menu(eli.story).options.map((o) => `note:${o.note}`))
})
