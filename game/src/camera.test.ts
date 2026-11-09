import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { Frame, Look, Rig, V3 } from './camera.ts'
import {
  ARM,
  CEILING,
  EYE,
  FLOOR,
  MARGIN,
  PITCH_MAX,
  PITCH_MIN,
  RECENTER_DELAY,
  SHOULDER,
  armFor,
  blocks,
  entry,
  follow,
  orbit,
  rigFor,
  toWorld,
} from './camera.ts'
import { solids, spaces } from './levels.ts'
import { bodies } from './cast.ts'
import type { Space } from './levels.ts'
import { blocked, vec } from './world.ts'
import type { Vec } from './world.ts'

const near = (a: number, b: number, eps = 1e-9): boolean => Math.abs(a - b) < eps

const still: Look = { yaw: 0, pitch: 0 }

const DT = 1 / 30

const clearance = (p: V3, s: Space): number =>
  Math.min(
    ...blocks(s).map((b) => {
      const dx = Math.max(b.box.x - b.box.w / 2 - p[0], 0, p[0] - b.box.x - b.box.w / 2)
      const dy = Math.max(b.y0 - p[1], 0, p[1] - b.y1)
      const dz = Math.max(b.box.z - b.box.d / 2 - p[2], 0, p[2] - b.box.z - b.box.d / 2)
      return Math.hypot(dx, dy, dz)
    }),
  )

const frames = (s: Space, pos: Vec, facing: number, rig: Rig, n: number, look: Look = still): Frame =>
  Array.from({ length: n }).reduce<Frame>((f) => follow(f.rig, s, pos, facing, look, DT), follow(rig, s, pos, facing, look, DT))

test('orbit turns freely and clamps the pitch to -20..+15 degrees', () => {
  const r = rigFor(0, ARM.interior)
  assert.ok(near(orbit(r, { yaw: 7, pitch: 0 }).yaw, 7))
  assert.ok(near(orbit(r, { yaw: 0, pitch: 5 }).pitch, (15 * Math.PI) / 180))
  assert.ok(near(orbit(r, { yaw: 0, pitch: -5 }).pitch, (-20 * Math.PI) / 180))
  assert.equal(PITCH_MAX, orbit(r, { yaw: 0, pitch: 5 }).pitch)
  assert.equal(PITCH_MIN, orbit(r, { yaw: 0, pitch: -5 }).pitch)
})

test('the stick moves Owen relative to the camera', () => {
  const north = toWorld({ x: 0, y: 1 }, Math.PI)
  assert.ok(near(north.x, 0) && near(north.z, -1))
  const east = toWorld({ x: 1, y: 0 }, Math.PI)
  assert.ok(near(east.x, 1) && near(east.z, 0))
  const turned = toWorld({ x: 0, y: 1 }, Math.PI / 2)
  assert.ok(near(turned.x, 1) && near(turned.z, 0))
})

test('at rest the camera is level at eye height, 2.6 m back and 0.5 m to the right in the open', () => {
  const pos = vec(0, -6)
  const { pose, rig } = frames(spaces.camp, pos, Math.PI, rigFor(Math.PI, ARM.exterior), 30)
  assert.ok(near(rig.reach, 1))
  assert.ok(Math.abs(pose.eye[1] - 1.7) <= 0.2 && near(pose.eye[1], EYE))
  assert.ok(near(pose.target[1], pose.eye[1]))
  assert.ok(near(pose.eye[2], pos.z + ARM.exterior, 1e-6))
  assert.ok(near(pose.eye[0], pos.x + SHOULDER, 1e-6))
})

test('the boom is 1.8 m indoors, and crossing into a new space blends it over 0.4 s', () => {
  assert.equal(ARM.interior, 1.8)
  assert.equal(ARM.exterior, 2.6)
  const first = follow(rigFor(Math.PI, ARM.exterior), spaces.room, vec(0, 0), Math.PI, still, DT)
  assert.ok(first.rig.base < ARM.exterior && first.rig.base > ARM.interior)
  const midway = frames(spaces.room, vec(0, 0), Math.PI, first.rig, 4)
  assert.ok(midway.rig.base > ARM.interior + 0.1)
  const later = frames(spaces.room, vec(0, 0), Math.PI, first.rig, 10)
  assert.ok(near(later.rig.base, ARM.interior))
})

test('looking up lowers the camera, looking down raises it, and both return to level when released', () => {
  const s = spaces.camp
  const pos = vec(0, -6)
  const up = follow(rigFor(Math.PI, ARM.exterior), s, pos, Math.PI, { yaw: 0, pitch: 1 }, DT)
  assert.ok(up.rig.pitch > 0 && up.pose.eye[1] < EYE && up.pose.target[1] > up.pose.eye[1])
  const down = follow(rigFor(Math.PI, ARM.exterior), s, pos, Math.PI, { yaw: 0, pitch: -1 }, DT)
  assert.ok(down.rig.pitch < 0 && down.pose.eye[1] > EYE)
  const released = frames(s, pos, Math.PI, down.rig, 60)
  assert.ok(Math.abs(released.rig.pitch) < 0.01)
})

