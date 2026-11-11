import { test } from 'node:test'
import assert from 'node:assert/strict'
import { replay } from '../../text-game/src/engine.ts'
import type { Game } from './prologue.ts'
import { available, ended, focus, footY, handedOff, heldBehind, inWorld, interact, label, playerMotion, press, shows, tick } from './prologue.ts'
import {
  DT,
  aboardPlane,
  back,
  downstairs,
  holdWhenSafe,
  leaveBar,
  landAtCamp,
  rideOut,
  routes,
  talk,
  toBed,
  toPostBox,
  toRoom,
  toSkiff,
  wadeOut,
  wait,
  walk,
  walkLeg,
  writeLetter,
} from './drive.ts'
import { start, still } from './prologue.ts'
import { FLOAT, legs } from './downtown.ts'
import { CURLY_ON_FLOAT, FLOAT_DECK, MORNING, POST_BOX, ROUND_TIME, curlyAt, curlyRound, dockFigures, dockNote, dockProps } from './floatDock.ts'
import { WALK_SPEED, clipFor } from './cast.ts'
import { FLIGHT_TIME, MOORED, MOORED_HEADING, PILOT_SEAT, SKIP, TOWN_TIME, flying, onBoard, seatAt } from './flight.ts'
import { present, spaces } from './levels.ts'
import { distance, vec } from './world.ts'

// The text build's path through the whole prologue with Wade's Texas talk and the notes behind the stove:
// `node src/cli.ts --choices 1,1,1,1,1,1` ends on a1_flood.
const PROLOGUE = [1, 1, 1, 1, 1, 1] as const

const morning = (): Game => toBed(writeLetter(toRoom(talk(start(), 'texas'))))

const hold = (g: Game): Game => {
  const started = interact(g)
  assert.ok(started.holding, `nothing to hold in ${g.space} at ${g.pos.x.toFixed(1)},${g.pos.z.toFixed(1)}`)
  return wait(started, (cur) => !cur.holding, { dir: vec(0, 0), hold: true })
}

// From the float, Owen mails nothing more and flies; then hides at the stove, goes home, and takes the skiff.
const fromCamp = (camp: Game): Game => {
  const hidden = holdWhenSafe(walk(camp, routes.stove))
  const home = interact(walk(hidden, back('stove')))
  return press(rideOut(press(toSkiff(wadeOut(downstairs(home))), 'note:continue')), 'continue')
}

test('the letter goes in the post box on the way, a hold that takes it out of his jacket and sends nothing yet', () => {
  const g = morning()
  assert.equal(g.story.scene, 'p_dock')
  const box = toPostBox(g)
  assert.equal(focus(box)?.id, POST_BOX)
  assert.equal(label(box, focus(box)!), 'Mail the letter')
  const letter = dockProps.find((p) => p.while === 'posting')!
  assert.equal(shows(box, letter.while), false, 'no letter in the slot before the hold')
  assert.equal(shows(interact(box), letter.while), true, 'the letter is in the slot while Owen holds it there')
  const mailed = hold(box)
  assert.equal(mailed.mailed, true)
  assert.equal(shows(mailed, letter.while), false, 'and gone once it is in')
  assert.deepEqual(mailed.story, g.story)
  assert.deepEqual(mailed.path, g.path)
  assert.ok(!available(mailed).some((i) => i.id === POST_BOX), 'mailed once')
})

test("the dock's note is how the walk down ended: the letter in the mail, or still in Owen's jacket", () => {
  assert.equal(dockNote(true), 'fly')
  assert.equal(dockNote(false), 'keep')
})

// The text build's path with the letter kept: `node src/cli.ts --choices 1,1,1,2,1,1` ends on a1_flood.
const KEPT = [1, 1, 1, 2, 1, 1] as const

