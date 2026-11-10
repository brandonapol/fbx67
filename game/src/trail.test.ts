import { test } from 'node:test'
import assert from 'node:assert/strict'
import { replay } from '../../text-game/src/engine.ts'
import { menu, place, sendMission } from '../../text-game/src/story.ts'
import { startFrom } from './start.ts'
import type { Game } from './prologue.ts'
import { JOG, WALK, available, focus, inWorld, interact, press, tick } from './prologue.ts'
import { present, spaces, standAt } from './levels.ts'
import { depthAt } from './highwater.ts'
import { FROM_TENT, KNEE, SLOWEST, WAIST, wadePace } from './trail.ts'
import { LINE_SPAWN, LINE_Z, SERGEANT_AT, STOPS, onStreet } from './searchEli.ts'
import type { Walked } from './trailDrive.ts'
import { nextStop, start, wade } from './trailDrive.ts'
import { distance, vec } from './world.ts'

const DT = 1 / 30

// The text build's path to Act 1's opening scene: `node src/cli.ts --choices 1,1,1,1,1,1`.
const OPENING = '1,1,1,1,1,1'
const opening = (): Game => startFrom(`#path=${OPENING}`, '')

test('starting at the opening scene from a path puts Wade on the sandbag line with the sergeant', () => {
  const g = opening()
  assert.equal(g.story.scene, 'a1_flood')
  assert.equal(g.space, 'line')
  assert.equal(g.panel, undefined)
  assert.ok(inWorld(g))
  assert.deepEqual(g.pos, LINE_SPAWN)
  assert.ok(Math.abs(g.pos.z - LINE_Z) < 2, 'at the bags')
  assert.ok(g.pos.x > -7 && g.pos.x < 7, 'across Cushman')
  const sergeant = spaces.line.figures.find((f) => f.id === 'sergeant')!
  assert.ok(present(sergeant, g.story, g.path))
  assert.ok(distance(g.pos, SERGEANT_AT) < 8, 'the sergeant is behind the line')
  assert.equal(focus(g)?.id, 'woman', 'the woman from Minto has stopped at him')
  assert.ok(depthAt(g.pos.z) > KNEE, 'thigh-deep')
})

test('depth follows the town map: the line above the knee, Third shin-deep, Fifth shallower still', () => {
  assert.ok(Math.abs(depthAt(103) - 0.32) < 0.01)
  assert.ok(Math.abs(depthAt(56) - 0.72) < 0.01)
  assert.ok(Math.abs(depthAt(64) - 0.6) < 0.01)
  assert.ok(Math.abs(depthAt(145) - 0.21) < 0.01)
  assert.ok(Math.abs(depthAt(1) - 1.5) < 0.01)
})

test('wading: no slower below the knee, slower above it, slowest from the waist', () => {
  ;[0, 0.1, 0.32, KNEE].forEach((d) => assert.equal(wadePace(d), 1, `${d} m`))
  const above = [0.55, 0.65, 0.8, 0.95].map(wadePace)
  above.forEach((p, i) => {
    assert.ok(p < 1)
    if (i > 0) assert.ok(p < above[i - 1]!, 'deeper is slower')
  })
  assert.equal(wadePace(WAIST), SLOWEST)
  assert.equal(wadePace(1.5), SLOWEST)
})

// Wade's pace wading north at z, in the open on Cushman: a second to get going, then the next second measured.
const paceOn = (g: Game, z: number, run = false): number => {
  const go = (cur: Game, n: number): Game => (n === 0 ? cur : go(tick(cur, { dir: vec(0, -1), hold: false, run }, DT), n - 1))
  const going = go({ ...g, pos: vec(2.5, z), vel: vec(0, 0), facing: Math.PI, view: Math.PI, panel: undefined }, 30)
  return distance(going.pos, go(going, 30).pos)
}

test('in the flooded town Wade wades at the pace of the water where he stands', () => {
  const g = opening()
  const third = paceOn(g, 120)
  const second = paceOn(g, 58)
  assert.ok(depthAt(120) < KNEE && depthAt(58) > KNEE)
  assert.ok(Math.abs(third - WALK) < 0.05, `shin-deep past Third he walks (${third.toFixed(2)} m/s)`)
  assert.ok(Math.abs(second - WALK * wadePace(depthAt(58))) < 0.05, `thigh-deep on Second he is slower (${second.toFixed(2)} m/s)`)
  // Running, he covers more ground in the second, into deeper water: his pace stays between the depths he starts and
  // ends in.
  const running = paceOn(g, 62, true)
  assert.ok(running <= JOG * wadePace(depthAt(62)) && running >= JOG * wadePace(depthAt(56)), `and running does not beat the water (${running.toFixed(2)} m/s)`)
  assert.equal(standAt(spaces.line, vec(2.5, 58)), 0)
})

// Plays the search from the line as a player would: hear the woman out, then wade to each stop the story opens,
// pressing its one note or the one the path names; at the help tent, walk to Joan and back out.
const press1 = (w: Walked, note: string): Walked => {
  assert.ok(w.game.panel?.buttons.some((b) => b.id === `note:${note}`), `${w.game.story.scene} offers ${note}`)
  const g = press(w.game, `note:${note}`)
  return { game: g, steps: [...w.steps, { space: g.space, pos: g.pos }] }
}

const atTent = (w: Walked): Walked => {
  assert.equal(w.game.space, 'helpTent')
  const joan = available(w.game)[0]!
  const there = wade(w, [[joan.x, joan.z + 0.9]])
  const g = interact(there.game)
  return { game: g, steps: [...there.steps, { space: g.space, pos: g.pos }] }
}

