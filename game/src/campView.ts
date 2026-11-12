import * as pc from 'playcanvas'
import type { Kind, Plant } from './campGround.ts'
import { EXTENT, GRID, SPECKS, SWARMS, WATER_Y, groundY, hash, heightmap, plants, speckAt, splatAt, sway } from './campGround.ts'
import { CACHE_BOX, CRATES, FIRE_RING, JERRY_CANS, LADDER_FOOT, MARKER_AT, STOVE_AT, TENT } from './camp.ts'
import type { Cast } from './characters.ts'
import { playbackRate } from './cast.ts'
import { CURLY_HALF_ANGLE, CURLY_RANGE, gaze } from './curly.ts'
import type { Game } from './prologue.ts'
import { curlyNow, hiding, seen } from './prologue.ts'
import type { Season } from './owensCamp.ts'
import { loadContainer, propUrl, spawnProp } from './props.ts'

// The survey camp drawn for real (#49): the bar's terrain from its heightmap (campGround.ts), painted from splat
// weights; the camp's structures as one merged mesh; the spruce, willow, alder, fireweed and tussocks instanced, one
// draw per kind, swaying in the wind; a mosquito haze over the willow; the crates and jerry cans from the prop kit.
// Curly's head turns ahead of his body; Owen's hiding moves the floorboard, the cache hatch and the trenching tool.
// The ground cone is off unless the accessibility option keeps it (frontEnd.ts, Prefs.cone).

type Rgb = readonly [number, number, number]

const rgb = (hex: string): Rgb => {
  const n = parseInt(hex.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

// Vertex colors go to the shader as they are, in linear light: the palette's sRGB hex is converted on the way in.
const linear = (c: Rgb): Rgb => c.map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)) as unknown as Rgb

const mix = (a: Rgb, b: Rgb, k: number): Rgb => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]

const shade = (c: Rgb, k: number): Rgb => [c[0] * k, c[1] * k, c[2] * k]

// --- A mesh builder: boxes and tapered prisms under a transform, with a color per face. ---

type Builder = { positions: number[]; normals: number[]; colors: number[]; indices: number[] }

const builder = (): Builder => ({ positions: [], normals: [], colors: [], indices: [] })

const tmpV = new pc.Vec3()
const tmpN = new pc.Vec3()

const quad = (b: Builder, m: pc.Mat4, corners: readonly (readonly [number, number, number])[], color: Rgb): void => {
  const base = b.positions.length / 3
  const p = corners.map(([x, y, z]) => m.transformPoint(new pc.Vec3(x, y, z), new pc.Vec3()))
  tmpN.cross(tmpV.sub2(p[1], p[0]), new pc.Vec3().sub2(p[2], p[0])).normalize()
  const lin = linear(color)
  p.forEach((v) => {
    b.positions.push(v.x, v.y, v.z)
    b.normals.push(tmpN.x, tmpN.y, tmpN.z)
    b.colors.push(lin[0], lin[1], lin[2], 1)
  })
  b.indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
}

// A frustum: bottom w x d, top scaled by `top`, height h, from y 0. top 1 is a box.
// under: how the bottom face is shaded against the color; a foliage tier's underside takes the light bounced up off
// the bar and is lighter, not darker.
const frustum = (b: Builder, m: pc.Mat4, w: number, h: number, d: number, color: Rgb, top = 1, under = 0.9): void => {
  const [x0, z0, x1, z1] = [w / 2, d / 2, (w / 2) * top, (d / 2) * top]
  const lo = [[-x0, 0, -z0], [x0, 0, -z0], [x0, 0, z0], [-x0, 0, z0]] as const
  const hi = [[-x1, h, -z1], [x1, h, -z1], [x1, h, z1], [-x1, h, z1]] as const
  const side = shade(color, 0.92)
  quad(b, m, [hi[0], hi[3], hi[2], hi[1]], color)
  quad(b, m, [lo[0], lo[1], lo[2], lo[3]], shade(color, under))
  quad(b, m, [lo[0], hi[0], hi[1], lo[1]], side)
  quad(b, m, [lo[1], hi[1], hi[2], lo[2]], color)
  quad(b, m, [lo[2], hi[2], hi[3], lo[3]], side)
  quad(b, m, [lo[3], hi[3], hi[0], lo[0]], color)
}

