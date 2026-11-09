// Procedural building kit: pure functions from parameters to a glTF document. No randomness, so the same
// parameters always give the same bytes. Units are meters, +y up, the street front faces -z.
import { Document } from '@gltf-transform/core'
import type { Material, Texture } from '@gltf-transform/core'

type V3 = readonly [number, number, number]

export type MaterialId = 'siding' | 'trim' | 'roof' | 'glass'

// One piece is a hexahedron: four bottom corners then the four top corners above them, counterclockwise from below
// starting at the front-left. Boxes and roof slabs are both pieces.
export type Piece = Readonly<{ material: MaterialId; corners: readonly [V3, V3, V3, V3, V3, V3, V3, V3] }>

export type Opening = Readonly<{ kind: 'door' | 'window'; x: number; width: number; sill: number; height: number }>

export type FalseFront = Readonly<{
  width: number
  depth: number
  wallHeight: number
  roofPitchDegrees: number
  frontHeight: number
  wall: number
  openings: readonly Opening[]
}>

export type Surface = Readonly<{ baseColor: readonly [number, number, number]; roughness: number; metallic: number }>

export type Textures = Readonly<{ baseColor: Uint8Array; normal: Uint8Array; orm: Uint8Array; mimeType: string; tileMeters: number }>

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const norm = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2])
  return [a[0] / l, a[1] / l, a[2] / l]
}

export const box = (material: MaterialId, min: V3, max: V3): Piece => {
  const [x0, y0, z0] = min
  const [x1, y1, z1] = max
  return {
    material,
    corners: [
      [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1],
      [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1],
    ],
  }
}

// Face corner indices, each counterclockwise seen from outside.
const FACES = [
  [0, 1, 2, 3], // bottom
  [4, 7, 6, 5], // top
  [0, 4, 5, 1], // front
  [3, 2, 6, 7], // back
  [0, 3, 7, 4], // left
  [1, 5, 6, 2], // right
] as const

// Tangent frame for world-space UVs: on walls u runs along the wall and v up it, so planks stay level and line up
// across pieces; on near-flat faces u runs along x.
const frame = (n: V3): readonly [V3, V3] => {
  const up: V3 = [0, 1, 0]
  const t = Math.abs(dot(n, up)) < 0.9 ? norm(cross(up, n)) : norm(cross(n, [0, 0, 1]))
  return [t, cross(n, t)]
}

export type Geometry = Readonly<{
  positions: Float32Array
  normals: Float32Array
  tangents: Float32Array
  uvs: Float32Array
  indices: Uint16Array
}>

export const geometry = (pieces: readonly Piece[], tileMeters: number): Geometry => {
  const quads = pieces.flatMap((p) =>
    FACES.map((f) => {
      const q = f.map((i) => p.corners[i])
      const n = norm(cross(sub(q[1], q[0]), sub(q[2], q[0])))
      const [t, b] = frame(n)
      return { q, n, t, uv: q.map((c) => [dot(c, t) / tileMeters, -dot(c, b) / tileMeters] as const) }
    }),
  )
  return {
    positions: new Float32Array(quads.flatMap((x) => x.q.flat())),
    normals: new Float32Array(quads.flatMap((x) => [x.n, x.n, x.n, x.n].flat())),
    tangents: new Float32Array(quads.flatMap((x) => Array.from({ length: 4 }, () => [...x.t, 1]).flat())),
    uvs: new Float32Array(quads.flatMap((x) => x.uv.flat())),
    indices: new Uint16Array(quads.flatMap((_, i) => [0, 1, 2, 0, 2, 3].map((k) => i * 4 + k))),
  }
}

export const ridgeHeight = (b: FalseFront): number => b.wallHeight + (b.width / 2) * Math.tan((b.roofPitchDegrees * Math.PI) / 180)

// Splits the front wall around its openings: a full-height column between openings, and a piece below and above
// each one. Glass and doors sit 5 cm behind the wall face.
const frontWall = (b: FalseFront): Piece[] => {
  const sorted = [...b.openings].sort((p, q) => p.x - q.x)
  const edges = [0, ...sorted.flatMap((o) => [o.x, o.x + o.width]), b.width]
  const columns = Array.from({ length: edges.length / 2 }, (_, i) => [edges[i * 2], edges[i * 2 + 1]] as const)
    .filter(([a, c]) => c > a)
    .map(([a, c]) => box('siding', [a, 0, 0], [c, b.frontHeight, b.wall]))
  const around = sorted.flatMap((o) => [
    ...(o.sill > 0 ? [box('siding', [o.x, 0, 0], [o.x + o.width, o.sill, b.wall])] : []),
    box('siding', [o.x, o.sill + o.height, 0], [o.x + o.width, b.frontHeight, b.wall]),
    box(o.kind === 'window' ? 'glass' : 'trim', [o.x, o.sill, b.wall - 0.07], [o.x + o.width, o.sill + o.height, b.wall - 0.05]),
    box('trim', [o.x - 0.08, o.sill + o.height, -0.04], [o.x + o.width + 0.08, o.sill + o.height + 0.12, 0]),
  ])
  return [...columns, ...around]
}

