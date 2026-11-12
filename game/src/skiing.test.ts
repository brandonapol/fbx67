import { test } from 'node:test'
import assert from 'node:assert/strict'
import { replay } from '../../text-game/src/engine.ts'
import { menu, send, sendMission } from '../../text-game/src/story.ts'
import type { State } from '../../text-game/src/types.ts'
import { starts } from '../smoke/starts.ts'
import type { RouteId, Skier } from './skiing.ts'
import {
  ARRIVE,
  ARRIVE_NOTE,
  ROUTE_NOTES,
  searchSpace,
  skiFrame,
  staggering,
  CLIMB,
  DOWN_MAX,
  GET_UP,
  KICK_MAX,
  ROUTES,
  SHUFFLE,
  SLOPE_TOP,
  WET,
  WINDOW_CLOSE,
  WINDOW_OPEN,
  arrived,
  exposureOf,
  fallen,
  glide,
  gradeAt,
  heightAt,
  kickOf,
  pushing,
  routeOf,
  setOff,
  startOf,
  terrainOf,
} from './skiing.ts'
import { NUMB_PACE } from './survival.ts'
import type { Vec } from './world.ts'
import { angleTo, distance, vec } from './world.ts'

const DT = 1 / 30

// A skier stood at a point on a route, facing along it toward the next point.
const at = (p: Vec, toward: Vec, sk: Skier = setOff('ridge')): Skier => ({ ...sk, pos: p, facing: angleTo(p, toward) })

const flatAt = vec(-25, -82.5)
const flatAhead = vec(-15, -105)
const downAt = vec(-40, 0)
const downAhead = vec(-40, -30)
const upAt = vec(27, -40)
const upAhead = vec(20, -90)

const forward = (sk: Skier): Vec => vec(Math.sin(sk.facing), Math.cos(sk.facing))

// Runs frames with the push forward held (true) or let go (false), one entry per frame.
const play = (sk: Skier, pushes: readonly boolean[], dir?: Vec): Skier =>
  pushes.reduce((s, p) => glide(s, p ? (dir ?? forward(s)) : vec(0, 0), DT), sk)

const frames = (seconds: number, on: boolean): readonly boolean[] => Array.from({ length: Math.round(seconds / DT) }, () => on)

// A kick every `period` seconds: a short push, then let go for the rest.
const rhythm = (period: number, kicks: number): readonly boolean[] =>
  Array.from({ length: kicks }, () => [...frames(0.1, true), ...frames(period - 0.1, false)]).flat()

test('the ground: the ridge runs down, its flats are flat, the creek climbs, and both routes end at the slope top', () => {
  assert.equal(terrainOf(gradeAt(downAt, angleTo(downAt, downAhead))), 'down')
  assert.equal(terrainOf(gradeAt(flatAt, angleTo(flatAt, flatAhead))), 'flat')
  assert.equal(terrainOf(gradeAt(upAt, angleTo(upAt, upAhead))), 'up')
  Object.values(ROUTES).forEach((r) => assert.deepEqual(r.at(-1)!.slice(0, 2), [SLOPE_TOP.x, SLOPE_TOP.z]))
  assert.ok(heightAt(vec(ROUTES.ridge[0]![0], ROUTES.ridge[0]![1])) > heightAt(SLOPE_TOP), 'the ridge starts above the top of the slope')
  assert.ok(heightAt(vec(ROUTES.creek[0]![0], ROUTES.creek[0]![1])) < heightAt(SLOPE_TOP), 'the creek starts below it')
})