const at = (x: number, y: number, z: number, yaw = 0, pitch = 0, roll = 0): pc.Mat4 =>
  new pc.Mat4().setTRS(new pc.Vec3(x, y, z), new pc.Quat().setFromEulerAngles((pitch * 180) / Math.PI, (yaw * 180) / Math.PI, (roll * 180) / Math.PI), pc.Vec3.ONE)

const box = (b: Builder, x: number, y: number, z: number, w: number, h: number, d: number, color: string | Rgb, yaw = 0, pitch = 0, roll = 0): void =>
  frustum(b, at(x, y, z, yaw, pitch, roll), w, h, d, typeof color === 'string' ? rgb(color) : color)

// Foliage normals are bent up: a crown takes light from the sky like the leaves in it, so a tier's underside is never
// a black band facing the ground.
const bentUp = (normals: readonly number[]): number[] =>
  Array.from({ length: normals.length / 3 }).flatMap((_, i) => {
    const n = new pc.Vec3(normals[i * 3], normals[i * 3 + 1] + 1.5, normals[i * 3 + 2]).normalize()
    return [n.x, n.y, n.z]
  })

const toMesh = (device: pc.GraphicsDevice, b: Builder, foliage = false): pc.Mesh => {
  const mesh = new pc.Mesh(device)
  mesh.setPositions(b.positions)
  mesh.setNormals(foliage ? bentUp(b.normals) : b.normals)
  mesh.setColors(b.colors, 4)
  mesh.setIndices(b.indices)
  mesh.update()
  return mesh
}

const vertexMaterial = (opts: Readonly<{ map?: pc.Texture; tiling?: number; gloss?: number; twoSided?: boolean }> = {}): pc.StandardMaterial => {
  const m = new pc.StandardMaterial()
  m.diffuse = new pc.Color(1, 1, 1)
  m.diffuseVertexColor = true
  m.gloss = opts.gloss ?? 0.12
  m.metalness = 0
  m.useMetalness = true
  if (opts.map) {
    m.diffuseMap = opts.map
    m.diffuseMapTiling = new pc.Vec2(opts.tiling ?? 1, opts.tiling ?? 1)
  }
  if (opts.twoSided) m.cull = pc.CULLFACE_NONE
  m.update()
  return m
}

const flat = (hex: string, opts: Readonly<{ opacity?: number; unlit?: boolean }> = {}): pc.StandardMaterial => {
  const m = new pc.StandardMaterial()
  const [r, g, b] = rgb(hex)
  m.diffuse = new pc.Color(r, g, b)
  m.gloss = 0.1
  m.useMetalness = true
  if (opts.unlit) {
    m.useLighting = false
    m.emissive = new pc.Color(r, g, b)
  }
  if (opts.opacity !== undefined) {
    m.opacity = opts.opacity
    m.blendType = pc.BLEND_NORMAL
    m.depthWrite = false
  }
  m.update()
  return m
}

const meshEntity = (name: string, mesh: pc.Mesh, material: pc.Material, shadows: Readonly<{ cast: boolean; receive: boolean }>): pc.Entity => {
  const e = new pc.Entity(name)
  e.addComponent('render', { meshInstances: [new pc.MeshInstance(mesh, material)], castShadows: shadows.cast, receiveShadows: shadows.receive })
  return e
}

// --- The ground: the heightmap as a grid, its splat weights mixed into vertex colors over a grain texture. ---

const LAYER: Readonly<Record<'gravel' | 'sand' | 'moss' | 'silt', Rgb>> = {
  gravel: rgb('#6a6153'),
  sand: rgb('#726856'),
  moss: rgb('#434a28'),
  silt: rgb('#57493a'),
}

