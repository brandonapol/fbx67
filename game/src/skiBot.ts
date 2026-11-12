import type { Vec } from './world.ts'
import { distance, sub, vec } from './world.ts'
import type { Game } from './prologue.ts'
import { tick } from './prologue.ts'
import type { RouteId } from './skiing.ts'
import { ROUTES } from './skiing.ts'

// A steady skier for the headless runs (smoke/act3Plan.ts, notesRatchet.ts): heads for the next point along the route
// he is on, holding the push the whole way. A held push is the flats' safe shuffle (skiing.ts), so he never falls; it
// is the input the browser's walk-to gives too.

// Closer than this to a route's point, he heads for the one after it.
export const PASS = 6

const pointsOf = (route: RouteId): readonly Vec[] => ROUTES[route].map(([x, z]) => vec(x, z))

// The point to head for: the end of the route's segment nearest him, or the one after it once he is close.
export const skiTarget = (route: RouteId, at: Vec): Vec => {
  const pts = pointsOf(route)
  const nearest = pts.slice(1).reduce(
    (best, b, i) => {
      const a = pts[i]!
      const lx = b.x - a.x
      const lz = b.z - a.z
      const t = Math.max(0, Math.min(1, ((at.x - a.x) * lx + (at.z - a.z) * lz) / (lx * lx + lz * lz)))
      const d = Math.hypot(at.x - (a.x + lx * t), at.z - (a.z + lz * t))
      return d < best.d ? { d, end: i + 1 } : best
    },
    { d: Infinity, end: 1 },
  )
  const end = nearest.end < pts.length - 1 && distance(at, pts[nearest.end]!) < PASS ? nearest.end + 1 : nearest.end
  return pts[end]!
}

const DT = 1 / 30

// Skis the game on from setting off to the top of the slope, steering for skiTarget with the push held: the story has
// moved on to the wreck (prologue.ts sends the scene's `follow`). A game not on skis is returned as it is.
export const skiOut = (g: Game, limit = 30 * 600): Game => {
  let cur = g
  for (let k = 0; cur.ski && k < limit; k++) cur = tick(cur, { dir: sub(skiTarget(cur.ski.route, cur.pos), cur.pos), hold: false }, DT)
  return cur
}