test('walking past the post box leaves the letter in his jacket: the dock offers only keep, as the text build does', () => {
  const g = morning()
  const dock = interact(walk(g, legs[1]!.route))
  assert.equal(dock.mailed, undefined)
  assert.equal(dock.story.scene, 'p_dock')
  assert.deepEqual(dock.panel?.buttons.map((b) => b.id), ['note:keep'])
  assert.match(dock.panel?.buttons[0]?.label ?? '', /still in your jacket/)
  const aloft = aboardPlane(dock)
  assert.equal(aloft.story.scene, 'p_camp')
  assert.equal(aloft.story.owenLetter, 'kept')
  assert.deepEqual(aloft.path, KEPT.slice(0, 4))
  assert.deepEqual(aloft.story, replay(KEPT.slice(0, 4)).at(-1))
  const flood = fromCamp(interact(aloft))
  assert.equal(flood.story.scene, 'a1_flood')
  assert.deepEqual(flood.path, KEPT)
  assert.deepEqual(flood.story, replay(KEPT).at(-1))
})

test('the post box is only there for the morning letter', () => {
  const night = leaveBar(talk(start(), 'texas'))
  assert.equal(night.space, 'downtown')
  assert.ok(!available(night).some((i) => i.id === POST_BOX))
})

test('Curly is out on the float by his plane only on the dock morning', () => {
  const curly = dockFigures.find((f) => f.id === 'curly')!
  assert.ok(spaces.downtown.figures.includes(curly))
  assert.equal(present(curly, morning().story), true)
  assert.equal(present(curly, start().story), false)
})

test('climbing in takes off from the float: no panel, the story already at the camp, Owen seated and held behind', () => {
  const dock = walkLeg(morning())
  const aloft = aboardPlane(dock)
  assert.equal(aloft.space, 'downtown')
  assert.equal(aloft.flight, 0)
  assert.equal(aloft.panel, undefined)
  assert.equal(aloft.story.scene, 'p_camp')
  assert.deepEqual(aloft.path, [1, 1, 1, 1])
  assert.equal(playerMotion(aloft).activity, 'sit')
  assert.equal(heldBehind(aloft), aloft.facing)
  assert.ok(footY(aloft) > 0.5, 'in the cabin, above the floats')
  assert.ok(inWorld(aloft))
  assert.deepEqual(available(aloft), [])
  assert.equal(focus(aloft)?.id, SKIP)
  assert.equal(label(aloft, focus(aloft)!), 'Skip the flight')
  const climbing = wait(aloft, (g) => (g.flight ?? 0) >= TOWN_TIME * 0.7)
  assert.equal(climbing.space, 'downtown')
  assert.ok(footY(climbing) > 50, 'over town')
  const camp = wait(aloft, (g) => (g.flight ?? 0) >= TOWN_TIME)
  assert.equal(camp.space, 'camp', 'the second leg is at the camp')
  assert.ok(flying(camp.flight))
})

test('the flight ends on the ground at the camp, the same as skipping it, and nothing is sent on the way', () => {
  const aloft = aboardPlane(walkLeg(morning()))
  const watched = landAtCamp(aloft)
  const skipped = interact(tick(aloft, still, DT))
  ;[watched, skipped].forEach((g) => {
    assert.equal(g.space, 'camp')
    assert.equal(g.flight, undefined)
    assert.equal(g.panel, undefined)
    assert.deepEqual(g.pos, spaces.camp.spawn)
    assert.deepEqual(g.story, aloft.story)
    assert.deepEqual(g.path, aloft.path)
    assert.deepEqual(available(g).map((i) => i.id).sort(), ['cache', 'marker', 'stove'])
  })
  assert.ok(watched.t < FLIGHT_TIME, 'the camp clock starts when Owen is on the ground')
})

test('the camp plane is drawn parked only once the flight is down', () => {
  const parked = spaces.camp.props.filter((p) => p.while === 'parked')
  assert.ok(parked.length > 0)
  const aloft = aboardPlane(walkLeg(morning()))
  const landing = wait(aloft, (g) => (g.flight ?? 0) >= TOWN_TIME + 1)
  parked.forEach((p) => assert.equal(shows(landing, p.while), false))
  parked.forEach((p) => assert.equal(shows(landAtCamp(aloft), p.while), true))
})

