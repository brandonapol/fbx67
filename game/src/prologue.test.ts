import { test } from 'node:test'
import assert from 'node:assert/strict'
import { replay } from '../../text-game/src/engine.ts'
import { readFileSync } from 'node:fs'
import { initialState } from '../../text-game/src/state.ts'
import { menu } from '../../text-game/src/story.ts'
import type { Game, Input } from './prologue.ts'
import { INDOOR_PACE, JOG, ROUND_TIME, TURN_GO, WALK, available, owenMotion, ended, focus, handedOff, inReach, interact, label, press, seen, start, still, textBuildHash, tick } from './prologue.ts'
import { DT, back, hold, holdWhenSafe, holdWhenWatched, playPrologue, routes, talk, walk } from './drive.ts'
import { angleBetween, length, vec } from './world.ts'
import { clipFor } from './cast.ts'
import { spaces } from './levels.ts'

const talks = ['texas', 'munitions', 'round'] as const
const spots = ['stove', 'cache', 'marker'] as const

talks.forEach((who, ti) =>
  spots.forEach((spot, si) =>
    test(`playing ${who} then hiding at the ${spot} matches text path ${ti + 1},1,1,1,${si + 1},1`, () => {
      const g = playPrologue(who, spot)
      assert.ok(ended(g))
      assert.deepEqual(g.path, [ti + 1, 1, 1, 1, si + 1, 1])
      assert.deepEqual(g.story, replay(g.path).at(-1))
      assert.equal(g.story.scene, 'a1_flood')
      assert.equal(g.story.owenCache, spot)
      assert.equal(textBuildHash(g), `#path=${ti + 1},1,1,1,${si + 1},1`)
      assert.equal(g.busts, 0)
    }),
  ),
)

const atCamp = () => {
  const bar = talk(start(), 'texas')
  const room = interact(walk(bar, [[0, 4.2]]))
  return press(press(interact(walk(room, [[1.6, -0.8]])), 'note:sleep'), 'note:fly')
}

test('the door only opens after a conversation, and Hank only sells the round before one', () => {
  const g = press(start(), 'close')
  assert.deepEqual(available(g).map((i) => i.id).sort(), ['curly', 'hank', 'wade'])
  const after = talk(start(), 'texas')
  assert.deepEqual(available(after).map((i) => i.id).sort(), ['curly', 'door', 'wade'])
})

test('the letter is read in the room, the dock panel follows, and no hiding note is sent before the camp', () => {
  const room = interact(walk(talk(start(), 'munitions'), [[0, 4.2]]))
  const desk = interact(walk(room, [[1.6, -0.8]]))
  assert.equal(desk.panel?.title, 'Owen: A Letter to Lucy')
  assert.deepEqual(desk.panel?.buttons, [{ id: 'note:sleep', label: menu(desk.story).options[0].label }])
  assert.equal(desk.story.owenCache, undefined)
  const dock = press(desk, 'note:sleep')
  assert.equal(dock.space, 'room')
  assert.equal(dock.story.scene, 'p_dock')
  assert.equal(dock.panel?.title, 'Owen: The Float Dock')
  assert.deepEqual(dock.panel?.buttons.map((b) => b.id), ['note:fly'])
  const camp = press(dock, 'note:fly')
  assert.equal(camp.space, 'camp')
  assert.equal(camp.panel, undefined)
  assert.equal(camp.story.scene, 'p_camp')
  assert.deepEqual(camp.path, [2, 1, 1, 1])
  assert.equal(camp.story.owenCache, undefined)
})

spots.forEach((spot) =>
  test(`hiding at the ${spot} while Curly looks over the camp gets you busted, and the story never hears`, () => {
    const camp = walk(atCamp(), routes[spot])
    const caught = holdWhenWatched(camp)
    assert.equal(caught.panel?.kind, 'busted')
    assert.equal(caught.hidden, undefined)
    assert.deepEqual(caught.story, replay([1, 1, 1, 1]).at(-1))
    const retried = press(caught, 'retry')
    assert.equal(retried.space, 'camp')
    assert.equal(retried.panel, undefined)
    assert.equal(retried.busts, 1)
    const done = holdWhenSafe(walk(retried, routes[spot]))
    assert.equal(done.hidden, spot)
    assert.equal(done.story.owenCache, spot)
  }),
)

test('letting go of E stops hiding without sending anything', () => {
  const camp = walk(atCamp(), routes.stove)
  const started = interact(camp)
  assert.ok(started.holding)
  const released = tick(started, still, 1 / 30)
  const walked = walk(released, [[5.6, 1.5]])
  assert.equal(walked.holding, undefined)
  assert.equal(walked.story.owenCache, undefined)
})

test('the plane only takes Owen home once the notes are hidden', () => {
  const camp = atCamp()
  assert.ok(!available(camp).some((i) => i.id === 'plane'))
  const hidden = holdWhenSafe(walk(camp, routes.cache))
  const home = walk(hidden, back('cache'))
  assert.equal(focus(home)?.id, 'plane')
  assert.equal(interact(home).space, 'flood')
})