const roof = (b: FalseFront): Piece[] => {
  const ridge = ridgeHeight(b)
  const slab = 0.12
  const eave = 0.3
  const drop = (eave * (ridge - b.wallHeight)) / (b.width / 2)
  const z0 = b.wall
  const z1 = b.depth + eave
  const half = (x0: number, x1: number): Piece => {
    const [ya, yb] = x0 < x1 ? [b.wallHeight - drop, ridge] : [ridge, b.wallHeight - drop]
    return {
      material: 'roof',
      corners: [
        [x0, ya, z0], [x1, yb, z0], [x1, yb, z1], [x0, ya, z1],
        [x0, ya + slab, z0], [x1, yb + slab, z0], [x1, yb + slab, z1], [x0, ya + slab, z1],
      ],
    }
  }
  return [half(-eave, b.width / 2), half(b.width / 2, b.width + eave)]
}

export const falseFrontPieces = (b: FalseFront): Piece[] => {
  if (ridgeHeight(b) + 0.12 >= b.frontHeight) throw new Error(`false front ${b.frontHeight} m must hide the ridge at ${ridgeHeight(b).toFixed(2)} m`)
  b.openings.forEach((o) => {
    if (o.x < 0.2 || o.x + o.width > b.width - 0.2) throw new Error(`opening at x ${o.x} does not fit a ${b.width} m front`)
    if (o.sill + o.height > b.wallHeight) throw new Error(`opening at x ${o.x} is taller than the wall`)
  })
  const w = b.wall
  return [
    ...frontWall(b),
    box('siding', [0, 0, b.depth - w], [b.width, b.wallHeight, b.depth]),
    box('siding', [0, 0, w], [w, b.wallHeight, b.depth - w]),
    box('siding', [b.width - w, 0, w], [b.width, b.wallHeight, b.depth - w]),
    box('trim', [-0.1, b.frontHeight, -0.15], [b.width + 0.1, b.frontHeight + 0.18, w]),
    box('trim', [-0.05, 0, -0.05], [b.width + 0.05, 0.25, 0]),
    ...roof(b),
  ]
}

const materialFor = (doc: Document, id: MaterialId, s: Surface, tex: Textures | undefined): Material => {
  const m = doc.createMaterial(id).setBaseColorFactor([...s.baseColor, 1]).setRoughnessFactor(s.roughness).setMetallicFactor(s.metallic)
  if (id !== 'siding' || !tex) return m
  const texture = (name: string, image: Uint8Array): Texture => doc.createTexture(name).setImage(image).setMimeType(tex.mimeType)
  const orm = texture('siding_arm', tex.orm)
  return m
    .setBaseColorTexture(texture('siding_diff', tex.baseColor))
    .setNormalTexture(texture('siding_nor', tex.normal))
    .setOcclusionTexture(orm)
    .setMetallicRoughnessTexture(orm)
}

// One node, one mesh, one primitive per material in use.
export const buildDocument = (
  name: string,
  pieces: readonly Piece[],
  surfaces: Readonly<Record<MaterialId, Surface>>,
  tex?: Textures,
): Document => {
  const doc = new Document()
  const buffer = doc.createBuffer()
  const mesh = doc.createMesh(name)
  const ids = [...new Set(pieces.map((p) => p.material))]
  ids.forEach((id) => {
    const g = geometry(pieces.filter((p) => p.material === id), tex?.tileMeters ?? 1)
    const acc = (type: 'VEC2' | 'VEC3' | 'VEC4' | 'SCALAR', array: Float32Array | Uint16Array) =>
      doc.createAccessor().setType(type).setArray(array).setBuffer(buffer)
    mesh.addPrimitive(
      doc.createPrimitive()
        .setAttribute('POSITION', acc('VEC3', g.positions))
        .setAttribute('NORMAL', acc('VEC3', g.normals))
        .setAttribute('TANGENT', acc('VEC4', g.tangents))
        .setAttribute('TEXCOORD_0', acc('VEC2', g.uvs))
        .setIndices(acc('SCALAR', g.indices))
        .setMaterial(materialFor(doc, id, surfaces[id], tex)),
    )
  })
  doc.createScene(name).addChild(doc.createNode(name).setMesh(mesh))
  return doc
}
