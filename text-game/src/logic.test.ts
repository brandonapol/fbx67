import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initialState } from './state.ts'
import {
  HEAT_LIMIT,
  LUCY_LET_GO,
  barnetteStops,
  barnetteTrustsWade,
  claimWon,
  recordsOpen,
  curlyFate,
  doubleAgentWorks,
  eliJailed,
  ending,
  hankRemembers,
  iceJam,
  jakeFrostbitten,
  nightSignal,
  searchHours,
  keyMissed,
  pendingHeat,
  middleFlavor,
  missingForBest,
  momVerdict,
  paperRouteComplete,
} from './logic.ts'
import type { State } from './types.ts'
import { menu } from './story.ts'
import { N } from './names.ts'

const base: State = {
  ...initialState,
  scene: 'end',
  curlyPlan: 'warn',
  eliTrespass: 'quiet',
  afterConfession: 'stay',
  offer: 'refuse',
  testified: true,
  sharedWreck: true,
  heat: 0,
}

const w = (patch: Partial<State>): State => ({ ...base, ...patch })

test('best requires every gate', () => {
  assert.equal(ending(base), 'best')
  assert.equal(ending(w({ offer: 'fake' })), 'best')
})

test('each missing best gate drops to good, never best', () => {
  const variants: readonly Partial<State>[] = [
    { curlyPlan: 'confront' },
    { curlyPlan: 'ignore' },
    { sharedWreck: false },
    { heat: HEAT_LIMIT + 1 },
    { leakedFlightDate: true },
  ]
  variants.forEach((v) => assert.equal(ending(w(v)), 'good', JSON.stringify(v)))
})

test('good drops to middle without testifying or after walking away', () => {
  const goods: readonly Partial<State>[] = [{ curlyPlan: 'confront' }, { sharedWreck: false }, { heat: HEAT_LIMIT + 1 }, { leakedFlightDate: true }]
  goods.forEach((g) => {
    assert.equal(ending(w(g)), 'good', JSON.stringify(g))
    assert.equal(ending(w({ ...g, testified: false })), 'middle', JSON.stringify(g))
    assert.equal(ending(w({ ...g, afterConfession: 'walk' })), 'middle', JSON.stringify(g))
  })
})

test('the paper route does not depend on evidence that is always obtained', () => {
  assert.equal(paperRouteComplete(w({ evidence: [] })), true)
  assert.equal(paperRouteComplete(w({ evidence: ['coFiles', 'tapes'] })), true)
  assert.equal(paperRouteComplete(w({ testified: false })), false)
  assert.equal(paperRouteComplete(w({ afterConfession: 'walk' })), false)
})

test('not testifying is middle', () => {
  assert.equal(ending(w({ testified: false })), 'middle')
})

test('walking away after the confession is middle', () => {
  assert.equal(ending(w({ afterConfession: 'walk' })), 'middle')
})

test('taking the offer or turning on Lucy is bad', () => {
  assert.equal(ending(w({ offer: 'take', testified: false })), 'bad')
  assert.equal(ending(w({ afterConfession: 'turn' })), 'bad')
})

test('double agent collapses to bad unless honest with friends', () => {
  assert.equal(doubleAgentWorks(w({ offer: 'fake' })), true)
  assert.equal(ending(w({ offer: 'fake', eliTrespass: 'report' })), 'bad')
  assert.equal(ending(w({ offer: 'fake', afterConfession: 'walk' })), 'bad')
})

test('ice jam is stopped only when honest with friends', () => {
  assert.equal(iceJam(base), 'stopped')
  assert.equal(iceJam(w({ eliTrespass: 'leverage' })), 'blown')
  assert.equal(iceJam(w({ afterConfession: 'walk' })), 'blown')
  assert.equal(iceJam(w({ offer: 'take' })), 'blown')
})

test('Eli is jailed if his trespass is used or the offer is taken', () => {
  assert.equal(eliJailed(base), false)
  assert.equal(eliJailed(w({ eliTrespass: 'report' })), true)
  assert.equal(eliJailed(w({ eliTrespass: 'leverage' })), true)
  assert.equal(eliJailed(w({ offer: 'take' })), true)
})

test('Curly fate follows the route for every ending', () => {
  const routes: readonly (readonly [Partial<State>, string, string])[] = [
    [{}, 'best', 'testifies'],
    [{ sharedWreck: false }, 'good', 'convicted'],
    [{ curlyPlan: 'confront' }, 'good', 'convicted'],
    [{ testified: false }, 'middle', 'convicted'],
    [{ afterConfession: 'walk' }, 'middle', 'convicted'],
    [{ offer: 'take' }, 'bad', 'buried'],
    [{ afterConfession: 'turn' }, 'bad', 'buried'],
    [{ offer: 'fake', eliTrespass: 'report' }, 'bad', 'buried'],
  ]
  routes.forEach(([patch, e, fate]) => {
    assert.equal(ending(w(patch)), e, JSON.stringify(patch))
    assert.equal(curlyFate(w(patch)), fate, JSON.stringify(patch))
    assert.equal(curlyFate(w({ ...patch, curlyPlan: 'ignore' })), 'killed', JSON.stringify(patch))
  })
})

