import { test } from 'node:test'
import assert from 'node:assert/strict'
import { replay } from '../../text-game/src/engine.ts'
import type { Visit } from './talk.ts'
import { near, perform, reply, showing, step, verbs, visit } from './talk.ts'
import { ended, interact, press, start, still } from './prologue.ts'
import { back, holdWhenSafe, leaveBar, playPrologue, routes, toBed, upstairs, walk, walkLeg, writeLetter } from './drive.ts'

// The headless mission test (#42): play the prologue in the engine build's logic with no renderer, using every small
// interaction on the way (greet, talk with a reply, ask about, use, buy), and prove the mission still completes on
// the text build's path, with every line said shown as a subtitle.

const DT = 1 / 30

const go = (v: Visit, points: readonly (readonly [number, number])[]): Visit => ({ ...v, game: walk(v.game, points) })
const then = (v: Visit, f: (g: Visit['game']) => Visit['game']): Visit => ({ ...v, game: f(v.game) })
const idle = (v: Visit, seconds: number): Visit =>
  Array.from({ length: Math.round(seconds / DT) }).reduce<Visit>((acc) => step(acc, still, DT), v)

test('the prologue completes headless with greet, talk, ask, use and buy along the way', () => {
  const bar = go(visit(press(start(), 'close')), [[-1.5, -2.2]])
  assert.equal(near(bar)?.id, 'hank')

  const greeted = perform(bar, 'hank', 'greet')
  assert.equal(showing(greeted.talk, greeted.clock)[0]?.who, 'hank', 'the greeting shows above Hank')
  const talked = reply(perform(idle(greeted, 4), 'hank', 'talk'))
  const asked = perform(talked, 'hank', 'ask', 'curly')

  const jukebox = go(asked, [[4.6, -2.2], [4.6, -1.4]])
  const used = perform(jukebox, 'jukebox', 'use')
  const before = perform(used, 'airmanJukebox', 'talk')
  assert.match(before.talk.log.at(-2)!.text, /^You with/, 'before the round, the airman asks about Wade')
  assert.equal(before.talk.offer?.with, 'airmanJukebox', 'and Owen may answer')

  const chair = perform(go(before, [[1.0, 0.4]]), 'chair', 'use')
  assert.deepEqual(chair.game.story, bar.game.story, 'nothing said so far changed the story')
  assert.deepEqual(chair.game.path, [])

  const bought = then(perform(go(chair, [[-1.5, -2.2]]), 'hank', 'buy'), (g) => press(g, 'close'))
  assert.equal(bought.game.story.scene, 'p_talk_round')
  const after = perform(go(bought, [[4.6, -2.2], [4.6, -1.4]]), 'airmanJukebox', 'talk')
  assert.match(after.talk.log.at(-1)!.text, /bought .* a beer/, 'after the round, the airman says so')

  const hall = then(after, (g) => walkLeg(leaveBar(g)))
  assert.equal(hall.game.space, 'boarding', 'the walk home ends in the boarding house hall')
  const room = then(hall, upstairs)
  assert.equal(room.game.space, 'room')
  const reel = go(room, [[2.3, -1.4]])
  assert.deepEqual(verbs(reel, near(reel)!), ['use'])
  const taped = perform(reel, 'reelToReel', 'use')

  const end = then(taped, (g) => {
    const camp = press(walkLeg(toBed(writeLetter(g))), 'note:fly')
    const hidden = holdWhenSafe(walk(camp, routes.stove))
    const skiff = interact(walk(interact(walk(hidden, back('stove'))), [[0.2, 5.4]]))
    return press(skiff, 'note:continue')
  })

  assert.ok(ended(end.game))
  assert.deepEqual(end.game.path, [3, 1, 1, 1, 1, 1])
  assert.deepEqual(end.game.story, replay(end.game.path).at(-1))
  assert.deepEqual(end.game.story, playPrologue('round', 'stove').story, 'the same story as playing it without a word')
  const whos = new Set(end.talk.log.map((l) => l.with))
  assert.deepEqual([...whos].sort(), ['airmanJukebox', 'chair', 'hank', 'jukebox', 'reelToReel'])
  assert.ok(end.talk.log.every((l) => l.until > l.from && l.text.length > 0))
})
