// Rebuilds game/public/props from game/assets/environment.json: CC0 props from Poly Haven, and procedural buildings
// dressed with CC0 materials. Sources are downloaded once into game/.cache/assets and checked against the pinned MD5s.
// Run through `make generate/assets`; see docs/art/pipeline.md.
import { createHash } from 'node:crypto'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import { NodeIO } from '@gltf-transform/core'
import type { Document } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, meshopt, prune, textureCompress } from '@gltf-transform/functions'
import { MeshoptEncoder } from 'meshoptimizer'
import sharp from 'sharp'
import type { FalseFront, MaterialId, Surface } from './procedural.ts'
import { buildDocument, falseFrontPieces } from './procedural.ts'

type Pinned = Readonly<{ asset: string; resolution: string; files: Readonly<Record<string, string>> }>
type Prop = Pinned
type CC0Material = Pinned & Readonly<{ tileMeters: number }>
type Building = FalseFront & Readonly<{ kind: 'falseFront'; material: string; surfaces: Readonly<Record<MaterialId, Surface>> }>
type Manifest = Readonly<{
  props: Readonly<Record<string, Prop>>
  materials: Readonly<Record<string, CC0Material>>
  buildings: Readonly<Record<string, Building>>
}>

const here = dirname(fileURLToPath(import.meta.url))
const manifestPath = join(here, '..', 'assets', 'environment.json')
const cacheDir = join(here, '..', '.cache', 'assets')
const outDir = join(here, '..', 'public', 'props')
const API = 'https://api.polyhaven.com/files/'

// Prop textures stay at their 1k source size (hero-prop density, 512 px/m or more on a 1 m prop); tiling
// architecture materials drop to 512 px, about 330 px/m on the 1.57 m siding tile (target 256 px/m).
const PROP_TEXTURE = 1024
const TILING_TEXTURE = 512

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder })

const exists = (p: string): Promise<boolean> => stat(p).then(() => true, () => false)
const md5 = (b: Uint8Array): string => createHash('md5').update(b).digest('hex')

