import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import * as pc from 'playcanvas'
import { MeshoptEncoder } from 'meshoptimizer'
import type { BufferView } from './props.ts'
import { decodeView, propUrl, spawnProp } from './props.ts'

const glbChunks = (path: string): { json: { bufferViews: BufferView[]; buffers: unknown[] }; bin: Uint8Array } => {
  const b = readFileSync(new URL(path, import.meta.url))
  const jsonLength = b.readUInt32LE(12)
  const json = JSON.parse(b.subarray(20, 20 + jsonLength).toString('utf8'))
  const binStart = 20 + jsonLength
  const bin = new Uint8Array(b.buffer, b.byteOffset + binStart + 8, b.readUInt32LE(binStart))
  return { json, bin }
}

test('decodeView restores a meshopt-encoded vertex stream byte for byte', async () => {
  await MeshoptEncoder.ready
  const count = 64
  const stride = 12
  const source = new Uint8Array(count * stride).map((_, i) => (i * 37) % 251)
  const encoded = MeshoptEncoder.encodeGltfBuffer(source, count, stride, 'ATTRIBUTES')
  const view = { extensions: { EXT_meshopt_compression: { buffer: 0, byteLength: encoded.length, byteStride: stride, count, mode: 'ATTRIBUTES' as const } } }
  assert.deepEqual(await decodeView(view, [Promise.resolve(encoded)]), source)
})

test('decodeView leaves an uncompressed view to PlayCanvas', async () => {
  assert.equal(await decodeView({}, []), null)
})

for (const id of ['crate', 'jerrycan', 'storefront']) {
  test(`every compressed view in the shipped ${id}.glb decodes to its declared size`, async () => {
    const { json, bin } = glbChunks(`../public/props/${id}.glb`)
    const compressed = json.bufferViews.filter((v) => v.extensions?.EXT_meshopt_compression)
    assert.ok(compressed.length > 0, `${id}.glb has no meshopt views; rerun make generate/assets`)
    // Buffer 0 is the GLB binary chunk; the meshopt fallback buffer has no bytes and is never read.
    const buffers = json.buffers.map(() => Promise.resolve(bin))
    for (const v of compressed) {
      const ext = v.extensions?.EXT_meshopt_compression
      const out = await decodeView(v, buffers)
      assert.equal(out?.length, (ext?.count ?? 0) * (ext?.byteStride ?? 0))
    }
  })
}

test('placing a prop keeps the dequantization transform on the model root', () => {
  // Meshopt-quantized models carry a scale and offset on their root node; overwriting it moved the storefront
  // half its size off its spot.
  const model = new pc.Entity('model')
  model.setLocalPosition(3.6, 3, 6)
  model.setLocalScale(3.7, 3.7, 3.7)
  const asset = { resource: { instantiateRenderEntity: () => model } } as unknown as pc.Asset
  const prop = spawnProp(asset, 'storefront')
  prop.setPosition(10, 0, -2)
  prop.setEulerAngles(0, 90, 0)
  assert.deepEqual([...model.getLocalPosition().toArray([])], [3.6, 3, 6])
  assert.ok(Math.abs(model.getLocalScale().x - 3.7) < 1e-6)
  assert.equal(prop.name, 'storefront')
})

test('propUrl puts props under the build base', () => {
  assert.equal(propUrl('/fbx67/play/', 'crate'), '/fbx67/play/props/crate.glb')
})
