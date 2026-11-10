import type { Box, Vec } from './world.ts'
import { vec } from './world.ts'

// The survey camp's ground (#49): a gravel bar on a clearwater creek north of the Chatanika. Local x east, z south, as
// the camp space and the flight north (flight.ts). The main channel runs east-west along the bar's south edge, where
// the floatplane comes in; a dry braid of older gravel crosses the bar; across the channel a cutbank stands about three
// meters, black spruce on its lip; north of the camp the bar gives way to a tussock edge and the spruce. The survey
// marker is on a low rise in the tussocks.
//
// Everything here is a pure function of position, so the renderer draws the same ground the player stands on (footY in
// prologue.ts) and the noise Owen makes walking on it (curly.ts) is the surface he is on.

const smooth = (a: number, b: number, x: number): number => {
  const k = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return k * k * (3 - 2 * k)
}

// A deterministic hash in [0, 1): the same bump at the same place on every build.
export const hash = (x: number, z: number): number => {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453
  return s - Math.floor(s)
}

const valueNoise = (x: number, z: number): number => {
  const [xi, zi] = [Math.floor(x), Math.floor(z)]
  const [xf, zf] = [x - xi, z - zi]
  const [u, v] = [xf * xf * (3 - 2 * xf), zf * zf * (3 - 2 * zf)]
  const a = hash(xi, zi)
  const b = hash(xi + 1, zi)
  const c = hash(xi, zi + 1)
  const d = hash(xi + 1, zi + 1)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}

// The creek: its near edge, where the gravel goes under, and the foot of the cutbank on the far side.
export const CREEK_NEAR = 8.2
export const CREEK_FAR = 12.6
export const WATER_Y = -0.12
// The tussock edge: north of this the bar is moss and sedge.
export const TUSSOCK_Z = -3.6
export const MARKER_RISE = vec(1.8, -9.3)

// The heightmap, in meters above the bar's gravel. Flat (within a few centimeters) where the camp stands, so the props
// sit on it; the channel, the cutbank, the rise and the hills are where the ground moves.
export const groundY = (x: number, z: number): number => {
  const channel = -0.62 * smooth(CREEK_NEAR - 0.4, CREEK_NEAR + 1.0, z) * (1 - smooth(CREEK_FAR - 0.6, CREEK_FAR + 0.3, z))
  const cutbank = 2.9 * smooth(CREEK_FAR, CREEK_FAR + 1.4, z) + 0.05 * Math.max(0, z - CREEK_FAR - 1.4)
  const braid = -0.1 * Math.exp(-(((z - 3.4 - 0.12 * x) / 1.4) ** 2)) * smooth(-14, -6, x)
  const tussocks = smooth(TUSSOCK_Z, TUSSOCK_Z - 5, z) * (0.22 + 0.1 * valueNoise(x * 0.9, z * 0.9))
  const rise = 0.55 * Math.exp(-((x - MARKER_RISE.x) ** 2 + (z - MARKER_RISE.z) ** 2) / (2 * 1.9 * 1.9))
  const north = 0.06 * Math.max(0, -z - 12) + 1.4 * valueNoise(x * 0.05, z * 0.05) * smooth(-12, -30, z)
  const flanks = 0.05 * Math.max(0, Math.abs(x) - 16) * (1 - smooth(CREEK_NEAR - 1, CREEK_NEAR, z))
  return channel + cutbank + braid + tussocks + rise + north + flanks
}

// The heightmap the terrain mesh is built from: GRID x GRID samples over the extent the camera can see from the bar,
// past the fog's start. Sampled from groundY, so the mesh and the walk agree at every vertex.
export const EXTENT = Object.freeze({ x0: -70, x1: 80, z0: -60, z1: 45 })
export const GRID = 96

export const heightmap = (): Float32Array => {
  const h = new Float32Array(GRID * GRID)
  for (let j = 0; j < GRID; j++)
    for (let i = 0; i < GRID; i++) {
      const x = EXTENT.x0 + ((EXTENT.x1 - EXTENT.x0) * i) / (GRID - 1)
      const z = EXTENT.z0 + ((EXTENT.z1 - EXTENT.z0) * j) / (GRID - 1)
      h[j * GRID + i] = groundY(x, z)
    }
  return h
}