test('Curly cannot see through the cook tent', () => {
  const camp = walk(atCamp(), [[-6, 2], [-2, -1.5], [6, -4.6]])
  const t = Array.from({ length: 300 }, (_, i) => i * 0.03)
  assert.ok(t.every((tt) => !seen({ ...camp, t: tt })))
})

test('a hold with nothing nearby is refused', () => {
  assert.throws(() => hold(press(start(), 'close')), /nothing to hold/)
  assert.deepEqual(start().story, initialState)
})

const run = (g: Game, input: Input, n: number): Game => Array.from({ length: n }).reduce<Game>((cur) => tick(cur, input, DT), g)

const holding: Input = { dir: vec(0, 0), hold: true }

test('walking out of reach cancels a hold and nothing is sent', () => {
  const started = interact(walk(atCamp(), routes.stove))
  const half = run(started, holding, 20)
  assert.ok(half.holding && half.holding.progress > 0.5)
  const away = run(half, { dir: vec(-1, 0), hold: true }, 60)
  assert.equal(away.holding, undefined)
  assert.equal(away.hidden, undefined)
  assert.equal(away.story.owenCache, undefined)
  assert.deepEqual(away.story, replay([1, 1, 1, 1]).at(-1))
})

test('reach, not stick drift, decides whether a hold survives', () => {
  const started = interact(walk(atCamp(), routes.stove))
  const drifting = run(started, { dir: vec(0.05, 0.05), hold: true }, 10)
  assert.ok(drifting.holding)
  assert.ok(inReach(drifting, 'stove'))
  const stove = spaces.camp.spots.find((i) => i.id === 'stove')!
  const outside = { ...drifting, pos: vec(stove.x, stove.z + stove.r + 0.05) }
  assert.ok(!inReach(outside, 'stove'))
  assert.equal(tick(outside, holding, DT).holding, undefined)
  const edge = { ...drifting, pos: vec(stove.x, stove.z + stove.r - 0.05) }
  assert.ok(tick(edge, holding, DT).holding)
})

test('buying the round is a hold at the bar, and a tap alone buys nothing', () => {
  const at = walk(press(start(), 'close'), [[-1.5, -2.2]])
  assert.equal(focus(at)?.id, 'hank')
  const tapped = tick(interact(at), still, DT)
  assert.equal(tapped.holding, undefined)
  assert.equal(tapped.story.scene, 'p_bar')
  const short = run(interact(at), holding, Math.floor(ROUND_TIME / DT) - 2)
  assert.equal(short.story.scene, 'p_bar')
  const bought = hold(at)
  assert.equal(bought.story.scene, 'p_talk_round')
  assert.deepEqual(bought.path, [3])
  assert.equal(bought.panel?.kind, 'story')
})

test('note-backed prompts read the story label', () => {
  const bar = press(start(), 'close')
  const hank = available(bar).find((i) => i.id === 'hank')!
  assert.equal(label(bar, hank), menu(bar.story).options.find((o) => o.note === 'round')?.label)
  const camp = atCamp()
  const notes = menu(camp.story).options
  available(camp)
    .filter((i) => i.note)
    .forEach((i) => assert.equal(label(camp, i), notes.find((o) => o.note === i.note)?.label))
  const after = talk(start(), 'texas')
  const door = available(after).find((i) => i.id === 'door')!
  assert.equal(label(after, door), menu(after.story).options.find((o) => o.note === 'goodnight')?.label)
})

test('talking to Wade is a tap that opens the menu', () => {
  const at = walk(press(start(), 'close'), [[1.6, 3.2]])
  assert.equal(focus(at)?.id, 'wade')
  assert.deepEqual(interact(at).panel?.buttons.map((b) => b.id), ['note:texas', 'note:munitions', 'close'])
})

test('the camera, not only the facing, decides the target', () => {
  const at = walk(press(start(), 'close'), [[1.6, 3.2]])
  const away = tick(at, { ...still, view: at.facing + Math.PI }, DT)
  assert.equal(focus(away), undefined)
  const back = tick(away, { ...still, view: at.facing }, DT)
  assert.equal(focus(back)?.id, 'wade')
})

test('Owen walks by default everywhere, jogs with run outdoors and walks briskly indoors', () => {
  const bar = press(start(), 'close')
  const north: Input = { dir: vec(0, -1), hold: false }
  assert.ok(length(tick(bar, north, DT).vel) < WALK)
  assert.ok(Math.abs(length(run(bar, north, 30).vel) - WALK) < 1e-6)
  assert.ok(Math.abs(length(run(bar, { ...north, run: true }, 40).vel) - INDOOR_PACE) < 1e-6)
  const camp = { ...atCamp(), pos: vec(-2, -1.5) }
  assert.ok(Math.abs(length(run(camp, north, 30).vel) - WALK) < 1e-6)
  assert.ok(Math.abs(length(run(camp, { ...north, run: true }, 40).vel) - JOG) < 1e-6)
})

