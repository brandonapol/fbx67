import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import type { Clock } from '../../text-game/src/types.ts'
import type { Body, Exposure, Run } from './survival.ts'
import {
  BARE_LIMIT,
  BOUGHS,
  CLOCK_RATE,
  DEADFALL,
  FIRE_CLIMB,
  FIRE_REACH,
  FREEZE_LIMIT,
  FUMBLE,
  LIGHTING,
  LIGHT_COST,
  MAX_FUEL,
  MEAL,
  NUMB_PACE,
  SHARE,
  begin,
  burn,
  burning,
  clockAfter,
  clockOf,
  eat,
  expose,
  failure,
  feed,
  fresh,
  handTime,
  kindle,
  light,
  lightLeft,
  lightOf,
  pace,
  rate,
  reach,
  retry,
  sheltered,
  shares,
  stepOf,
  tick,
} from './survival.ts'
import { start } from './prologue.ts'

// The survival rules of docs/acts/act3-missions.md, one test per rule. The light tests use the spec's own numbers
// (fact-check 54); the rest pin this module's assumed tuning so a change to it is a deliberate one.

const DIG: Clock = '1967-12-12T12:10'
const SEARCH: Clock = '1967-12-13T08:30'

const run = (b: Body, e: Exposure, seconds: number, dt = 1): Body =>
  Array.from({ length: Math.round(seconds / dt) }).reduce<Body>((acc) => expose(acc, e, dt), b)

const minutes = (c: Clock): number => {
  const [h, m] = c.split('T')[1]!.split(':').map(Number) as [number, number]
  return h * 60 + m
}

// The first minute at which `f` holds, scanning a day from midnight.
const firstMinute = (date: string, f: (c: Clock) => boolean): number => {
  for (let m = 0; m < 24 * 60; m++) {
    const c = `${date}T${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}` as Clock
    if (f(c)) return m
  }
  return -1
}

// --- Light -----------------------------------------------------------------------------------------------------------

test('the survival clock runs at twenty times real time', () => {
  assert.equal(CLOCK_RATE, 20)
  assert.equal(clockAfter(DIG, 9 * 60), '1967-12-12T15:10', 'nine minutes of play are three hours of game time')
  assert.equal(clockAfter('1967-12-12T23:50', 60), '1967-12-13T00:10', 'the clock runs across midnight')
})

test('on 12 December the sun is up about 09:40 to 13:50 and the grey light lasts until about 15:10', () => {
  const near = (m: number, h: number, mm: number) => assert.ok(Math.abs(m - (h * 60 + mm)) <= 10, `${m} vs ${h}:${mm}`)
  near(firstMinute('1967-12-12', (c) => lightOf(c) === 'sun'), 9, 40)
  near(firstMinute('1967-12-12', (c) => minutes(c) > 12 * 60 && lightOf(c) !== 'sun'), 13, 50)
  near(firstMinute('1967-12-12', (c) => minutes(c) > 12 * 60 && lightOf(c) === 'dark'), 15, 10)
  assert.equal(lightOf('1967-12-12T12:00'), 'sun')
  assert.equal(lightOf('1967-12-12T14:30'), 'grey')
  assert.equal(lightOf('1967-12-12T18:00'), 'dark')
})

test("the dig's three hours of grey light are about nine minutes of play", () => {
  const left = lightLeft(DIG)
  assert.ok(Math.abs(left - 9 * 60) <= 30, `${left} s of light from Jake's landing`)
  assert.equal(lightLeft('1967-12-12T18:00'), 0, 'none once it is dark')
})

test("Wade's search runs on the same light, a day later", () => {
  assert.equal(lightOf(SEARCH), 'grey', 'first light')
  assert.ok(lightLeft(SEARCH) > lightLeft(DIG), 'the search has the whole short day ahead')
})

// --- Warmth ----------------------------------------------------------------------------------------------------------

test('warmth has four named steps', () => {
  assert.deepEqual([4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5, 0].map(stepOf), [
    'warm', 'warm', 'chilled', 'chilled', 'cold', 'cold', 'freezing', 'freezing', 'freezing',
  ])
  assert.equal(stepOf(fresh.warmth), 'warm')
})

test('warmth falls in the open, in the wind, standing still and with mitts off, one share each', () => {
  for (const k of ['open', 'wind', 'still', 'mittsOff'] as const) {
    assert.equal(rate(fresh, { ...sheltered, [k]: true }), -SHARE, k)
  }
  assert.equal(rate(fresh, { ...sheltered, open: true, wind: true, still: true, mittsOff: true }), -4 * SHARE)
  assert.equal(rate(fresh, sheltered), 0, 'sheltered and moving, mitts on: it holds')
})

