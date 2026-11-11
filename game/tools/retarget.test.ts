import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Document } from '@gltf-transform/core'
import type { Quat, Rest } from './retarget.ts'
import { checkJoints, footHeights, ground, legScale, qinv, qmul, restOf, retarget, retargetRotation } from './retarget.ts'

const norm = (q: readonly number[]): Quat => {
  const n = Math.hypot(...q)
  return [q[0] / n, q[1] / n, q[2] / n, q[3] / n]
}

// The same rotation, either sign.
const same = (a: Quat, b: Quat, what: string): void => {
  const dot = Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3])
  assert.ok(dot > 1 - 1e-6, `${what}: ${a.join(',')} vs ${b.join(',')}`)
}

// Rest poses that differ the way two Meshy rigs do: a few degrees of tilt at every joint.
const sp = norm([-0.023, -0.003, -0.003, 1])
const tp = norm([-0.04, 0.01, 0.002, 1])
const sb = norm([0.1, 0.02, -0.05, 1])
const tb = norm([0.07, -0.03, 0.01, 1])
const q = norm([0.4, 0.1, 0.2, 0.9])

test('a clip on its own rig is unchanged', () => {
  same(retargetRotation(q, sb, sb, sp, sp), q, 'same rig')
})

// #62: the old form, q·inv(sb)·tb, ignored the parents' rest rotations, so on Hank and Wade every joint down the leg
// bent a little wrong and the feet hung 3 to 12 cm above the ground.
test('the target joint turns from its rest as the source joint does, in the world', () => {
  const qt = retargetRotation(q, sb, tb, sp, tp)
  const sourceTurn = qmul(qmul(sp, q), qinv(qmul(sp, sb)))
  same(qmul(qmul(tp, qt), qinv(qmul(tp, tb))), sourceTurn, 'world turn')
  const old = qmul(q, qmul(qinv(sb), tb))
  assert.ok(Math.abs(qmul(qmul(tp, old), qinv(qmul(tp, tb)))[0] - sourceTurn[0]) > 1e-4, 'the old form misses it')
})

test('down a chain, each joint keeps the source turn when its parent moves too', () => {
  // Root (identity) > thigh > shin, each rig with its own rest; the clip moves both joints.
  const [sThigh, tThigh, sShin, tShin] = [sb, tb, norm([0.02, 0.2, 0.03, 1]), norm([-0.03, 0.17, 0.05, 1])]
  const [qThigh, qShin] = [q, norm([-0.3, 0.05, 0.1, 0.95])]
  const tThighQ = retargetRotation(qThigh, sThigh, tThigh, sp, tp)
  const tShinQ = retargetRotation(qShin, sShin, tShin, qmul(sp, sThigh), qmul(tp, tThigh))
  const sourceTurn = qmul(qmul(qmul(sp, qThigh), qShin), qinv(qmul(qmul(sp, sThigh), sShin)))
  same(qmul(qmul(qmul(tp, tThighQ), tShinQ), qinv(qmul(qmul(tp, tThigh), tShin))), sourceTurn, 'shin world turn')
})

const rest = (joints: readonly string[], hipsY = 1): Rest => ({
  rotations: new Map(joints.map((j) => [j, [0, 0, 0, 1] as Quat] as const)),
  parents: new Map(joints.map((j) => [j, [0, 0, 0, 1] as Quat] as const)),
  hips: [0, hipsY, 0],
  joints: [],
})

test('a joint missing from either rig fails the run, naming it', () => {
  assert.doesNotThrow(() => checkJoints(rest(['Hips', 'Spine']), rest(['Hips', 'Spine']), 'idle', 'hank'))
  assert.throws(() => checkJoints(rest(['Hips', 'Spine', 'Tail']), rest(['Hips', 'Spine']), 'idle', 'hank'), /idle.*hank.*Tail/)
  assert.throws(() => checkJoints(rest(['Hips']), rest(['Hips', 'Spine']), 'idle', 'hank'), /Spine/)
})

test('the hips move by the ratio of the two rigs leg lengths', () => {
  assert.equal(legScale(rest(['Hips'], 1), rest(['Hips'], 1.05)), 1.05)
})

