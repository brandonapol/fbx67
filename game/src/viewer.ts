// Dev-only asset viewer (`make serve/game`, then /fbx67/play/viewer.html): one procedural building, two CC0 props and
// one rigged, animated character through the game's loaders. `make test/assets/viewer` reads its numbers.
import * as pc from 'playcanvas'
import { loadCast } from './characters.ts'
import { loadContainer, propUrl, spawnProp } from './props.ts'

type Loaded = Readonly<{ id: string; ms: number }>

export type ViewerStats = Readonly<{ loads: readonly Loaded[]; drawCalls: number; triangles: number; textureBytes: number }>

declare global {
  interface Window {
    __viewer?: ViewerStats
  }
}

const base = import.meta.env.BASE_URL
const canvas = document.getElementById('scene') as HTMLCanvasElement
const app = new pc.Application(canvas, {})
app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW)
app.setCanvasResolution(pc.RESOLUTION_AUTO)
app.scene.ambientLight = new pc.Color(0.42, 0.44, 0.47)

const camera = new pc.Entity('camera')
camera.addComponent('camera', { fov: 36, nearClip: 0.1, farClip: 100, clearColor: new pc.Color(0.73, 0.77, 0.79) })
camera.setPosition(3.6, 1.7, -11)
camera.lookAt(3.6, 2.6, 0)
app.root.addChild(camera)

const sun = new pc.Entity('sun')
sun.addComponent('light', { type: 'directional', castShadows: true, shadowDistance: 30, shadowResolution: 2048, intensity: 1.4 })
sun.setEulerAngles(50, 150, 0)
app.root.addChild(sun)

const ground = new pc.Entity('ground')
const dirt = new pc.StandardMaterial()
dirt.diffuse = new pc.Color(0.42, 0.38, 0.32)
dirt.update()
ground.addComponent('render', { type: 'plane', material: dirt })
ground.setLocalScale(40, 1, 40)
app.root.addChild(ground)
app.start()

const timed = async <T>(id: string, f: () => Promise<T>): Promise<readonly [T, Loaded]> => {
  const t = performance.now()
  const r = await f()
  return [r, { id, ms: Math.round(performance.now() - t) }] as const
}

const place = (e: pc.Entity, x: number, z: number, yaw: number): pc.Entity => {
  e.setPosition(x, 0, z)
  e.setEulerAngles(0, yaw, 0)
  app.root.addChild(e)
  return e
}

const [[storefront, a], [crate, b], [jerrycan, c], [cast, d]] = await Promise.all([
  timed('storefront', () => loadContainer(app, propUrl(base, 'storefront'))),
  timed('crate', () => loadContainer(app, propUrl(base, 'crate'))),
  timed('jerrycan', () => loadContainer(app, propUrl(base, 'jerrycan'))),
  timed('cast (4 characters, 40 clips)', () => loadCast(app, base)),
])
place(spawnProp(storefront, 'storefront'), 0, 0, 0)
place(spawnProp(crate, 'crate'), 5.3, -1.0, 12)
place(spawnProp(jerrycan, 'jerrycan'), 6.0, -1.4, -30)
place(cast.spawn('curly'), 2.4, -1.6, 180)

const triangles = (): number =>
  app.root.findComponents('render').flatMap((r) => (r as pc.RenderComponent).meshInstances)
    .reduce((n, mi) => n + (mi.mesh?.primitive[0]?.count ?? 0) / 3, 0)

let frames = 0
app.on('frameupdate', () => {
  frames += 1
  if (frames !== 30) return
  const loads = [a, b, c, d]
  window.__viewer = { loads, drawCalls: app.stats.drawCallCount, triangles: Math.round(triangles()), textureBytes: app.stats.vramTextureBytes }
})
