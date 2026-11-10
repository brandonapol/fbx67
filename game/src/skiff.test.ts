import { test } from 'node:test'
import assert from 'node:assert/strict'
import { replay } from '../../text-game/src/engine.ts'
import type { Look, Rig, V3 } from './camera.ts'
import { ARM, PITCH_MAX, PITCH_MIN, follow, rigFor } from './camera.ts'
import { solids, spaces } from './levels.ts'
import { PORCH, WALKWAY } from './highwater.ts'
import type { Game } from './prologue.ts'
import { footY, heldBehind, playerBody, press, resume, tick } from './prologue.ts'
import { DT, downstairs, toSkiff, wadeOut } from './drive.ts'
import { poses } from './probe.ts'
import { FACE_MARGIN, RIDE_FADE, RIDE_LOOK, RIDE_TIME, faceSeen, fade, keepBehind, manAt, rideAt } from './skiff.ts'
import { blocked, distance, vec } from './world.ts'

const atSkiff = (): Game => {
  const path = [1, 1, 1, 1, 1]
  return toSkiff(wadeOut(downstairs(resume(replay(path).at(-1)!, path))))
}

const pose = (g: Game, rig: Rig, look: Look) =>
  follow(rig, spaces[g.space], g.pos, g.facing, look, DT, 0, playerBody(g).eye + footY(g), heldBehind(g))

test('the face test: ahead of his back is seen, behind it or square from the side is not', () => {
  const man = { at: vec(0, 0), facing: 0 }
  assert.ok(faceSeen([0, 1.7, 2], man))
  assert.ok(faceSeen([3, 1.7, 0.5], man))
  assert.ok(!faceSeen([0, 1.7, -2], man))
  assert.ok(!faceSeen([3, 1.7, -FACE_MARGIN - 0.01], man))
})

// The smoke test reads the live camera; this sweeps every place the camera can be. On the porch and the walkway the
// man waits with his back to the house, and no stand, yaw or pitch puts the camera ahead of it.
test('on the porch and the walkway the camera never sees the hooded man’s face', () => {
  const g = atSkiff()
  const man = manAt(undefined)
  const walls = solids(spaces.flood)
  const stands = Array.from({ length: Math.floor((WALKWAY[1] - WALKWAY[0]) / 0.5) + 1 }).flatMap((_, i) =>
    Array.from({ length: 9 }).map((__, j) => vec(WALKWAY[0] + i * 0.5, PORCH[2] + j * 0.4)),
  )
  const open = stands.filter((p) => !blocked(p, walls))
  assert.ok(open.length > 200)
  open.forEach((pos) =>
    Array.from({ length: 24 }, (_, k) => (k * Math.PI) / 12).forEach((yaw) =>
      [PITCH_MIN, 0, PITCH_MAX].forEach((pitch) => {
        const { pose: p } = pose({ ...g, pos, facing: yaw }, { ...rigFor(yaw, ARM.exterior), pitch }, { yaw: 0, pitch: 0 })
        assert.ok(!faceSeen(p.eye, man), `seen from ${p.eye.map((n) => n.toFixed(2))} with Owen at ${pos.x},${pos.z}`)
      }),
    ),
  )
})

// On the ride the player turns the camera as hard as they can, one way and the other; it is held within RIDE_LOOK of
// the heading and stays behind Owen, who sits behind the man.
test('on the ride the camera stays behind his back, however the player turns it', () => {
  const aboard = press(atSkiff(), 'note:continue')
  ;[1, -1].forEach((way) => {
    const run = (g: Game, rig: Rig, n: number): number => {
      if (g.panel) return n
      const next = tick(g, { dir: vec(0, 0), hold: false }, DT)
      const f = pose(next, rig, { yaw: way * 0.4, pitch: way * 0.1 })
      assert.ok(!faceSeen(f.pose.eye, manAt(next.ride)), `seen at ${next.ride?.toFixed(2)}s from ${f.pose.eye.map((v) => v.toFixed(2))}`)
      return run(next, f.rig, n + 1)
    }
    assert.ok(run(aboard, rigFor(aboard.facing, ARM.exterior), 0) * DT >= RIDE_TIME - DT)
  })
})

test('the camera poses of the skiff frames stand behind him too', () => {
  Object.values(poses)
    .filter((p) => p.space === 'flood')
    .forEach((p) => assert.ok(!faceSeen(p.shot.eye as V3, manAt(undefined)), `${p.shot.eye}`))
})

test('the ride is short and slow, poles west down Third and turns north up Lacey, and ends on black', () => {
  assert.ok(RIDE_TIME > 20 && RIDE_TIME < 40, `${RIDE_TIME}s`)
  const [from, to] = [rideAt(0), rideAt(RIDE_TIME)]
  assert.ok(distance(from.seat, vec(135.2, 100)) < 1e-9)
  assert.ok(Math.abs(rideAt(RIDE_TIME / 2).heading + Math.PI / 2) < 1e-9, 'west on Third')
  assert.ok(Math.abs(Math.abs(to.heading) - Math.PI) < 1e-9, 'north on Lacey')
  assert.equal(fade(undefined), 0)
  assert.equal(fade(0), 0)
  assert.equal(fade(RIDE_TIME - RIDE_FADE), 0)
  assert.ok(fade(RIDE_TIME - RIDE_FADE / 2) > 0.4 && fade(RIDE_TIME - RIDE_FADE / 2) < 0.6)
  assert.equal(fade(RIDE_TIME + 5), 1)
  assert.ok(Math.abs(keepBehind(Math.PI, 0) - RIDE_LOOK) < 1e-9)
  assert.ok(Math.abs(keepBehind(0.2, 0) - 0.2) < 1e-9)
})