const play = (notes: readonly string[]): Walked => {
  const heard = { ...start(opening()), game: interact(opening()) }
  return notes.reduce<Walked>((w, note) => {
    if (w.game.panel) return press1(w, note)
    const there = w.game.space === 'helpTent' ? atTent(w) : nextStop(w)
    if (there.game.space === 'helpTent' && !there.game.panel) return press1(atTent(there), note)
    return press1(there, note)
  }, heard)
}

// The notes in the order the scenes ask for them, and the text build's paths through the same choices.
const SKIPPED = ['findEli', 'lacey', 'drink', 'sendSomebody', 'tellEli', 'wadeBack', 'passBags']
const RAN = ['findEli', 'lacey', 'drink', 'helpTent', 'envelope', 'waitBaby', 'wadeBack', 'passBags']
const PATHS = { skipped: [1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1], ran: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] }

// No teleport: within a space every tick moves Wade no farther than his top speed allows. The one change of space
// is up to the help tent and back, and he comes back down into the town where he went up. The search ends with Wade
// in Eli's boat, at the start of the ride out to the cabin (cabinRide.test.ts).
const ashore = (w: Walked): Walked => {
  const last = w.steps.at(-1)!
  assert.equal(last.space, 'cabin', 'the search ends in the boat')
  assert.deepEqual(last.pos, spaces.cabin.spawn)
  return { ...w, steps: w.steps.slice(0, -1) }
}

const noJumps = (all: Walked) => {
  const most = JOG * DT + 1e-6
  const w = ashore(all)
  w.steps.forEach((s, i) => {
    const prev = w.steps[i - 1]
    if (!prev) return
    if (s.space === prev.space) assert.ok(distance(s.pos, prev.pos) <= most, `jumped ${distance(s.pos, prev.pos).toFixed(2)} m in ${s.space} at ${s.pos.x},${s.pos.z}`)
    else if (s.space === 'line') assert.ok(distance(s.pos, FROM_TENT) < 1e-9 && prev.space === 'helpTent', `came into the town at ${s.pos.x},${s.pos.z}`)
    else assert.ok(s.space === 'helpTent' && prev.space === 'line' && distance(prev.pos, FROM_TENT) < 1.5, `left for ${s.space} from ${prev.pos.x},${prev.pos.z}`)
  })
}

test('the trail without the errand is walkable end to end, and lands where the text build and the mission note do', () => {
  const w = play(SKIPPED)
  noJumps(w)
  assert.ok(ashore(w).steps.every((s) => s.space === 'line'), 'never leaves the town on foot')
  assert.equal(w.game.story.scene, 'a1_body')
  assert.deepEqual(w.game.path, PATHS.skipped)
  assert.deepEqual(w.game.story, replay(PATHS.skipped).at(-1))
  assert.deepEqual(w.game.story, sendMission(replay(PATHS.skipped.slice(0, 7)).at(-1)!, 'skippedIt'))
})

test('the trail with the errand is walkable end to end through the help tent, and lands where the text build does', () => {
  const w = play(RAN)
  noJumps(w)
  const walked = ashore(w).steps
  assert.ok(walked.some((s) => s.space === 'helpTent'), 'up to the tent')
  assert.equal(walked.filter((s, i) => i > 0 && s.space !== walked[i - 1]!.space).length, 2, 'there and back, once')
  assert.equal(w.game.story.scene, 'a1_body')
  assert.deepEqual(w.game.path, PATHS.ran)
  assert.deepEqual(w.game.story, replay(PATHS.ran).at(-1))
  assert.deepEqual(w.game.story, sendMission(replay(PATHS.ran.slice(0, 7)).at(-1)!, 'ranIt'))
  const town = w.steps.filter((s) => s.space === 'line')
  assert.ok(Math.max(...town.map((s) => s.pos.z)) > 135, 'the longer trail reaches Fifth')
})

test('each scene of the search opens at its stop; the message opens where Wade caught up with Eli', () => {
  Object.entries(STOPS).forEach(([scene, stop]) => assert.ok(spaces.line.spots.some((s) => s.id === stop), `${scene} at ${stop}`))
  const third = replay(PATHS.skipped.slice(0, 11))
  const fifth = replay(PATHS.ran.slice(0, 12))
  assert.equal(third.at(-1)!.scene, 'a1_delivered')
  assert.equal(fifth.at(-1)!.scene, 'a1_delivered')
  assert.equal(place(third.at(-1)!), 'floodedStreet')
  // Eli stands at the boat where he was found, through the message, and nowhere else.
  assert.ok(onStreet('eliThird', third.at(-1)!, PATHS.skipped.slice(0, 11)))
  assert.ok(!onStreet('eliFifth', third.at(-1)!, PATHS.skipped.slice(0, 11)))
  assert.ok(onStreet('eliFifth', fifth.at(-1)!, PATHS.ran.slice(0, 12)))
  assert.ok(!onStreet('eliThird', fifth.at(-1)!, PATHS.ran.slice(0, 12)))
  // The woman from Minto is on the line until Wade gets back to it; the couple on their porch from their scene on.
  assert.ok(onStreet('woman', replay(PATHS.ran.slice(0, 6)).at(-1)!))
  assert.ok(!onStreet('woman', replay(PATHS.ran.slice(0, 13)).at(-1)!))
  assert.ok(!onStreet('oldMan', replay(PATHS.ran.slice(0, 8)).at(-1)!))
  assert.ok(onStreet('oldMan', replay(PATHS.ran.slice(0, 9)).at(-1)!))
  assert.equal(menu(replay(PATHS.ran.slice(0, 9)).at(-1)!).scene, 'a1_couple')
})