// The willow thickets on the bar: the cover between the plane and the camp. Walking through them is quiet.
export const WILLOWS: readonly Box[] = [
  { x: -2.6, z: 1.8, w: 2.2, d: 1.2 },
  { x: 4, z: 2.2, w: 2.2, d: 1.2 },
  { x: 7.4, z: 1.8, w: 2.2, d: 1.2 },
  { x: -11.5, z: 0.4, w: 2.6, d: 2.4 },
  { x: 12.2, z: 6.2, w: 2.6, d: 2.0 },
]

// The black spruce standing in the camp: solid, and Curly cannot see through them.
export const SPRUCE_IN_CAMP: readonly Vec[] = [
  [-1, 1.5],
  [-5.5, -1.5],
  [2.6, -4.2],
  [3.4, -6.3],
  [-3.4, -3.6],
  [11.6, 1.6],
  [12, -7],
  [-11, -6.5],
  [-6.2, -8.6],
  [5.2, 7.4],
].map(([x, z]) => vec(x, z))

export type Surface = 'gravel' | 'willow' | 'tussock' | 'water'

const inside = (p: Vec, b: Box): boolean => Math.abs(p.x - b.x) <= b.w / 2 && Math.abs(p.z - b.z) <= b.d / 2

export const surfaceAt = (p: Vec): Surface => {
  if (WILLOWS.some((b) => inside(p, b))) return 'willow'
  if (p.z > CREEK_NEAR + 0.3 && p.z < CREEK_FAR) return 'water'
  if (p.z < TUSSOCK_Z || Math.hypot(p.x - MARKER_RISE.x, p.z - MARKER_RISE.z) < 2.4) return 'tussock'
  return 'gravel'
}

// The splat weights the terrain is painted with at a point: gravel, sand by the water, moss and the cutbank's silt.
// They sum to one. Slope pushes toward silt, so the cutbank's face is bare.
export type Splat = Readonly<{ gravel: number; sand: number; moss: number; silt: number }>

export const splatAt = (x: number, z: number): Splat => {
  const e = 0.6
  const slope = Math.hypot(groundY(x + e, z) - groundY(x - e, z), groundY(x, z + e) - groundY(x, z - e)) / (2 * e)
  const silt = 3 * Math.min(1, slope * 1.6)
  const wet = smooth(CREEK_NEAR - 1.4, CREEK_NEAR, z) * (1 - smooth(CREEK_FAR, CREEK_FAR + 0.6, z))
  const mossy = Math.max(smooth(TUSSOCK_Z + 0.5, TUSSOCK_Z - 2.5, z), smooth(CREEK_FAR + 1.0, CREEK_FAR + 2.5, z))
  const grit = 0.25 * valueNoise(x * 0.7, z * 0.7)
  const raw = { gravel: (1 - mossy) * (1 - wet) + grit, sand: wet * 0.9, moss: mossy * (1 + grit), silt }
  const sum = raw.gravel + raw.sand + raw.moss + raw.silt
  return { gravel: raw.gravel / sum, sand: raw.sand / sum, moss: raw.moss / sum, silt: raw.silt / sum }
}

// What grows where, placed once from the hash. Each is drawn instanced (campView.ts), one draw per kind.
export type Plant = Readonly<{ x: number; z: number; y: number; scale: number; yaw: number; phase: number }>

export type Kind = 'spruce' | 'willow' | 'fireweed' | 'tussock' | 'alder'

const plant = (x: number, z: number, scale: number, n: number): Plant => ({
  x,
  z,
  y: groundY(x, z),
  scale,
  yaw: hash(n, 7.3) * Math.PI * 2,
  phase: hash(n, 2.1) * Math.PI * 2,
})

const scatter = (n: number, seed: number, at: (u: number, v: number) => Vec | undefined, size: (k: number) => number): readonly Plant[] =>
  Array.from({ length: n }).flatMap((_, i) => {
    const p = at(hash(i, seed), hash(seed, i + 0.5))
    return p ? [plant(p.x, p.z, size(hash(i + seed, 3.7)), i + seed * 1000)] : []
  })

const inCamp = (p: Vec): boolean => Math.abs(p.x) < 14.5 && p.z > -12.5 && p.z < CREEK_NEAR

const campClear = (p: Vec): boolean =>
  !inCamp(p) || (p.z < TUSSOCK_Z - 1 && Math.hypot(p.x - MARKER_RISE.x, p.z - MARKER_RISE.z) > 3.2 && Math.abs(p.x - 6) > 3.5)

