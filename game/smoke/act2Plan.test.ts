import { test } from 'node:test'
import assert from 'node:assert/strict'
import { menu, weather } from '../../text-game/src/story.ts'
import { replayPath, startFrom } from '../src/start.ts'
import type { Game } from '../src/prologue.ts'
import { interact, press, still, tick } from '../src/prologue.ts'
import { sheet } from '../src/letters.ts'
import type { Vec } from '../src/world.ts'
import { distance, sub, vec } from '../src/world.ts'
import { poses } from '../src/probe.ts'
import type { Step } from './act2Plan.ts'
import { ACT2_FIRST, ACT2_PATH, ACT3_FIRST, act2Beats, act2Spaces, bands, isBeat, nextStep, poseFor } from './act2Plan.ts'

const DT = 1 / 30

const walkTo = (g: Game, to: Vec): Game => {
  let cur = g
  for (let n = 0; distance(cur.pos, to) >= 0.15 && !cur.panel; n++) {
    if (n > 30 * 300) throw new Error(`stuck at ${cur.pos.x.toFixed(2)},${cur.pos.z.toFixed(2)} walking to ${to.x},${to.z} in ${cur.space}`)
    cur = tick(cur, { dir: sub(to, cur.pos), hold: false, limit: distance(to, cur.pos) }, DT)
  }
  return cur
}

// Does a step the way main.ts does with the same input, as act1Plan.test.ts does.
const act = (g: Game, s: Step): Game => {
  if (s.kind === 'key') {
    const i = Number(s.key) - 1
    const id = g.home ? `note:${sheet(g.home).buttons[i]!.note}` : g.panel!.buttons[i]!.id
    return press(g, id)
  }
  if (s.kind === 'interact') {
    const started = interact(g)
    const fill = (cur: Game, n: number): Game => (cur.holding && n < 600 ? fill(tick(cur, { dir: vec(0, 0), hold: true }, DT), n + 1) : cur)
    return s.hold ? fill(started, 0) : started
  }
  if (s.kind === 'walk') {
    const there = s.points.reduce((cur, [x, z]) => walkTo(cur, vec(x, z)), g)
    return there.panel ? there : tick(there, { ...still, view: s.yaw }, DT)
  }
  return tick(g, still, DT)
}

type Played = Readonly<{ end: Game; beats: readonly Game[] }>

const played = (): Played => {
  const beats: Game[] = []
  let g = startFrom(`#path=${ACT2_PATH}`, '')
  let before: Game | undefined
  for (let n = 0; g.story.scene !== ACT3_FIRST; n++) {
    if (n > 2000) throw new Error(`stuck at ${g.story.scene} in ${g.space} at ${g.pos.x.toFixed(2)},${g.pos.z.toFixed(2)}`)
    if (isBeat(before, g)) beats.push(g)
    before = g
    g = act(g, nextStep(g))
  }
  return { end: g, beats }
}

test('Act 2 plays from its start to Act 3’s first scene, every choice the first, as the text build does', () => {
  const start = startFrom(`#path=${ACT2_PATH}`, '')
  assert.equal(start.story.scene, ACT2_FIRST)
  assert.equal(menu(start.story).act, 'Act 2: Freeze-up')
  const { end } = played()
  assert.equal(end.story.scene, ACT3_FIRST)
  const text = replayPath(end.path.join(','))
  assert.ok(!('error' in text), 'the engine’s path replays in the text build')
  assert.deepEqual(end.story, text.story, 'the engine reaches the same state as the text build on its path')
  assert.ok(end.path.every((n) => n === 1), `every choice is the first: ${end.path.join(',')}`)
})

test('each Act 2 beat is a place on the path, and each has a pose in the space it plays in', () => {
  const { beats } = played()
  assert.deepEqual(beats.map((b) => b.story.scene), act2Beats)
  beats.forEach((b) => assert.equal(poses[poseFor[b.space]!]?.space, b.space, `${b.story.scene} in ${b.space}`))
})

test('every Act 2 space has a pose, so the run can sample it and take its frame', () => {
  assert.ok(act2Spaces.length > 0)
  act2Spaces.forEach((s) => assert.equal(poses[poseFor[s]!]?.space, s, s))
})

test('a beat starts where the place changes, or the space, not at every scene', () => {
  const at = (path: string): Game => startFrom(`#path=${path}`, '')
  const major = at(ACT2_PATH)
  const photos = act(major, nextStep(major))
  const on = (g: Game, n = 0): Game => (g.story.scene !== photos.story.scene || n > 10 ? g : on(act(g, nextStep(g)), n + 1))
  const files = on(photos)
  assert.deepEqual([major.story.scene, photos.story.scene, files.story.scene], ['a2_major', 'a2_photos', 'a2_photos_files'])
  assert.equal(isBeat(undefined, major), true)
  assert.equal(isBeat(major, photos), true, 'the major’s office to the photo lab')
  assert.equal(isBeat(photos, photos), false)
  assert.equal(isBeat(photos, { ...photos, space: 'story' }), true, 'same place, another space')
})

// The probe's capture sets only the heat: on a start where Eli's trust is already spent, every band's frame is dusk or
// night, and the clear band is never captured.
test('every beat’s frame in each band is in that band, the heat the probe sets taking it there', () => {
  const { beats } = played()
  const want = { '': 'clear', _dusk: 'dusk', _night: 'night' } as const
  beats.forEach((b) =>
    bands.forEach((band) => assert.equal(weather({ ...b.story, heat: band.heat }), want[band.suffix], `${b.story.scene}${band.suffix}`)),
  )
})
