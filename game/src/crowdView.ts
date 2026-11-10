import * as pc from 'playcanvas'
import type { Notice } from './crowd.ts'
import { lookOf } from './ambient.ts'
import { crowdIn, due, nodPitch, react, stareTime, staringAt, tierAt } from './crowd.ts'
import type { Game } from './prologue.ts'
import { spaces } from './levels.ts'
import type { Vec } from './world.ts'
import { add, distance, scale, sub, vec } from './world.ts'

// The town's people drawn (issue #44): one gray-box figure per person crowd.ts has in the space, posed every frame up
// close and less often further out, swapped for a single box at a distance and dropped past that. Each keeps the few
// things that run across frames: when they were last posed, how long Owen has stared, when their nod began, and how
// far they have stepped aside and turned.

export type Primitive = (
  parent: pc.Entity,
  type: 'box' | 'sphere' | 'capsule',
  hex: string,
  pos: readonly [number, number, number],
  size: readonly [number, number, number],
  opts?: Readonly<{ shadows?: boolean }>,
) => pc.Entity

type Person = {
  e: pc.Entity
  whole: pc.Entity
  head: pc.Entity
  box: pc.Entity
  last: number
  stared: number
  nodAt: number
  notice: Notice
  aside: Vec
  yaw: number
}

export type CrowdView = Readonly<{ key: string; root: pc.Entity; people: ReadonlyMap<string, Person> }>

// How fast a turn and a sidestep close on where they are going, per second.
const EASE = 6

const person = (root: pc.Entity, who: string, prim: Primitive): Person => {
  const look = lookOf(who)
  const e = new pc.Entity(who)
  const whole = new pc.Entity('whole')
  const body = look.height * 0.62
  prim(whole, 'capsule', look.coat, [0, body / 2 + 0.05, 0], [0.5, body / 2, 0.4])
  // The head pivots at the neck, so a nod dips it and a look turns it.
  const head = new pc.Entity('head')
  head.setLocalPosition(0, body + 0.05, 0)
  // Only the body casts a shadow: a crowd's heads add shadow casters and nothing anyone sees.
  prim(head, 'sphere', look.skin, [0, 0.15, 0], [0.32, 0.36, 0.32], { shadows: false })
  prim(head, 'sphere', look.hair, [0, 0.27, -0.04], [0.34, 0.2, 0.34], { shadows: false })
  whole.addChild(head)
  e.addChild(whole)
  // The impostor: one box in the coat's color, the person's height, casting no shadow.
  const box = prim(e, 'box', look.coat, [0, look.height / 2, 0], [0.45, look.height, 0.35], { shadows: false })
  box.enabled = false
  root.addChild(e)
  return { e, whole, head, box, last: -Infinity, stared: 0, nodAt: -Infinity, notice: 'none', aside: vec(0, 0), yaw: 0 }
}

// Whose crowd this is: the space and the story scene, which together say who the schedule has there.
const keyOf = (g: Game): string => `${g.space}:${g.story.scene}`

const materials = (root: pc.Entity): ReadonlySet<pc.Material> =>
  new Set((root.findComponents('render') as pc.RenderComponent[]).flatMap((r) => r.meshInstances.flatMap((mi) => (mi.material ? [mi.material] : []))))

export const disposeCrowd = (c: CrowdView | undefined): void => {
  if (!c) return
  const mats = materials(c.root)
  c.root.destroy()
  mats.forEach((m) => m.destroy())
}

export const buildCrowd = (parent: pc.Entity, g: Game, prim: Primitive): CrowdView => {
  const root = new pc.Entity('crowd')
  parent.addChild(root)
  const people = new Map(crowdIn(g.story, g.space, g.t).map((p) => [p.who, person(root, p.who, prim)] as const))
  return { key: keyOf(g), root, people }
}

// The crowd for this frame: the one given, while it is still the space's and the scene's, else a new one.
export const crowdFor = (c: CrowdView | undefined, parent: pc.Entity, g: Game, prim: Primitive): CrowdView => {
  if (c && c.key === keyOf(g) && c.root.parent === parent) return c
  // A crowd in a space that was rebuilt went with it; one left over from another scene goes now.
  if (c?.root.parent === parent) disposeCrowd(c)
  return buildCrowd(parent, g, prim)
}

const turn = (from: number, to: number, k: number): number => from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * k

export const syncCrowd = (c: CrowdView, g: Game, dt: number): void => {
  const owen = { pos: g.pos, vel: g.vel, view: g.view, interior: spaces[g.space].interior }
  const k = Math.min(1, dt * EASE)
  crowdIn(g.story, g.space, g.t).forEach((p) => {
    const m = c.people.get(p.who)
    if (!m) return
    const tier = tierAt(distance(p.at, g.pos))
    m.e.enabled = tier !== 'hidden'
    m.whole.enabled = tier === 'full' || tier === 'slow'
    m.box.enabled = tier === 'impostor'
    m.stared = stareTime(m.stared, dt, tier === 'full' && staringAt(p, owen))
    if (!due(tier, m.last, g.t)) return
    const first = m.last === -Infinity
    m.last = g.t
    // Only someone drawn whole notices Owen; further out they keep to what they are doing.
    const r = tier === 'full' ? react(p, owen, m.stared) : { notice: 'none' as const, yaw: p.yaw, head: 0, aside: vec(0, 0) }
    if (r.notice === 'nod' && m.notice !== 'nod') m.nodAt = g.t
    m.notice = r.notice
    m.aside = first ? r.aside : add(m.aside, scale(sub(r.aside, m.aside), k))
    m.yaw = first ? r.yaw : turn(m.yaw, r.yaw, k)
    m.e.setLocalPosition(p.at.x + m.aside.x, 0, p.at.z + m.aside.z)
    m.e.setLocalEulerAngles(0, (m.yaw * 180) / Math.PI, 0)
    m.head.setLocalEulerAngles((nodPitch(g.t - m.nodAt) * 180) / Math.PI, ((r.head + r.yaw - m.yaw) * 180) / Math.PI, 0)
  })
}