const grain = (device: pc.GraphicsDevice): pc.Texture => {
  const n = 128
  const tex = new pc.Texture(device, { width: n, height: n, format: pc.PIXELFORMAT_RGBA8, mipmaps: true, addressU: pc.ADDRESS_REPEAT, addressV: pc.ADDRESS_REPEAT })
  const px = tex.lock() as Uint8Array
  // Cobbles: each texel takes the nearest of a jittered grid of stone centers (wrapping, so the texture tiles), lit on
  // its upper side and dark in the cracks between, each stone its own shade, over a fine grit.
  const cells = 12
  const size = n / cells
  const center = (ci: number, cj: number): readonly [number, number] => {
    const [wi, wj] = [((ci % cells) + cells) % cells, ((cj % cells) + cells) % cells]
    return [(ci + 0.2 + 0.6 * hash(wi, wj)) * size, (cj + 0.2 + 0.6 * hash(wj + 17, wi)) * size]
  }
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const [ci, cj] = [Math.floor(i / size), Math.floor(j / size)]
      const near = [-1, 0, 1]
        .flatMap((a) => [-1, 0, 1].map((b) => [ci + a, cj + b] as const))
        .map(([a, b]) => {
          const [cx, cy] = center(a, b)
          return { d: Math.hypot(i - cx, j - cy), cy, a, b }
        })
        .sort((p, q) => p.d - q.d)
      const edge = near[1].d - near[0].d
      const tone = 0.8 + 0.18 * hash(((near[0].a % cells) + cells) % cells, ((near[0].b % cells) + cells) % cells)
      const top = j < near[0].cy ? 0.06 : -0.04
      const crack = edge < 1.2 ? 0.78 : 1
      const grit = 0.05 * hash(i, j)
      const v = Math.round(255 * Math.max(0, Math.min(1, (tone + top + grit) * crack)))
      const o = (j * n + i) * 4
      px[o] = v
      px[o + 1] = v
      px[o + 2] = Math.round(v * 0.97)
      px[o + 3] = 255
    }
  tex.unlock()
  return tex
}

// In winter the snow lies over every layer, thinnest where the bar's relief shows through.
const SNOW_COVER = 0.88

const terrain = (device: pc.GraphicsDevice, winter?: Season): pc.Mesh => {
  const h = heightmap()
  const { x0, x1, z0, z1 } = EXTENT
  const dx = (x1 - x0) / (GRID - 1)
  const dz = (z1 - z0) / (GRID - 1)
  const positions: number[] = []
  const normals: number[] = []
  const colors: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const y = (i: number, j: number): number => h[Math.max(0, Math.min(GRID - 1, j)) * GRID + Math.max(0, Math.min(GRID - 1, i))]
  for (let j = 0; j < GRID; j++)
    for (let i = 0; i < GRID; i++) {
      const x = x0 + dx * i
      const z = z0 + dz * j
      positions.push(x, y(i, j), z)
      const n = new pc.Vec3(-(y(i + 1, j) - y(i - 1, j)) / (2 * dx), 1, -(y(i, j + 1) - y(i, j - 1)) / (2 * dz)).normalize()
      normals.push(n.x, n.y, n.z)
      const s = splatAt(x, z)
      const bare = [0, 1, 2].map((k) => s.gravel * LAYER.gravel[k] + s.sand * LAYER.sand[k] + s.moss * LAYER.moss[k] + s.silt * LAYER.silt[k]) as unknown as Rgb
      const c = linear(winter ? mix(bare, rgb(winter.snow), SNOW_COVER) : bare)
      colors.push(c[0], c[1], c[2], 1)
      uvs.push(x / 3, z / 3)
    }
  for (let j = 0; j < GRID - 1; j++)
    for (let i = 0; i < GRID - 1; i++) {
      const a = j * GRID + i
      indices.push(a, a + GRID, a + 1, a + 1, a + GRID, a + GRID + 1)
    }
  const mesh = new pc.Mesh(device)
  mesh.setPositions(positions)
  mesh.setNormals(normals)
  mesh.setColors(colors, 4)
  mesh.setUvs(0, uvs)
  mesh.setIndices(indices)
  mesh.update()
  return mesh
}

// --- The camp's structures, merged into one mesh. ---

const canvas = '#a39a80'
const canvasShade = '#8a826c'
const weathered = '#584836'
const darkWood = '#5e4c3a'
const stove = '#403c38'