test('middle flavor: burning beats walking, walking beats silence', () => {
  assert.equal(middleFlavor(w({ rashPlan: 'burn', afterConfession: 'walk' })), 'burn')
  assert.equal(middleFlavor(w({ rashPlan: 'burn' })), 'burn')
  assert.equal(middleFlavor(w({ rashPlan: 'safe', afterConfession: 'walk' })), 'walked')
  assert.equal(middleFlavor(w({ rashPlan: 'gunpoint', testified: false })), 'silent')
  assert.equal(middleFlavor(w({ rashPlan: 'none' })), 'silent')
})

test('Mom verdict tiers on honesty', () => {
  const expected: readonly (readonly [number, string])[] = [
    [3, 'knows'],
    [2, 'knows'],
    [1, 'halfKnows'],
    [0, 'halfKnows'],
    [-1, 'halfKnows'],
    [-2, 'believesALie'],
    [-3, 'believesALie'],
  ]
  expected.forEach(([h, v]) => assert.equal(momVerdict(w({ momHonesty: h })), v, String(h)))
})

test('missingForBest is empty for best and names each missing gate', () => {
  assert.deepEqual(missingForBest(base), [])
  assert.deepEqual(missingForBest(w({ curlyPlan: 'confront' })), ['decision 3 was not "warn Lucy"'])
  assert.deepEqual(missingForBest(w({ testified: false })), ['decision 7 did not testify'])
  assert.deepEqual(missingForBest(w({ sharedWreck: false })), ['wreck evidence not shared with Jake'])
  assert.deepEqual(missingForBest(w({ heat: HEAT_LIMIT + 1 })), [`heat ${HEAT_LIMIT + 1} above ${HEAT_LIMIT}`])
  assert.deepEqual(missingForBest(w({ leakedFlightDate: true })), ['told Mama the flight date'])
  assert.deepEqual(missingForBest(w({ eliTrespass: 'report' })), ['decision 4 was not "keep quiet"'])
  assert.deepEqual(missingForBest(w({ afterConfession: 'walk' })), ['decision 5 was not "stay"'])
  assert.deepEqual(missingForBest(w({ offer: 'take' })), ['ending is bad', 'decision 6 was not refuse or fake'])
  assert.deepEqual(missingForBest(w({ afterConfession: 'turn' })), ['ending is bad', 'decision 5 was not "stay"'])
})

test('every best gate missing at once is reported in order', () => {
  const worst = w({ curlyPlan: 'ignore', eliTrespass: 'report', afterConfession: 'turn', offer: 'take', testified: false, sharedWreck: false, heat: 6, leakedFlightDate: true })
  assert.equal(missingForBest(worst).length, 9)
  assert.equal(missingForBest(worst)[0], 'ending is bad')
})

test('Hank remembers the barfight move, or that Wade stayed on his stool', () => {
  assert.equal(hankRemembers(initialState), 'seat')
  assert.equal(hankRemembers({ ...initialState, barfightMove: 'shove' }), 'shove')
  assert.equal(hankRemembers({ ...initialState, barfightMove: 'mooseRack' }), 'mooseRack')
  assert.equal(hankRemembers({ ...initialState, barfightMove: 'bottle' }), 'bottle')
})

test('only the borrowed key is missed', () => {
  assert.deepEqual(
    [undefined, 'lunch', 'key'].map((photoLab) => keyMissed({ ...initialState, photoLab } as State)),
    [false, false, true],
  )
  assert.deepEqual([pendingHeat({ ...initialState, photoLab: 'lunch' }), pendingHeat({ ...initialState, photoLab: 'key' })], [0, 1])
})

test('only fire first leaves Jake frostbitten', () => {
  assert.deepEqual(
    [undefined, 'fire', 'jake'].map((nightOrder) => jakeFrostbitten({ ...initialState, nightOrder } as State)),
    [false, true, false],
  )
})

test('the signal sets how long the ground team takes: smoke soonest, a saved fire latest', () => {
  const hours = (['smoke', 'stampX', 'saveFire'] as const).map((nightSignal) => searchHours({ ...initialState, nightSignal }))
  assert.deepEqual(hours, [3, 5, 7])
})

test('no signal yet reads as the saved fire, in one place', () => {
  assert.equal(nightSignal(initialState), 'saveFire')
  assert.equal(searchHours(initialState), searchHours({ ...initialState, nightSignal: 'saveFire' }))
})

