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
  toRoom,
  toSkiff,
  wadeOut,
  wait,
  walk,
  walkLeg,
  writeLetter,
} from './drive.ts'
import { start, still } from './prologue.ts'
import { legs } from './downtown.ts'
import { POST_BOX, dockFigures, dockProps } from './floatDock.ts'
import { FLIGHT_TIME, SKIP, TOWN_TIME, flying } from './flight.ts'
import { present, spaces } from './levels.ts'
import { vec } from './world.ts'

// The text build's path through the whole prologue with Wade's Texas talk and the notes behind the stove:
// `node src/cli.ts --choices 1,1,1,1,1,1` ends on a1_flood.
const PROLOGUE = [1, 1, 1, 1, 1, 1] as const

const morning = (): Game => toBed(writeLetter(toRoom(talk(start(), 'texas'))))

// The morning walk as far as the post box on Cushman.
const toPostBox = (g: Game): Game => walk(g, [...legs[1]!.route.slice(0, 3), [-5.1, 66]])

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

test('the letter goes in the post box on the way, a hold that sends the story nothing', () => {
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