test('indoors, run held never plays the run clip and Owen stays at or under the indoor pace', () => {
  const bar = press(start(), 'close')
  const north: Input = { dir: vec(0, -1), hold: false, run: true }
  const steps = Array.from({ length: 90 }).reduce<readonly Game[]>((acc) => [...acc, tick(acc[acc.length - 1], north, DT)], [bar])
  steps.forEach((g, i) => {
    assert.ok(length(g.vel) <= INDOOR_PACE + 1e-9, `over the indoor pace at step ${i}`)
    assert.notEqual(clipFor(owenMotion(g)), 'run', `run clip at step ${i}`)
  })
  assert.ok(Math.abs(length(steps[steps.length - 1].vel) - INDOOR_PACE) < 1e-6)
  const walking: Input = { ...north, run: false }
  const camp = { ...atCamp(), pos: vec(-2, -1.5) }
  assert.ok(length(run(bar, walking, 4).vel) < length(run(camp, walking, 4).vel), 'indoors Owen starts gentler than outdoors')
})

test('the clip follows the simulated velocity, not the frame displacement', () => {
  const bar = press(start(), 'close')
  assert.equal(clipFor(owenMotion({ ...bar, vel: vec(0, -WALK) })), 'walk')
  assert.equal(clipFor(owenMotion({ ...bar, vel: vec(0, 0) })), 'idle')
  assert.equal(clipFor(owenMotion({ ...atCamp(), vel: vec(0, -JOG) })), 'run')
})

test('Owen eases to a stop, and against a wall his velocity is zero', () => {
  const bar = press(start(), 'close')
  const moving = run(bar, { dir: vec(0, -1), hold: false }, 30)
  const coast = tick(moving, still, DT)
  assert.ok(coast.pos.z < moving.pos.z && length(coast.vel) < WALK)
  assert.equal(length(run(moving, still, 10).vel), 0)
  const wall = run(bar, { dir: vec(0, 1), hold: false, run: true }, 120)
  assert.ok(wall.pos.z > 4.4)
  assert.equal(length(tick(wall, { dir: vec(0, 1), hold: false, run: true }, DT).vel), 0)
})

test('Owen turns in place before walking off the other way', () => {
  const bar = press(start(), 'close')
  const turned = tick(bar, { dir: vec(0, 1), hold: false }, DT)
  assert.deepEqual(turned.pos, bar.pos)
  assert.notEqual(turned.facing, bar.facing)
  const later = run(bar, { dir: vec(0, 1), hold: false }, 20)
  assert.ok(later.pos.z > bar.pos.z)
  assert.ok(Math.abs(Math.cos(later.facing) - 1) < 1e-6)
})

test('reversing at a jog slows down along the old way and never moves the new way before the turn', () => {
  const camp = { ...atCamp(), pos: vec(-2, -1.5) }
  const east: Input = { dir: vec(1, 0), hold: false, run: true }
  const jogging = run(camp, east, 40)
  assert.ok(Math.abs(length(jogging.vel) - JOG) < 1e-6)
  const west: Input = { dir: vec(-1, 0), hold: false, run: true }
  const heading = -Math.PI / 2
  const steps = Array.from({ length: 40 }).reduce<readonly Game[]>((acc) => [...acc, tick(acc[acc.length - 1], west, DT)], [jogging])
  const turning = steps.slice(1).filter((g) => angleBetween(g.facing, heading) > TURN_GO)
  assert.ok(turning.length > 3)
  steps.slice(1).forEach((g, i) => {
    if (angleBetween(g.facing, heading) > TURN_GO) assert.ok(g.pos.x >= steps[i].pos.x - 1e-9, `moved west mid-turn at step ${i}`)
  })
  assert.ok(steps[steps.length - 1].pos.x < steps[0].pos.x)
})

const goldenRoutes: readonly { ending: string; path: string }[] = JSON.parse(readFileSync(new URL('../../text-game/routes/golden.json', import.meta.url), 'utf8'))

const golden = (ending: string): readonly number[] => {
  const route = goldenRoutes.find((r) => r.ending === ending)
  if (!route) throw new Error(`no golden ${ending} route`)
  return route.path.split(',').map(Number)
}

test('Continue as Wade on the end card leaves the flood for the text build at the story path', () => {
  const end = playPrologue('texas', 'stove')
  const card = end.panel!
  assert.deepEqual(card.buttons, [{ id: 'continue', label: 'Continue as Wade' }])
  const g = press(end, 'continue')
  assert.equal(g.story.scene, 'a1_flood')
  assert.equal(g.panel, undefined)
  assert.ok(handedOff(g))
  assert.deepEqual(g.path, golden('best').slice(0, g.path.length))
  assert.equal(textBuildHash(g), `#path=${g.path.join(',')}`)
})

test('the float dock, a prologue scene with no space, stays a panel over the room and its fly button enters the camp', () => {
  const room = interact(walk(talk(start(), 'texas'), [[0, 4.2]]))
  const dock = press(interact(walk(room, [[1.6, -0.8]])), 'note:sleep')
  assert.equal(dock.story.scene, 'p_dock')
  assert.equal(dock.space, 'room')
  assert.equal(handedOff(dock), false)
  assert.deepEqual(dock.panel?.buttons.map((b) => b.id), ['note:fly'])
  const camp = press(dock, 'note:fly')
  assert.equal(camp.space, 'camp')
  assert.equal(handedOff(camp), false)
})