// #104: Lucy's logbook entry moves only the date the claim is won, and only where it is won.
test('the logbook wins the claim sooner in good and best, and nothing in bad or middle', () => {
  const good = w({ curlyPlan: 'confront' })
  const middle = w({ testified: false })
  const bad = w({ offer: 'take' })
  const rows: readonly (readonly [State, number, string, string])[] = [
    [base, 1, 'best', 'twoYears'],
    [base, 0, 'best', 'threeYears'],
    [good, 1, 'good', 'threeYears'],
    [good, 0, 'good', 'yearsLater'],
    [middle, 1, 'middle', 'lost'],
    [middle, 0, 'middle', 'lost'],
    [bad, 1, 'bad', 'lost'],
    [bad, 0, 'bad', 'lost'],
  ]
  for (const [s, log, e, won] of rows) {
    const at = { ...s, recordsLog: log }
    assert.equal(ending(at), e, `${e} with recordsLog ${log}`)
    assert.equal(claimWon(at), won, `${e} with recordsLog ${log}`)
  }
})

test('no ending gate reads the logbook', () => {
  for (const s of [base, w({ curlyPlan: 'confront' }), w({ testified: false }), w({ offer: 'take' })])
    assert.deepEqual([ending({ ...s, recordsLog: 1 }), missingForBest({ ...s, recordsLog: 1 })], [ending({ ...s, recordsLog: 0 }), missingForBest({ ...s, recordsLog: 0 })])
})

test('the records thread is open below Lucy\'s let-go heat and closed at it or above', () => {
  assert.equal(LUCY_LET_GO, 2)
  assert.deepEqual([0, 1, 2, 3, 4].map((h) => recordsOpen(w({ lucyHeat: h }))), [true, true, false, false, false])
})

// design.md, Outcomes: the best ending needs "heat ≤ 3". The tests above use HEAT_LIMIT + 1, so pin the number and
// the boundary itself.
test('heat at the limit still reaches best, one above does not', () => {
  assert.equal(HEAT_LIMIT, 3)
  assert.equal(ending(w({ heat: HEAT_LIMIT })), 'best')
  assert.deepEqual(missingForBest(w({ heat: HEAT_LIMIT })), [])
  assert.equal(ending(w({ heat: HEAT_LIMIT + 1 })), 'good')
})

// Every combination of the plot decisions and the gating facts, so a gate added to isBest without a reason in
// missingForBest (or the reverse) fails here.
const decisionStates: readonly State[] = (['warn', 'confront', 'ignore'] as const).flatMap((curlyPlan) =>
  (['quiet', 'report', 'leverage'] as const).flatMap((eliTrespass) =>
    (['stay', 'walk', 'turn'] as const).flatMap((afterConfession) =>
      (['refuse', 'fake', 'take'] as const).flatMap((offer) =>
        [true, false].flatMap((testified) =>
          [true, false].flatMap((sharedWreck) =>
            [true, false].flatMap((leakedFlightDate) =>
              [HEAT_LIMIT, HEAT_LIMIT + 1].map((heat) =>
                w({ curlyPlan, eliTrespass, afterConfession, offer, testified, sharedWreck, leakedFlightDate, heat }),
              ),
            ),
          ),
        ),
      ),
    ),
  ),
)

test('missingForBest is empty exactly when the ending is best, over every decision combination', () => {
  assert.equal(decisionStates.length, 3 ** 4 * 2 ** 4)
  decisionStates.forEach((s) => assert.equal(missingForBest(s).length === 0, ending(s) === 'best', JSON.stringify(s)))
})

test('the bad ending is exactly taking the offer, turning on Lucy, or faking it without honesty', () => {
  decisionStates.forEach((s) => {
    const honest = s.eliTrespass === 'quiet' && s.afterConfession === 'stay'
    const bad = s.offer === 'take' || s.afterConfession === 'turn' || (s.offer === 'fake' && !honest)
    assert.equal(ending(s) === 'bad', bad, JSON.stringify(s))
  })
})

test('outside bad, good and best are exactly the paper route: stayed and testified', () => {
  decisionStates
    .filter((s) => ending(s) !== 'bad')
    .forEach((s) => assert.equal(ending(s) !== 'middle', s.afterConfession === 'stay' && s.testified === true, JSON.stringify(s)))
})

// Barnette's roadside stop (a2_heat): the scene pulls Wade over exactly when barnetteStops holds, and leans in the
// window exactly when Barnette no longer trusts him. The engine stages the stop from these gates (#209).
test('the roadside stop plays in a2_heat at heat 3 and up, and the lean only above the limit', () => {
  for (let heat = 0; heat <= 6; heat++) {
    const s: State = { ...initialState, scene: 'a2_heat', heat }
    const text = menu(s).text
    assert.equal(barnetteStops(s), heat >= 3, `stops at heat ${heat}`)
    assert.equal(text.includes(`${N.barnette} pulls you over`), barnetteStops(s), `the stop's text at heat ${heat}`)
    assert.equal(text.includes('leans in the window'), !barnetteTrustsWade(s), `the lean's text at heat ${heat}`)
  }
})
