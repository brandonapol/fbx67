import type { Prop } from './levels.ts'
import type { Vec } from './world.ts'
import { add, angleTo, distance, scale, sub } from './world.ts'

// A poled boat on a fixed course, with the player sitting in it and the boatman standing in its bow: the skiff that
// takes Owen off his steps (skiff.ts), and Eli's riverboat out to the flooded cabin (cabinRide.ts). The boat goes on
// along its course whatever the player does; the player only turns the camera.

// Where a boat is `t` seconds into its ride: the player's seat, the boatman in the bow, the hull's middle, and the
// heading from the seat to the bow.
export type Ride = Readonly<{ seat: Vec; bow: Vec; hull: Vec; heading: number }>

export type Course = Readonly<{ length: number; time: number; at: (t?: number) => Ride }>

// A course along the line the seat follows, the bow `bow` ahead of it on the same line, at `speed`. The ride is over
// when the bow reaches the line's end.
export const course = (path: readonly Vec[], bow: number, speed: number): Course => {
  const segments = path.slice(1).map((b, i) => ({ a: path[i]!, b, len: distance(path[i]!, b) }))
  const along = (d: number): Vec => {
    const go = (i: number, left: number): Vec => {
      const s = segments[i]!
      if (left <= s.len || i === segments.length - 1) return add(s.a, scale(sub(s.b, s.a), Math.min(1, left / s.len)))
      return go(i + 1, left - s.len)
    }
    return go(0, Math.max(0, d))
  }
  const length = segments.reduce((n, s) => n + s.len, 0) - bow
  const at = (t = 0): Ride => {
    const d = Math.min(length, Math.max(0, t) * speed)
    const seat = along(d)
    const tip = along(d + bow)
    return { seat, bow: tip, hull: along(d + bow / 2), heading: angleTo(seat, tip) }
  }
  return { length, time: length / speed, at }
}

// A boat in a space: its course, its hull in its own frame (x across, z forward to the bow, centered on the hull's
// middle), the figure who stands in its bow, and how high the floor is that the player sits on.
export type Boat = Readonly<{ course: Course; hull: readonly Prop[]; man: string; deck: number }>

// Eli's riverboat: the long flat-bottomed freighter he runs to the villages, square at the stern with the outboard
// tilted up, empty now but for a coil of line and a tarp. On the flood he poles it through the shallows.
const plank = '#6a5a44'
const side = '#5d625a'
export const RIVERBOAT_L = 6.4
export const RIVERBOAT_BEAM = 1.7

// Wade sits on the middle thwart; Eli stands in the bow, ELI_AHEAD in front of him.
export const ELI_AHEAD = 2.4

export const RIVERBOAT_DECK = 0.25

export const riverboatHull: readonly Prop[] = [
  { box: { x: 0, z: 0, w: RIVERBOAT_BEAM, d: RIVERBOAT_L }, h: 0.1, y: 0.15, color: plank },
  { box: { x: -RIVERBOAT_BEAM / 2 + 0.03, z: 0, w: 0.06, d: RIVERBOAT_L }, h: 0.45, y: 0.15, color: side },
  { box: { x: RIVERBOAT_BEAM / 2 - 0.03, z: 0, w: 0.06, d: RIVERBOAT_L }, h: 0.45, y: 0.15, color: side },
  { box: { x: 0, z: -RIVERBOAT_L / 2, w: RIVERBOAT_BEAM, d: 0.06 }, h: 0.45, y: 0.15, color: side },
  { box: { x: 0, z: RIVERBOAT_L / 2, w: RIVERBOAT_BEAM * 0.6, d: 0.06 }, h: 0.5, y: 0.15, color: side },
  { box: { x: 0, z: -ELI_AHEAD / 2, w: RIVERBOAT_BEAM - 0.1, d: 0.25 }, h: 0.05, y: 0.45, color: plank },
  { box: { x: 0, z: -RIVERBOAT_L / 2 - 0.2, w: 0.3, d: 0.35 }, h: 0.5, y: 0.45, color: '#3a3c3e' },
  { box: { x: 0.35, z: -RIVERBOAT_L / 2 + 0.9, w: 0.7, d: 0.7 }, h: 0.18, y: 0.25, color: '#a89a6a', shape: 'cylinder' },
  { box: { x: -0.3, z: -RIVERBOAT_L / 2 + 1.0, w: 0.8, d: 1.0 }, h: 0.12, y: 0.25, color: '#55604a' },
  { box: { x: 0.4, z: ELI_AHEAD / 2 + 0.15, w: 0.05, d: 0.05 }, h: 3.4, y: 0.2, color: '#8a7a5a', shape: 'cylinder' },
]