const structures = (b: Builder): void => {
  const { x, z, w, d, wall, ridge } = TENT
  const g0 = groundY(x, z)
  // The wall tent: four walls, the gable ends, the two roof slopes with a little overhang; the door flap tied back.
  box(b, x, g0, z - d / 2, w, wall, 0.04, canvasShade)
  box(b, x - w / 2, g0, z, 0.04, wall, d, canvasShade)
  box(b, x + w / 2, g0, z, 0.04, wall, d, canvas)
  box(b, x - w / 4 - 0.35, g0, z + d / 2, w / 2 - 0.7, wall, 0.04, canvas)
  box(b, x + w / 4 + 0.35, g0, z + d / 2, w / 2 - 0.7, wall, 0.04, canvas)
  box(b, x, g0, z + d / 2 + 0.25, 0.5, 1.2, 0.04, canvasShade, 0, -0.5)
  const slope = Math.atan2(ridge - wall, w / 2)
  const half = Math.hypot(w / 2, ridge - wall) + 0.15
  ;[-1, 1].forEach((side) => {
    const m = at(x + (side * w) / 4, g0 + (wall + ridge) / 2 - 0.03, z, 0, 0, -side * slope)
    frustum(b, m, half, 0.04, d + 0.3, rgb(side < 0 ? canvasShade : canvas))
  })
  ;[-1, 1].forEach((end) =>
    Array.from({ length: 5 }).forEach((_, i) => {
      const k = (i + 0.5) / 5
      box(b, x, g0 + wall + (ridge - wall) * (k - 0.1), z + (end * d) / 2, w * (1 - k), (ridge - wall) / 5, 0.04, canvasShade)
    }),
  )
  // The ridge pole sticking out at the ends, the guy lines' stakes, the stove and its pipe out through the roof.
  box(b, x, g0 + ridge, z, 0.08, 0.08, d + 0.6, darkWood)
  box(b, STOVE_AT.x, g0, STOVE_AT.z, 0.55, 0.5, 0.75, stove)
  box(b, STOVE_AT.x + 0.15, g0 + 0.5, STOVE_AT.z - 0.2, 0.12, ridge, 0.12, '#3a3836')
  box(b, STOVE_AT.x + 0.15, g0 + ridge + 0.5, STOVE_AT.z - 0.2, 0.2, 0.08, 0.2, '#3a3836')
  // The floor: planks inside the door, one of them loose behind the stove (drawn on its own, campView sync).
  Array.from({ length: 6 }).forEach((_, i) => box(b, x - w / 2 + 0.3 + i * 0.6, g0 + 0.01, z, 0.56, 0.03, d - 0.1, i % 2 ? '#7a6248' : '#6e5840'))
  // Guy-line stakes.
  ;[-1, 1].forEach((sx) => [-1, 1].forEach((sz) => box(b, x + sx * (w / 2 + 0.6), g0, z + sz * (d / 2 - 0.3), 0.05, 0.3, 0.05, darkWood)))

  // The meat cache: four poles, tin collars against the martens, the box with its shake roof, the ladder.
  const c = CACHE_BOX
  const gc = groundY(c.x, c.z)
  ;[-1, 1].forEach((sx) =>
    [-1, 1].forEach((sz) => {
      box(b, c.x + sx * (c.w / 2 - 0.1), gc, c.z + sz * (c.d / 2 - 0.1), 0.16, c.legs + 0.1, 0.16, weathered)
      box(b, c.x + sx * (c.w / 2 - 0.1), gc + 1.0, c.z + sz * (c.d / 2 - 0.1), 0.2, 0.35, 0.2, '#9a9a94')
    }),
  )
  box(b, c.x, gc + c.legs, c.z, c.w + 0.1, 0.08, c.d + 0.1, darkWood)
  box(b, c.x, gc + c.legs + 0.08, c.z, c.w, c.h - 0.2, c.d, weathered)
  ;[-1, 1].forEach((side) => box(b, c.x + (side * c.w) / 4, gc + c.legs + c.h - 0.18, c.z, c.w / 2 + 0.35, 0.06, c.d + 0.4, '#5a4a38', 0, 0, -side * 0.45))
  box(b, c.x, gc + c.legs + 0.2, c.z - c.d / 2 - 0.01, 0.62, 0.66, 0.03, '#584634')
  // Leaning from its foot to the hatch's sill on the cache's south face.
  const lean = Math.atan2(c.z - c.d / 2 - LADDER_FOOT.z, c.legs + 0.25)
  ;[-1, 1].forEach((side) => box(b, LADDER_FOOT.x + side * 0.22, gc, LADDER_FOOT.z, 0.07, c.legs + 0.25, 0.07, '#7a6650', 0, lean))
  Array.from({ length: 6 }).forEach((_, i) => {
    const y = 0.3 * (i + 1)
    box(b, LADDER_FOOT.x, gc + y, LADDER_FOOT.z + Math.tan(lean) * y, 0.5, 0.04, 0.05, '#7a6650')
  })

  // The survey marker: the iron pipe with its brass cap, a lath stake with red flagging, a mound of turned earth.
  const gm = groundY(MARKER_AT.x, MARKER_AT.z)
  box(b, MARKER_AT.x, gm - 0.05, MARKER_AT.z, 0.08, 0.5, 0.08, '#5a5550')
  box(b, MARKER_AT.x, gm + 0.45, MARKER_AT.z, 0.13, 0.04, 0.13, '#c9a640')
  box(b, MARKER_AT.x + 0.35, gm, MARKER_AT.z + 0.1, 0.04, 1.3, 0.02, '#cbb894', 0.3)
  box(b, MARKER_AT.x + 0.35, gm + 1.1, MARKER_AT.z + 0.1, 0.02, 0.18, 0.12, '#b8322a', 0.3)
  frustum(b, at(MARKER_AT.x, gm - 0.08, MARKER_AT.z + 0.6, 0.2), 0.9, 0.14, 0.6, rgb('#5a4a36'), 0.5)

  // The fire ring: stones, two charred logs, a grate, and the stumps they sit on.
  const gf = groundY(FIRE_RING.x, FIRE_RING.z)
  Array.from({ length: 11 }).forEach((_, i) => {
    const a = (i / 11) * Math.PI * 2
    const s = 0.16 + 0.06 * hash(i, 4.2)
    box(b, FIRE_RING.x + Math.cos(a) * 0.55, gf - 0.02, FIRE_RING.z + Math.sin(a) * 0.55, s * 1.4, s, s, shade(rgb('#8a8478'), 0.8 + 0.3 * hash(i, 1)), a)
  })
  box(b, FIRE_RING.x, gf, FIRE_RING.z, 0.7, 0.04, 0.7, '#2a2420')
  box(b, FIRE_RING.x - 0.1, gf + 0.02, FIRE_RING.z, 0.12, 0.1, 0.8, '#1e1a16', 0.6)
  box(b, FIRE_RING.x + 0.1, gf + 0.02, FIRE_RING.z, 0.12, 0.1, 0.8, '#26201a', -0.5)
  box(b, FIRE_RING.x, gf + 0.25, FIRE_RING.z, 0.5, 0.02, 0.4, '#3a3634')
  ;[[1.4, 0.2], [-1.2, 0.6], [0.3, -1.3]].forEach(([dx, dz], i) => box(b, FIRE_RING.x + dx, gf, FIRE_RING.z + dz, 0.4, 0.42, 0.4, i % 2 ? '#7a6248' : '#6e5840'))
  // A coffee pot on the grate.
  box(b, FIRE_RING.x + 0.1, gf + 0.27, FIRE_RING.z, 0.14, 0.2, 0.14, '#5c6a70', 0, 0, 0)
}

