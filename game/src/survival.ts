import type { Clock } from '../../text-game/src/types.ts'
import { sunAt } from './sun.ts'

// The winter survival rules of docs/acts/act3-missions.md ("Survival"), as pure updates over plain data: Lucy's dig,
// the long night and Wade's ski search all run on these, whoever is playing. Two things to watch, light and warmth,
// and both are read from the world, never from a meter. Nothing here knows the story: a failure is a retry from the
// last checkpoint and sends no note (docs/story-api.md, Rule 4).
//
// The spec gives one rate, the clock. Every other number below is this module's own tuning, marked "Assumed".

// --- Light: the sky is the clock -------------------------------------------------------------------------------------

// A survival mission's game clock runs at about twenty times real time: three hours of grey light, nine minutes of play.
export const CLOCK_RATE = 20

// The sky's three states by the sun's geometric elevation: the sun's disc up (refraction lifts it about 0.83 degrees),
// civil twilight to six below, then dark. On 12 December that is sun about 09:40 to 13:50 and grey until about 15:10
// (fact-check 54).
export type Light = 'sun' | 'grey' | 'dark'

export const SUNRISE = -0.833
export const CIVIL = -6

export const lightOf = (clock: Clock): Light => {
  const e = sunAt(clock).elevation
  return e > SUNRISE ? 'sun' : e > CIVIL ? 'grey' : 'dark'
}

const pad = (n: number): string => String(n).padStart(2, '0')

// The clock a number of play seconds after `start`, to the minute.
export const clockAfter = (start: Clock, play: number): Clock => {
  const [date, time] = start.split('T') as [string, string]
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  const [h, min] = time.split(':').map(Number) as [number, number]
  const at = new Date(Date.UTC(y, m - 1, d, h, min) + Math.floor((play * CLOCK_RATE) / 60) * 60000)
  return `${at.getUTCFullYear()}-${pad(at.getUTCMonth() + 1)}-${pad(at.getUTCDate())}T${pad(at.getUTCHours())}:${pad(at.getUTCMinutes())}` as Clock
}

// Play seconds of light left from `clock` until dark, to the game minute: zero when it is already dark. The search
// stops at a day, which no survival mission outlasts.
export const lightLeft = (clock: Clock): number => {
  for (let minutes = 0; minutes <= 24 * 60; minutes++) {
    if (lightOf(clockAfter(clock, (minutes * 60) / CLOCK_RATE)) === 'dark') return (minutes * 60) / CLOCK_RATE
  }
  return Infinity
}

// --- Warmth ----------------------------------------------------------------------------------------------------------

// One hidden value with four named steps. `warmth` runs from 0 to 4: above 3 is warm, above 2 chilled, above 1 cold,
// and 1 or below freezing.
export type Step = 'warm' | 'chilled' | 'cold' | 'freezing'

export const STEPS: readonly Step[] = ['freezing', 'cold', 'chilled', 'warm']
export const WARMEST = 4

export const stepOf = (warmth: number): Step => STEPS[Math.min(3, Math.max(0, Math.ceil(warmth) - 1))]!

// The body a player carries through a survival mission. `fed` is play seconds of food left in it; `freezing` the play
// seconds spent at freezing in a row; `bare` the play seconds of bare-handed work since the last checkpoint. `hands`
// and `feet` are frostbite: a slowdown that clears at the next checkpoint.
export type Body = Readonly<{
  warmth: number
  fed: number
  freezing: number
  bare: number
  hands: 'fine' | 'white'
  feet: 'fine' | 'numb'
}>

export const fresh: Body = { warmth: WARMEST, fed: 0, freezing: 0, bare: 0, hands: 'fine', feet: 'fine' }

// What the world does to the body this moment. `fire` is the distance to a burning fire, if there is one.
export type Exposure = Readonly<{
  open: boolean
  wind: boolean
  still: boolean
  mittsOff: boolean
  wet: boolean
  fire?: number
}>

export const sheltered: Exposure = { open: false, wind: false, still: false, mittsOff: false, wet: false }

// Assumed: each thing the spec names (the open, the wind, standing still, mitts off) costs one share of loss; wet
// (sweat counts) costs two, so it is the fastest; a cold body that hasn't eaten falls one share faster. One share is a
// step per three minutes of play (an hour of game time).
export const SHARE = 1 / 180
export const WET_SHARES = 2

// Assumed: inside a fire's reach warmth climbs a step a minute of play, faster than any fall.
export const FIRE_CLIMB = 1 / 60

// Assumed: a meal from the kit stops the fall for ten minutes of play (over three hours of game time) and lifts the
// body half a step, never to warm: fire is the only way back to warm.
export const MEAL = 600
export const MEAL_LIFT = 0.5

// Assumed: a minute of play at freezing whites out the screen (twenty minutes of game time).
export const FREEZE_LIMIT = 60

// Assumed: bare hands go white after forty-five seconds of bare-handed work (fifteen game minutes), or at once when
// the body is freezing.
export const BARE_LIMIT = 45

export const shares = (b: Body, e: Exposure): number => {
  const base = [e.open, e.wind, e.still, e.mittsOff].filter(Boolean).length + (e.wet ? WET_SHARES : 0)
  const hungry = base > 0 && b.fed <= 0 && b.warmth <= 2 ? 1 : 0
  return base + hungry
}

// The change in warmth per play second: up inside a fire's reach, otherwise down by the exposure's shares, held while
// fed.
export const rate = (b: Body, e: Exposure, reach: number = FIRE_REACH): number => {
  if (e.fire !== undefined && e.fire <= reach) return FIRE_CLIMB
  if (b.fed > 0) return 0
  return 0 - shares(b, e) * SHARE
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))

