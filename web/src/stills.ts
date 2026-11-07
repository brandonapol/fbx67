import stills from 'virtual:stills'
import { HEAT_LIMIT } from '../../text-game/src/logic.ts'
import { BOUNDS } from '../../text-game/src/state.ts'
import type { Act, SceneId, State } from '../../text-game/src/types.ts'

export type Season = 'flood' | 'freeze' | 'winter' | 'breakup'

export type Weather = 'clear' | 'dusk' | 'night'

const seasons: Readonly<Record<Act, Season>> = {
  Prologue: 'flood',
  'Act 1: Flood': 'flood',
  'Act 2: Freeze-up': 'freeze',
  'Act 3: Deep Winter': 'winter',
  'Act 4: Breakup': 'breakup',
  Epilogue: 'breakup',
}

export const seasonOf = (act: Act): Season => seasons[act]

export const weatherOf = (s: State): Weather =>
  s.heat > HEAT_LIMIT || s.eliTrust <= BOUNDS.eliTrust[0] ? 'night' : s.heat >= HEAT_LIMIT - 1 || s.eliTrust < 0 ? 'dusk' : 'clear'

export const stillUrl = (id: SceneId): string | undefined => {
  const file = stills[id]
  return file ? `${import.meta.env.BASE_URL}stills/${file}` : undefined
}