test('the camera recenters behind Owen after a short idle, and not while the player is looking', () => {
  const s = spaces.camp
  const pos = vec(0, -6)
  const turned = orbit(rigFor(Math.PI, ARM.exterior), { yaw: 1.2, pitch: 0 })
  const soon = frames(s, pos, Math.PI, turned, Math.floor(RECENTER_DELAY / DT) - 5)
  assert.ok(near(soon.rig.yaw, turned.yaw))
  const later = frames(s, pos, Math.PI, soon.rig, 120)
  assert.ok(Math.abs(later.rig.yaw - Math.PI) < 0.02)
  const busy = frames(s, pos, Math.PI, turned, 120, { yaw: 0.001, pitch: 0 })
  assert.ok(busy.rig.yaw > turned.yaw)
})

const sample = (s: Space, step: number): readonly Vec[] =>
  Array.from({ length: Math.floor(s.size.w / step) + 1 }).flatMap((_, i) =>
    Array.from({ length: Math.floor(s.size.d / step) + 1 }).map((__, j) => vec(-s.size.w / 2 + i * step, -s.size.d / 2 + j * step)),
  )

const sweeps = [
  [spaces.bar, 0.5],
  [spaces.boarding, 0.5],
  [spaces.room, 0.5],
  [spaces.camp, 1],
  [spaces.flood, 0.5],
] as const

sweeps.forEach(([s, step]) =>
  test(`in ${s.name} the camera never enters a wall, a prop, a person or the floor${s.interior ? ' or the ceiling' : ''}`, () => {
    const spots = sample(s, step).filter((p) => !blocked(p, solids(s)))
    const yaws = Array.from({ length: 16 }, (_, i) => (i * Math.PI) / 8)
    const pitches = [PITCH_MIN, 0, PITCH_MAX]
    assert.ok(spots.length > 20)
    spots.forEach((pos) =>
      yaws.forEach((yaw) =>
        pitches.forEach((pitch) => {
          const { pose } = follow({ ...rigFor(yaw, armFor(s)), pitch }, s, pos, yaw, still, DT)
          const where = `${pos.x},${pos.z} yaw ${yaw.toFixed(2)} pitch ${pitch.toFixed(2)}`
          assert.ok(clearance(pose.eye, s) >= MARGIN - 1e-2, `eye too close to a solid at ${where}`)
          assert.ok(pose.eye[1] >= FLOOR - 1e-6, `eye through the floor at ${where}`)
          if (s.interior) {
            assert.ok(pose.eye[1] <= CEILING, `eye through the ceiling at ${where}`)
            assert.ok(Math.abs(pose.eye[0]) < s.size.w / 2 && Math.abs(pose.eye[2]) < s.size.d / 2, `eye outside at ${where}`)
          }
        }),
      ),
    )
  }),
)

test('a pivot inside a block pulls the camera all the way in instead of skipping it', () => {
  const b = { box: { x: 0, z: 0, w: 1, d: 1 }, y0: 0, y1: 2 }
  assert.equal(entry([0, 1, 0], [0, 1, 5], b), 0)
  assert.equal(entry([0, 1, 3], [0, 1, 5], b), 1)
})

test('backed into the corner of the bar, the arm pulls in at once and lets out smoothly', () => {
  const bar = spaces.bar
  const corner = vec(5.4, 4.4)
  const out = frames(bar, vec(0, 0), (-3 * Math.PI) / 4, rigFor((-3 * Math.PI) / 4, ARM.interior), 30)
  const pulled = follow(out.rig, bar, corner, (-3 * Math.PI) / 4, still, DT)
  assert.ok(pulled.rig.reach < 0.6)
  assert.ok(clearance(pulled.pose.eye, bar) >= MARGIN - 1e-2)
  const freed = follow(pulled.rig, bar, vec(0, 0), (-3 * Math.PI) / 4, still, DT)
  assert.ok(freed.rig.reach > pulled.rig.reach && freed.rig.reach < 1)
})

test("the arm hangs from the player's eye: Wade's camera rides higher than Owen's by the difference in eye height", () => {
  assert.equal(bodies.owen.eye, EYE)
  assert.ok(bodies.wade.eye > bodies.owen.eye)
  const s = spaces.line
  const at = (eye: number): number => follow(rigFor(Math.PI, ARM.exterior), s, s.spawn, Math.PI, still, DT, 0, eye).pose.eye[1]
  assert.ok(near(at(bodies.wade.eye) - at(bodies.owen.eye), bodies.wade.eye - bodies.owen.eye, 1e-6))
})