// --- Plants, instanced. Each kind is a small vertex-colored mesh, unit size; the instance scales and turns it. ---

const plantMesh = (device: pc.GraphicsDevice, kind: Kind): pc.Mesh => {
  const b = builder()
  if (kind === 'spruce') {
    // Black spruce: a spindly trunk, short drooping tiers, a clump at the top.
    box(b, 0, 0, 0, 0.12, 5.2, 0.12, '#3a2e24')
    Array.from({ length: 7 }).forEach((_, i) => {
      const y = 0.6 + i * 0.62
      const r = 1.0 - i * 0.12
      frustum(b, at(0, y, 0, i * 0.7), r, 0.7, r, mix(rgb('#38462e'), rgb('#455539'), (i % 3) / 2), 0.15, 1.3)
    })
    frustum(b, at(0, 4.9, 0), 0.45, 0.6, 0.45, rgb('#2a3622'), 0.2)
  } else if (kind === 'willow' || kind === 'alder') {
    const tall = kind === 'alder' ? 2.6 : 1.6
    const leaf = kind === 'alder' ? ['#36462a', '#3e4e30'] : ['#43562e', '#4c6036']
    Array.from({ length: 6 }).forEach((_, i) => {
      const a = (i / 6) * Math.PI * 2
      const lean = 0.25 + 0.15 * (i % 2)
      box(b, Math.cos(a) * 0.15, 0, Math.sin(a) * 0.15, 0.04, tall * 0.6, 0.04, '#5a4a3a', a, lean)
      frustum(b, at(Math.cos(a) * 0.45, tall * 0.35, Math.sin(a) * 0.45, a, lean * 0.6), 0.75, tall * 0.65, 0.6, rgb(leaf[i % 2]), 0.35)
    })
  } else if (kind === 'fireweed') {
    Array.from({ length: 4 }).forEach((_, i) => {
      const a = (i / 4) * Math.PI * 2 + 0.4
      const h = 0.8 + 0.25 * (i % 2)
      box(b, Math.cos(a) * 0.12, 0, Math.sin(a) * 0.12, 0.03, h, 0.03, '#56602e', a, 0.08)
      frustum(b, at(Math.cos(a) * 0.12, h * 0.35, Math.sin(a) * 0.12, a), 0.16, h * 0.4, 0.05, rgb('#4a5a2a'), 0.6)
      frustum(b, at(Math.cos(a) * 0.14, h * 0.8, Math.sin(a) * 0.14, a), 0.06, h * 0.24, 0.06, rgb(i % 2 ? '#9a4a6e' : '#a85a80'), 0.3)
    })
  } else {
    frustum(b, at(0, 0, 0), 0.55, 0.22, 0.5, rgb('#55552f'), 0.6)
    Array.from({ length: 5 }).forEach((_, i) => {
      const a = (i / 5) * Math.PI * 2
      box(b, Math.cos(a) * 0.12, 0.15, Math.sin(a) * 0.12, 0.03, 0.32, 0.12, i % 2 ? '#716e42' : '#615f37', a, 0.5)
    })
  }
  return toMesh(device, b, true)
}

