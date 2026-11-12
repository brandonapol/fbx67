import { CENTER, SIZE, pieces, spawnAt, yawOf } from './downtown.ts'
import { standing } from './freezeup.ts'
import { streetSigns } from './streetSigns.ts'
import type { Figure, Prop, Space } from './levels.ts'
import type { Interactable } from './world.ts'
import { vec } from './world.ts'

// The officer's stop on Second Avenue (a2_officer, #210): Wade comes out of the Northern Lights Café at half past three
// and a Fairbanks PD car is at the curb with its engine running, the officer leaning on its fender. The story places the
// scene at the café (`nlCafe`) in Act 2, and this space is where Act 2's café scenes play outside the café: router.ts
// sends it the act and the place, and the café's own gossip visits go indoors because that space names its scenes
// (dottiesCafe.ts). Nothing here reads heat or picks his lines: at the officer the scene's own text comes up, his read
// of Wade's heat tiered by the story (officerTier in text-game/src/scenes/act2.ts), and its one note, `walkOn`.
//
// Downtown's own data in world coordinates (docs/town-map.md), with the town's freeze-up layer laid over it as on the
// other town spaces (levels.ts, propsIn). He is the officer from the barfight, in the same look; he stays N.cop.

// The officer, N.cop: one id and one look wherever he stands, here and in the Silver Pan's door the night of the
// barfight (barfight.ts reads them from here). He is a gray box in a look, as the town's people are.
export const OFFICER = 'cop'
export const OFFICER_LOOK = { coat: '#27304a', skin: '#e0b48f', hair: '#3a2c20', height: 1.85 } as const

// Out of the café's door onto Second's south walk, facing the street.
const door = spawnAt('nlCafe')
export const SPAWN = vec(door.x, door.z)
export const SPAWN_FACING = yawOf(vec(-door.facing.x, -door.facing.z))

// Second's south curb (freezeup.ts parks its cars against it) and the cruiser along it, nosed east, a little up the
// street from the door; clear of the parked car further east.
const CURB = 60
const CAR_L = 4.8
const CAR_W = 1.8
export const CRUISER = vec(16.5, CURB - CAR_W / 2 - 0.2)

// The officer on the walk, leaning back on the cruiser's front fender with his hands in his coat, looking west down the
// walk at the café's door.
export const OFFICER_AT = vec(CRUISER.x + 1.6, CURB + 0.35)
const WEST = -Math.PI / 2

export const OFFICER_SPOT: Interactable = { id: OFFICER, x: OFFICER_AT.x, z: OFFICER_AT.z, r: 1.6, prompt: 'Hear him out' }

// One streetlight on the south curb past the cruiser, on at half past three in November.
export const LAMP_AT = vec(21.5, CURB + 0.3)
export const LAMP_HEAD = 4.4

const black = '#1d2026'
const white = '#d8dadc'

// A 1960s city cruiser, gray-box and unlettered: black, white doors, the one red dome on the roof, and its exhaust
// smoking in the cold at the tailpipe.
export const cruiser: readonly Prop[] = [
  { box: { x: CRUISER.x, z: CRUISER.z, w: CAR_L, d: CAR_W }, h: 0.95, y: 0.2, color: black, solid: true },
  { box: { x: CRUISER.x - 0.2, z: CRUISER.z, w: 1.6, d: CAR_W + 0.02 }, h: 0.6, y: 0.35, color: white },
  { box: { x: CRUISER.x - 0.3, z: CRUISER.z, w: 2.4, d: CAR_W - 0.2 }, h: 0.5, y: 1.15, color: black },
  { box: { x: CRUISER.x - 0.3, z: CRUISER.z, w: 0.22, d: 0.22 }, h: 0.2, y: 1.65, color: '#b3221c', shape: 'cylinder', glow: true },
  { box: { x: CRUISER.x - CAR_L / 2 - 0.2, z: CRUISER.z + 0.5, w: 0.22, d: 0.22 }, h: 0.22, y: 0.22, color: '#e4e8ea', shape: 'cylinder' },
]

export const streetlight: readonly Prop[] = [
  { box: { x: LAMP_AT.x, z: LAMP_AT.z, w: 0.14, d: 0.14 }, h: LAMP_HEAD, color: '#3a3c3e', shape: 'cylinder', solid: true },
  { box: { x: LAMP_AT.x, z: LAMP_AT.z - 0.5, w: 0.4, d: 0.3 }, h: 0.18, y: LAMP_HEAD - 0.1, color: '#ffd9a0', glow: true },
]

export const figures: readonly Figure[] = [{ id: OFFICER, ...OFFICER_LOOK, at: OFFICER_AT, facing: WEST, activity: 'stand' }]

export const street: Space = {
  id: 'street',
  act: 'Act 2: Freeze-up',
  place: 'nlCafe',
  name: 'Second Avenue',
  interior: false,
  size: SIZE,
  center: CENTER,
  ground: '#6c665a',
  spawn: SPAWN,
  props: [...pieces, ...standing, ...streetSigns, ...cruiser, ...streetlight],
  figures,
  spots: [OFFICER_SPOT],
}