// The body after `dt` play seconds of an exposure.
export const expose = (b: Body, e: Exposure, dt: number, reach: number = FIRE_REACH): Body => {
  const warmth = clamp(b.warmth + rate(b, e, reach) * dt, 0, WARMEST)
  const frozen = stepOf(warmth) === 'freezing'
  // Hands held to a fire warm back: the bare-handed count starts again there (white hands stay white until a checkpoint).
  const warmed = e.fire !== undefined && e.fire <= reach
  const bare = warmed ? 0 : b.bare + (e.mittsOff ? dt : 0)
  return {
    warmth,
    fed: Math.max(0, b.fed - dt),
    freezing: frozen ? b.freezing + dt : 0,
    bare,
    hands: b.hands === 'white' || (e.mittsOff && (bare >= BARE_LIMIT || frozen)) ? 'white' : 'fine',
    feet: b.feet === 'numb' || frozen ? 'numb' : 'fine',
  }
}

// Eating from the survival kit.
export const eat = (b: Body): Body => ({ ...b, fed: MEAL, warmth: Math.max(b.warmth, Math.min(3, b.warmth + MEAL_LIFT)) })

// --- Frostbite: a slowdown, never a fail -----------------------------------------------------------------------------

// Assumed: white hands take twice as long at any hand task (the axe, matches, a knot, the dig); numb feet walk and ski
// at two thirds of their pace.
export const FUMBLE = 2
export const NUMB_PACE = 2 / 3

export const handTime = (b: Body, seconds: number): number => seconds * (b.hands === 'white' ? FUMBLE : 1)
export const pace = (b: Body): number => (b.feet === 'numb' ? NUMB_PACE : 1)

// --- Fire ------------------------------------------------------------------------------------------------------------

// A thing in the world with a reach and a fuel load, in play seconds of burning. It burns down unless fed.
export type Fire = Readonly<{ fuel: number }>

// Assumed: a fire warms within three meters; a bough armful burns a minute of play, deadfall three; it holds at most
// ten minutes of fuel.
export const FIRE_REACH = 3
export const BOUGHS = 60
export const DEADFALL = 180
export const MAX_FUEL = 600

// Assumed: lighting takes twenty seconds of bare-handed work and costs a quarter step of warmth on top.
export const LIGHTING = 20
export const LIGHT_COST = 0.25

export const burning = (f: Fire): boolean => f.fuel > 0
export const burn = (f: Fire, dt: number): Fire => ({ fuel: Math.max(0, f.fuel - dt) })
export const feed = (f: Fire, load: number): Fire => ({ fuel: Math.min(MAX_FUEL, f.fuel + load) })

// Lighting a fire with a first load: bare hands, which costs warmth and counts as bare-handed work. Returns the body
// after, the fire, and the play seconds it took (slow with white hands).
// The moment the fire catches, after the bare-handed work: the warmth it cost and the first load burning. A mission
// played frame by frame runs the work as exposure and calls this at the end.
export const kindle = (b: Body, load: number): Readonly<{ body: Body; fire: Fire }> => ({
  body: { ...b, warmth: Math.max(0, b.warmth - LIGHT_COST) },
  fire: feed({ fuel: 0 }, load),
})

export const light = (b: Body, load: number): Readonly<{ body: Body; fire: Fire; seconds: number }> => {
  const seconds = handTime(b, LIGHTING)
  return { ...kindle(expose(b, { ...sheltered, mittsOff: true }, seconds), load), seconds }
}

// --- Fail and retry --------------------------------------------------------------------------------------------------

// A survival run over whatever the mission carries (`T`: the game, the story state, what is in the pack). The
// checkpoint keeps what was carried, the clock and the fire then; the body comes back fresh of frostbite.
export type Run<T> = Readonly<{
  carried: T
  body: Body
  fire?: Fire
  played: number
  start: Clock
  checkpoint: Readonly<{ carried: T; body: Body; fire?: Fire; played: number }>
}>

export const begin = <T>(carried: T, start: Clock, body: Body = fresh): Run<T> => ({
  carried,
  body,
  played: 0,
  start,
  checkpoint: { carried, body, played: 0 },
})

export const clockOf = <T>(r: Run<T>): Clock => clockAfter(r.start, r.played)

// Reaching a checkpoint: frostbite clears there, and the run saves what it carries.
export const reach = <T>(r: Run<T>, carried: T = r.carried): Run<T> => {
  const body: Body = { ...r.body, bare: 0, hands: 'fine', feet: 'fine' }
  return { ...r, carried, body, checkpoint: { carried, body, fire: r.fire, played: r.played } }
}

// Why a run fails: freezing too long, or the light gone. The night is played as tasks, not by the sky, so it passes
// `sky: false` and only the cold can fail it.
export type Failure = 'froze' | 'dark'

export const failure = <T>(r: Run<T>, sky: boolean = true): Failure | undefined =>
  r.body.freezing >= FREEZE_LIMIT ? 'froze' : sky && lightOf(clockOf(r)) === 'dark' ? 'dark' : undefined

// Back to the last checkpoint with what was carried then. The story is whatever the checkpoint carried: nothing that
// happened since reaches it.
export const retry = <T>(r: Run<T>): Run<T> => ({ ...r, ...r.checkpoint })

// One moment of play: the fire burns, the body takes the exposure (a fire warms only while it burns), the clock runs.
// A failed run fades back to its checkpoint.
export const tick = <T>(r: Run<T>, e: Exposure, dt: number, sky: boolean = true): Run<T> => {
  const fire = r.fire === undefined ? undefined : burn(r.fire, dt)
  const warmed = r.fire !== undefined && burning(r.fire) ? e : { ...e, fire: undefined }
  const next: Run<T> = { ...r, fire, body: expose(r.body, warmed, dt), played: r.played + dt }
  return failure(next, sky) === undefined ? next : retry(next)
}