test('the end of the prologue plays through the dock, the flight and the flood into Act 1, as the text build path does', () => {
  const dock = interact(walk(hold(toPostBox(morning())), legs[1]!.route.slice(2)))
  assert.equal(dock.story.scene, 'p_dock')
  assert.deepEqual(dock.panel?.buttons.map((b) => b.id), ['note:fly'])
  assert.equal(aboardPlane(dock).story.owenLetter, 'mailed')
  const watched = fromCamp(landAtCamp(aboardPlane(dock)))
  const skipped = fromCamp(interact(aboardPlane(dock)))
  ;[watched, skipped].forEach((g) => {
    assert.equal(g.story.scene, 'a1_flood')
    assert.equal(g.space, 'line')
    assert.equal(g.panel, undefined)
    assert.equal(handedOff(g), false)
    assert.equal(ended(g), false)
    assert.deepEqual(g.path, PROLOGUE)
    assert.deepEqual(g.story, replay(PROLOGUE).at(-1))
  })
})

test("Curly walks round on the plane's near float: from the pump up to its bow, down to its heel and back", () => {
  const begin = curlyRound(0)
  assert.deepEqual(begin.at, CURLY_ON_FLOAT)
  assert.equal(begin.speed, 0)
  const near = onBoard({ at: MOORED, y: 0, heading: MOORED_HEADING }, vec(1.3, 0))
  assert.ok(near.x > FLOAT[1], 'the plane\'s float, not the dock')
  const samples = Array.from({ length: Math.ceil(ROUND_TIME * 10) }, (_, i) => curlyRound(i / 10))
  samples.forEach((w, i) => {
    assert.ok(Math.abs(w.at.x - near.x) < 1e-9, `on the float's deck at ${i / 10}`)
    assert.ok(Math.abs(w.at.z - MOORED.z) < 3.3, `within the float's length at ${i / 10}`)
    assert.ok(w.speed <= WALK_SPEED + 1e-9, 'a walk, never a run')
  })
  const zs = samples.map((w) => w.at.z)
  assert.ok(Math.max(...zs) - Math.min(...zs) > 5, 'he walks the length of the float')
  assert.ok(samples.some((w) => w.speed > 0) && samples.filter((w) => w.speed === 0).length > samples.length / 3, 'and stops to look')
  // A loop, and a pure function of the time: no jumps a frame apart.
  assert.deepEqual(curlyRound(ROUND_TIME), curlyRound(0))
  Array.from({ length: Math.ceil(ROUND_TIME * 30) }, (_, i) => i / 30).forEach((t) => {
    assert.ok(distance(curlyRound(t).at, curlyRound(t + 1 / 30).at) < 0.1, `jump at ${t}`)
  })
})

test("Curly's one pose a frame: flying from the left seat, walking round on the morning, standing to talk", () => {
  const dock = { ...start(), story: { ...start().story, scene: MORNING }, space: 'downtown', panel: undefined } as Game
  const walking = curlyAt({ ...dock, pos: vec(118.5, -2), t: 7 })
  assert.ok(walking)
  assert.deepEqual(walking.at, curlyRound(7).at)
  assert.equal(walking.y, FLOAT_DECK)
  assert.equal(clipFor(walking.motion), curlyRound(7).speed > 0 ? 'walk' : 'idle')
  // Owen down on the dock, or the scene's menu up: Curly is at the pump, as the scene finds him.
  ;[{ pos: vec(118.5, -16) }, { pos: vec(118.5, -2), panel: { kind: 'story', title: '', text: '', buttons: [] } as Game['panel'] }].forEach((at) => {
    const held = curlyAt({ ...dock, ...at, t: 7 })
    assert.deepEqual(held?.at, CURLY_ON_FLOAT)
    assert.equal(held?.motion.speed, 0)
  })
  const aloft = curlyAt({ ...dock, flight: 20 })
  assert.ok(aloft)
  assert.equal(clipFor(aloft.motion), 'sit')
  assert.deepEqual(aloft.at, seatAt(20, PILOT_SEAT).at)
  assert.equal(curlyAt({ ...dock, story: { ...dock.story, scene: 'p_camp' }, space: 'camp' }), undefined, 'at the camp he is the watcher')
})