type Instanced = Readonly<{ kind: Kind; plants: readonly Plant[]; data: Float32Array; vb: pc.VertexBuffer; swaying: boolean }>

const writePlant = (data: Float32Array, i: number, p: Plant, lean: readonly [number, number], m: pc.Mat4, q: pc.Quat, s: pc.Vec3, v: pc.Vec3): void => {
  q.setFromEulerAngles((lean[0] * 180) / Math.PI, (p.yaw * 180) / Math.PI, (lean[1] * 180) / Math.PI)
  m.setTRS(v.set(p.x, p.y - 0.05, p.z), q, s.set(p.scale, p.scale, p.scale))
  data.set(m.data, i * 16)
}

const instanced = (device: pc.GraphicsDevice, root: pc.Entity, kind: Kind, material: pc.Material): Instanced => {
  const list = plants[kind]
  const data = new Float32Array(list.length * 16)
  const [m, q, s, v] = [new pc.Mat4(), new pc.Quat(), new pc.Vec3(), new pc.Vec3()]
  list.forEach((p, i) => writePlant(data, i, p, [0, 0], m, q, s, v))
  const vb = new pc.VertexBuffer(device, pc.VertexFormat.getDefaultInstancingFormat(device), list.length, { usage: pc.BUFFER_DYNAMIC, data })
  const mi = new pc.MeshInstance(plantMesh(device, kind), material)
  mi.setInstancing(vb, false)
  const e = new pc.Entity(kind)
  e.addComponent('render', { meshInstances: [mi], castShadows: kind !== 'tussock', receiveShadows: true })
  root.addChild(e)
  return { kind, plants: list, data, vb, swaying: kind !== 'tussock' }
}

// --- The mosquito haze: specks over the willow. ---

const specks = (device: pc.GraphicsDevice, root: pc.Entity): Readonly<{ data: Float32Array; vb: pc.VertexBuffer }> => {
  const n = SWARMS.length * SPECKS
  const data = new Float32Array(n * 16)
  const vb = new pc.VertexBuffer(device, pc.VertexFormat.getDefaultInstancingFormat(device), n, { usage: pc.BUFFER_DYNAMIC, data })
  const b = builder()
  box(b, 0, 0, 0, 0.02, 0.012, 0.02, '#1a1a18')
  const mi = new pc.MeshInstance(toMesh(device, b), flat('#141412', { unlit: true }))
  mi.setInstancing(vb, false)
  const e = new pc.Entity('mosquitoes')
  e.addComponent('render', { meshInstances: [mi], castShadows: false, receiveShadows: false })
  root.addChild(e)
  return { data, vb }
}

// The sight fan for the accessibility option: Curly's range and half-angle on the ground.
const fan = (device: pc.GraphicsDevice, range: number, half: number, steps = 18): pc.Mesh => {
  const points = Array.from({ length: steps + 1 }, (_, i) => -half + (2 * half * i) / steps)
  const positions = [0, 0.06, 0, ...points.flatMap((a) => [Math.sin(a) * range, 0.06, Math.cos(a) * range])]
  const mesh = new pc.Mesh(device)
  mesh.setPositions(positions)
  mesh.setNormals(Array.from({ length: positions.length / 3 }).flatMap(() => [0, 1, 0]))
  mesh.setIndices(points.slice(1).flatMap((_, i) => [0, i + 1, i + 2]))
  mesh.update()
  return mesh
}

// The crate and jerry can glTFs from the prop kit, loaded once per app and placed when they arrive.
const kit = new WeakMap<pc.Application, Promise<readonly [pc.Asset, pc.Asset]>>()

