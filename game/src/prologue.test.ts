import { test } from 'node:test'
import assert from 'node:assert/strict'
import { replay } from '../../text-game/src/engine.ts'
import { readFileSync } from 'node:fs'
import { initialState } from '../../text-game/src/state.ts'
import { menu } from '../../text-game/src/story.ts'
import type { Game, Input } from './prologue.ts'
import { HIDE_TIME, INDOOR_PACE, JOG, ROUND_TIME, TURN_GO, WALK, available, beingCaught, curlyNow, footY, hiding, inWorld, playerBody, playerMotion, ended, focus, handedOff, inReach, interact, label, press, seen, start, still, textBuildHash, tick, watcher } from './prologue.ts'
import { DT, back, flyNorth, hold, holdWhenSafe, holdWhenWatched, leaveBar, phase, playPrologue, routes, talk, toBed, toRoom, wait, walk, walkLeg, writeLetter } from './drive.ts'
import { ALARM_GLANCE, CAUGHT_LINE, CAUGHT_TIME, FILL, beatStart } from './curly.ts'
import { groundY, surfaceAt } from './campGround.ts'
import { stealthOf } from './stealthView.ts'
import { angleBetween, length, vec } from './world.ts'
import { bodies, clipFor } from './cast.ts'
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
  const room = toRoom(bar)
  return flyNorth(walkLeg(toBed(writeLetter(room))))
}

const run = (g: Game, input: Input, n: number): Game => Array.from({ length: n }).reduce<Game>((cur) => tick(cur, input, DT), g)

const holding: Input = { dir: vec(0, 0), hold: true }

test('the door only opens after a conversation, and Hank only sells the round before one', () => {
  const g = press(start(), 'close')
  assert.deepEqual(available(g).map((i) => i.id).sort(), ['curly', 'hank', 'wade'])
  const after = talk(start(), 'texas')
  assert.deepEqual(available(after).map((i) => i.id).sort(), ['curly', 'door', 'wade'])
})

test('the letter is read in the room, the walk to the dock follows, and no hiding note is sent before the camp', () => {
  const room = toRoom(talk(start(), 'munitions'))
  const desk = interact(walk(room, [[0.6, -1.0]]))
  assert.equal(desk.panel?.title, 'Owen: A Letter to Lucy')
  assert.equal(desk.story.owenCache, undefined)
  const folded = writeLetter(room)
  assert.equal(label(folded, focus(walk(folded, [[-0.6, 0.6]]))!), menu(desk.story).options[0].label)
  const morning = toBed(folded)
  assert.equal(morning.space, 'downtown')
  assert.equal(morning.panel, undefined)
  const dock = walkLeg(morning)
  assert.equal(dock.space, 'downtown')
  assert.equal(dock.story.scene, 'p_dock')
  assert.equal(dock.panel?.title, 'Owen: The Float Dock')
  assert.deepEqual(dock.panel?.buttons.map((b) => b.id), ['note:fly'])
  const camp = flyNorth(dock)
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
  assert.equal(interact(home).space, 'room', 'home in August is his room, rain on the window')
})

test('busted plays Curly\'s line first, then the retry; neither is the story\'s', () => {
  const camp = walk(atCamp(), routes.marker)
  const watched = wait(camp, (cur) => seen(cur) && !cur.watch?.alarm)
  const started = interact(watched)
  const held = run(started, holding, Math.ceil(FILL / DT) + 2)
  assert.equal(held.holding, undefined, 'Curly has seen him at it')
  assert.ok(beingCaught(held))
  assert.equal(held.panel, undefined, 'the line plays before any panel')
  assert.equal(stealthOf(held).line, `Curly: "${CAUGHT_LINE}"`)
  assert.equal(angleBetween(watcher(held).facing, Math.atan2(held.pos.x - curlyNow(held).at.x, held.pos.z - curlyNow(held).at.z)) < 0.01, true, 'he faces Owen')
  const frozen = run(held, { dir: vec(1, 0), hold: false }, 10)
  assert.deepEqual(frozen.pos, held.pos, 'Owen stands caught')
  const after = run(held, still, Math.ceil(CAUGHT_TIME / DT) + 1)
  assert.equal(after.panel?.kind, 'busted')
  assert.equal(after.panel?.text, `"${CAUGHT_LINE}"`)
  assert.deepEqual(after.panel?.buttons.map((b) => b.id), ['retry'])
  assert.equal(after.busts, 1)
  assert.deepEqual(after.story, replay([1, 1, 1, 1]).at(-1))
  const retried = press(after, 'retry')
  assert.equal(retried.watch, undefined, 'Curly starts his day over')
  assert.ok(!beingCaught(retried))
})

test('running on the gravel turns Curly round to the noise, and a hold then in his view is caught', () => {
  const camp = { ...atCamp(), pos: vec(-2, -1.5) }
  const quiet = run(camp, { dir: vec(1, 0), hold: false }, 20)
  assert.equal(quiet.watch?.alarm, undefined, 'walking on the gravel at this distance makes no noise he hears')
  const loud = run(camp, { dir: vec(1, 0), hold: false, run: true }, 20)
  assert.ok(loud.watch?.alarm, 'running on the gravel does')
  assert.equal(surfaceAt(loud.watch!.alarm!.at), 'gravel')
  const looking = run(loud, still, Math.ceil(ALARM_GLANCE / DT) + 4)
  assert.ok(curlyNow(looking).eyes, 'after his head turns he looks toward the noise')
})

