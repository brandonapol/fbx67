import type { Evidence, MomLine, State } from './types.ts'

export const initialState: State = {
  scene: 'p_bar',
  momHonesty: 0,
  leakedFlightDate: false,
  sharedWreck: false,
  evidence: [],
  heat: 0,
  lucyHeat: 0,
  eliTrust: 0,
  joan: 0,
}

export const BOUNDS = {
  heat: [0, 6],
  eliTrust: [-3, 5],
  joan: [0, 3],
  momHonesty: [-3, 3],
} as const

const clamp = ([lo, hi]: readonly [number, number], n: number): number => Math.min(hi, Math.max(lo, n))

export const has = (s: State, e: Evidence): boolean => s.evidence.includes(e)

export const addEvidence = (e: Evidence) => (s: State): State =>
  has(s, e) ? s : { ...s, evidence: [...s.evidence, e].sort() }

export const set = (patch: Partial<State>) => (s: State): State => ({ ...s, ...patch })

export const heat = (n: number) => (s: State): State => ({ ...s, heat: clamp(BOUNDS.heat, s.heat + n) })

export const eliTrust = (n: number) => (s: State): State => ({ ...s, eliTrust: clamp(BOUNDS.eliTrust, s.eliTrust + n) })

export const joan = (n: number) => (s: State): State => ({ ...s, joan: clamp(BOUNDS.joan, s.joan + n) })

export const mom = (line: MomLine) => (s: State): State => ({
  ...s,
  momHonesty: clamp(BOUNDS.momHonesty, s.momHonesty + (line === 'honest' ? 1 : line === 'lie' ? -1 : 0)),
})

export const pipe = (...fs: ReadonlyArray<(s: State) => State>) => (s: State): State =>
  fs.reduce((acc, f) => f(acc), s)

export const honesty = (s: State): number => s.momHonesty

export const lefty = (s: State): boolean => has(s, 'curlyLefty') && has(s, 'bruising')

export const texan = (s: State): boolean => has(s, 'knot') && has(s, 'curlyKnot')
