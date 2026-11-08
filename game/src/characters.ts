import * as pc from 'playcanvas'
import type { CastId, ClipId } from './cast.ts'
import { castIds, clipIds, clipUrl, modelUrl } from './cast.ts'

export type Cast = Readonly<{
  spawn: (who: CastId) => pc.Entity
  play: (e: pc.Entity, clip: ClipId, rate: number) => void
}>

const BLEND = 0.25

const loadContainer = (app: pc.Application, url: string): Promise<pc.Asset> =>
  new Promise((resolve, reject) =>
    app.assets.loadFromUrl(url, 'container', (err, asset) => (err || !asset ? reject(new Error(`${url}: ${err}`)) : resolve(asset))),
  )

type Loaded = Readonly<{ model: pc.Asset; clips: ReadonlyMap<ClipId, pc.AnimTrack> }>

const loadOne = async (app: pc.Application, base: string, who: CastId): Promise<Loaded> => {
  const [model, ...clipAssets] = await Promise.all([
    loadContainer(app, modelUrl(base, who)),
    ...clipIds.map((clip) => loadContainer(app, clipUrl(base, who, clip))),
  ])
  const clips = new Map(
    clipIds.map((clip, i) => [clip, (clipAssets[i].resource as pc.ContainerResource).animations[0].resource as pc.AnimTrack] as const),
  )
  return { model, clips }
}

const playing = new WeakMap<pc.Entity, ClipId>()

export const loadCast = async (app: pc.Application, base: string): Promise<Cast> => {
  const loaded = new Map(await Promise.all(castIds.map(async (who) => [who, await loadOne(app, base, who)] as const)))
  const spawn = (who: CastId): pc.Entity => {
    const l = loaded.get(who)
    if (!l) throw new Error(`cast member ${who} not loaded`)
    const root = new pc.Entity(who)
    const body = (l.model.resource as pc.ContainerResource).instantiateRenderEntity({ castShadows: true, receiveShadows: true })
    root.addChild(body)
    body.addComponent('anim', { activate: true })
    l.clips.forEach((track, clip) => body.anim?.assignAnimation(clip, track))
    body.anim?.baseLayer?.play('idle')
    playing.set(root, 'idle')
    return root
  }
  const play = (e: pc.Entity, clip: ClipId, rate: number): void => {
    const body = e.children[0] as pc.Entity | undefined
    const anim = body?.anim
    if (!anim) return
    anim.speed = rate
    if (playing.get(e) === clip) return
    playing.set(e, clip)
    anim.baseLayer?.transition(clip, BLEND)
  }
  return { spawn, play }
}
