import type { CacheSpot } from '../../text-game/src/types.ts'
import type { ClipId } from './cast.ts'
import type { Prop, Space } from './levels.ts'
import type { Vec } from './world.ts'
import { vec } from './world.ts'
import { CREEK_FAR, CREEK_NEAR, SPRUCE_IN_CAMP, WILLOWS, groundY } from './campGround.ts'

// The survey camp (#49), Prologue, place surveyCamp: a gravel bar on a clearwater creek (campGround.ts), Curly's
// floatplane pulled up on it, the cook tent, the old meat cache on stilts, the survey marker on its rise, gear crates
// and a fire ring. Owen has three places to hide his notes: under a floorboard behind the stove in the cook tent, up the
// ladder in the cache, and dug in at the marker. Curly is on his routine by the plane (curly.ts).
//
// The props are what stops Owen and what Curly cannot see through. The tent, the cache, the marker, the trees and the
// willow are drawn by the camp's own view (campView.ts) with real shapes; their props here are `unseen`.

// Seconds held to hide the notes at a spot.
export const HIDE_TIME = 2.5

export const STOVE = vec(5.6, -0.5)
export const CACHE = vec(9.2, 3.8)
export const MARKER = vec(1.8, -8.1)

// The cook tent: a wall tent, door to the south, the stove just inside the door.
export const TENT = Object.freeze({ x: 6, z: -2.4, w: 3.6, d: 3.0, wall: 1.3, ridge: 2.3 })
export const STOVE_AT = vec(5.5, -1.4)
// The meat cache: a box on four poles, the ladder up its south face.
export const CACHE_BOX = Object.freeze({ x: 9.2, z: 5.2, w: 1.8, d: 1.6, legs: 1.9, h: 1.2 })
export const LADDER_FOOT = vec(9.2, 3.95)
// The survey marker: a brass cap on an iron pipe, on the rise.
export const MARKER_AT = vec(1.8, -9.3)
export const DRUM = vec(-5.5, 6.7)
export const FIRE_RING = vec(0.8, 3.4)
export const CRATES: readonly Readonly<{ at: Vec; yaw: number }>[] = [
  { at: vec(8.45, -2.0), yaw: 0.1 },
  { at: vec(8.5, -2.85), yaw: -0.05 },
  { at: vec(8.45, -2.4), yaw: 0.3 },
]
export const JERRY_CANS: readonly Readonly<{ at: Vec; yaw: number }>[] = [
  { at: vec(-5.95, 6.05), yaw: 0.2 },
  { at: vec(-5.6, 5.85), yaw: 1.4 },
  { at: vec(-5.25, 6.15), yaw: 0.9 },
]

const edges = (w: number, d: number): readonly Prop[] => [
  { box: { x: 0, z: -d / 2 - 0.5, w: w + 2, d: 1 }, h: 0.01, color: '#000000', solid: true },
  { box: { x: 0, z: d / 2 + 0.5, w: w + 2, d: 1 }, h: 0.01, color: '#000000', solid: true },
  { box: { x: -w / 2 - 0.5, z: 0, w: 1, d: d + 2 }, h: 0.01, color: '#000000', solid: true },
  { box: { x: w / 2 + 0.5, z: 0, w: 1, d: d + 2 }, h: 0.01, color: '#000000', solid: true },
]

const unseen = (p: Omit<Prop, 'unseen'>): Prop => ({ ...p, unseen: true })