const loadKit = (app: pc.Application, base: string): Promise<readonly [pc.Asset, pc.Asset]> => {
  const had = kit.get(app)
  if (had) return had
  const p = Promise.all([loadContainer(app, propUrl(base, 'crate')), loadContainer(app, propUrl(base, 'jerrycan'))] as const)
  kit.set(app, p)
  return p
}

export type CampView = Readonly<{
  sync: (g: Game, curly: pc.Entity | undefined, cast: Cast, cone: boolean) => void
  dispose: () => void
}>

const HEAD_BONE = 'Head'

const heads = new WeakMap<pc.Entity, pc.GraphNode | null>()

const headOf = (e: pc.Entity): pc.GraphNode | null => {
  if (!heads.has(e)) heads.set(e, e.findByName(HEAD_BONE))
  return heads.get(e) ?? null
}

// `winter` is the season laid over the camp in Act 3 (owensCamp.ts): snow on the ground, ice on the creek, and no
// fireweed, mosquitoes or Curly's sight.
export const buildCamp = (app: pc.Application, root: pc.Entity, base: string, winter?: Season): CampView => {
  const device = app.graphicsDevice
  const materials: pc.Material[] = []
  const keep = <M extends pc.Material>(m: M): M => {
    materials.push(m)
    return m
  }
  const textures: pc.Texture[] = []

  const g = grain(device)
  textures.push(g)
  const ground = meshEntity('terrain', terrain(device, winter), keep(vertexMaterial({ map: g, tiling: 1 })), { cast: false, receive: true })
  root.addChild(ground)

  const water = new pc.Entity('creek')
  water.addComponent('render', { type: 'plane', castShadows: false, receiveShadows: true })
  const wm = keep(winter ? flat(winter.ice) : flat('#46616a', { opacity: 0.82 }))
  wm.gloss = winter ? 0.9 : 0.8
  wm.update()
  if (water.render) water.render.material = wm
  water.setLocalPosition(5, WATER_Y, 10.4)
  water.setLocalScale(150, 1, 6.2)
  root.addChild(water)

  const b = builder()
  structures(b)
  root.addChild(meshEntity('camp', toMesh(device, b), keep(vertexMaterial()), { cast: true, receive: true }))

  const leaf = keep(vertexMaterial({ twoSided: true }))
  const kinds: readonly Kind[] = winter ? ['spruce', 'willow', 'alder', 'tussock'] : ['spruce', 'willow', 'alder', 'fireweed', 'tussock']
  const groves = kinds.map((k) => instanced(device, root, k, leaf))
  const haze = winter ? undefined : specks(device, root)

  // What moves when Owen hides: the loose floorboard behind the stove, the cache's hatch, the trenching tool.
  const part = (name: string, w: number, h: number, d: number, hex: string, pivot: readonly [number, number, number], offset: readonly [number, number, number]): pc.Entity => {
    const e = new pc.Entity(name)
    const pb = builder()
    box(pb, offset[0], offset[1], offset[2], w, h, d, hex)
    e.addComponent('render', { meshInstances: [new pc.MeshInstance(toMesh(device, pb), keep(vertexMaterial()))], castShadows: true, receiveShadows: true })
    e.setLocalPosition(pivot[0], pivot[1], pivot[2])
    root.addChild(e)
    return e
  }
  const gt = groundY(TENT.x, TENT.z)
  const board = part('floorboard', 0.5, 0.035, 0.7, '#7e664c', [STOVE_AT.x - 0.1, gt + 0.03, STOVE_AT.z + 0.35], [0, 0, -0.35])
  const gc = groundY(CACHE_BOX.x, CACHE_BOX.z)
  const hatch = part('hatch', 0.6, 0.64, 0.03, '#5a4836', [CACHE_BOX.x - 0.3, gc + CACHE_BOX.legs + 0.2, CACHE_BOX.z - CACHE_BOX.d / 2 - 0.03], [0.3, 0, 0])
  const shovel = new pc.Entity('trenching tool')
  const sb = builder()
  box(sb, 0, 0, 0, 0.035, 0.6, 0.035, '#5a4a36')
  box(sb, 0, -0.18, 0, 0.16, 0.2, 0.02, '#4a5040')
  shovel.addComponent('render', { meshInstances: [new pc.MeshInstance(toMesh(device, sb), keep(vertexMaterial()))], castShadows: true, receiveShadows: true })
  root.addChild(shovel)

  const cone = new pc.Entity('sight')
  const coneMats = [keep(flat('#e8e2c8', { opacity: 0.12, unlit: true })), keep(flat('#ffe9a8', { opacity: 0.3, unlit: true })), keep(flat('#ff4a3a', { opacity: 0.45, unlit: true }))] as const
  cone.addComponent('render', { meshInstances: [new pc.MeshInstance(fan(device, CURLY_RANGE, CURLY_HALF_ANGLE), coneMats[0])], castShadows: false })
  root.addChild(cone)

  const alive = { on: true }
  loadKit(app, base).then(
    ([crate, can]) => {
      if (!alive.on) return
      CRATES.forEach((c, i) => {
        const e = spawnProp(crate, `crate${i}`)
        e.setLocalPosition(c.at.x, groundY(c.at.x, c.at.z) + (i === 2 ? 0.45 : 0), c.at.z)
        e.setLocalEulerAngles(0, (c.yaw * 180) / Math.PI, 0)
        root.addChild(e)
      })
      JERRY_CANS.forEach((c, i) => {
        const e = spawnProp(can, `jerrycan${i}`)
        e.setLocalPosition(c.at.x, groundY(c.at.x, c.at.z), c.at.z)
        e.setLocalEulerAngles(0, (c.yaw * 180) / Math.PI, 0)
        root.addChild(e)
      })
    },
    (err: unknown) => console.warn('camp props did not load', err),
  )

  const [m4, q, s, v] = [new pc.Mat4(), new pc.Quat(), new pc.Vec3(), new pc.Vec3()]
  const turn = new pc.Quat()

  const sync = (gm: Game, curly: pc.Entity | undefined, cast: Cast, coneOn: boolean): void => {
    const t = gm.t
    groves.forEach((gr) => {
      if (!gr.swaying) return
      gr.plants.forEach((p, i) => writePlant(gr.data, i, p, sway(p, gr.kind, t), m4, q, s, v))
      gr.vb.setData(gr.data)
    })
    if (haze) {
      SWARMS.forEach((_, sw) =>
        Array.from({ length: SPECKS }).forEach((__, i) => {
          const [x, y, z] = speckAt(sw, i, t)
          m4.setTranslate(x, y, z)
          haze.data.set(m4.data, (sw * SPECKS + i) * 16)
        }),
      )
      haze.vb.setData(haze.data)
    }

    const pose = curlyNow(gm)
    if (curly) {
      curly.setLocalPosition(pose.at.x, groundY(pose.at.x, pose.at.z), pose.at.z)
      curly.setLocalEulerAngles(0, (pose.heading * 180) / Math.PI, 0)
      cast.play(curly, pose.clip, playbackRate(pose.clip, pose.speed))
      // His head turns ahead of his body: applied over the clip's pose, after the animation has run this frame.
      const head = headOf(curly)
      if (head && Math.abs(pose.head) > 1e-3) {
        turn.setFromEulerAngles(0, (pose.head * 180) / Math.PI, 0)
        head.setRotation(turn.mul(head.getRotation()))
      }
    }

    cone.enabled = coneOn && !winter
    if (cone.enabled) {
      cone.setLocalPosition(pose.at.x, groundY(pose.at.x, pose.at.z), pose.at.z)
      cone.setLocalEulerAngles(0, (gaze(pose) * 180) / Math.PI, 0)
      const mi = cone.render?.meshInstances[0]
      if (mi) mi.material = !pose.eyes ? coneMats[0] : seen(gm) ? coneMats[2] : coneMats[1]
    }

    const h = hiding(gm)
    board.setLocalEulerAngles(h?.spot === 'stove' ? -70 * h.tool : 0, 0, 0)
    hatch.setLocalEulerAngles(0, h?.spot === 'cache' ? -100 * h.tool : 0, 0)
    shovel.enabled = h?.spot === 'marker'
    if (h?.spot === 'marker') {
      const k = h.tool
      shovel.setLocalPosition(MARKER_AT.x + 0.15, groundY(MARKER_AT.x, MARKER_AT.z + 0.55) + 0.35 + 0.15 * k, MARKER_AT.z + 0.55)
      shovel.setLocalEulerAngles(-25 - 30 * k, 0, 0)
    }
  }

  const dispose = (): void => {
    alive.on = false
    materials.forEach((m) => m.destroy())
    textures.forEach((x) => x.destroy())
  }

  return { sync, dispose }
}
