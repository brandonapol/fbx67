import type { State } from '../../text-game/src/types.ts'
import { mission } from '../../text-game/src/story.ts'
import type { Figure, Prop, Space } from './levels.ts'
import type { Interactable } from './world.ts'
import { vec } from './world.ts'

// Lucy's kitchen (place `lucysKitchen`; docs/town-map.md: off the map, no scene walks there), as its first pass plays
// it: one gray-box room, Wade in at the door, Lucy at her table. At the two missions that start here, the hotel bar
// (a2_hotel) and the Major's cabinet (a2_co_ask), Wade walks to the table and the scene's own menu asks what he does;
// every other kitchen scene opens its menu where he comes in. Nothing here decides what a choice does. Local x east,
// z south; the door is in the north wall.

const W = 6
const D = 5
const DOOR = 1.0

export const SPAWN = vec(-1.6, -D / 2 + 0.7)
export const SPAWN_FACING = 0

export const TABLE_AT = vec(0.6, 0.6)
const LUCY_AT = vec(TABLE_AT.x + 0.2, TABLE_AT.z + 0.75)

// Lucy's table, where she reads what Wade brings her: her menu comes up here.
export const TABLE_SPOT: Interactable = { id: 'table', x: TABLE_AT.x, z: TABLE_AT.z, r: 1.6, prompt: 'Sit down with Lucy' }

// The table is there to use only where one of the kitchen's missions starts.
const MISSIONS: readonly string[] = ['theHotelBar', 'theMajorsCabinet']

export const tableSpot = (s: State, id: string): boolean => id === TABLE_SPOT.id && MISSIONS.includes(mission(s)?.id ?? '')

const wall = (x: number, z: number, w: number, d: number, color: string): Prop => ({ box: { x, z, w, d }, h: 2.6, color, solid: true, occludes: true })

const plaster = '#b5a98f'
const pine = '#7a5c3c'

const figures: readonly Figure[] = [{ id: 'lucy', at: LUCY_AT, facing: Math.PI, coat: '#6a3b33', skin: '#a8754f', hair: '#16130f', height: 1.62, activity: 'sit' }]

export const kitchen: Space = {
  id: 'kitchen',
  act: 'Act 2: Freeze-up',
  place: 'lucysKitchen',
  name: "Lucy's kitchen",
  interior: true,
  size: { w: W, d: D },
  ground: '#5b4a36',
  spawn: SPAWN,
  props: [
    // The north wall either side of the door, which is at the spawn's x.
    wall((-W / 2 + SPAWN.x - DOOR / 2) / 2, -D / 2, SPAWN.x - DOOR / 2 + W / 2, 0.2, plaster),
    wall((W / 2 + SPAWN.x + DOOR / 2) / 2, -D / 2, W / 2 - SPAWN.x - DOOR / 2, 0.2, plaster),
    wall(0, D / 2, W, 0.2, plaster),
    wall(-W / 2, 0, 0.2, D, plaster),
    wall(W / 2, 0, 0.2, D, plaster),
    // The table and its two chairs, the photos and Owen's survey grid on it; the stove in the corner, the counter and
    // the window over it on the east wall.
    { box: { x: TABLE_AT.x, z: TABLE_AT.z, w: 1.4, d: 0.9 }, h: 0.75, color: pine, solid: true },
    { box: { x: TABLE_AT.x - 0.2, z: TABLE_AT.z, w: 0.9, d: 0.6 }, h: 0.01, y: 0.75, color: '#d8d2c0' },
    { box: { x: LUCY_AT.x, z: LUCY_AT.z + 0.2, w: 0.45, d: 0.45 }, h: 0.46, color: '#5a4026', solid: true },
    { box: { x: TABLE_AT.x - 0.2, z: TABLE_AT.z - 0.8, w: 0.45, d: 0.45 }, h: 0.46, color: '#5a4026', solid: true },
    { box: { x: -W / 2 + 0.5, z: D / 2 - 0.5, w: 0.8, d: 0.7 }, h: 0.9, color: '#2b2b2a', solid: true, occludes: true },
    { box: { x: W / 2 - 0.4, z: 0, w: 0.6, d: 2.4 }, h: 0.9, color: '#8a7454', solid: true },
    { box: { x: W / 2 - 0.12, z: 0, w: 0.06, d: 1.2 }, h: 0.9, y: 1.1, color: '#c9d2da', glow: true },
  ],
  figures,
  spots: [TABLE_SPOT],
}
