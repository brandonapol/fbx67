import { mkdir, readFile, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { NodeIO } from '@gltf-transform/core'
import type { Document } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, prune, quantize, textureCompress } from '@gltf-transform/functions'
import sharp from 'sharp'
import { cachedFetcher } from './fetchCache.ts'

type Source = Readonly<{ url: string; job: string }>
type Character = Source & Readonly<{ name: string; image: string; heightMeters: number }>
type Clip = Source & Readonly<{ action: number; name: string; rootMotion: boolean }>
type Manifest = Readonly<{
  sourceHeightMeters: number
  characters: Readonly<Record<string, Character>>
  clips: Readonly<Record<string, Clip>>
}>

const here = dirname(fileURLToPath(import.meta.url))
const manifestPath = join(here, '..', 'assets', 'characters.json')
const cacheDir = join(here, '..', '.cache', 'characters')
const outDir = join(here, '..', 'public', 'characters')

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)

const fetchTo = cachedFetcher()

const dropEmissive = (doc: Document): Document => {
  doc.getRoot().listMaterials().forEach((m) => {
    m.setEmissiveTexture(null)
    m.setEmissiveFactor([0, 0, 0])
  })
  return doc
}

const dropMeshes = (doc: Document): Document => {
  doc.getRoot().listNodes().forEach((n) => n.setMesh(null))
  doc.getRoot().listMeshes().forEach((m) => m.dispose())
  doc.getRoot().listMaterials().forEach((m) => m.dispose())
  doc.getRoot().listTextures().forEach((t) => t.dispose())
  return doc
}

const pinRootXZ = (doc: Document, rootName: string): Document => {
  doc.getRoot().listAnimations().forEach((anim) =>
    anim.listChannels()
      .filter((c) => c.getTargetPath() === 'translation' && c.getTargetNode()?.getName() === rootName)
      .forEach((c) => {
        const out = c.getSampler()?.getOutput()
        const values = out?.getArray()
        if (!out || !values) return
        const source = Array.from(values as ArrayLike<number>)
        const [x0, z0] = [source[0], source[2]]
        out.setArray(new Float32Array(source.map((v, i) => (i % 3 === 0 ? x0 : i % 3 === 2 ? z0 : v))))
      }),
  )
  return doc
}

const rotationsOnly = (doc: Document, rootName: string): Document => {
  doc.getRoot().listAnimations().forEach((anim) =>
    anim.listChannels()
      .filter((c) => c.getTargetPath() === 'scale' || (c.getTargetPath() === 'translation' && c.getTargetNode()?.getName() !== rootName))
      .forEach((c) => {
        c.getSampler()?.dispose()
        c.dispose()
      }),
  )
  return doc
}

type Quat = readonly [number, number, number, number]

const qmul = (a: Quat, b: Quat): Quat => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
]

const qinv = (q: Quat): Quat => [-q[0], -q[1], -q[2], q[3]]

type Rest = Readonly<{ rotations: ReadonlyMap<string, Quat>; hips: readonly [number, number, number] }>

const restOf = (doc: Document, rootName: string): Rest => {
  const nodes = doc.getRoot().listNodes()
  const hipsNode = nodes.find((n) => n.getName() === rootName)
  const t = hipsNode?.getTranslation() ?? [0, 0, 0]
  return {
    rotations: new Map(nodes.map((n) => [n.getName(), n.getRotation() as unknown as Quat] as const)),
    hips: [t[0], t[1], t[2]],
  }
}

const retarget = (doc: Document, source: Rest, target: Rest, scale: number, rootName: string): Document => {
  doc.getRoot().listAnimations().forEach((anim) =>
    anim.listChannels().forEach((c) => {
      const name = c.getTargetNode()?.getName() ?? ''
      const out = c.getSampler()?.getOutput()
      const arr = out?.getArray()
      if (!out || !arr) return
      const values = Array.from(arr as ArrayLike<number>)
      if (c.getTargetPath() === 'rotation') {
        const sb = source.rotations.get(name)
        const tb = target.rotations.get(name)
        if (!sb || !tb) return
        const fromRest = qmul(qinv(sb), tb)
        const next = Array.from({ length: values.length / 4 }, (_, i) =>
          qmul(values.slice(i * 4, i * 4 + 4) as unknown as Quat, fromRest),
        ).flat()
        out.setArray(new Float32Array(next))
      }
      if (c.getTargetPath() === 'translation' && name === rootName) {
        const next = values.map((v, i) => target.hips[i % 3] + (v - source.hips[i % 3]) * scale)
        out.setArray(new Float32Array(next))
      }
    }),
  )
  return doc
}

const nameClips = (doc: Document, name: string): Document => {
  doc.getRoot().listAnimations().forEach((a) => a.setName(name))
  return doc
}

const characterRest = async (id: string, c: Character): Promise<Rest> =>
  restOf(await io.read(await fetchTo(c.url, join(cacheDir, `${id}.glb`))), 'Hips')

const character = async (id: string, c: Character): Promise<string> => {
  const raw = await fetchTo(c.url, join(cacheDir, `${id}.glb`))
  const doc = dropEmissive(await io.read(raw))
  doc.getRoot().listAnimations().forEach((a) => a.dispose())
  await doc.transform(
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024], slots: /^(?!baseColor)/ }),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [2048, 2048], slots: /^baseColor/ }),
    prune(),
    dedup(),
    quantize({ quantizeNormal: 10, quantizeTexcoord: 14, quantizePosition: 14 }),
  )
  const out = join(outDir, `${id}.glb`)
  await io.write(out, doc)
  return out
}

const clip = async (id: string, c: Clip, who: string, target: Rest, scale: number): Promise<string> => {
  const raw = await fetchTo(c.url, join(cacheDir, 'clips', `${id}.glb`))
  const source = await io.read(raw)
  const rest = restOf(source, 'Hips')
  const doc = rotationsOnly(nameClips(dropMeshes(source), id), 'Hips')
  const pinned = c.rootMotion ? pinRootXZ(doc, 'Hips') : doc
  const shaped = retarget(pinned, rest, target, scale, 'Hips')
  await shaped.transform(prune({ keepLeaves: true }), dedup())
  const out = join(outDir, 'anims', who, `${id}.glb`)
  await mkdir(dirname(out), { recursive: true })
  await io.write(out, shaped)
  return out
}

const sizeOf = async (p: string): Promise<string> => `${p.replace(outDir + '/', '')} ${((await stat(p)).size / 1024).toFixed(0)} KB`

const main = async (): Promise<void> => {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Manifest
  await mkdir(outDir, { recursive: true })
  const cast = Object.entries(manifest.characters)
  const meshes = await Promise.all(cast.map(([id, c]) => character(id, c)))
  const clips = await Promise.all(
    cast.map(async ([who, c]) => {
      const rest = await characterRest(who, c)
      const scale = c.heightMeters / manifest.sourceHeightMeters
      return Promise.all(Object.entries(manifest.clips).map(([id, k]) => clip(id, k, who, rest, scale)))
    }),
  )
  const outs = [...meshes, ...clips.flat()]
  console.log((await Promise.all(outs.map(sizeOf))).join('\n'))
}

await main()