const fetchJson = async (url: string): Promise<unknown> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} fetching ${url}`)
  return res.json()
}

const fetchPinned = async (url: string, path: string, want: string): Promise<Uint8Array> => {
  if (!(await exists(path))) {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`${res.status} fetching ${url}`)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, Buffer.from(await res.arrayBuffer()))
  }
  const bytes = new Uint8Array(await readFile(path))
  if (md5(bytes) !== want) throw new Error(`${path}: MD5 ${md5(bytes)}, pinned ${want}; the source changed upstream`)
  return bytes
}

type FileEntry = Readonly<{ url: string; md5: string; include?: Readonly<Record<string, { url: string; md5: string }>> }>
type PolyHavenFiles = Readonly<Record<string, Readonly<Record<string, Readonly<Record<string, FileEntry>>>>>>

// Model sources: the .gltf plus everything it includes, laid out as the .gltf expects. Returns the .gltf path.
const fetchModel = async (p: Prop): Promise<Readonly<{ path: string; bytes: number }>> => {
  const files = (await fetchJson(API + p.asset)) as PolyHavenFiles
  const gltf = files.gltf[p.resolution].gltf
  const dir = join(cacheDir, p.asset)
  const name = `${p.asset}_${p.resolution}.gltf`
  const entries = [[name, gltf] as const, ...Object.entries(gltf.include ?? {})]
  const missing = Object.keys(p.files).filter((k) => !entries.some(([rel]) => rel === k))
  if (missing.length > 0 || entries.length !== Object.keys(p.files).length) throw new Error(`${p.asset}: file list changed upstream`)
  const all = await Promise.all(entries.map(([rel, e]) => fetchPinned(e.url, join(dir, rel), p.files[rel])))
  return { path: join(dir, name), bytes: all.reduce((n, b) => n + b.length, 0) }
}

const fetchMaterial = async (m: CC0Material): Promise<Readonly<Record<string, Uint8Array>>> => {
  const files = (await fetchJson(API + m.asset)) as PolyHavenFiles
  const keys = { diff: 'Diffuse', nor_gl: 'nor_gl', arm: 'arm' } as const
  const entries = await Promise.all(
    (Object.keys(keys) as (keyof typeof keys)[]).map(async (k) => {
      const e = files[keys[k]][m.resolution].jpg
      return [k, await fetchPinned(e.url, join(cacheDir, m.asset, `${k}_${m.resolution}.jpg`), m.files[k])] as const
    }),
  )
  return Object.fromEntries(entries)
}

const webp = (jpg: Uint8Array, size: number): Promise<Uint8Array> =>
  sharp(jpg).resize(size, size, { fit: 'inside' }).webp({ quality: 85 }).toBuffer().then((b) => new Uint8Array(b))

const triangles = (doc: Document): number =>
  doc.getRoot().listMeshes().flatMap((m) => m.listPrimitives())
    .reduce((n, p) => n + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION')?.getCount() ?? 0) / 3, 0)

type Row = Readonly<{ id: string; route: string; ms: number; source: number; plain: number; out: number; gzip: number; tris: number }>

// The shared finish for every model: prune, dedup, then quantize and meshopt-compress the geometry. Writes the
// .glb and reports its size with and without meshopt.
const finish = async (id: string, route: string, doc: Document, source: number, started: number): Promise<Row> => {
  await doc.transform(prune(), dedup())
  const tris = triangles(doc)
  const plain = (await io.writeBinary(doc)).length
  await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'medium' }))
  const glb = await io.writeBinary(doc)
  await mkdir(outDir, { recursive: true })
  await writeFile(join(outDir, `${id}.glb`), glb)
  return { id, route, ms: performance.now() - started, source, plain, out: glb.length, gzip: gzipSync(glb).length, tris }
}

const prop = async (id: string, p: Prop): Promise<Row> => {
  const started = performance.now()
  const src = await fetchModel(p)
  const doc = await io.read(src.path)
  await doc.transform(textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [PROP_TEXTURE, PROP_TEXTURE] }))
  return finish(id, `CC0 ${p.asset}`, doc, src.bytes, started)
}

const building = async (id: string, b: Building, materials: Manifest['materials']): Promise<Row> => {
  const started = performance.now()
  const m = materials[b.material]
  if (!m) throw new Error(`${id}: no material ${b.material}`)
  const jpgs = await fetchMaterial(m)
  const [baseColor, normal, orm] = await Promise.all([jpgs.diff, jpgs.nor_gl, jpgs.arm].map((j) => webp(j, TILING_TEXTURE)))
  const doc = buildDocument(id, falseFrontPieces(b), b.surfaces, { baseColor, normal, orm, mimeType: 'image/webp', tileMeters: m.tileMeters })
  const source = Object.values(jpgs).reduce((n, j) => n + j.length, 0)
  return finish(id, `procedural ${b.kind} + CC0 ${m.asset}`, doc, source, started)
}

const kb = (n: number): string => `${(n / 1024).toFixed(0)} KB`

const main = async (): Promise<void> => {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as Manifest
  const rows = [
    ...(await Promise.all(Object.entries(manifest.props).map(([id, p]) => prop(id, p)))),
    ...(await Promise.all(Object.entries(manifest.buildings).map(([id, b]) => building(id, b, manifest.materials)))),
  ]
  console.log('| Asset | Route | Time | Source | No meshopt | Shipped | Gzipped | Triangles |')
  console.log('| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |')
  rows.forEach((r) =>
    console.log(`| \`${r.id}\` | ${r.route} | ${(r.ms / 1000).toFixed(1)} s | ${kb(r.source)} | ${kb(r.plain)} | ${kb(r.out)} | ${kb(r.gzip)} | ${r.tris.toLocaleString('en-US')} |`),
  )
}

await main()