test('warmth falls fastest when wet', () => {
  const wet = rate(fresh, { ...sheltered, wet: true })
  for (const k of ['open', 'wind', 'still', 'mittsOff'] as const) assert.ok(wet < rate(fresh, { ...sheltered, [k]: true }), k)
})

test('a cold body that has not eaten falls a step faster', () => {
  const open = { ...sheltered, open: true }
  const cold: Body = { ...fresh, warmth: 1.5 }
  assert.equal(shares(cold, open), 2)
  assert.equal(shares({ ...fresh, warmth: 2.5 }, open), 1, 'only once cold')
  assert.equal(shares(cold, sheltered), 0, 'and only while falling')
})

test('a meal stops the fall for a while, and lifts the body, never to warm', () => {
  const e = { ...sheltered, open: true, wind: true }
  const fed = eat({ ...fresh, warmth: 2 })
  assert.equal(fed.fed, MEAL)
  assert.equal(fed.warmth, 2.5)
  assert.equal(eat({ ...fresh, warmth: 2.9 }).warmth, 3, 'the lift stops at chilled')
  assert.equal(eat(fresh).warmth, 4, 'and never takes warmth away')
  assert.equal(run(fed, e, MEAL - 1).warmth, 2.5, 'held while fed')
  assert.ok(run(fed, e, MEAL + 30).warmth < 2.5, 'falling again after')
})

test('inside a fire’s reach warmth climbs back to warm; outside it, it falls', () => {
  const cold: Body = { ...fresh, warmth: 1.5 }
  assert.equal(rate(cold, { ...sheltered, open: true, fire: FIRE_REACH }), FIRE_CLIMB)
  assert.ok(rate(cold, { ...sheltered, open: true, fire: FIRE_REACH + 0.1 }) < 0)
  assert.equal(stepOf(run(cold, { ...sheltered, still: true, fire: 1 }, 3 / FIRE_CLIMB).warmth), 'warm')
})

test('warmth stays between freezing and warm', () => {
  assert.equal(run(fresh, { ...sheltered, fire: 0 }, 60).warmth, 4)
  assert.equal(run(fresh, { ...sheltered, wet: true, wind: true }, 3600).warmth, 0)
})

// --- Frostbite -------------------------------------------------------------------------------------------------------

test('bare-handed work turns the hands white, and white hands fumble', () => {
  const bare = { ...sheltered, mittsOff: true }
  assert.equal(run(fresh, bare, BARE_LIMIT - 1).hands, 'fine')
  const white = run(fresh, bare, BARE_LIMIT)
  assert.equal(white.hands, 'white')
  assert.equal(handTime(white, 10), 10 * FUMBLE)
  assert.equal(handTime(fresh, 10), 10)
  assert.equal(run(white, sheltered, 600).hands, 'white', 'mitts back on do not clear it; the checkpoint does')
})

test('freezing turns bare hands white at once and numbs the feet, slowing the walk', () => {
  const frozen: Body = { ...fresh, warmth: 1.01 }
  const b = expose(frozen, { ...sheltered, open: true, mittsOff: true }, 1)
  assert.equal(stepOf(b.warmth), 'freezing')
  assert.equal(b.hands, 'white')
  assert.equal(b.feet, 'numb')
  assert.equal(pace(b), NUMB_PACE)
  assert.equal(pace(fresh), 1)
  assert.equal(expose(frozen, { ...sheltered, open: true }, 1).hands, 'fine', 'mittened hands are not exposed')
})

// --- Fire ------------------------------------------------------------------------------------------------------------

test('a fire burns down unless fed, and holds only so much', () => {
  const f = feed({ fuel: 0 }, BOUGHS)
  assert.ok(burning(f))
  assert.equal(burn(f, BOUGHS).fuel, 0)
  assert.ok(!burning(burn(f, BOUGHS + 5)))
  assert.equal(feed(f, DEADFALL).fuel, BOUGHS + DEADFALL)
  assert.equal(feed({ fuel: MAX_FUEL - 10 }, DEADFALL).fuel, MAX_FUEL)
})

test('lighting a fire takes bare hands and costs warmth, slower with white hands', () => {
  const lit = light(fresh, DEADFALL)
  assert.equal(lit.seconds, LIGHTING)
  assert.equal(lit.fire.fuel, DEADFALL)
  assert.equal(lit.body.warmth, 4 - LIGHTING * SHARE - LIGHT_COST)
  assert.equal(lit.body.bare, LIGHTING)
  assert.equal(light({ ...fresh, hands: 'white' }, BOUGHS).seconds, LIGHTING * FUMBLE, 'Jake first: the fire is slow')
})

