import type { SceneId } from './sceneIds.ts'

export type { SceneId }

export type Act = 'Prologue' | 'Act 1: Flood' | 'Act 2: Freeze-up' | 'Act 3: Deep Winter' | 'Act 4: Breakup' | 'Epilogue'

export type Evidence =
  | 'knot'
  | 'bruising'
  | 'aerialPhotos'
  | 'hotelTalk'
  | 'coFiles'
  | 'curlyKnot'
  | 'tapes'
  | 'wreckProof'
  | 'curlyLefty'
  | 'staffCar'
  | 'curlyNamesAshby'
  | 'councilmanFlips'

export type MomLine = 'honest' | 'soft' | 'lie'

export type CacheSpot = 'stove' | 'cache' | 'marker'

export type State = Readonly<{
  scene: SceneId
  owenCache?: CacheSpot
  barfight?: 'coverEli' | 'blameEli' | 'sideCurly'
  momHonesty: number
  leakedFlightDate: boolean
  coJob?: 'wade' | 'lucy'
  curlyPlan?: 'warn' | 'confront' | 'ignore'
  eliTrespass?: 'quiet' | 'report' | 'leverage'
  rashPlan?: 'safe' | 'burn' | 'gunpoint' | 'none'
  afterConfession?: 'stay' | 'walk' | 'turn'
  offer?: 'take' | 'refuse' | 'fake'
  testified?: boolean
  sharedWreck: boolean
  evidence: readonly Evidence[]
  heat: number
  lucyHeat: number
  eliTrust: number
  joan: number
}>

export type Choice = Readonly<{
  label: string
  note?: string
  apply?: (s: State) => State
  next: SceneId | ((s: State) => SceneId)
}>

export type Scene = Readonly<{
  id: SceneId
  act: Act
  title: string
  text: (s: State) => string
  choices: (s: State) => readonly Choice[]
}>
