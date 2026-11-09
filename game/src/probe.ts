import type * as pc from 'playcanvas'
import type { SpaceId } from './levels.ts'
import type { Game } from './prologue.ts'
import type { Shot, View } from './render.ts'
import type { Vec } from './world.ts'
import { vec } from './world.ts'

// heat, when set, overrides the story's heat for the frame, so one shot can show each moral-weather band.
export type Pose = Readonly<{ space: SpaceId; pos: Vec; facing: number; t: number; shot: Shot; heat?: number }>

export const poses: Readonly<Record<string, Pose>> = {
  bar: { space: 'bar', pos: vec(0, 3.9), facing: Math.PI, t: 0, shot: { eye: [0, 9.5, 9.5], at: [0, 0.9, 0] } },
  round: { space: 'bar', pos: vec(-1.5, -2.2), facing: Math.PI, t: 0, shot: { eye: [3.5, 5.5, 4.5], at: [-1.5, 1, -2.6] } },
  // From the hall through the parlor doorway: the landlady by the radio, the boarder, the sofa and the lamp.
  parlor: { space: 'boarding', pos: vec(-0.8, 4.0), facing: -Math.PI / 2, t: 0, shot: { eye: [0.7, 1.9, 3.7], at: [-5.5, 1.0, 3.3] } },
  letter: { space: 'room', pos: vec(0.6, -1.0), facing: Math.PI, t: 0, shot: { eye: [-1.8, 2.4, 2.4], at: [0.8, 1.0, -2.4] } },
  hidden: { space: 'camp', pos: vec(1.8, -7.5), facing: Math.PI, t: 1, shot: { eye: [-2, 4.6, -4.4], at: [1.8, 0.6, -8.4] } },
  skiff: { space: 'flood', pos: vec(0.2, 5.4), facing: 0, t: 0, shot: { eye: [5, 7, 13], at: [0, 1, 3] } },
  // The skiff shot at blue hour and at danger (heat at and past HEAT_LIMIT); 'skiff' itself is alpenglow.
  skiff_dusk: { space: 'flood', pos: vec(0.2, 5.4), facing: 0, t: 0, shot: { eye: [5, 7, 13], at: [0, 1, 3] }, heat: 2 },
  skiff_night: { space: 'flood', pos: vec(0.2, 5.4), facing: 0, t: 0, shot: { eye: [5, 7, 13], at: [0, 1, 3] }, heat: 4 },
  // Act 1's first frame: Wade on the sandbag line, the woman from Minto at his shoulder, the river past the bags.
  line: { space: 'line', pos: vec(0.7, -1.2), facing: Math.PI, t: 0, shot: { eye: [3.2, 2.6, 3.6], at: [0, 1.1, -3] } },
  // Act 1's morning in the drunk tank: Wade in the cell, Barnette at the bars, the desk beyond.
  cell: { space: 'jail', pos: vec(-3.6, 1.4), facing: Math.PI / 2, t: 0, shot: { eye: [-4.6, 2.4, 3.6], at: [-0.5, 1.1, -0.5] } },
  downtown: { space: 'downtown', pos: vec(33, 50.5), facing: Math.PI / 2, t: 0, shot: { eye: [26, 4.5, 50.5], at: [70, 3, 53] } },
  // The same street from the same data on a flood day and late in freeze-up (snow down, cars plugged in, smoke up).
  downtown_flood: { space: 'downtown', pos: vec(33, 50.5), facing: Math.PI / 2, t: 0, shot: { eye: [26, 4.5, 50.5], at: [70, 3, 53], clock: '1967-08-15T12:00' } },
  downtown_freezeup: { space: 'downtown', pos: vec(33, 50.5), facing: Math.PI / 2, t: 0, shot: { eye: [26, 4.5, 50.5], at: [70, 3, 53], clock: '1967-10-28T12:30' } },
  story: { space: 'story', pos: vec(0, 0), facing: Math.PI, t: 0, shot: { eye: [0, 5, 6], at: [0, 0, 0] } },
}

export const WARMUP_FRAMES = 5

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

export type AnimLayerLike = {
  readonly activeState: string | null
  readonly transitioning: boolean
  activeStateCurrentTime: number
  transition: (to: string, time?: number) => void
  update: (dt: number) => void
}

export type AnimLike = Readonly<{ enabled: boolean; layers: readonly AnimLayerLike[] }>

export const freezeAnims = (anims: readonly AnimLike[]): number => {
  const layers = anims.filter((a) => a.enabled).flatMap((a) => a.layers).filter((l) => l.activeState !== null)
  layers.forEach((l) => {
    if (l.transitioning && l.activeState !== null) l.transition(l.activeState, 0)
    l.activeStateCurrentTime = 0
    l.update(0)
  })
  return layers.length
}

export const posed = (g: Game, p: Pose): Game => {
  if (g.space !== p.space) throw new Error(`pose is for ${p.space}, the game is in ${g.space}`)
  const story = p.heat === undefined ? g.story : { ...g.story, heat: p.heat }
  return { ...g, story, pos: p.pos, facing: p.facing, t: p.t, holding: undefined }
}

const triangles = (app: pc.AppBase): number =>
  (app.root.findComponents('render') as pc.RenderComponent[])
    .filter((r) => r.enabled && r.entity.enabled)
    .flatMap((r) => r.meshInstances.filter((mi) => mi.visible))
    .reduce((n, mi) => n + Math.floor((mi.mesh?.primitive[0]?.count ?? 0) / 3), 0)

const hudStyle = 'body[data-capture] > :not(#scene) { visibility: hidden !important; }'

export const installProbe = (view: View, live: Live): void => {
  const app = view.app
  const hold: { saved?: Game } = {}
  const rec: {
    on: boolean
    start: number
    age: number
    space?: SpaceId
    pending?: Pick<Sample, 'space' | 'triangles' | 'cpuMs'>
    samples: Sample[]
  } = { on: false, start: 0, age: 0, samples: [] }

  document.head.append(Object.assign(document.createElement('style'), { textContent: hudStyle }))

  const frames = (n: number): Promise<void> =>
    n <= 0 ? Promise.resolve() : new Promise((done) => app.once('frameend', () => done(frames(n - 1))))

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
    if (!rec.on) return
    const cpuMs = performance.now() - rec.start
    const space = live.get().space
    rec.age = space === rec.space ? rec.age + 1 : 0
    rec.space = space
    if (rec.age >= WARMUP_FRAMES) rec.pending = { space, triangles: triangles(app), cpuMs }
  })

  const capture = async (name: string, at: string = name): Promise<void> => {
    const pose = poses[at]
    if (!pose) throw new Error(`no capture pose named ${at}`)
    const saved = hold.saved ?? live.get()
    hold.saved = saved
    live.set(posed(saved, pose))
    app.timeScale = 0
    document.body.dataset.capture = name
    view.pose(pose.shot)
    view.reset()
    await frames(1)
    freezeAnims(app.root.findComponents('anim') as unknown as AnimLike[])
    await frames(2)
  }

  const release = (): Promise<void> => {
    if (hold.saved) live.set(hold.saved)
    hold.saved = undefined
    view.pose(undefined)
    app.timeScale = 1
    delete document.body.dataset.capture
    view.reset()
    return frames(1)
  }

  const record = (on: boolean): void => {
    rec.on = on
    rec.age = 0
    rec.space = undefined
    rec.pending = undefined
  }

  const w = window as unknown as { __prologue: object }
  w.__prologue = { ...w.__prologue, capture, release, record, samples: () => rec.samples, poses: () => Object.keys(poses) }
}
