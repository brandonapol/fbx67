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
import { ACT2_PATH, ACT3_FIRST as ACT2_END } from './act2Plan.ts'
import type { Step } from './act3Plan.ts'
import { ACT3_FIRST, ACT3_PATH, ACT4_FIRST, act3Beats, act3Spaces, bands, isBeat, nextStep, poseFor } from './act3Plan.ts'

const DT = 1 / 30

// A steer on skis lasts this many ticks before the planner looks again.
const STEER_TICKS = 15

const walkTo = (g: Game, to: Vec): Game => {
  let cur = g
  for (let n = 0; distance(cur.pos, to) >= 0.15 && !cur.panel && cur.space === g.space; n++) {
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
    // A walk ends where the story takes Wade on the way (out of the photo lab's records room).
    const there = s.points.reduce((cur, [x, z]) => (cur.space === g.space ? walkTo(cur, vec(x, z)) : cur), g)
    return there.panel || there.space !== g.space ? there : tick(there, { ...still, view: s.yaw }, DT)
  }
  if (s.kind === 'steer') {
    // On skis: head for the point a moment with the push held, as the browser's walk-to does.
    const toward = (cur: Game, n: number): Game => (n === 0 || !cur.ski ? cur : toward(tick(cur, { dir: sub(vec(s.x, s.z), cur.pos), hold: false }, DT), n - 1))
    return toward(g, STEER_TICKS)
  }
  if ('seconds' in s) {
    // The long night runs under its own panel: a wait there lasts its seconds or until the night is over.
    const wait = (cur: Game, n: number): Game => (n <= 0 || (cur.panel && !cur.night) ? cur : wait(tick(cur, still, DT), n - 1))
    return wait(g, Math.round(s.seconds / DT))
  }
  return tick(g, still, DT)
}

type Played = Readonly<{ end: Game; beats: readonly Game[] }>

const playTo = (path: string, to: string): Played => {
  const beats: Game[] = []
  let g = startFrom(`#path=${path}`, '')
  let before: Game | undefined
  for (let n = 0; g.story.scene !== to; n++) {
    if (n > 2000) throw new Error(`stuck at ${g.story.scene} in ${g.space} at ${g.pos.x.toFixed(2)},${g.pos.z.toFixed(2)}`)
    if (isBeat(before, g)) beats.push(g)
    before = g
    g = act(g, nextStep(g))
  }
  return { end: g, beats }
}

const played = (): Played => playTo(ACT3_PATH, ACT4_FIRST)

test('Act 3 starts where the Act 2 run ends', () => {
  assert.equal(ACT2_END, ACT3_FIRST)
  assert.equal(playTo(ACT2_PATH, ACT2_END).end.path.join(','), ACT3_PATH)
})

test('Act 3 plays from its start to Act 4’s first scene, every choice the first, as the text build does', () => {
  const start = startFrom(`#path=${ACT3_PATH}`, '')
  assert.equal(start.story.scene, ACT3_FIRST)
  assert.equal(menu(start.story).act, 'Act 3: Deep Winter')
  const { end } = played()
  assert.equal(end.story.scene, ACT4_FIRST)
  const text = replayPath(end.path.join(','))
  assert.ok(!('error' in text), 'the engine’s path replays in the text build')
  assert.deepEqual(end.story, text.story, 'the engine reaches the same state as the text build on its path')
  assert.ok(end.path.every((n) => n === 1), `every choice is the first: ${end.path.join(',')}`)
})

test('each Act 3 beat is a place on the path, and each has a pose in the space it plays in', () => {
  const { beats } = played()
  assert.deepEqual(beats.map((b) => b.story.scene), act3Beats)
  beats.forEach((b) => assert.equal(poses[poseFor[b.space]!]?.space, b.space, `${b.story.scene} in ${b.space}`))
})

test('every Act 3 space has a pose, so the run can sample it and take its frame', () => {
  act3Spaces.forEach((s) => assert.equal(poses[poseFor[s]!]?.space, s, s))
})

test('every beat’s frame in each band is in that band, the heat the probe sets taking it there', () => {
  const { beats } = played()
  const want = { '': 'clear', _dusk: 'dusk', _night: 'night' } as const
  beats.forEach((b) =>
    bands.forEach((band) => assert.equal(weather({ ...b.story, heat: band.heat }), want[band.suffix], `${b.story.scene}${band.suffix}`)),
  )
})
