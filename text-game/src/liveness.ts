import type { Evidence, State } from './types.ts'
import { scenes } from './scenes/index.ts'
import { HEAT_LIMIT } from './logic.ts'

const order: readonly string[] = scenes.map((sc) => sc.id)

const past = (s: State, lastUse: string): boolean => order.indexOf(s.scene) > order.indexOf(lastUse)

type Rule = Readonly<{ after: string; apply: (s: State) => State }>

const drop = (field: keyof State) => (s: State): State => {
  const { [field]: _, ...rest } = s
  return rest as State
}

const dropEvidence = (...es: readonly Evidence[]) => (s: State): State => ({
  ...s,
  evidence: s.evidence.filter((e) => !es.includes(e)),
})

const rules: readonly Rule[] = [
  { after: 'a1_ashby', apply: drop('barfight') },
  { after: 'a2_hotel', apply: dropEvidence('aerialPhotos') },
  { after: 'a2_flight', apply: drop('coJob') },
  { after: 'a3_curly', apply: dropEvidence('knot', 'bruising', 'curlyKnot', 'curlyLefty', 'staffCar', 'wreckProof') },
  { after: 'a4_offer', apply: dropEvidence('hotelTalk') },
  { after: 'a3_eli', apply: (s) => ({ ...s, eliTrust: s.eliTrust >= 3 ? 3 : 0 }) },
  { after: 'a3_rash_none', apply: (s) => ({ ...s, heat: s.heat <= HEAT_LIMIT ? 0 : HEAT_LIMIT + 1 }) },
  {
    after: 'a3_joan',
    apply: (s) => ({
      ...s,
      joan: s.joan >= 3 ? 3 : 0,
      momHonesty: s.momHonesty >= 2 ? 2 : s.momHonesty <= -2 ? -2 : 0,
    }),
  },
  { after: 'a3_confession', apply: (s) => ({ ...s, leakedFlightDate: false }) },
]

export const canonical = (s: State): State =>
  rules.reduce((acc, r) => (past(acc, r.after) ? r.apply(acc) : acc), s)

export const canonicalKey = (s: State): string =>
  JSON.stringify(Object.fromEntries(Object.entries(canonical(s)).sort(([a], [b]) => a.localeCompare(b))))
