import type { State } from './types.ts'
import { has, honesty } from './state.ts'

export type Ending = 'best' | 'good' | 'middle' | 'bad'

export type CurlyFate = 'testifies' | 'convicted' | 'buried' | 'killed'

export type IceJam = 'stopped' | 'blown'

export const HEAT_LIMIT = 3

export const leakIsWadesFault = (s: State): boolean => s.leakedFlightDate

export const curlyTalks = (s: State): boolean => s.curlyPlan === 'warn'

export const honestWithFriends = (s: State): boolean =>
  s.eliTrespass === 'quiet' && s.afterConfession === 'stay'

export const doubleAgentWorks = (s: State): boolean => s.offer === 'fake' && honestWithFriends(s)

export const iceJam = (s: State): IceJam => (honestWithFriends(s) && s.offer !== 'take' ? 'stopped' : 'blown')

export const barnetteTrustsWade = (s: State): boolean => s.heat <= HEAT_LIMIT

export const councilmanFlips = (s: State): boolean => s.sharedWreck

export const paperRouteComplete = (s: State): boolean =>
  has(s, 'coFiles') && has(s, 'tapes') && s.afterConfession === 'stay' && s.testified === true

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

export const missingForBest = (s: State): readonly string[] =>
  [
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
    .filter(([miss]) => miss)
    .map(([, why]) => why as string)
