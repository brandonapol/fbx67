import type { BarfightMove, CacheSpot, NightSignal, State } from './types.ts'
import { honesty } from './state.ts'

export type Ending = 'best' | 'good' | 'middle' | 'bad'

export type CurlyFate = 'testifies' | 'convicted' | 'buried' | 'killed'

export type IceJam = 'stopped' | 'blown'

export const HEAT_LIMIT = 3

// What Hank Lyle remembers of Wade's barfight: the move he made, or that he stayed on his stool.
export type BarfightMemory = BarfightMove | 'seat'

export const hankRemembers = (s: State): BarfightMemory => s.barfightMove ?? 'seat'

// Owen kept his first letter to Lucy on the morning walk (p_dock), so it goes in the mail with the second (p_end).
export const lettersTogether = (s: State): boolean => s.owenLetter === 'kept'

// The photo lab's spare key is missed in November if Wade borrowed it to go in after lockup (design: photo-lab method).
export const keyMissed = (s: State): boolean => s.photoLab === 'key'

// Owen's notes are where he hid them in the prologue (owenCache): Lucy's dig finds them at that spot and nowhere else.
export const cacheIsAt = (s: State, spot: CacheSpot): boolean => s.owenCache === spot

// Fire first leaves Jake pinned in the cold while Lucy builds it: his foot freezes, and he loses toes (design:
// survival-night order). Jake first costs Lucy her fingertips for a week and Jake nothing he keeps.
export const jakeFrostbitten = (s: State): boolean => s.nightOrder === 'fire'

// Lucy's signal, set at a3_survive_*. Scenes rendered from a bare state (the ambient lint, the engine's previews) read
// no signal as the saved fire: nothing sent up.
export const nightSignal = (s: State): NightSignal => s.nightSignal ?? 'saveFire'

// Hours from the ground team setting out (a3_search, 10:00 on 13 December) until the rest of it reaches the wreck, by
// Lucy's signal (design: survival-night signal). Lucy keeps the smoke fed all morning, so it draws them by early
// afternoon; the X waits for a spotter plane to circle it and radio a bearing, at dusk; a fire saved for warmth is only
// a smell, so they come in the dark to Wade's flares. Wade, alone on skis, gets there first on every path at 11:30, and
// his radio breaks in the fall, so his arrival does not shorten theirs.
export const SEARCH_HOURS: Readonly<Record<NightSignal, number>> = { smoke: 3, stampX: 5, saveFire: 7 }

export const searchHours = (s: State): number => SEARCH_HOURS[nightSignal(s)]

// Heat a choice already made will still add later. Any new deferred heat goes here, so the matrix keys on it.
export const pendingHeat = (s: State): number => (keyMissed(s) ? 1 : 0)

export const leakIsWadesFault = (s: State): boolean => s.leakedFlightDate

export const curlyTalks = (s: State): boolean => s.curlyPlan === 'warn'

export const honestWithFriends = (s: State): boolean =>
  s.eliTrespass === 'quiet' && s.afterConfession === 'stay'

export const doubleAgentWorks = (s: State): boolean => s.offer === 'fake' && honestWithFriends(s)

export const iceJam = (s: State): IceJam => (honestWithFriends(s) && s.offer !== 'take' ? 'stopped' : 'blown')

export const barnetteTrustsWade = (s: State): boolean => s.heat <= HEAT_LIMIT

// Barnette pulls Wade over on the Richardson Highway before the dark (a2_heat) once his heat reaches the limit, and
// leans in the window to say he is done believing him once it is past it (design: Systems > Heat). The engine stages
// the stop from this gate (game/src/roadsideStop.ts), so the scene and the stop never disagree.
export const barnetteStops = (s: State): boolean => s.heat >= HEAT_LIMIT

export const councilmanFlips = (s: State): boolean => s.sharedWreck

export const paperRouteComplete = (s: State): boolean => s.afterConfession === 'stay' && s.testified === true

