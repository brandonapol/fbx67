import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Rig, V3 } from './camera.ts'
import { ARM, CEILING, FLOOR, MARGIN, PITCH_MAX, PITCH_MIN, armFor, blocks, follow, orbit, rigFor, toWorld } from './camera.ts'
import { spaces } from './levels.ts'
import type { Space } from './levels.ts'
import { blocked, vec } from './world.ts'
import type { Vec } from './world.ts'

const near = (a: number, b: number): boolean => Math.abs(a - b) < 1e-9

const clearance = (p: V3, s: Space): number =>
  Math.min(
    ...blocks(s).map((b) => {
      const dx = Math.max(b.box.x - b.box.w / 2 - p[0], 0, p[0] - b.box.x - b.box.w / 2)
      const dy = Math.max(b.y0 - p[1], 0, p[1] - b.y1)
      const dz = Math.max(b.box.z - b.box.d / 2 - p[2], 0, p[2] - b.box.z - b.box.d / 2)
      return Math.hypot(dx, dy, dz)
    }),
  )

const settle = (s: Space, pos: Vec, yaw: number, pitch: number): ReturnType<typeof follow> =>
  Array.from({ length: 60 }).reduce<ReturnType<typeof follow>>(
    (f) => follow(f.rig, s, pos, { yaw: 0, pitch: 0 }, 1 / 30),
    follow({ ...rigFor(yaw, armFor(s)), pitch }, s, pos, { yaw: 0, pitch: 0 }, 1 / 30),
  )

test('orbit turns freely and clamps the pitch', () => {
  const r = rigFor(0, ARM.interior)
  assert.ok(near(orbit(r, { yaw: 7, pitch: 0 }).yaw, 7))
  assert.equal(orbit(r, { yaw: 0, pitch: 5 }).pitch, PITCH_MAX)
  assert.equal(orbit(r, { yaw: 0, pitch: -5 }).pitch, PITCH_MIN)
})

test('the stick moves Owen relative to the camera', () => {
  const north = toWorld({ x: 0, y: 1 }, Math.PI)
  assert.ok(near(north.x, 0) && near(north.z, -1))
  const east = toWorld({ x: 1, y: 0 }, Math.PI)
  assert.ok(near(east.x, 1) && near(east.z, 0))
  const turned = toWorld({ x: 0, y: 1 }, Math.PI / 2)
  assert.ok(near(turned.x, 1) && near(turned.z, 0))
})

test('in the open the arm is at full length behind and over the shoulder', () => {
  const { pose, rig } = settle(spaces.camp, vec(0, -6), Math.PI, 0.2)
  assert.ok(near(rig.reach, 1))
  assert.ok(pose.eye[2] > -6 + ARM.exterior * 0.9)
  assert.ok(pose.eye[0] > 0)
})

test('the interior arm is shorter, and crossing into a new space blends the length', () => {
  assert.ok(ARM.interior < ARM.exterior)
  const outdoorRig: Rig = rigFor(Math.PI, ARM.exterior)
  const first = follow(outdoorRig, spaces.room, vec(0, 0), { yaw: 0, pitch: 0 }, 1 / 30)
  assert.ok(first.rig.base < ARM.exterior && first.rig.base > ARM.interior)
  const later = settle(spaces.room, vec(0, 0), Math.PI, 0.2)
  assert.ok(Math.abs(later.rig.base - ARM.interior) < 0.01)
})

const sample = (s: Space, step: number): readonly Vec[] =>
  Array.from({ length: Math.floor(s.size.w / step) + 1 }).flatMap((_, i) =>
    Array.from({ length: Math.floor(s.size.d / step) + 1 }).map((__, j) => vec(-s.size.w / 2 + i * step, -s.size.d / 2 + j * step)),
  )

const indoors = [spaces.bar, spaces.room] as const

indoors.forEach((s) =>
  test(`in ${s.name} the camera never enters a wall, a prop, the ceiling or the floor`, () => {
    const bs = blocks(s)
    const spots = sample(s, 0.5).filter((p) => !blocked(p, s.props.filter((q) => q.solid).map((q) => q.box)))
    const yaws = Array.from({ length: 16 }, (_, i) => (i * Math.PI) / 8)
    const pitches = [PITCH_MIN, 0, 0.4, PITCH_MAX]
    assert.ok(bs.length > 4 && spots.length > 20)
    spots.forEach((pos) =>
      yaws.forEach((yaw) =>
        pitches.forEach((pitch) => {
          const { pose } = follow({ ...rigFor(yaw, armFor(s)), pitch, reach: 1 }, s, pos, { yaw: 0, pitch: 0 }, 1 / 30)
          const where = `${pos.x},${pos.z} yaw ${yaw.toFixed(2)} pitch ${pitch}`
          assert.ok(clearance(pose.eye, s) >= MARGIN - 1e-2, `eye too close to a solid at ${where}`)
          assert.ok(pose.eye[1] <= CEILING && pose.eye[1] >= FLOOR - 1e-6, `eye through the ceiling or floor at ${where}`)
          assert.ok(Math.abs(pose.eye[0]) < s.size.w / 2 && Math.abs(pose.eye[2]) < s.size.d / 2, `eye outside at ${where}`)
        }),
      ),
    )
  }),
)

test('backed into the corner of the bar, the arm pulls in at once and lets out smoothly', () => {
  const bar = spaces.bar
  const corner = vec(5.4, 4.4)
  const out = settle(bar, vec(0, 0), -Math.PI * 0.75, 0.2)
  const pulled = follow(out.rig, bar, corner, { yaw: 0, pitch: 0 }, 1 / 30)
  assert.ok(pulled.rig.reach < 0.5)
  assert.ok(clearance(pulled.pose.eye, bar) >= MARGIN - 1e-2)
  const freed = follow(pulled.rig, bar, vec(0, 0), { yaw: 0, pitch: 0 }, 1 / 30)
  assert.ok(freed.rig.reach > pulled.rig.reach && freed.rig.reach < 1)
})