export const plants: Readonly<Record<Kind, readonly Plant[]>> = {
  // Black spruce: the ones in the camp, then the stand north of the tussocks and along the cutbank's lip.
  spruce: [
    ...SPRUCE_IN_CAMP.map((p, i) => plant(p.x, p.z, 1 + 0.2 * hash(i, 1.9), i)),
    ...scatter(170, 11, (u, v) => vec(-70 + 150 * u, -60 + 46 * v), (k) => 0.8 + 0.6 * k).filter((p) => campClear(p) && p.z < -11.5),
    ...scatter(90, 12, (u, v) => vec(-70 + 150 * u, CREEK_FAR + 2.2 + 26 * v), (k) => 0.9 + 0.6 * k),
    // Where the bar bends west, out past the plane, the spruce come down to the water.
    ...scatter(110, 13, (u, v) => vec(-70 + 46 * u, -12 + 20 * v), (k) => 0.9 + 0.6 * k).filter((p) => p.z < CREEK_NEAR - 0.6),
  ],
  // Willow: the thickets on the bar, and a fringe along the water.
  willow: [
    ...WILLOWS.flatMap((b, j) => scatter(9, 20 + j, (u, v) => vec(b.x + (u - 0.5) * b.w, b.z + (v - 0.5) * b.d), (k) => 0.75 + 0.45 * k)),
    ...scatter(40, 26, (u, v) => vec(-40 + 100 * u, CREEK_NEAR - 1.1 + 0.6 * v), (k) => 0.6 + 0.5 * k).filter((p) => !inCamp(p) || Math.abs(p.x + 9) > 4),
    ...scatter(30, 27, (u, v) => vec(-60 + 140 * u, CREEK_FAR + 1.2 + 1.2 * v), (k) => 0.7 + 0.5 * k),
  ],
  // Alder and young poplar at the back of the camp, at the spruce's edge: tall, so never where Owen walks.
  alder: scatter(40, 31, (u, v) => vec(-40 + 80 * u, -10 - 6 * v), (k) => 0.8 + 0.5 * k).filter((p) => !inCamp(p) || p.z < -10.5),
  // Fireweed in flower on the bar's edges and the cutbank's lip.
  fireweed: [
    ...scatter(110, 41, (u, v) => vec(-14 + 28 * u, TUSSOCK_Z - 0.5 + 1.8 * v), (k) => 0.7 + 0.5 * k).filter((p) => Math.abs(p.x - 6) > 2.6 && Math.abs(p.x - 1.8) > 1.8),
    ...scatter(90, 42, (u, v) => vec(-50 + 120 * u, CREEK_FAR + 1.6 + 3 * v), (k) => 0.8 + 0.5 * k),
  ],
  // Tussocks: the sedge hummocks north of the camp.
  tussock: scatter(260, 51, (u, v) => vec(-20 + 40 * u, TUSSOCK_Z - 0.4 - 12 * v), (k) => 0.7 + 0.6 * k).filter(
    (p) => Math.hypot(p.x - MARKER_RISE.x, p.z - MARKER_RISE.z) > 1.6 && !SPRUCE_IN_CAMP.some((s) => Math.hypot(p.x - s.x, p.z - s.z) < 1),
  ),
}

// Wind: the sway of a plant at time t, as a lean in radians about x and z. Small, slow and out of phase plant to plant.
export const sway = (p: Plant, kind: Kind, t: number): readonly [number, number] => {
  const amp = kind === 'spruce' ? 0.012 : kind === 'tussock' ? 0.03 : 0.05
  const gust = 0.6 + 0.4 * Math.sin(t * 0.31 + p.x * 0.05)
  return [amp * gust * Math.sin(t * 1.3 + p.phase), amp * gust * 0.6 * Math.cos(t * 1.1 + p.phase * 1.7)]
}

// The mosquito haze: clouds over the willow thickets, each a few dozen specks circling a point a meter up.
export const SWARMS: readonly Vec[] = WILLOWS.map((b) => vec(b.x, b.z))
export const SPECKS = 28

export const speckAt = (swarm: number, i: number, t: number): readonly [number, number, number] => {
  const c = SWARMS[swarm]
  const r = 0.3 + 0.7 * hash(swarm, i)
  const w = 1.5 + 2.5 * hash(i, swarm + 0.3)
  const a = t * w + hash(i, 9.1) * Math.PI * 2
  const y = 0.9 + 0.5 * hash(i + 3, swarm) + 0.25 * Math.sin(t * (2 + w) + i)
  return [c.x + Math.cos(a) * r, groundY(c.x, c.z) + y, c.z + Math.sin(a * 1.3) * r * 0.8]
}