export const isBad = (s: State): boolean =>
  s.offer === 'take' || s.afterConfession === 'turn' || (s.offer === 'fake' && !doubleAgentWorks(s))

export const isBest = (s: State): boolean =>
  !isBad(s) &&
  curlyTalks(s) &&
  honestWithFriends(s) &&
  (s.offer === 'refuse' || s.offer === 'fake') &&
  s.testified === true &&
  councilmanFlips(s) &&
  iceJam(s) === 'stopped' &&
  barnetteTrustsWade(s) &&
  !leakIsWadesFault(s)

export const isGood = (s: State): boolean => !isBad(s) && !isBest(s) && paperRouteComplete(s)

export const ending = (s: State): Ending =>
  isBad(s) ? 'bad' : isBest(s) ? 'best' : isGood(s) ? 'good' : 'middle'

// Lucy's heat at which she is let go from the land office (design: Systems > Heat). Below it she keeps the job, and
// the records thread is open: her after-hours search runs. At or above it the thread is closed and recordsLog stays 0.
export const LUCY_LET_GO = 2

// Read after Act 2 too (a3_turn, a4_news, the epilogue) as "she was let go before Act 3". That holds because the
// cabinet refusal is the only source of lucyHeat; a later source would need its own flag.
export const lucyLetGo = (s: State): boolean => s.lucyHeat >= LUCY_LET_GO

export const recordsOpen = (s: State): boolean => !lucyLetGo(s)

export type ClaimWon = 'twoYears' | 'threeYears' | 'yearsLater' | 'lost'

// When the family's claim is won (design: Outcomes, epilogue timing). The elders' testimony wins it in the good and
// best endings either way; Lucy's logbook entry only puts paper beside it, so it wins sooner. No ending gate reads it.
export const claimWon = (s: State): ClaimWon => {
  const e = ending(s)
  const log = s.recordsLog > 0
  return e === 'best' ? (log ? 'twoYears' : 'threeYears') : e === 'good' ? (log ? 'threeYears' : 'yearsLater') : 'lost'
}

export const eliJailed = (s: State): boolean =>
  s.eliTrespass === 'report' || s.eliTrespass === 'leverage' || s.offer === 'take'

export const curlyKilled = (s: State): boolean => s.curlyPlan === 'ignore'

export const curlyFate = (s: State): CurlyFate => {
  const e = ending(s)
  return curlyKilled(s) ? 'killed' : e === 'best' ? 'testifies' : e === 'bad' ? 'buried' : 'convicted'
}

export const middleFlavor = (s: State): 'burn' | 'walked' | 'silent' =>
  s.rashPlan === 'burn' ? 'burn' : s.afterConfession === 'walk' ? 'walked' : 'silent'

export const momVerdict = (s: State): 'knows' | 'halfKnows' | 'believesALie' => {
  const h = honesty(s)
  return h >= 2 ? 'knows' : h <= -2 ? 'believesALie' : 'halfKnows'
}

export const missingForBest = (s: State): readonly string[] => {
  const checks: readonly (readonly [boolean, string])[] = [
    [isBad(s), 'ending is bad'],
    [!curlyTalks(s), 'decision 3 was not "warn Lucy"'],
    [s.eliTrespass !== 'quiet', 'decision 4 was not "keep quiet"'],
    [s.afterConfession !== 'stay', 'decision 5 was not "stay"'],
    [s.offer !== 'refuse' && s.offer !== 'fake', 'decision 6 was not refuse or fake'],
    [s.testified !== true, 'decision 7 did not testify'],
    [!councilmanFlips(s), 'wreck evidence not shared with Jake'],
    [!barnetteTrustsWade(s), `heat ${s.heat} above ${HEAT_LIMIT}`],
    [leakIsWadesFault(s), 'told Mama the flight date'],
  ]
  return checks.flatMap(([miss, why]) => (miss ? [why] : []))
}
