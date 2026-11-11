import { test } from 'node:test'
import assert from 'node:assert/strict'
import { menu } from '../../text-game/src/story.ts'
import { replayPath, startFrom } from '../src/start.ts'
import type { Game } from '../src/prologue.ts'
import { interact, press, still, tick } from '../src/prologue.ts'
import { sheet } from '../src/letters.ts'
import type { Vec } from '../src/world.ts'
import { distance, sub, vec } from '../src/world.ts'
import { poses } from '../src/probe.ts'
import type { Step } from './act1Plan.ts'
import { ACT1_PATH, ACT2_FIRST, act1Spaces, isBeat, nextStep, poseFor } from './act1Plan.ts'

const DT = 1 / 30
// A steer in the browser is a walk target and two drawn frames at the smoke run's pace of four ticks a frame.
const STEER_TICKS = 8

const walkTo = (g: Game, to: Vec): Game => {
  let cur = g
  for (let n = 0; distance(cur.pos, to) >= 0.15 && !cur.panel; n++) {
    if (n > 30 * 300) throw new Error(`stuck at ${cur.pos.x.toFixed(2)},${cur.pos.z.toFixed(2)} walking to ${to.x},${to.z} in ${cur.space}`)
    cur = tick(cur, { dir: sub(to, cur.pos), hold: false, limit: distance(to, cur.pos) }, DT)
  }
  return cur
}

// Does a step the way main.ts does with the same input: a number key presses that button, interact uses the spot (held
// until it fills), a walk heads for the spot until it is in focus, and a wait lets the game run.
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
  if (s.kind === 'steer') {
    const toward = (cur: Game, n: number): Game => (n === 0 || !cur.brawl ? cur : toward(tick(cur, { dir: sub(vec(s.x, s.z), cur.pos), hold: false, verbs: { shove: s.getUp, grab: false, use: false } }, DT), n - 1))
    return toward(g, STEER_TICKS)
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
  let g = startFrom(`#path=${ACT1_PATH}`, '')
  let before: Game | undefined
  for (let n = 0; g.story.scene !== ACT2_FIRST; n++) {
    if (n > 2000) throw new Error(`stuck at ${g.story.scene} in ${g.space} at ${g.pos.x.toFixed(2)},${g.pos.z.toFixed(2)}`)
    if (isBeat(before, g)) beats.push(g)
    before = g
    g = act(g, nextStep(g))
  }
  return { end: g, beats }
}

test('Act 1 plays from its path to Act 2’s first scene, every choice the first, as the text build does', () => {
  const start = startFrom(`#path=${ACT1_PATH}`, '')
  assert.equal(menu(start.story).act, 'Act 1: Flood')
  const { end } = played()
  assert.equal(end.story.scene, ACT2_FIRST)
  const text = replayPath(end.path.join(','))
  assert.ok(!('error' in text), 'the engine’s path replays in the text build')
  assert.deepEqual(end.story, text.story, 'the engine reaches the same state as the text build on its path')
  assert.ok(end.path.every((n) => n === 1), `every choice is the first: ${end.path.join(',')}`)
})

test('every Act 1 space is a beat of the run, and each beat has a pose in its space', () => {
  const { beats } = played()
  assert.deepEqual(
    beats.map((b) => `${b.story.scene} in ${b.space}`),
    ['a1_flood in line', 'a1_errand in helpTent', 'a1_trail in line', 'a1_body in cabin', 'a1_ruling in helpTent', 'a1_lucy in office', 'a1_barfight in pan', 'a1_tank in jail'],
  )
  assert.deepEqual([...new Set(beats.map((b) => b.space))].sort(), [...act1Spaces].sort())
  beats.forEach((b) => assert.equal(poses[poseFor[b.space]!]?.space, b.space, `${b.story.scene} in ${b.space}`))
})

test('nextStep takes the first choice from a panel and walks to the spot that moves the story', () => {
  const tank = startFrom('#path=1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1', '')
  assert.equal(tank.story.scene, 'a1_tank')
  const step = nextStep(tank)
  assert.equal(step.kind, 'walk')
  const office = startFrom('#path=1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1', '')
  assert.equal(office.story.scene, 'a1_lucy')
  assert.equal((nextStep(office) as { spot?: string }).spot, 'lucy', 'Lucy, not the ledgers, at the land office')
})
