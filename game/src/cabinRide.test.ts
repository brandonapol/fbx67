import { test } from 'node:test'
import assert from 'node:assert/strict'
import { replay } from '../../text-game/src/engine.ts'
import { menu, place, sendMission } from '../../text-game/src/story.ts'
import type { Game } from './prologue.ts'
import { available, canLight, footY, heldBehind, inWorld, interact, playerBody, press, still, tick } from './prologue.ts'
import { startFrom } from './start.ts'
import { posed, poses } from './probe.ts'
import { DT } from './drive.ts'
import { solids, spaces } from './levels.ts'
import { spaceFor } from './router.ts'
import { bodies } from './cast.ts'
import { lighting } from './lighting.ts'
import { ELI_AHEAD, RIVERBOAT_BEAM, RIVERBOAT_DECK, RIVERBOAT_L } from './boat.ts'
import { BODY_AT, CABIN_PATH, CABIN_SPEED, SAWHORSE_AT, boatIn, cabin, cabinRide } from './cabinRide.ts'
import { add, blocked, distance, scale, vec } from './world.ts'

// The boat ride with Eli to the flooded cabin (#167): from wherever the search for Eli ends, the story is at a1_body
// and Wade is in the riverboat; it poles out to the cabin and stops beside the body, where the scene's menu comes up.
// Played headless in the engine build's logic and checked against the text build on the same `--choices` path.

const hash = (path: readonly number[]): string => `#path=${path.join(',')}`
const textBuild = (g: Game) => replay(g.path).at(-1)!

// The search for Eli starts at `--choices 1,1,1,1,1,1,1` (a1_track, #231); the mission ends it one of two ways, and
// staying on the line skips it. Each is a text-build path that ends on a1_body.
const SEARCH = [1, 1, 1, 1, 1, 1, 1]
const ENDS = {
  skipped: [1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1],
  ran: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  stayed: [1, 1, 1, 1, 1, 1, 2],
} as const

// Rides on with the player's hands off, one tick at a time, until something comes up; every tick is kept.
const rideOut = (g: Game): readonly Game[] => {
  const go = (cur: Game, seen: Game[]): readonly Game[] => {
    if (cur.panel || seen.length > 30 * 60) return seen
    const next = tick(cur, still, DT)
    return go(next, [...seen, next])
  }
  return go(g, [g])
}

const boarded = startFrom(hash(ENDS.skipped), '')
const ride = rideOut(boarded)
const there = ride.at(-1)!

test('the end of the search puts Wade in the boat with Eli, at the start of the ride, with no menu open', () => {
  assert.equal(replay(SEARCH).at(-1)!.scene, 'a1_track', 'the search starts on the prefix #231 lists')
  Object.entries(ENDS).forEach(([how, path]) => {
    const g = startFrom(hash(path), '')
    assert.equal(g.story.scene, 'a1_body', how)
    assert.equal(place(g.story), 'floodCabin', how)
    assert.equal(g.space, 'cabin', how)
    assert.equal(g.panel, undefined, how)
    assert.equal(g.ride, 0, `${how}: in the boat`)
    assert.deepEqual(g.pos, cabin.spawn, how)
    assert.deepEqual(g.story, textBuild(g), how)
  })
  assert.deepEqual(boarded.story, sendMission(replay(SEARCH).at(-1)!, 'skippedIt'), 'where the mission note lands')
})

test("the cabin's place id has a spawn point: the ride's first seat, clear of every solid and figure", () => {
  assert.equal(cabin.place, 'floodCabin')
  assert.equal(cabin.act, 'Act 1: Flood')
  assert.equal(spaces.cabin, cabin)
  assert.equal(spaceFor('Act 1: Flood', 'floodCabin'), 'cabin')
  assert.deepEqual(cabin.spawn, cabinRide.at(0).seat)
  assert.deepEqual(cabin.spawn, CABIN_PATH[0])
  assert.equal(blocked(cabin.spawn, solids(cabin, boarded.story, boarded.path)), false)
})

test('the ride poles on with no teleport: the seat never moves faster than the boat, and the story waits', () => {
  assert.ok(ride.length > 2)
  ride.slice(1).forEach((g, i) => {
    const prev = ride[i]!
    assert.equal(g.space, 'cabin')
    assert.ok(distance(g.pos, prev.pos) <= CABIN_SPEED * DT + 1e-9, `jumped ${distance(g.pos, prev.pos).toFixed(3)} m at ${g.ride}`)
    assert.deepEqual(g.story, boarded.story)
    assert.deepEqual(g.path, boarded.path)
  })
  assert.ok(ride.slice(0, -1).every((g) => g.panel === undefined && inWorld(g)))
  assert.ok(Math.abs(there.ride! - cabinRide.time) < DT + 1e-9, 'the menu comes up when the boat stops')
})

test('the player is Wade on the thwart, the camera held behind the heading, with Eli standing in the bow', () => {
  const mid = ride[Math.floor(ride.length / 2)]!
  assert.equal(playerBody(mid), bodies.wade, 'not Owen, who is only in the skiff')
  assert.equal(footY(mid), RIVERBOAT_DECK)
  assert.equal(heldBehind(mid), mid.facing)
  const r = cabinRide.at(mid.ride)
  assert.deepEqual(mid.pos, r.seat)
  assert.ok(distance(r.seat, r.bow) <= ELI_AHEAD + 1e-9 && distance(r.seat, r.bow) > ELI_AHEAD - 0.3, 'Eli ahead along the course')
  assert.equal(boatIn('cabin').man, 'eli')
  assert.ok(cabin.figures.some((f) => f.id === 'eli'))
  assert.equal(boatIn('flood').man, 'hooded', 'the skiff keeps its own man')
})

