import type { Document, Node } from '@gltf-transform/core'

// Moving a clip authored on one Meshy rig onto another (tools/characters.ts). The rigs share joint names but not rest
// poses: every joint sits a few degrees differently. Each target joint is made to turn from its own rest exactly as
// the source joint turns from its rest, measured in the world, which is the parent-space form
// q' = C·(q·inv(sb))·inv(C)·tb with C = inv(tp)·sp, sp and tp the two rigs' parent rest rotations in the world. The
// hips' translation moves by the ratio of the two rigs' leg lengths, then each frame is grounded: the hips move up or
// down so the lowest foot is as high off the floor as on the clip's own rig (docs/art/pipeline.md).

export type Quat = readonly [number, number, number, number]

export const qmul = (a: Quat, b: Quat): Quat => [
  a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
  a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
  a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
  a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
]

export const qinv = (q: Quat): Quat => [-q[0], -q[1], -q[2], q[3]]

const IDENTITY: Quat = [0, 0, 0, 1]

type Vec3 = readonly [number, number, number]

const rotate = (q: Quat, v: Vec3): Vec3 => {
  const p = qmul(qmul(q, [v[0], v[1], v[2], 0]), qinv(q))
  return [p[0], p[1], p[2]]
}

// A joint at rest, in its parent's space; the joints run parents first, the root's parent being the armature.
export type Joint = Readonly<{ name: string; parent?: string; t: Vec3; r: Quat }>

// A rig at rest: each joint's local rotation, the world rotation of its parent, the hips' rest position and the
// skeleton, for posing.
export type Rest = Readonly<{
  rotations: ReadonlyMap<string, Quat>
  parents: ReadonlyMap<string, Quat>
  hips: Vec3
  joints: readonly Joint[]
}>

// q is the source joint's animated local rotation; sb and tb the two joints' rest rotations; sp and tp their
// parents' rest rotations in the world.
export const retargetRotation = (q: Quat, sb: Quat, tb: Quat, sp: Quat, tp: Quat): Quat => {
  const c = qmul(qinv(tp), sp)
  return qmul(qmul(c, qmul(q, qinv(sb))), qmul(qinv(c), tb))
}

const rotationOf = (n: Node): Quat => n.getRotation() as unknown as Quat

const parentWorld = (n: Node): Quat => {
  const p = n.getParentNode()
  return p ? qmul(parentWorld(p), rotationOf(p)) : IDENTITY
}

const depth = (n: Node): number => {
  const p = n.getParentNode()
  return p ? 1 + depth(p) : 0
}

export const restOf = (doc: Document, rootName: string): Rest => {
  const joints = [...new Set(doc.getRoot().listSkins().flatMap((s) => s.listJoints()))].sort((a, b) => depth(a) - depth(b))
  const t = joints.find((n) => n.getName() === rootName)?.getTranslation()
  if (!t) throw new Error(`rig has no ${rootName} joint`)
  const names = new Set(joints.map((n) => n.getName()))
  const parentName = (n: Node): string | undefined => {
    const p = n.getParentNode()?.getName()
    return p !== undefined && names.has(p) ? p : undefined
  }
  return {
    rotations: new Map(joints.map((n) => [n.getName(), rotationOf(n)] as const)),
    parents: new Map(joints.map((n) => [n.getName(), parentWorld(n)] as const)),
    hips: [t[0], t[1], t[2]],
    joints: joints.map((n) => {
      const [x, y, z] = n.getTranslation()
      return { name: n.getName(), parent: parentName(n), t: [x, y, z], r: rotationOf(n) }
    }),
  }
}

// --- Grounding. Heights are in the armature's units, the same on every Meshy rig.

type Frame = ReadonlyMap<string, Readonly<{ t?: Vec3; r?: Quat }>>

const FEET = ['LeftToeBase', 'RightToeBase']

const lowestFoot = (rest: Rest, frame: Frame): number => {
  const world = new Map<string, Readonly<{ p: Vec3; r: Quat }>>()
  rest.joints.forEach((j) => {
    const parent = j.parent === undefined ? undefined : world.get(j.parent)
    const [t, r] = [frame.get(j.name)?.t ?? j.t, frame.get(j.name)?.r ?? j.r]
    if (!parent) return world.set(j.name, { p: t, r })
    const d = rotate(parent.r, t)
    world.set(j.name, { p: [parent.p[0] + d[0], parent.p[1] + d[1], parent.p[2] + d[2]], r: qmul(parent.r, r) })
  })
  const feet = FEET.flatMap((f) => world.get(f)?.p[1] ?? [])
  if (feet.length === 0) throw new Error(`rig has none of the foot joints ${FEET.join(', ')}`)
  return Math.min(...feet)
}

