import type { Bus, Volumes } from './mixer.ts'
import { BUSES, LIMITER, STORAGE_KEY, busGains, parseVolumes, serializeVolumes, withVolume } from './mixer.ts'
import type { Gait } from './footsteps.ts'
import { pace, standing, surfaceAt } from './footsteps.ts'
import type { SpaceId } from './levels.ts'
import { spaces } from './levels.ts'
import type { Game } from './prologue.ts'
import type { Event } from './soundscape.ts'
import { arrivals, ducked, holds, soundscapes, sourceAt, walked } from './soundscape.ts'
import type { Buffers, Rand, Voice } from './synth.ts'
import { between, footstep, layerVoice, makeBuffers, mulberry, spot } from './synth.ts'
import type { Vec } from './world.ts'
import { vec } from './world.ts'

export type Status = 'locked' | 'running' | 'suspended' | 'unavailable'

export type Audio = Readonly<{
  unlock: () => void
  sync: (g: Game, dt: number) => void
  volumes: () => Volumes
  setVolume: (bus: Bus, v: number) => void
  status: () => Status
}>

type Placed = Readonly<{ voice: Voice; panner?: PannerNode; at?: Vec; alongX?: boolean }>

type Scene = Readonly<{ space: SpaceId; fades: readonly GainNode[]; placed: readonly Placed[]; next: number[] }>

type Graph = Readonly<{ ctx: AudioContext; buffers: Buffers; buses: Readonly<Record<Bus, GainNode>> }>

const EAR = 1.6
const SOURCE = 1.2
const FADE = 0.8
const SMOOTH = 0.15

const whenDone = (ctx: AudioContext, keep: AudioNode, at: number, done: () => void): void => {
  const timer = ctx.createConstantSource()
  timer.offset.value = 0
  timer.connect(keep)
  timer.onended = () => {
    timer.disconnect()
    done()
  }
  timer.start()
  timer.stop(at)
}

const panner = (ctx: AudioContext, dest: AudioNode, at: Vec): PannerNode => {
  const p = ctx.createPanner()
  p.panningModel = 'equalpower'
  p.distanceModel = 'inverse'
  p.refDistance = 1.5
  p.rolloffFactor = 1
  p.maxDistance = 80
  place(p, at)
  p.connect(dest)
  return p
}

const place = (p: PannerNode, at: Vec): void => {
  if (p.positionX) {
    p.positionX.value = at.x
    p.positionY.value = SOURCE
    p.positionZ.value = at.z
  } else p.setPosition(at.x, SOURCE, at.z)
}

const listen = (ctx: AudioContext, at: Vec): void => {
  const l = ctx.listener
  if (l.positionX) {
    l.positionX.value = at.x
    l.positionY.value = EAR
    l.positionZ.value = at.z
    l.forwardX.value = 0
    l.forwardY.value = 0
    l.forwardZ.value = -1
    l.upX.value = 0
    l.upY.value = 1
    l.upZ.value = 0
  } else {
    l.setPosition(at.x, EAR, at.z)
    l.setOrientation(0, 0, -1, 0, 1, 0)
  }
}

const storage = (store: Storage | undefined) => ({
  get: (): string | null => {
    try {
      return store?.getItem(STORAGE_KEY) ?? null
    } catch {
      return null
    }
  },
  set: (v: string): void => {
    try {
      store?.setItem(STORAGE_KEY, v)
    } catch {
      return
    }
  },
})

const contextClass = (): typeof AudioContext | undefined =>
  typeof window === 'undefined'
    ? undefined
    : (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)

const delay = (rand: Rand, e: Event): number => between(rand, e.every[0], e.every[1])

const scatter = (rand: Rand, at: Vec, spread: number): Vec => {
  const a = rand() * Math.PI * 2
  const r = Math.sqrt(rand()) * spread
  return vec(at.x + Math.sin(a) * r, at.z + Math.cos(a) * r)
}

