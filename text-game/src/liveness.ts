import type { Evidence, SceneId, State } from './types.ts'
import { sceneIndex } from './sceneIds.ts'
import { HEAT_LIMIT } from './logic.ts'

type OptionalKey = { [K in keyof State]-?: undefined extends State[K] ? K : never }[keyof State]

export type Rule = Readonly<{ after: SceneId | readonly SceneId[]; apply: (s: State) => State }>

const drop = (field: OptionalKey) => (s: State): State => {
  const { [field]: _, ...rest } = s
  return rest
}

const dropEvidence = (...es: readonly Evidence[]) => (s: State): State => ({
  ...s,
  evidence: s.evidence.filter((e) => !es.includes(e)),
})

export const rules: readonly Rule[] = [
  { after: 'a1_ashby', apply: drop('barfight') },
  { after: 'a2_steak', apply: drop('barfightMove') },
  { after: 'a2_hotel', apply: dropEvidence('aerialPhotos') },
  { after: 'a2_flight', apply: drop('coJob') },
  { after: 'a3_curly', apply: dropEvidence('knot', 'bruising', 'curlyKnot', 'curlyLefty', 'staffCar', 'wreckProof') },
  { after: 'a4_offer', apply: dropEvidence('hotelTalk') },
  { after: 'a3_eli', apply: (s) => ({ ...s, eliTrust: s.eliTrust >= 3 ? 3 : 0 }) },
  { after: ['a3_rash_safe', 'a3_rash_burn', 'a3_rash_gun'], apply: (s) => ({ ...s, heat: s.heat <= HEAT_LIMIT ? 0 : HEAT_LIMIT + 1 }) },
  { after: 'a3_joan', apply: (s) => ({ ...s, joan: s.joan >= 3 ? 3 : 0 }) },
  { after: 'a3_joan', apply: (s) => ({ ...s, momHonesty: Math.max(-2, Math.min(2, s.momHonesty)) }) },
  { after: 'a3_confession', apply: (s) => ({ ...s, rashPlan: s.rashPlan === 'burn' ? 'burn' : 'safe' }) },
  { after: 'a3_turn', apply: (s) => ({ ...s, lucyHeat: s.lucyHeat > 0 ? 1 : 0 }) },
  { after: 'a4_testify', apply: dropEvidence('curlyNamesAshby', 'councilmanFlips') },
]

export const threshold = (r: Rule): number =>
  typeof r.after === 'string' ? sceneIndex(r.after) : Math.max(...r.after.map(sceneIndex))

export const isPast = (s: State, r: Rule): boolean => sceneIndex(s.scene) > threshold(r)

const compiled: readonly Readonly<{ at: number; apply: (s: State) => State }>[] = rules.map((r) => ({ at: threshold(r), apply: r.apply }))

export const canonical = (s: State): State => {
  const i = sceneIndex(s.scene)
  return compiled.reduce((acc, r) => (i > r.at ? r.apply(acc) : acc), s)
}

export const canonicalKey = (s: State): string =>
  JSON.stringify(Object.fromEntries(Object.entries(canonical(s)).sort(([a], [b]) => a.localeCompare(b))))
