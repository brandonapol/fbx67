import type { Body, Exposure, Fire } from './survival.ts'
import { burn, burning, expose, handTime, stepOf } from './survival.ts'

// Lucy's first aid on herself (#218, docs/acts/lucy-audit.md follow-up D): white fingers held to the fire, or tucked
// inside her parka against her skin where there is none; numb feet out of her boots at the fire, warmed and wrapped
// dry in her scarf. It is her verb, not a meter: the time it takes is time not spent on anything else, and at a fire
// it is the fire's time, burning while she sits at it. The story hears nothing of it (story-api.md, Rule 4).
//
// Done right, as she would: nothing is thawed that would freeze again. A body still freezing when she is done keeps
// its white fingers and numb feet. Hands and feet, the fire and warmth are survival.ts's; nothing here copies a rule.

export type Aid = 'hands' | 'feet'

// Assumed: half a minute of play with her hands to a fire (ten game minutes) brings white fingers back; a minute inside
// her parka, with no fire. Feet need a fire: boots off in the snow away from one is no first aid. Unlacing and the
// scarf's knot are hand work, so white hands fumble them (survival.ts handTime).
export const HANDS_AT_FIRE = 30
export const HANDS_IN_PARKA = 60
export const WRAP_FEET = 45

// Whether the aid has anything to do.
export const needs = (b: Body, aid: Aid): boolean => (aid === 'hands' ? b.hands === 'white' : b.feet === 'numb')

// Play seconds the aid takes, by a fire or not.
export const aidSeconds = (b: Body, aid: Aid, byFire: boolean): number =>
  aid === 'feet' ? handTime(b, WRAP_FEET) : byFire ? HANDS_AT_FIRE : HANDS_IN_PARKA

// A fire she can sit at for the whole of it: burning, with fuel to last.
export const lasts = (fire: Fire | undefined, seconds: number): fire is Fire => fire !== undefined && burning(fire) && fire.fuel >= seconds

// Whether the aid can be done now: something to treat, and for the feet a fire that lasts it.
export const canTend = (b: Body, aid: Aid, fire?: Fire): boolean =>
  needs(b, aid) && (aid === 'hands' || lasts(fire, aidSeconds(b, aid, true)))

// The aid's end: the treated part comes back, unless the body is still freezing.
export const cured = (b: Body, aid: Aid): Body =>
  stepOf(b.warmth) === 'freezing' ? b : aid === 'hands' ? { ...b, hands: 'fine', bare: 0 } : { ...b, feet: 'fine' }

// What the world does to her while she tends herself where she is (`e`): standing still; at a fire, inside its reach
// and mitts off; away from one, hands inside her parka, so mitts not off.
export const tendExposure = (e: Exposure, byFire: boolean): Exposure => {
  const { fire: _, ...rest } = e
  return { ...rest, still: true, mittsOff: byFire, ...(byFire ? { fire: 0 } : {}) }
}

export type Tended = Readonly<{ body: Body; fire?: Fire; seconds: number }>

// The whole aid at once: the seconds it takes pass in the cold of `e` (or at the fire, which burns them), then the
// part is treated. `undefined` when there is nothing to treat or no fire to treat the feet at.
export const tend = (b: Body, aid: Aid, e: Exposure, fire?: Fire): Tended | undefined => {
  if (!canTend(b, aid, fire)) return undefined
  const byFire = lasts(fire, aidSeconds(b, aid, true))
  const seconds = aidSeconds(b, aid, byFire)
  const body = cured(expose(b, tendExposure(e, byFire), seconds), aid)
  return { body, ...(fire ? { fire: burn(fire, seconds) } : {}), seconds }
}
