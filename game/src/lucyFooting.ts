import type { Pov } from '../../text-game/src/story.ts'

// Lucy sure-footed in snow (#218, docs/acts/lucy-audit.md follow-up C). She grew up walking winter ground: she steps
// where the wind crust holds, sets her feet flat on a slope and on the creek ice, and reads the snow over tussocks and
// buried willow before she puts her weight on it. Someone new to it (Wade, from Act 1 on) breaks through the crust,
// turns an ankle in the tussocks and slips on a grade or the ice, so he cannot run there and walks slower. A drift is
// a wade for anyone, but she wades it lighter. It is her step, not a meter: nothing of it is drawn, and the story hears
// nothing of it (story-api.md, Rule 4). Who is sure-footed comes from pov(state) alone, never a scene id.

// The winter ground under a walker: wind crust on the open bar, rough ground (snow over tussocks and willow), creek
// ice, a slope steep enough to slip on, and a drift.
export type Ground = 'crust' | 'rough' | 'ice' | 'slope' | 'drift'
export const GROUNDS: readonly Ground[] = ['crust', 'rough', 'ice', 'slope', 'drift']

// What the ground lets a walker do: the share of their top speed, and whether they can run on it.
export type Footing = Readonly<{ pace: number; run: boolean }>

const step = (pace: number, run: boolean): Footing => Object.freeze({ pace, run })
const sure = step(1, true)

// Assumed: [hers, a stranger's]. Breaking through crust costs him a third of his walk; tussocks under snow and a slope
// cost more; ice less, since it is flat. A drift to the knee halves his pace and takes a quarter of hers.
const FOOTING: Readonly<Record<Ground, readonly [Footing, Footing]>> = {
  crust: [sure, step(0.7, false)],
  rough: [sure, step(0.6, false)],
  ice: [sure, step(0.8, false)],
  slope: [sure, step(0.6, false)],
  drift: [step(0.75, false), step(0.5, false)],
}

// Lucy is the one who knows the snow.
export const sureFooted = (who: Pov): boolean => who === 'lucy'

// How a walker, sure-footed or not, moves on a ground.
export const footing = (sureFoot: boolean, ground: Ground): Footing => FOOTING[ground][sureFoot ? 0 : 1]