export const campProps: readonly Prop[] = [
  ...edges(28, 24),
  // The creek, and the plane pulled up on the bar (drawn by the flight's own hull, flight.ts).
  unseen({ box: { x: 0, z: (CREEK_NEAR + CREEK_FAR) / 2 + 0.2, w: 28, d: CREEK_FAR - CREEK_NEAR + 0.4 }, h: 0.05, color: '#4f6f78', solid: true }),
  unseen({ box: { x: -9, z: 7.2, w: 1.1, d: 5.2 }, h: 1.2, y: 0.5, color: '#c9c2b0', solid: true, occludes: true, while: 'parked' }),
  // The fuel drum by the cans.
  { box: { x: DRUM.x, z: DRUM.z, w: 0.6, d: 0.6 }, h: 0.88, color: '#7a2a1c', solid: true, shape: 'cylinder' },
  unseen({ box: { x: TENT.x, z: TENT.z, w: TENT.w, d: TENT.d }, h: TENT.ridge, color: '#d8ceb0', solid: true, occludes: true }),
  unseen({ box: { x: CACHE_BOX.x, z: CACHE_BOX.z, w: CACHE_BOX.w, d: CACHE_BOX.d }, h: CACHE_BOX.legs + CACHE_BOX.h, color: '#6a5034', solid: true }),
  unseen({ box: { x: MARKER_AT.x, z: MARKER_AT.z, w: 0.3, d: 0.3 }, h: 1.3, y: groundY(MARKER_AT.x, MARKER_AT.z), color: '#d9c25a', solid: true }),
  ...CRATES.map((c) => unseen({ box: { x: c.at.x, z: c.at.z, w: 0.62, d: 0.45 }, h: 0.45, color: '#6a5034', solid: true })),
  ...SPRUCE_IN_CAMP.map((p) => unseen({ box: { x: p.x, z: p.z, w: 1.4, d: 1.4 }, h: 4, color: '#2f4a33', solid: true, occludes: true })),
  // The willow: Owen walks through it, Curly cannot see through it.
  ...WILLOWS.map((b) => unseen({ box: b, h: 1.4, color: '#5b7a3a', occludes: true })),
]

export const camp: Space = {
  id: 'camp',
  act: 'Prologue',
  place: 'surveyCamp',
  name: 'The survey camp',
  interior: false,
  size: { w: 28, d: 24 },
  ground: '#6f7a4a',
  spawn: vec(-8.2, 3.6),
  props: campProps,
  figures: [{ id: 'curly', at: vec(-6.4, 5.4), facing: -Math.PI / 2, coat: '#8a5a2a', skin: '#e3b28a', hair: '#c8873f', height: 1.75 }],
  spots: [
    { id: 'stove', x: STOVE.x, z: STOVE.z, r: 1.1, note: 'stove', hold: HIDE_TIME },
    { id: 'cache', x: CACHE.x, z: CACHE.z, r: 1.1, note: 'cache', hold: HIDE_TIME },
    { id: 'marker', x: MARKER.x, z: MARKER.z, r: 1.1, note: 'marker', hold: HIDE_TIME },
    { id: 'plane', x: -7.6, z: 4.6, r: 1.6, prompt: 'Fly home with Curly' },
  ],
}

// How Owen looks while he hides the notes, k from 0 to 1 through the hold: kneeling in the tent door to lift the
// floorboard behind the stove; up the cache's ladder and back down; down on one knee digging at the marker with the
// trenching tool. `lift` raises him off the ground (the ladder), `facing` is the way he faces the work, `tool` is how
// far the board is lifted or the shovel is in its stroke (0 to 1).
export type HidePose = Readonly<{ spot: CacheSpot; lift: number; facing: number; clip: ClipId; tool: number; at?: Vec }>

const RUNG = 0.3

export const hidePose = (spot: CacheSpot, k: number): HidePose => {
  if (spot === 'stove') return { spot, lift: 0, facing: Math.PI, clip: 'sneak', tool: Math.min(1, Math.sin(Math.min(1, k * 1.15) * Math.PI) * 1.4) }
  if (spot === 'cache') {
    // Up four rungs in the first 40%, in at the hatch, and down again in the last 40%.
    const climb = k < 0.4 ? k / 0.4 : k > 0.6 ? (1 - k) / 0.4 : 1
    return { spot, lift: 4 * RUNG * climb, facing: 0, clip: climb > 0 && climb < 1 ? 'walk' : 'idle', tool: k > 0.4 && k < 0.6 ? 1 : 0, at: LADDER_FOOT }
  }
  return { spot, lift: 0, facing: Math.PI, clip: 'sneak', tool: 0.5 + 0.5 * Math.sin(k * Math.PI * 6) }
}
