import type * as pc from 'playcanvas'
import type { SpaceId } from './levels.ts'
import type { Game } from './prologue.ts'
import type { View } from './render.ts'
import type { Vec } from './world.ts'
import { vec } from './world.ts'

type Triple = readonly [number, number, number]

export type Pose = Readonly<{ space: SpaceId; pos: Vec; facing: number; t: number; eye: Triple; at: Triple }>

export const poses: Readonly<Record<string, Pose>> = {
  bar: { space: 'bar', pos: vec(0, 3.9), facing: Math.PI, t: 0, eye: [0, 9.5, 9.5], at: [0, 0.9, 0] },
  round: { space: 'bar', pos: vec(-1.5, -2.2), facing: Math.PI, t: 0, eye: [3.5, 5.5, 4.5], at: [-1.5, 1, -2.6] },
  letter: { space: 'room', pos: vec(1.6, -0.8), facing: Math.PI, t: 0, eye: [-1.5, 6.5, 6], at: [0.6, 0.9, -0.6] },
  hidden: { space: 'camp', pos: vec(1.8, -7.5), facing: Math.PI, t: 1, eye: [0, 26, 16], at: [0, 0, -2] },
  skiff: { space: 'flood', pos: vec(0.2, 5.4), facing: 0, t: 0, eye: [5, 7, 13], at: [0, 1, 3] },
}

export type Sample = Readonly<{
  space: SpaceId
  drawCalls: number
  triangles: number
  textureBytes: number
  vramBytes: number
  cpuMs: number
  frameMs: number
}>

export type Live = Readonly<{ get: () => Game; set: (g: Game) => void }>

export const posed = (g: Game, p: Pose): Game => {
  if (g.space !== p.space) throw new Error(`pose is for ${p.space}, the game is in ${g.space}`)
  return { ...g, pos: p.pos, facing: p.facing, t: p.t, hiding: undefined }
}

const triangles = (app: pc.AppBase): number =>
  (app.root.findComponents('render') as pc.RenderComponent[])
    .filter((r) => r.enabled && r.entity.enabled)
    .flatMap((r) => r.meshInstances.filter((mi) => mi.visible))
    .reduce((n, mi) => n + Math.floor((mi.mesh?.primitive[0]?.count ?? 0) / 3), 0)

const hudStyle = 'body[data-capture] > :not(#scene) { visibility: hidden !important; }'

export const installProbe = (view: View, live: Live): void => {
  const app = view.app
  const hold: { pose?: Pose; saved?: Game } = {}
  const rec: { on: boolean; start: number; pending?: Omit<Sample, 'drawCalls' | 'textureBytes' | 'vramBytes' | 'frameMs'>; samples: Sample[] } = {
    on: false,
    start: 0,
    samples: [],
  }

  document.head.append(Object.assign(document.createElement('style'), { textContent: hudStyle }))

  const frames = (n: number): Promise<void> =>
    n <= 0 ? Promise.resolve() : new Promise((done) => app.once('frameend', () => done(frames(n - 1))))

  app.on('update', () => {
    if (!hold.pose || !hold.saved) return
    const g = posed(hold.saved, hold.pose)
    live.set(g)
    view.sync(g, 0)
    view.camera.setPosition(hold.pose.eye[0], hold.pose.eye[1], hold.pose.eye[2])
    view.camera.lookAt(hold.pose.at[0], hold.pose.at[1], hold.pose.at[2])
  })

  app.on('frameupdate', () => {
    const p = rec.pending
    if (rec.on && p) {
      rec.samples.push({
        ...p,
        drawCalls: app.stats.drawCallCount,
        textureBytes: app.stats.vramTextureBytes,
        vramBytes: app.stats.vramTotalBytes,
        frameMs: app.stats.frameTime,
      })
    }
    rec.pending = undefined
    rec.start = performance.now()
  })

  app.on('frameend', () => {
    if (rec.on) rec.pending = { space: live.get().space, triangles: triangles(app), cpuMs: performance.now() - rec.start }
  })

  const capture = (name: string): Promise<void> => {
    const pose = poses[name]
    if (!pose) throw new Error(`no capture pose named ${name}`)
    hold.saved = hold.saved ?? live.get()
    hold.pose = pose
    app.timeScale = 0
    document.body.dataset.capture = name
    view.reset()
    return frames(3)
  }

  const release = (): Promise<void> => {
    if (hold.saved) live.set(hold.saved)
    hold.pose = undefined
    hold.saved = undefined
    app.timeScale = 1
    delete document.body.dataset.capture
    view.reset()
    return frames(1)
  }

  const record = (on: boolean): void => {
    rec.on = on
    rec.pending = undefined
  }

  const w = window as unknown as { __prologue: object }
  w.__prologue = { ...w.__prologue, capture, release, record, samples: () => rec.samples, poses: () => Object.keys(poses) }
}
