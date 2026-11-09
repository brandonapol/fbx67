// Loads viewer.html in headless Chromium (software GL, as CI) and prints what the generated assets cost in engine:
// load time per asset, bytes fetched, draw calls, triangles and texture memory. Also reports what meshopt would save
// on the shipped characters. `make test/assets`; SHOT=<file.png> saves the frame.
import { readdir, readFile, stat } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { meshopt } from '@gltf-transform/functions'
import { MeshoptEncoder } from 'meshoptimizer'
import { createServer } from 'vite'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright') as typeof import('playwright')

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const mb = (n: number): string => `${(n / 1e6).toFixed(2)} MB`
const kb = (n: number): string => `${(n / 1024).toFixed(0)} KB`

type Stats = Readonly<{ loads: readonly { id: string; ms: number }[]; drawCalls: number; triangles: number; textureBytes: number }>

const inEngine = async (): Promise<void> => {
  const server = await createServer({ configFile: join(root, 'vite.config.ts'), logLevel: 'error', server: { port: 0 } })
  await server.listen()
  const url = `${server.resolvedUrls?.local[0]}viewer.html`
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
  try {
    const page = await browser.newPage({ viewport: { width: 960, height: 600 } })
    const errors: string[] = []
    const fetched: { url: string; bytes: number }[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    page.on('requestfinished', async (r) => {
      if (!r.url().endsWith('.glb')) return
      fetched.push({ url: r.url(), bytes: (await r.sizes()).responseBodySize })
    })
    await page.goto(url)
    await page.waitForFunction('window.__viewer !== undefined', undefined, { timeout: 120_000 })
    const stats = (await page.evaluate('window.__viewer')) as Stats
    if (errors.length > 0) throw new Error(errors.join('\n'))
    if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT })
    stats.loads.forEach((l) => console.log(`load ${l.id}: ${l.ms} ms`))
    const props = fetched.filter((f) => f.url.includes('/props/'))
    const chars = fetched.filter((f) => f.url.includes('/characters/'))
    console.log(`fetched props: ${props.length} files, ${mb(props.reduce((n, f) => n + f.bytes, 0))}`)
    console.log(`fetched cast: ${chars.length} files, ${mb(chars.reduce((n, f) => n + f.bytes, 0))}`)
    console.log(`draw calls ${stats.drawCalls}, triangles ${stats.triangles.toLocaleString('en-US')}, texture memory ${mb(stats.textureBytes)}`)
  } finally {
    await browser.close()
    await server.close()
  }
}

// What meshopt would do to the shipped cast, which is quantized but not meshopt-compressed today.
const castSavings = async (): Promise<void> => {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder })
  const dir = join(root, 'public', 'characters')
  const files = [
    ...(await readdir(dir)).filter((f) => f.endsWith('.glb')).map((f) => join(dir, f)),
    ...(await readdir(join(dir, 'anims', 'curly'))).map((f) => join(dir, 'anims', 'curly', f)),
  ]
  const rows = await Promise.all(
    files.map(async (f) => {
      const before = (await stat(f)).size
      const gzBefore = gzipSync(await readFile(f)).length
      const doc = await io.read(f)
      await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'medium' }))
      const after = await io.writeBinary(doc)
      return { f: f.replace(dir + '/', ''), before, gzBefore, after: after.length, gzAfter: gzipSync(after).length }
    }),
  )
  console.log('| Cast file | Today | Today gzipped | Meshopt | Meshopt gzipped |')
  console.log('| --- | ---: | ---: | ---: | ---: |')
  rows.forEach((r) => console.log(`| \`${r.f}\` | ${kb(r.before)} | ${kb(r.gzBefore)} | ${kb(r.after)} | ${kb(r.gzAfter)} |`))
  const decoder = await readFile(join(root, 'node_modules', 'meshoptimizer', 'meshopt_decoder.mjs'))
  console.log(`meshopt decoder: ${kb(decoder.length)}, ${kb(gzipSync(decoder).length)} gzipped`)
}

await castSavings()
await inEngine()
