import type { Vec } from './world.ts'
import { vec } from './world.ts'
import { avenues } from './downtown.ts'
import { depthAt } from './highwater.ts'
import { WAIST } from './trail.ts'

// The current on the search for Eli (docs/acts/act1-missions.md, section 1, "Fail and retry"). North of Second the
// water runs past a meter and moving: row A, First Avenue, the bank. South of Second's north curb it stands, whatever
// its depth. The Chena runs west past the town (docs/town-map.md: Curly's floatplane noses east, upstream), and the
// water over the bank runs with it.
//
// In the moving water the current leans on Wade, nothing at Second's curb and more the deeper he wades, until at his
// waist it takes his feet. That is the mission's only fail: a fade, then the last checkpoint (hazards.ts).

// Second Avenue's north curb, from downtown's own avenues: the edge of the moving water.
export const SECOND_NORTH = avenues.find((a) => a.name === 'Second Avenue')!.row[0]

export const DOWNSTREAM = vec(-1, 0)

// How hard the current pushes, in meters a second, at the waist; it rises from nothing at the curb's depth.
export const DRIFT = 0.6

const CURB_DEPTH = depthAt(SECOND_NORTH)

export const moving = (p: Vec): boolean => p.z < SECOND_NORTH

// How far into the push Wade is, 0 at Second's curb to 1 at the waist. A deck he stands on is out of the water.
export const lean = (p: Vec, depth: number, raised: number): number =>
  raised > 0 || !moving(p) ? 0 : Math.min(1, Math.max(0, (depth - CURB_DEPTH) / (WAIST - CURB_DEPTH)))

// The current's push on Wade, a velocity: downstream, from nothing at the curb to DRIFT at the waist.
export const drift = (p: Vec, depth: number, raised: number): Vec => {
  const k = DRIFT * lean(p, depth, raised)
  return vec(DOWNSTREAM.x * k, DOWNSTREAM.z * k)
}

// Past his waist in the moving water, the current takes his feet.
export const takesFeet = (p: Vec, depth: number, raised: number): boolean => raised === 0 && moving(p) && depth > WAIST
