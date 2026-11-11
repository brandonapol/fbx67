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

export type BarfightMove = 'shove' | 'mooseRack' | 'bottle'

export type MomLine = 'honest' | 'soft' | 'lie'

export type CacheSpot = 'stove' | 'cache' | 'marker'

// Lucy's long night (docs/acts/act3-missions.md, section 2): what she did first, and how she signaled.
export type NightOrder = 'fire' | 'jake'

export type NightSignal = 'smoke' | 'stampX' | 'saveFire'

export type Place =
  | 'silverPan'
  | 'owensRoom'
  | 'floatDock'
  | 'surveyCamp'
  | 'boardingHouse'
  | 'floodedStreet'
  | 'floodCabin'
  | 'helpTent'
  | 'landOffice'
  | 'cityJail'
  | 'eielsonBarracks'
  | 'majorsOffice'
  | 'squadronBuilding'
  | 'photoLab'
  | 'photoRecords'
  | 'baseHangar'
  | 'lucysKitchen'
  | 'hotelBar'
  | 'communityHall'
  | 'nlCafe'
  | 'bushStrip'
  | 'richardsonHighway'
  | 'crashSite'
  | 'searchRidge'
  | 'hospital'
  | 'hospitalLot'
  | 'tolliversHouse'
  | 'tolliversOffice'
  | 'tolliversCabin'
  | 'troopersPost'

export type Clock = `${number}-${number}-${number}T${number}:${number}`

export type State = Readonly<{
  scene: SceneId
  owenCache?: CacheSpot
  // Owen's first letter to Lucy on the morning walk: in the box on Cushman, or still in his jacket (p_dock).
  owenLetter?: 'mailed' | 'kept'
  barfight?: 'coverEli' | 'blameEli' | 'sideCurly'
  barfightMove?: BarfightMove
  momHonesty: number
  leakedFlightDate: boolean
  photoLab?: 'lunch' | 'key'
  coJob?: 'wade' | 'lucy'
  nightOrder?: NightOrder
  nightSignal?: NightSignal
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
  recordsLog: number
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
  place?: Place
  clock?: Clock
  goal?: string
  text: (s: State) => string
  choices: (s: State) => readonly Choice[]
}>