test('retarget rewrites a rotation channel and refuses one on a joint the target lacks', () => {
  const doc = new Document()
  const buffer = doc.createBuffer()
  const armature = doc.createNode('Armature')
  const hips = doc.createNode('Hips').setRotation([...sb])
  armature.addChild(hips)
  doc.createSkin().addJoint(hips)
  const input = doc.createAccessor().setType('SCALAR').setArray(new Float32Array([0])).setBuffer(buffer)
  const output = doc.createAccessor().setType('VEC4').setArray(new Float32Array(q)).setBuffer(buffer)
  const sampler = doc.createAnimationSampler().setInput(input).setOutput(output)
  doc.createAnimation('idle').addSampler(sampler).addChannel(doc.createAnimationChannel().setTargetNode(hips).setTargetPath('rotation').setSampler(sampler))
  const source = restOf(doc, 'Hips')
  assert.deepEqual([...source.rotations.keys()], ['Hips'])
  const target: Rest = { ...source, rotations: new Map([['Hips', tb]]) }
  retarget(doc, source, target, 1, 'Hips')
  same(Array.from(output.getArray() as Float32Array) as unknown as Quat, retargetRotation(q, sb, tb, [0, 0, 0, 1], [0, 0, 0, 1]), 'hips')
  assert.throws(() => retarget(doc, source, rest(['Spine']), 1, 'Hips'), /Hips/)
})

// A leg: Hips > Knee > LeftToeBase, straight down with the toe `rest` above the floor, in a one-frame clip that turns
// the knee by `bend` about x and sets the hips' height.
const leg = (rest: number, shin: number, foot: number, bend: number, hipsY: number) => {
  const doc = new Document()
  const buffer = doc.createBuffer()
  const hips = doc.createNode('Hips').setTranslation([0, rest + shin + foot, 0])
  const knee = doc.createNode('Knee').setTranslation([0, -shin, 0])
  const toe = doc.createNode('LeftToeBase').setTranslation([0, -foot, 0])
  hips.addChild(knee)
  knee.addChild(toe)
  doc.createScene().addChild(doc.createNode('Armature').addChild(hips))
  doc.createSkin().addJoint(hips).addJoint(knee).addJoint(toe)
  const input = doc.createAccessor().setType('SCALAR').setArray(new Float32Array([0])).setBuffer(buffer)
  const channel = (node: typeof hips, path: 'rotation' | 'translation', values: readonly number[]) => {
    const out = doc.createAccessor().setType(path === 'rotation' ? 'VEC4' : 'VEC3').setArray(new Float32Array(values)).setBuffer(buffer)
    const sampler = doc.createAnimationSampler().setInput(input).setOutput(out)
    return { sampler, channel: doc.createAnimationChannel().setTargetNode(node).setTargetPath(path).setSampler(sampler), out }
  }
  const k = channel(knee, 'rotation', [Math.sin(bend / 2), 0, 0, Math.cos(bend / 2)])
  const h = channel(hips, 'translation', [0, hipsY, 0])
  doc.createAnimation('clip').addSampler(k.sampler).addChannel(k.channel).addSampler(h.sampler).addChannel(h.channel)
  return { doc, hipsOut: h.out }
}

// #62: Hank's legs are longer for his height than the clips' rig, so his lowest foot hung 4 cm above the ground at idle
// and 12 cm in the sneak.
test('the lowest foot is measured from where it stands at rest', () => {
  const { doc } = leg(0.5, 0.4, 0.1, Math.PI / 2, 1.0)
  // The knee folds the foot forward level with it, 0.4 under the hips: 0.6 up, 0.1 above where it stands at rest.
  const [h] = footHeights(doc, restOf(doc, 'Hips'))
  assert.ok(Math.abs(h - 0.1) < 1e-6, `foot height ${h}`)
})

test('grounding moves the hips so the lowest foot is as high as the clip wants it', () => {
  const { doc, hipsOut } = leg(0.5, 0.4, 0.1, Math.PI / 2, 1.0)
  const rest = restOf(doc, 'Hips')
  ground(doc, rest, [0.02], 'Hips')
  const [h] = footHeights(doc, rest)
  assert.ok(Math.abs(h - 0.02) < 1e-6, `foot height ${h}`)
  assert.ok(Math.abs((hipsOut.getArray() as Float32Array)[1] - 0.92) < 1e-6)
})