test('walking through the willows is quiet even close to Curly; running through them is not', () => {
  const inWillow = { ...atCamp(), pos: vec(-3.6, 1.8) }
  const walked = run(inWillow, { dir: vec(1, 0), hold: false }, 40)
  assert.equal(surfaceAt(walked.pos), 'willow')
  assert.equal(walked.watch?.alarm, undefined)
  const ran = run(inWillow, { dir: vec(1, 0), hold: false, run: true }, 12)
  assert.ok(ran.watch?.alarm)
})

test('each spot has its own hiding: the floorboard in the tent, the cache ladder, the trenching tool, about 2.5 s held', () => {
  assert.equal(HIDE_TIME, 2.5)
  const at = (spot: keyof typeof routes, k: number) => {
    const g = interact(wait(walk(atCamp(), routes[spot]), (cur) => phase(cur) < DT))
    return hiding(run(g, holding, Math.round((k * HIDE_TIME) / DT)))
  }
  assert.ok(at('stove', 0.5)!.tool > 0.5, 'the board is up mid-hold')
  assert.ok(at('cache', 0.5)!.lift > 1, 'Owen is up the ladder')
  assert.equal(at('cache', 0.05)!.lift < at('cache', 0.3)!.lift, true, 'climbing')
  assert.equal(at('marker', 0.3)!.clip, 'sneak', 'down on one knee to dig')
  assert.equal(hiding(atCamp()), undefined)
})

test('the eye at the top of the screen: shut at work, turning before he looks, open while he looks', () => {
  const camp = atCamp()
  assert.deepEqual(stealthOf(camp), { shown: true, eye: 'shut', aware: 0, line: undefined })
  const turning = run(camp, still, Math.ceil((beatStart('glance') + 0.4) / DT))
  assert.equal(stealthOf(turning).eye, 'turning')
  const looking = run(turning, still, Math.ceil(0.9 / DT))
  assert.equal(stealthOf(looking).eye, 'open')
  assert.equal(stealthOf(press(start(), 'close')).shown, false, 'only at the camp')
})

test('Owen walks on the ground: up on the marker\'s rise his feet are off the gravel', () => {
  const camp = walk(atCamp(), routes.marker)
  assert.ok(footY(camp) > 0.3)
  assert.equal(footY(camp), groundY(camp.pos.x, camp.pos.z))
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

test('outdoors, run held settles into the jog clip, never the sprint', () => {
  const camp = { ...atCamp(), pos: vec(-2, -1.5) }
  const north: Input = { dir: vec(0, -1), hold: false, run: true }
  const steps = Array.from({ length: 90 }).reduce<readonly Game[]>((acc) => [...acc, tick(acc[acc.length - 1], north, DT)], [camp])
  steps.forEach((g, i) => assert.notEqual(clipFor(playerMotion(g)), 'run', `sprint clip at step ${i}`))
  assert.equal(clipFor(playerMotion(steps[steps.length - 1])), 'jog')
})

test('indoors, run held never plays the run clip and Owen stays at or under the indoor pace', () => {
  const bar = press(start(), 'close')
  const north: Input = { dir: vec(0, -1), hold: false, run: true }
  const steps = Array.from({ length: 90 }).reduce<readonly Game[]>((acc) => [...acc, tick(acc[acc.length - 1], north, DT)], [bar])
  steps.forEach((g, i) => {
    assert.ok(length(g.vel) <= INDOOR_PACE + 1e-9, `over the indoor pace at step ${i}`)
    assert.notEqual(clipFor(playerMotion(g)), 'run', `run clip at step ${i}`)
  })
  assert.ok(Math.abs(length(steps[steps.length - 1].vel) - INDOOR_PACE) < 1e-6)
  const walking: Input = { ...north, run: false }
  const camp = { ...atCamp(), pos: vec(-2, -1.5) }
  assert.ok(length(run(bar, walking, 4).vel) < length(run(camp, walking, 4).vel), 'indoors Owen starts gentler than outdoors')
})

test('the clip follows the simulated velocity, not the frame displacement', () => {
  const bar = press(start(), 'close')
  assert.equal(clipFor(playerMotion({ ...bar, vel: vec(0, -WALK) })), 'walk')
  assert.equal(clipFor(playerMotion({ ...bar, vel: vec(0, 0) })), 'idle')
  assert.equal(clipFor(playerMotion({ ...atCamp(), vel: vec(0, -JOG) })), 'jog')
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

test('Continue as Wade on the end card puts Wade on the sandbag line, with no menu in between', () => {
  const end = playPrologue('texas', 'stove')
  const card = end.panel!
  assert.deepEqual(card.buttons, [{ id: 'continue', label: 'Continue as Wade' }])
  const g = press(end, 'continue')
  assert.equal(g.story.scene, 'a1_flood')
  assert.equal(g.space, 'line')
  assert.equal(g.panel, undefined)
  assert.equal(handedOff(g), false)
  assert.equal(playerBody(g), bodies.wade)
  assert.ok(inWorld(g))
  assert.equal(inWorld(end), false, 'nobody stands in the prologue flood under the end card')
  assert.deepEqual(g.path, golden('best').slice(0, g.path.length))
  assert.equal(textBuildHash(g), `#path=${g.path.join(',')}`)
})

test('the float dock, a prologue scene with no space, is the end of the morning walk: its menu opens on the float', () => {
  const morning = toBed(writeLetter(toRoom(talk(start(), 'texas'))))
  assert.equal(morning.story.scene, 'p_dock')
  assert.equal(morning.space, 'downtown')
  assert.equal(morning.panel, undefined)
  const dock = walkLeg(morning)
  assert.equal(dock.space, 'downtown')
  assert.equal(handedOff(dock), false)
  assert.deepEqual(dock.panel?.buttons.map((b) => b.id), ['note:fly'])
  const camp = flyNorth(dock)
  assert.equal(camp.space, 'camp')
  assert.equal(handedOff(camp), false)
})
