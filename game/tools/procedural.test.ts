import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { NodeIO } from '@gltf-transform/core'
import type { FalseFront, Surface } from './procedural.ts'
import { box, buildDocument, falseFrontPieces, geometry, ridgeHeight } from './procedural.ts'

const manifest = JSON.parse(readFileSync(new URL('../assets/environment.json', import.meta.url), 'utf8'))
const storefront = manifest.buildings.storefront as FalseFront & { surfaces: Record<'siding' | 'trim' | 'roof' | 'glass', Surface> }

test('a box is 12 triangles with outward unit normals', () => {
  const g = geometry([box('trim', [0, 0, 0], [1, 2, 3])], 1)
  assert.equal(g.indices.length / 3, 12)
  for (let i = 0; i < g.positions.length; i += 3) {
    const n = [g.normals[i], g.normals[i + 1], g.normals[i + 2]]
    assert.ok(Math.abs(Math.hypot(n[0], n[1], n[2]) - 1) < 1e-6)
    const p = [g.positions[i], g.positions[i + 1], g.positions[i + 2]]
    const centre = [0.5, 1, 1.5]
    const out = p.reduce((s, v, k) => s + (v - centre[k]) * n[k], 0)
    assert.ok(out > 0, `normal at ${p} points inward`)
  }
})

test('triangle winding agrees with the normals', () => {
  const g = geometry(falseFrontPieces(storefront), 1.57)
  for (let t = 0; t < g.indices.length; t += 3) {
    const [a, b, c] = [g.indices[t], g.indices[t + 1], g.indices[t + 2]].map((i) => [0, 1, 2].map((k) => g.positions[i * 3 + k]))
    const u = b.map((v, k) => v - a[k])
    const w = c.map((v, k) => v - a[k])
    const face = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]]
    const n = [0, 1, 2].map((k) => g.normals[g.indices[t] * 3 + k])
    assert.ok(face[0] * n[0] + face[1] * n[1] + face[2] * n[2] > 0)
  }
})

test('the storefront stays inside its lot and its false front hides the roof', () => {
  const g = geometry(falseFrontPieces(storefront), 1.57)
  const xs = g.positions.filter((_, i) => i % 3 === 0)
  const ys = g.positions.filter((_, i) => i % 3 === 1)
  assert.ok(Math.min(...xs) >= -0.31 && Math.max(...xs) <= storefront.width + 0.31)
  assert.ok(Math.min(...ys) >= 0)
  assert.ok(ridgeHeight(storefront) + 0.12 < storefront.frontHeight)
})

test('a false front lower than the ridge is refused', () => {
  assert.throws(() => falseFrontPieces({ ...storefront, frontHeight: 4 }), /must hide the ridge/)
})

test('an opening past the corner board is refused', () => {
  const wide = { ...storefront, openings: [{ kind: 'window' as const, x: 6, width: 2, sill: 0.7, height: 1.8 }] }
  assert.throws(() => falseFrontPieces(wide), /does not fit/)
})

test('the same parameters give the same bytes', async () => {
  const io = new NodeIO()
  const once = () => io.writeBinary(buildDocument('storefront', falseFrontPieces(storefront), storefront.surfaces))
  assert.deepEqual(await once(), await once())
})

test('each material in use is one primitive', () => {
  const doc = buildDocument('storefront', falseFrontPieces(storefront), storefront.surfaces)
  const materials = doc.getRoot().listMeshes()[0].listPrimitives().map((p) => p.getMaterial()?.getName())
  assert.deepEqual(materials.sort(), ['glass', 'roof', 'siding', 'trim'])
})