// Found in the first headless render: the cigarette prompt came up on the ride, and holding it did nothing, since the
// ride ticks before any hold. Wade's hands are on the gunwales.
test('no cigarette on the ride: nothing to hold, and interact leaves the boat as it was', () => {
  const mid = ride[Math.floor(ride.length / 2)]!
  assert.equal(canLight(mid), false)
  assert.deepEqual(interact(mid), mid)
})

test('the ride ends at the cabin, the body off the bow to starboard, and the hull never runs through anything', () => {
  const end = cabinRide.at(cabinRide.time)
  assert.ok(distance(end.bow, CABIN_PATH.at(-1)!) < 1e-9)
  const off = distance(end.bow, BODY_AT)
  assert.ok(off < 2.2, `the pole reaches it (${off.toFixed(2)} m)`)
  const right = vec(-Math.cos(end.heading), Math.sin(end.heading))
  assert.ok((BODY_AT.x - end.bow.x) * right.x + (BODY_AT.z - end.bow.z) * right.z > 0, 'to starboard')
  assert.ok(distance(BODY_AT, SAWHORSE_AT) < 2, 'held under by a short line')
  // The hull's centerline from stern to stem, sampled along the ride, keeps half a beam clear of every prop.
  const staged = (p: (typeof cabin.props)[number]): boolean => Math.abs(p.box.x - BODY_AT.x) < 0.6 && p.box.z < BODY_AT.z + 1.5 && p.box.z > SAWHORSE_AT.z - 0.5
  const props = cabin.props.filter((p) => !staged(p))
  Array.from({ length: 80 }, (_, i) => (cabinRide.time * i) / 79).forEach((t) => {
    const r = cabinRide.at(t)
    const fwd = vec(Math.sin(r.heading), Math.cos(r.heading))
    Array.from({ length: 9 }, (_, k) => -RIVERBOAT_L / 2 + (RIVERBOAT_L * k) / 8).forEach((s) => {
      const p = add(r.hull, scale(fwd, s))
      const hit = props.find((q) => Math.abs(p.x - q.box.x) < q.box.w / 2 + RIVERBOAT_BEAM / 2 && Math.abs(p.z - q.box.z) < q.box.d / 2 + RIVERBOAT_BEAM / 2)
      assert.equal(hit, undefined, `the hull at ${p.x.toFixed(1)},${p.z.toFixed(1)} runs into a prop at ${hit?.box.x},${hit?.box.z}`)
    })
  })
})

test("at the cabin the scene's own menu comes up, with every note the story offers and no way to walk off", () => {
  assert.equal(there.panel?.kind, 'story')
  assert.equal(there.panel?.title, menu(there.story).title)
  assert.equal(there.panel?.text, menu(there.story).text, "the scene's own text")
  assert.deepEqual(there.panel?.buttons.map((b) => b.id), menu(there.story).options.map((o) => `note:${o.note}`))
  assert.deepEqual(available(there), [])
  assert.deepEqual(tick(there, still, 5), { ...there, t: there.t + 5 }, 'nothing moves under the menu')
})

// Each answer, pressed as the panel offers it, until the story leaves the cabin for the help tent: pointing out the
// knot stays a beat at the cabin while Eli looks (a1_knot), still in the boat; cutting it goes straight on.
const ashore = (g: Game, n = 0): Game => {
  if (g.space !== 'cabin' || n > 4) return g
  const note = g.panel?.buttons[0]?.id ?? ''
  assert.ok(note.startsWith('note:'), `${g.story.scene} at the cabin offers a note`)
  const next = press(g, note)
  assert.deepEqual(next.story, textBuild(next), next.story.scene)
  assert.ok(next.space !== 'cabin' || next.ride === g.ride, 'still in the boat')
  return ashore(next, n + 1)
}

menu(there.story).options.forEach((o) =>
  test(`${o.note} at the cabin: parity with the text build, on to the help tent`, () => {
    const next = press(there, `note:${o.note}`)
    assert.deepEqual(next.path, [...ENDS.skipped, o.n], 'the same --choices path as the text build')
    assert.deepEqual(next.story, textBuild(next))
    assert.deepEqual(next.story, startFrom(hash(next.path), '').story)
    const tent = ashore(next)
    assert.equal(place(tent.story), 'helpTent')
    assert.equal(tent.space, 'helpTent')
    assert.equal(tent.ride, undefined, 'out of the boat')
  }),
)

test('the cabin is lit as the outdoors on a flood evening, with no streetlight out there', () => {
  const l = lighting('cabin', 'flood', 'dusk', '1967-08-15T18:00')
  assert.equal(l.lamp, undefined)
})

// The smoke run samples the cabin's budget and captures its frame from this pose (smoke/starts.ts). It holds the boat
// at the end of the ride whatever the page's frame rate, with Wade on the thwart there.
test('the cabin capture pose holds the boat where the ride ends, with Wade on its thwart', () => {
  const p = poses.cabin!
  const g = posed(boarded, p)
  assert.equal(p.space, 'cabin')
  assert.ok(p.ride! >= cabinRide.time, 'the ride is over')
  const end = cabinRide.at(p.ride)
  assert.ok(distance(g.pos, end.seat) < 0.01 && Math.abs(g.facing - end.heading) < 0.01)
  assert.equal(g.ride, p.ride)
  assert.equal(posed(boarded, { ...p, ride: undefined }).ride, boarded.ride, 'a pose without one leaves the ride alone')
})
