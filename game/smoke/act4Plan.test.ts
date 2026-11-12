import { test } from 'node:test'
import assert from 'node:assert/strict'
import { menu, weather } from '../../text-game/src/story.ts'
import { doubleAgentWorks, iceJam } from '../../text-game/src/logic.ts'
import { replayPath, startFrom } from '../src/start.ts'
import type { Game } from '../src/prologue.ts'
import { press } from '../src/prologue.ts'
import { poses } from '../src/probe.ts'
import { ACT3_PATH, ACT4_FIRST as ACT3_END } from './act3Plan.ts'
import { ACT4_FIRST, ACT4_LAST, ACT4_PATH, act4Beats, bands, isBeat, nextStep, poseFor } from './act4Plan.ts'

// Everything Act 4 plays is a panel over the story, so a step is a key press: the same press main.ts makes.
const play = (): { end: Game; beats: readonly Game[]; seen: readonly Game[] } => {
  const beats: Game[] = []
  const seen: Game[] = []
  let g = startFrom(`#path=${ACT4_PATH}`, '')
  let before: Game | undefined
  for (let n = 0; g.story.scene !== ACT4_LAST; n++) {
    if (n > 200) throw new Error(`stuck at ${g.story.scene}`)
    if (isBeat(before, g)) beats.push(g)
    seen.push(g)
    before = g
    const s = nextStep(g)
    if (s.kind !== 'key') throw new Error(`${g.story.scene}: not a key press: ${s.kind}`)
    g = press(g, g.panel!.buttons[Number(s.key) - 1]!.id)
  }
  return { end: g, beats, seen }
}

test('Act 4 starts where the Act 3 run ends', () => {
  assert.equal(ACT3_END, ACT4_FIRST)
  assert.ok(ACT4_PATH.startsWith(ACT3_PATH), 'it is the Act 3 run’s path, carried on')
  const text = replayPath(ACT4_PATH)
  assert.ok(!('error' in text))
  assert.equal(text.story.scene, ACT4_FIRST, 'and it ends where Act 3 does')
  const before = replayPath(ACT4_PATH.split(',').slice(1).join(','))
  assert.ok('error' in before || before.story.scene !== ACT4_FIRST, 'one choice shorter it has not arrived')
  const start = startFrom(`#path=${ACT4_PATH}`, '')
  assert.equal(start.story.scene, ACT4_FIRST)
  assert.equal(menu(start.story).act, 'Act 4: Breakup')
})

test('the run takes the backed wire and the stopped ice jam, asked of the story', () => {
  const { seen } = play()
  const wire = seen.find((g) => g.story.scene === 'a4_wire')
  assert.ok(wire, 'the run reaches a4_wire')
  assert.equal(doubleAgentWorks(wire.story), true)
  const chase = seen.find((g) => g.story.scene === 'a4_chase')
  assert.ok(chase, 'the run reaches a4_chase')
  assert.equal(iceJam(chase.story), 'stopped')
})

test('Act 4 plays to the end, every choice the first but the offer, as the text build does', () => {
  const { end } = play()
  assert.equal(end.story.scene, ACT4_LAST)
  const text = replayPath(end.path.join(','))
  assert.ok(!('error' in text), 'the engine’s path replays in the text build')
  assert.deepEqual(end.story, text.story, 'the engine reaches the same state as the text build on its path')
  const offer = end.path.slice(ACT4_PATH.split(',').length)
  assert.equal(offer.filter((n) => n !== 1).length, 1, `one choice is not the first: ${offer.join(',')}`)
  assert.equal(offer.find((n) => n !== 1), 3, 'and it is the third')
})

test('each Act 4 beat is a scene on the path, in order, played over the story', () => {
  const { beats } = play()
  assert.deepEqual(beats.map((b) => b.story.scene), act4Beats)
  beats.forEach((b) => assert.equal(poses[poseFor[b.space]!]?.space, b.space, `${b.story.scene} in ${b.space}`))
})

test('every beat’s frame in each band is in that band, the heat the probe sets taking it there', () => {
  const { beats } = play()
  const want = { '': 'clear', _dusk: 'dusk', _night: 'night' } as const
  beats.forEach((b) =>
    bands.forEach((band) => assert.equal(weather({ ...b.story, heat: band.heat }), want[band.suffix], `${b.story.scene}${band.suffix}`)),
  )
})