test('the ground has no step: neighbouring points a meter apart differ by less than a meter anywhere along the routes', () => {
  Object.values(ROUTES).forEach((r) =>
    r.slice(1).forEach((b, i) => {
      const a = r[i]!
      for (let t = 0; t < 1; t += 0.02) {
        const p = vec(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
        assert.ok(Math.abs(heightAt(p) - heightAt(vec(p.x + 1, p.z))) < 1, `${p.x},${p.z}`)
      }
    }),
  )
})

test('each route starts at its first point facing its second', () => {
  const s = startOf('creek')
  assert.deepEqual(s.at, vec(30, -20))
  assert.ok(Math.abs(s.facing - angleTo(vec(30, -20), vec(20, -90))) < 1e-9)
})

test('the kick window: too soon is a fall, inside it is a good kick, after it a late one', () => {
  assert.equal(kickOf(0), 'early')
  assert.equal(kickOf(WINDOW_OPEN - 0.01), 'early')
  assert.equal(kickOf(WINDOW_OPEN), 'good')
  assert.equal(kickOf(WINDOW_CLOSE), 'good')
  assert.equal(kickOf(WINDOW_CLOSE + 0.01), 'late')
  assert.equal(kickOf(Infinity), 'late', 'the first kick from a standstill is never a fall')
})

test('a push is a press past the threshold, held until it drops below the release: a resting thumb does not kick', () => {
  assert.equal(pushing(false, 0.5), false)
  assert.equal(pushing(false, 0.7), true)
  assert.equal(pushing(true, 0.4), true, 'held through a wobble of the stick')
  assert.equal(pushing(true, 0.2), false)
})

test('on the flats, kicking in rhythm carries him faster than a shuffle, and never down', () => {
  const kicked = play(at(flatAt, flatAhead), rhythm((WINDOW_OPEN + WINDOW_CLOSE) / 2, 8))
  assert.equal(kicked.ski.falls, 0)
  assert.ok(kicked.ski.speed > SHUFFLE, `${kicked.ski.speed}`)
  assert.ok(kicked.ski.speed <= KICK_MAX)
})

test('on the flats, one kick too soon only staggers him, and a good kick steadies him', () => {
  const staggered = play(at(flatAt, flatAhead), rhythm(WINDOW_OPEN / 2, 2))
  assert.equal(staggered.ski.falls, 0)
  assert.ok(staggering(staggered.ski))
  const steady = play(staggered, [...frames((WINDOW_OPEN + WINDOW_CLOSE) / 2 - WINDOW_OPEN / 2, false), ...frames(0.1, true)])
  assert.equal(steady.ski.falls, 0)
  assert.equal(staggering(steady.ski), false)
})

test('on the flats, a second kick too soon while he staggers puts him on his face', () => {
  const s = play(at(flatAt, flatAhead), rhythm(WINDOW_OPEN / 2, 3))
  assert.equal(s.ski.falls, 1)
  assert.ok(fallen(s.ski))
  assert.equal(s.ski.speed, 0)
})

test('mashing forward on the flats falls him every few yards', () => {
  const s = play(at(flatAt, flatAhead), rhythm(0.25, 40))
  assert.ok(s.ski.falls >= 3, `${s.ski.falls} falls`)
})

test('down, he ignores the stick until he is up again, where he fell, facing the same way', () => {
  const down = play(at(flatAt, flatAhead), rhythm(WINDOW_OPEN / 2, 3))
  const struggling = play(down, frames(GET_UP / 2, true), vec(1, 0))
  assert.deepEqual(struggling.pos, down.pos)
  assert.equal(struggling.facing, down.facing)
  const up = play(struggling, frames(GET_UP, false))
  assert.equal(fallen(up.ski), false)
})

test('a slow rhythm is always safe: late kicks never fall him', () => {
  const s = play(at(flatAt, flatAhead), rhythm(WINDOW_CLOSE + 0.3, 10))
  assert.equal(s.ski.falls, 0)
  assert.ok(distance(s.pos, flatAt) > 5)
})

test('holding forward on the flats is a steady shuffle that never falls', () => {
  const s = play(at(flatAt, flatAhead), frames(6, true))
  assert.equal(s.ski.falls, 0)
  assert.ok(Math.abs(s.ski.speed - SHUFFLE) < 0.05, `${s.ski.speed}`)
})

test('downhill, gravity carries him with no input, up to his top speed, and nothing he presses falls him', () => {
  const coasting = play(at(downAt, downAhead), frames(3, false))
  assert.ok(coasting.ski.speed > 4, `${coasting.ski.speed}`)
  const mashing = play(at(downAt, downAhead), rhythm(0.2, 15))
  assert.equal(mashing.ski.falls, 0)
  assert.ok(mashing.ski.speed <= DOWN_MAX)
})

test('downhill, pulling back is a snowplow: he slows without turning round', () => {
  const fast = play(at(downAt, downAhead), frames(3, false))
  const back = vec(-Math.sin(fast.facing), -Math.cos(fast.facing))
  const plowed = play(fast, frames(1, true), back)
  assert.ok(plowed.ski.speed < fast.ski.speed - 1)
  assert.equal(plowed.facing, fast.facing)
})

test('downhill he steers well: a quarter turn takes under a second', () => {
  const fast = play(at(downAt, downAhead), frames(2, false))
  const right = vec(Math.cos(fast.facing), -Math.sin(fast.facing))
  const turned = play(fast, frames(0.7, true), right)
  assert.ok(Math.abs(Math.atan2(Math.sin(turned.facing - angleTo(vec(0, 0), right)), Math.cos(turned.facing - angleTo(vec(0, 0), right)))) < 0.05)
})

test('climbing is slow, holds where he stops, and soaks him in sweat', () => {
  const climbing = play(at(upAt, upAhead, setOff('creek')), frames(25, true))
  assert.ok(climbing.ski.speed <= CLIMB + 1e-9)
  assert.ok(climbing.ski.sweat >= WET)
  assert.equal(exposureOf(climbing.ski).wet, true, 'the sweat is wet to the survival rules')
  const stopped = play(climbing, frames(2, false))
  assert.equal(stopped.ski.speed, 0, 'the edges hold')
  const after = play(stopped, frames(3, false))
  assert.deepEqual(after.pos, stopped.pos, 'no slide back')
  assert.equal(climbing.ski.falls, 0)
})

test('the sweat freezes in his layers: it chills him faster than a dry climb would', () => {
  const sweaty = play(at(upAt, upAhead, setOff('creek')), frames(25, true))
  const dry = { ...sweaty, ski: { ...sweaty.ski, sweat: 0 } }
  const a = play(sweaty, frames(10, false))
  const b = play(dry, frames(10, false))
  assert.ok(a.ski.body.warmth < b.ski.body.warmth)
})

test('numb feet slow the shuffle and the climb (survival.ts, pace)', () => {
  const numb = setOff('ridge', { ...setOff('ridge').ski.body, feet: 'numb' })
  const s = play(at(flatAt, flatAhead, numb), frames(6, true))
  assert.ok(Math.abs(s.ski.speed - SHUFFLE * NUMB_PACE) < 0.05, `${s.ski.speed}`)
})

test('the search ends within reach of the slope top', () => {
  assert.ok(arrived(SLOPE_TOP))
  assert.ok(arrived(vec(SLOPE_TOP.x + ARRIVE - 0.1, SLOPE_TOP.z)))
  assert.equal(arrived(vec(SLOPE_TOP.x + ARRIVE + 0.1, SLOPE_TOP.z)), false)
})

test("the route is read off the path: the prompt's note, until the top of the slope", () => {
  const at = toSearch()
  assert.equal(routeOf(at.path), undefined, 'at the prompt, no route yet')
  const ridge = choose(at, ROUTE_NOTES.ridge)
  assert.equal(ridge.story.scene, 'a3_ski_down')
  assert.equal(routeOf(ridge.path), 'ridge')
  assert.equal(routeOf(choose(at, ROUTE_NOTES.creek).path), 'creek')
  assert.equal(routeOf(choose(ridge, ARRIVE_NOTE).path), undefined, 'at the wreck, off skis')
})

// --- The mission, headless: the prompt, the run, the note, against the text build ---------------------------------

type Run = Readonly<{ story: State; path: readonly number[] }>

const choose = (r: Run, note: string): Run => {
  const o = menu(r.story).options.find((x) => x.note === note)
  if (!o) throw new Error(`${r.story.scene} has no ${note}`)
  return { story: send(r.story, note), path: [...r.path, o.n] }
}

// The text build's first choice at every scene from the a3_camp start until the search sets out.
const toSearch = (): Run => {
  const camp = starts.find((s) => s.scene === 'a3_camp')!.path.split(',').map(Number)
  const go = (r: Run): Run => (r.story.scene === 'a3_search' ? r : go(choose(r, menu(r.story).options[0]!.note)))
  return go({ story: replay(camp).at(-1)!, path: camp })
}

// A deliberate player: steers at the route's next point; holds forward up the creek; on the ridge and the flats taps
// forward once every `period` seconds.
const skiOut = (route: RouteId, period: number): Readonly<{ skier: Skier; seconds: number }> => {
  const points = ROUTES[route].map(([x, z]) => vec(x, z))
  let sk = setOff(route)
  let next = 1
  for (let n = 0; n < 30 * 60 * 6; n++) {
    while (next < points.length - 1 && distance(sk.pos, points[next]!) < 6) next++
    const to = points[next]!
    const want = vec(to.x - sk.pos.x, to.z - sk.pos.z)
    const up = terrainOf(gradeAt(sk.pos, sk.facing)) === 'up'
    const t = n * DT
    const tap = t % period < 0.1
    const f = skiFrame(sk, up || tap ? want : vec(0, 0), DT, searchSpace.props.filter((p) => p.solid).map((p) => p.box))
    sk = f.skier
    if (f.outcome === 'arrived') return { skier: sk, seconds: t }
    if (f.outcome === 'froze') throw new Error(`froze on the ${route}`)
  }
  throw new Error(`never reached the slope top on the ${route}: at ${sk.pos.x.toFixed(1)},${sk.pos.z.toFixed(1)}`)
}

for (const route of ['ridge', 'creek'] as const) {
  test(`the ${route}: skied to the slope top, the story lands where the text build and sendMission do`, () => {
    const at = toSearch()
    const chosen = choose(at, ROUTE_NOTES[route])
    assert.equal(routeOf(chosen.path), route)
    const run = skiOut(route, (WINDOW_OPEN + WINDOW_CLOSE) / 2)
    assert.ok(arrived(run.skier.pos))
    const done = choose(chosen, ARRIVE_NOTE)
    assert.equal(done.story.scene, 'a3_arm')
    assert.deepEqual(done.story, sendMission(at.story, route))
    assert.deepEqual(done.story, replay(done.path).at(-1), 'node src/cli.ts --choices <path> reaches the same state')
  })
}

test('the ridge is the fast way down and then a fight across the flats; mashing still gets there', () => {
  const steady = skiOut('ridge', (WINDOW_OPEN + WINDOW_CLOSE) / 2)
  const mashed = skiOut('ridge', 0.3)
  assert.equal(steady.skier.ski.falls, 0)
  assert.ok(mashed.skier.ski.falls > 0, 'mashing the kick falls him')
  assert.ok(mashed.seconds > steady.seconds)
})

test('the creek leaves him wet through at the top', () => {
  assert.ok(skiOut('creek', 0.65).skier.ski.sweat >= WET)
})

test('frozen too long on the slope, he is back where the team split on the same route, the body fresh', () => {
  const sk = at(flatAt, flatAhead, setOff('ridge', { ...setOff('ridge').ski.body, warmth: 0.5, freezing: 59.99 }))
  const f = skiFrame(sk, vec(0, 0), DT)
  assert.equal(f.outcome, 'froze')
  assert.deepEqual(f.skier, setOff('ridge'))
})