export const createAudio = (store: Storage | undefined): Audio => {
  const saved = storage(store)
  const rand = mulberry(1967)
  const live: { volumes: Volumes; graph?: Graph; scene?: Scene; prev?: Game; gains?: Volumes; gait: Gait; failed: boolean } = {
    volumes: parseVolumes(saved.get()),
    gait: standing,
    failed: false,
  }

  const build = (): Graph | undefined => {
    const Ctor = contextClass()
    if (!Ctor) return undefined
    const ctx = new Ctor()
    const limiter = ctx.createDynamicsCompressor()
    limiter.threshold.value = LIMITER.threshold
    limiter.knee.value = LIMITER.knee
    limiter.ratio.value = LIMITER.ratio
    limiter.attack.value = LIMITER.attack
    limiter.release.value = LIMITER.release
    limiter.connect(ctx.destination)
    const buses = Object.fromEntries(
      BUSES.map((b) => {
        const g = ctx.createGain()
        g.gain.value = 0
        g.connect(limiter)
        return [b, g]
      }),
    ) as Record<Bus, GainNode>
    return { ctx, buffers: makeBuffers(ctx), buses }
  }

  const unlock = (): void => {
    if (live.failed) return
    try {
      live.graph = live.graph ?? build()
      if (!live.graph) live.failed = true
      else if (live.graph.ctx.state !== 'running') void live.graph.ctx.resume().catch(() => undefined)
    } catch {
      live.failed = true
    }
  }

  const oneShot = (gr: Graph, bus: Bus, at: Vec, play: (dest: AudioNode) => number): void => {
    const p = panner(gr.ctx, gr.buses[bus], at)
    whenDone(gr.ctx, p, play(p) + 0.25, () => p.disconnect())
  }

  const enter = (gr: Graph, space: SpaceId, listener: Vec): Scene => {
    const { ctx } = gr
    const now = ctx.currentTime
    const scape = soundscapes[space]
    const fades = Object.fromEntries(
      BUSES.map((b) => {
        const g = ctx.createGain()
        g.gain.setValueAtTime(0, now)
        g.gain.linearRampToValueAtTime(1, now + FADE)
        g.connect(gr.buses[b])
        return [b, g]
      }),
    ) as Record<Bus, GainNode>
    const half = spaces[space].size.w / 2
    const placed = scape.layers.map((l): Placed => {
      const voice = layerVoice(ctx, gr.buffers, l, rand)
      const at = 'at' in l ? l.at : undefined
      const alongX = l.kind === 'noise' ? l.alongX : undefined
      const p = at ? panner(ctx, fades[l.bus], sourceAt(at, alongX, listener, half)) : undefined
      voice.out.connect(p ?? fades[l.bus])
      return { voice, panner: p, at, alongX }
    })
    return { space, fades: Object.values(fades), placed, next: scape.events.map((e) => now + delay(rand, e)) }
  }

  const leave = (gr: Graph, s: Scene): void => {
    const now = gr.ctx.currentTime
    s.fades.forEach((f) => {
      f.gain.cancelScheduledValues(now)
      f.gain.setValueAtTime(f.gain.value, now)
      f.gain.linearRampToValueAtTime(0, now + FADE)
    })
    s.placed.forEach((p) => p.voice.stop(now + FADE + 0.05))
    whenDone(gr.ctx, s.fades[0], now + FADE + 0.3, () => s.fades.forEach((f) => f.disconnect()))
  }

  const events = (gr: Graph, s: Scene, g: Game): void => {
    const now = gr.ctx.currentTime
    soundscapes[s.space].events.forEach((e, i) => {
      if (now < s.next[i]) return
      s.next[i] = now + delay(rand, e)
      if (!holds(e.when, g)) return
      const at = scatter(rand, e.at ?? g.pos, e.spread ?? 0)
      oneShot(gr, e.bus, at, (dest) => spot(gr.ctx, gr.buffers, e.spot, dest, rand))
    })
  }

  const steps = (gr: Graph, g: Game, dt: number): void => {
    const { gait, falls } = pace(live.gait, walked(live.prev, g), dt)
    live.gait = gait
    if (!falls) return
    const surface = surfaceAt(soundscapes[g.space].ground, g.pos)
    oneShot(gr, 'sfx', g.pos, (dest) => footstep(gr.ctx, gr.buffers, surface, dest, rand))
  }

  const run = (gr: Graph, g: Game, dt: number): void => {
    const now = gr.ctx.currentTime
    listen(gr.ctx, g.pos)
    const gains = busGains(live.volumes, ducked(g))
    BUSES.filter((b) => live.gains?.[b] !== gains[b]).forEach((b) => gr.buses[b].gain.setTargetAtTime(gains[b], now, SMOOTH))
    live.gains = gains
    if (live.scene?.space !== g.space) {
      if (live.scene) leave(gr, live.scene)
      live.scene = enter(gr, g.space, g.pos)
    }
    const s = live.scene
    const half = spaces[g.space].size.w / 2
    s.placed.forEach((p) => {
      p.voice.tick?.(now)
      if (p.panner && p.at && p.alongX) place(p.panner, sourceAt(p.at, true, g.pos, half))
    })
    events(gr, s, g)
    arrivals(live.prev, g).forEach((a) => oneShot(gr, 'sfx', g.pos, (dest) => spot(gr.ctx, gr.buffers, a, dest, rand)))
    steps(gr, g, dt)
  }

  const sync = (g: Game, dt: number): void => {
    const gr = live.graph
    try {
      if (gr && gr.ctx.state === 'running') run(gr, g, dt)
    } catch (e) {
      console.warn('audio disabled after an error in the frame loop', e)
      live.failed = true
      live.graph = undefined
      void gr?.ctx.close().catch(() => undefined)
    }
    live.prev = g
  }

  if (typeof document !== 'undefined')
    document.addEventListener('visibilitychange', () => {
      const ctx = live.graph?.ctx
      if (!ctx) return
      void (document.hidden ? ctx.suspend() : ctx.resume()).catch(() => undefined)
    })

  return {
    unlock,
    sync,
    volumes: () => live.volumes,
    setVolume: (bus, v) => {
      live.volumes = withVolume(live.volumes, bus, v)
      saved.set(serializeVolumes(live.volumes))
    },
    status: () => (live.failed ? 'unavailable' : !live.graph ? 'locked' : live.graph.ctx.state === 'running' ? 'running' : 'suspended'),
  }
}