// The clip's poses, one per key. Meshy bakes every channel on the same keys; a clip that does not cannot be grounded.
const framesOf = (doc: Document): readonly Frame[] => {
  const channels = doc.getRoot().listAnimations().flatMap((a) => a.listChannels())
  const keys = channels.map((c) => Array.from((c.getSampler()?.getInput()?.getArray() ?? []) as ArrayLike<number>))
  if (keys.some((k) => k.length !== keys[0].length || k.some((t, i) => Math.abs(t - keys[0][i]) > 1e-6)))
    throw new Error('the clip\'s channels are not keyed on the same times, so it cannot be grounded')
  return (keys[0] ?? []).map((_, i) => {
    const frame = new Map<string, { t?: Vec3; r?: Quat }>()
    channels.forEach((c) => {
      const name = c.getTargetNode()?.getName() ?? ''
      const v = Array.from((c.getSampler()?.getOutput()?.getArray() ?? []) as ArrayLike<number>)
      const e = frame.get(name) ?? {}
      if (c.getTargetPath() === 'rotation') e.r = [v[i * 4], v[i * 4 + 1], v[i * 4 + 2], v[i * 4 + 3]]
      if (c.getTargetPath() === 'translation') e.t = [v[i * 3], v[i * 3 + 1], v[i * 3 + 2]]
      frame.set(name, e)
    })
    return frame
  })
}

// How far the lowest foot is above where it stands at rest, at each key of the clip, posed on this rig.
export const footHeights = (doc: Document, rest: Rest): readonly number[] => {
  const floor = lowestFoot(rest, new Map())
  return framesOf(doc).map((f) => lowestFoot(rest, f) - floor)
}

// Moves the hips up or down at each key so the lowest foot is `wanted` above where it stands at rest.
export const ground = (doc: Document, rest: Rest, wanted: readonly number[], rootName: string): Document => {
  const hips = doc.getRoot().listAnimations().flatMap((a) => a.listChannels()).find((c) => c.getTargetPath() === 'translation' && c.getTargetNode()?.getName() === rootName)
  const out = hips?.getSampler()?.getOutput()
  if (!out) throw new Error(`the clip does not move ${rootName}, so it cannot be grounded`)
  const now = footHeights(doc, rest)
  if (now.length !== wanted.length) throw new Error(`grounding ${now.length} keys to ${wanted.length} heights`)
  const values = Array.from(out.getArray() as ArrayLike<number>)
  out.setArray(new Float32Array(values.map((v, i) => (i % 3 === 1 ? v + wanted[(i - 1) / 3] - now[(i - 1) / 3] : v))))
  return doc
}

// Both rigs must have the same joints: a joint only one has would play its rest pose, or not at all.
export const checkJoints = (source: Rest, target: Rest, clip: string, who: string): void => {
  const missing = (from: Rest, to: Rest) => [...from.rotations.keys()].filter((j) => !to.rotations.has(j))
  const [notInTarget, notInSource] = [missing(source, target), missing(target, source)]
  if (notInTarget.length + notInSource.length === 0) return
  throw new Error(`retargeting ${clip} onto ${who}: joints missing from ${who}: [${notInTarget.join(', ')}]; missing from the clip's rig: [${notInSource.join(', ')}]`)
}

// The hips rise and fall with the legs, so they move by the ratio of the rigs' rest hip heights, not overall heights.
export const legScale = (source: Rest, target: Rest): number => target.hips[1] / source.hips[1]

export const retarget = (doc: Document, source: Rest, target: Rest, scale: number, rootName: string): Document => {
  doc.getRoot().listAnimations().forEach((anim) =>
    anim.listChannels().forEach((c) => {
      const name = c.getTargetNode()?.getName() ?? ''
      const out = c.getSampler()?.getOutput()
      const arr = out?.getArray()
      if (!out || !arr) return
      const values = Array.from(arr as ArrayLike<number>)
      if (c.getTargetPath() === 'rotation') {
        const [sb, tb, sp, tp] = [source.rotations.get(name), target.rotations.get(name), source.parents.get(name), target.parents.get(name)]
        if (!sb || !tb || !sp || !tp) throw new Error(`a rotation channel targets ${name}, which is not a joint of both rigs`)
        const next = Array.from({ length: values.length / 4 }, (_, i) => retargetRotation(values.slice(i * 4, i * 4 + 4) as unknown as Quat, sb, tb, sp, tp)).flat()
        out.setArray(new Float32Array(next))
      }
      if (c.getTargetPath() === 'translation' && name === rootName) {
        out.setArray(new Float32Array(values.map((v, i) => target.hips[i % 3] + (v - source.hips[i % 3]) * scale)))
      }
    }),
  )
  return doc
}
