import * as pc from 'playcanvas'
import { MeshoptDecoder } from 'meshoptimizer'

// The glTF loader for every model in the game. PlayCanvas reads glTF 2.0, KHR_mesh_quantization and WebP itself;
// EXT_meshopt_compression it does not, so each compressed buffer view is decoded here through the parser's
// bufferView hook. See docs/art/pipeline.md#formats-and-compression.

type MeshoptView = Readonly<{
  buffer: number
  byteOffset?: number
  byteLength: number
  byteStride: number
  count: number
  mode: 'ATTRIBUTES' | 'TRIANGLES' | 'INDICES'
  filter?: 'NONE' | 'OCTAHEDRAL' | 'QUATERNION' | 'EXPONENTIAL'
}>

export type BufferView = Readonly<{ extensions?: Readonly<{ EXT_meshopt_compression?: MeshoptView }> }>

// Decodes one buffer view, or resolves null for a view that is not meshopt-compressed (PlayCanvas then slices it).
export const decodeView = async (view: BufferView, buffers: ReadonlyArray<Promise<Uint8Array>>): Promise<Uint8Array | null> => {
  const ext = view.extensions?.EXT_meshopt_compression
  if (!ext) return null
  const [source] = await Promise.all([buffers[ext.buffer], MeshoptDecoder.ready])
  const bytes = new Uint8Array(source.buffer, source.byteOffset + (ext.byteOffset ?? 0), ext.byteLength)
  const target = new Uint8Array(ext.count * ext.byteStride)
  MeshoptDecoder.decodeGltfBuffer(target, ext.count, ext.byteStride, bytes, ext.mode, ext.filter)
  return target
}

const containerOptions = {
  bufferView: {
    processAsync: (view: BufferView, buffers: Promise<Uint8Array>[], done: (err: unknown, result: Uint8Array | null) => void) => {
      decodeView(view, buffers).then((r) => done(null, r), (err: unknown) => done(err, null))
    },
  },
}

export const loadContainer = (app: pc.Application, url: string): Promise<pc.Asset> =>
  new Promise((resolve, reject) => {
    const asset = new pc.Asset(url, 'container', { url }, undefined, containerOptions as unknown as Record<string, unknown>)
    asset.once('load', () => resolve(asset))
    asset.once('error', (err: unknown) => reject(new Error(`${url}: ${String(err)}`)))
    app.assets.add(asset)
    app.assets.load(asset)
  })

export const propUrl = (base: string, id: string): string => `${base}props/${id}.glb`

// A fresh root per instance: the container's own root may carry the dequantization transform, which placing the
// prop must not overwrite.
export const spawnProp = (asset: pc.Asset, name: string): pc.Entity => {
  const root = new pc.Entity(name)
  root.tags.add('prop')
  root.addChild((asset.resource as pc.ContainerResource).instantiateRenderEntity({ castShadows: true, receiveShadows: true }))
  return root
}