// Regression: the bare-hand count only cleared at a checkpoint, so warming at a fire did nothing for Lucy's fingers and
// fire first left her hands as white as Jake first did (docs/acts/act3-missions.md, section 2: she "warms her hands").
test('warming at a burning fire brings bare hands back, but white hands stay white until the checkpoint', () => {
  const chilled: Body = { ...fresh, bare: BARE_LIMIT - 5 }
  assert.equal(expose(chilled, { ...sheltered, fire: 1 }, 1).bare, 0, 'by the fire the count starts again')
  assert.equal(expose(chilled, { ...sheltered, mittsOff: true, fire: 1 }, 10).hands, 'fine', 'bare hands by a fire do not go white')
  assert.equal(expose({ ...chilled, hands: 'white' }, { ...sheltered, fire: 1 }, 1).hands, 'white')
  assert.equal(expose(chilled, { ...sheltered, fire: FIRE_REACH + 1 }, 1).bare, BARE_LIMIT - 5, 'out of reach it does not')
})

test('a lit fire is the first load and a quarter step of warmth', () => {
  const k = kindle(fresh, BOUGHS)
  assert.equal(k.fire.fuel, BOUGHS)
  assert.equal(k.body.warmth, 4 - LIGHT_COST)
})

test('a fire that has burned out warms no one', () => {
  const r: Run<null> = { ...begin(null, DIG, { ...fresh, warmth: 2 }), fire: { fuel: 1 } }
  const e = { ...sheltered, still: true, fire: 1 }
  const warmed = tick(r, e, 1)
  assert.equal(warmed.body.warmth, 2 + FIRE_CLIMB)
  assert.ok(tick(warmed, e, 1).body.warmth < warmed.body.warmth, 'out: the fall starts again')
})

// --- Fail and retry --------------------------------------------------------------------------------------------------

test('freezing too long fades back to the last checkpoint, frostbite cleared', () => {
  const r = reach(begin('pack', SEARCH, { ...fresh, warmth: 2 }))
  const out = { ...sheltered, open: true, wind: true, wet: true }
  let t: Run<string> = r
  let froze = false
  for (let i = 0; i < 3600 && !froze; i++) {
    const next = tick(t, out, 1)
    froze = next.played < t.played
    t = next
  }
  assert.ok(froze, 'the run whited out')
  assert.deepEqual(t.body, r.checkpoint.body)
  assert.equal(t.played, r.checkpoint.played)
  assert.equal(failure({ ...t, body: { ...t.body, freezing: FREEZE_LIMIT } }), 'froze')
})

test('the light running out fails the dig, but not the night', () => {
  const r = begin('pack', DIG)
  assert.equal(failure({ ...r, played: lightLeft(DIG) + 3 }), 'dark')
  assert.equal(failure({ ...r, played: lightLeft(DIG) + 3 }, false), undefined)
  assert.equal(tick({ ...r, played: lightLeft(DIG) }, sheltered, 3).played, 0, 'the dig fades back')
  assert.equal(tick({ ...r, played: lightLeft(DIG) }, sheltered, 3, false).played, lightLeft(DIG) + 3, 'the night goes on')
})

test('a checkpoint clears frostbite and keeps what was carried, the fire and the clock', () => {
  const r: Run<string> = { ...begin('mitts', DIG), fire: { fuel: 90 }, played: 120, body: { ...fresh, warmth: 1, bare: 60, hands: 'white', feet: 'numb' } }
  const saved = reach(r, 'bundle')
  assert.equal(saved.body.hands, 'fine')
  assert.equal(saved.body.feet, 'fine')
  assert.equal(saved.body.warmth, 1, 'warmth is not a frostbite; it stays')
  assert.deepEqual(saved.checkpoint, { carried: 'bundle', body: saved.body, fire: { fuel: 90 }, played: 120 })
  assert.equal(clockOf(saved), '1967-12-12T12:50')
  assert.deepEqual(retry({ ...saved, carried: 'nothing', played: 400 }), saved)
})

test('failure never sends a note: the story and path come back as the checkpoint carried them', () => {
  const game = start()
  let r: Run<typeof game> = begin(game, DIG, { ...fresh, warmth: 1.01 })
  for (let i = 0; i < FREEZE_LIMIT + 5; i++) r = tick(r, { ...sheltered, open: true }, 1)
  assert.equal(r.played < FREEZE_LIMIT, true, 'it failed and retried')
  assert.equal(r.carried, game)
  assert.deepEqual(r.carried.story, game.story)
  assert.deepEqual(r.carried.path, [])
  const source = readFileSync(new URL('./survival.ts', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /sendNote|from '.*(engine|story|prologue)\.ts'/, 'the rules cannot reach the story')
})

test('the same rules run Lucy’s night and Wade’s search with no copy', () => {
  const lucy = tick(begin('lucy', '1967-12-12T16:00'), { ...sheltered, open: true, still: true }, 30, false)
  const wade = tick(begin('wade', SEARCH), { ...sheltered, open: true, still: true }, 30)
  assert.deepEqual(lucy.body, wade.body, 'one body, one exposure, one result')
})
