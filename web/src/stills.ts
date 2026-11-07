import stills from 'virtual:stills'
import { weather } from '../../text-game/src/story.ts'
import type { Act, SceneId } from '../../text-game/src/types.ts'

export type Season = 'flood' | 'freeze' | 'winter' | 'breakup'

export type { Weather } from '../../text-game/src/story.ts'

const seasons: Readonly<Record<Act, Season>> = {
  Prologue: 'flood',
  'Act 1: Flood': 'flood',
  'Act 2: Freeze-up': 'freeze',
  'Act 3: Deep Winter': 'winter',
  'Act 4: Breakup': 'breakup',
  Epilogue: 'breakup',
}

export const seasonOf = (act: Act): Season => seasons[act]

export const weatherOf = weather

export const stillUrl = (id: SceneId): string | undefined => {
  const file = stills[id]
  return file ? `${import.meta.env.BASE_URL}stills/${file}` : undefined
}
