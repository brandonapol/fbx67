import { test } from 'node:test'
import assert from 'node:assert/strict'
import { N } from '../../text-game/src/names.ts'
import { prologueThings } from '../../text-game/src/ambient/prologueThings.ts'
import type { Visit } from './talk.ts'
import { LINGER, LOG_SIZE, READ_BASE, attending, near, perform, readTime, reply, said, showing, speaking, step, targets, verbs, visit } from './talk.ts'
import { press, start, still } from './prologue.ts'
import { walk } from './drive.ts'

const DT = 1 / 30

const idle = (v: Visit, seconds: number): Visit =>
  Array.from({ length: Math.round(seconds / DT) }).reduce<Visit>((acc) => step(acc, still, DT), v)

const atBar = visit(press(start(), 'close'))
const at = (v: Visit, points: readonly (readonly [number, number])[]): Visit => ({ ...v, game: walk(v.game, points) })
const atHank = at(atBar, [[-1.5, -2.2]])
const atJukebox = at(atHank, [[4.6, -2.2], [4.6, -1.4]])
const texts = (v: Visit) => v.talk.log.map((l) => l.text)
const target = (v: Visit, id: string) => targets(v).find((t) => t.id === id)!

test('Owen looking at Hank can greet, talk, ask about and buy; things can only be used', () => {
  assert.equal(near(atHank)?.id, 'hank')
  assert.deepEqual(verbs(atHank, target(atHank, 'hank')), ['greet', 'talk', 'ask', 'buy'])
  assert.deepEqual(verbs(atJukebox, target(atJukebox, 'jukebox')), ['use'])
  assert.deepEqual(verbs(atJukebox, target(atJukebox, 'airmanJukebox')), ['greet', 'talk', 'ask'])
})

test('Buy sends the story its round note, and only once', () => {
  const bought = perform(atHank, 'hank', 'buy')
  assert.equal(bought.game.story.scene, 'p_talk_round')
  assert.deepEqual(bought.game.path, [3])
  const back = { ...bought, game: press(bought.game, 'close') }
  assert.deepEqual(verbs(back, target(back, 'hank')), ['greet', 'talk', 'ask'])
  assert.equal(perform(back, 'hank', 'buy'), back)
})

test('greet, talk, ask and use never change the story', () => {
  const v = [
    (x: Visit) => perform(x, 'hank', 'greet'),
    (x: Visit) => perform(x, 'hank', 'talk'),
    (x: Visit) => reply(x),
    (x: Visit) => perform(x, 'hank', 'ask', 'curly'),
    (x: Visit) => perform(x, 'hank', 'ask', 'weather'),
  ].reduce((x, f) => f(x), atHank)
  assert.equal(v.talk.log.length, 7)
  assert.deepEqual(v.game, atHank.game)
  const used = perform(atJukebox, 'jukebox', 'use')
  assert.deepEqual(used.game, atJukebox.game)
  assert.equal(used.talk.log[0].who, 'aside')
})

test('a verb out of reach, not taken, or on a topic they have nothing on does nothing', () => {
  assert.equal(perform(atBar, 'hank', 'greet'), atBar, 'Hank is across the room')
  assert.equal(perform(atHank, 'hank', 'use'), atHank)
  assert.equal(perform(atHank, 'hank', 'ask', 'landOffice'), atHank)
  assert.equal(perform(atHank, 'hank', 'ask'), atHank)
  assert.equal(perform(atHank, 'nobody', 'greet'), atHank)
})

test('a line is not repeated until its pool is spent', () => {
  const first = (text: string) => text.split(' ').slice(0, 3).join(' ')
  const pool = prologueThings.find((t) => t.id === 'jukebox')!.lines.use!.map((b) => first(b.lines[0].text))
  const uses = Array.from({ length: pool.length + 1 }).reduce<Visit>((v) => perform(v, 'jukebox', 'use'), atJukebox)
  assert.deepEqual(uses.talk.log.map((l) => first(l.text)), [...pool, pool[0]])
})

test('subtitles play one after another above the speaker, then stay in the log', () => {
  const v = perform(atHank, 'hank', 'talk')
  const [first, second] = v.talk.log
  assert.equal(first.who, 'hank')
  assert.equal(first.name, N.bartender)
  assert.equal(first.from, 0)
  assert.equal(first.until, readTime(first.text))
  assert.equal(second.from, first.until)
  assert.deepEqual(showing(v.talk, 0.1), [first])
  assert.deepEqual(showing(v.talk, first.until + 0.1), [second])
  assert.deepEqual(showing(v.talk, second.until), [])
  assert.deepEqual(said(v.talk, 0.1), [first])
  assert.deepEqual(said(v.talk, second.until + 10), [first, second])
  assert.ok(speaking(v.talk, 'hank', 0.1))
  assert.ok(!speaking(v.talk, 'owen', 0.1))
  assert.ok(readTime('') === READ_BASE)
})

test('a line said later starts at the visit clock, and the reply is Owen then them', () => {
  const later = perform(idle(atHank, 30), 'hank', 'talk')
  assert.ok(Math.abs(later.talk.log[0].from - 30) < 1e-6)
  assert.ok(later.talk.offer)
  const answered = reply(later)
  assert.deepEqual(answered.talk.log.slice(2).map((l) => l.who), ['owen', 'hank'])
  assert.equal(answered.talk.log[2].name, N.owenShort)
  assert.equal(answered.talk.offer, undefined)
  assert.equal(reply(answered), answered, 'a reply is given once')
})

test('someone in an exchange faces Owen while it lasts, and turns back after', () => {
  const v = perform(atHank, 'hank', 'greet')
  const end = v.talk.log.at(-1)!.until
  assert.ok(attending(v.talk, 'hank', 0))
  assert.ok(attending(v.talk, 'hank', end + LINGER - 0.01))
  assert.ok(!attending(v.talk, 'hank', end + LINGER))
  assert.ok(!attending(v.talk, 'airmanJukebox', 0))
})

test('the log keeps the last lines only', () => {
  const v = Array.from({ length: LOG_SIZE }).reduce<Visit>((x) => perform(x, 'jukebox', 'use'), atJukebox)
  assert.equal(v.talk.log.length, LOG_SIZE)
  assert.equal(perform(v, 'jukebox', 'use').talk.log.length, LOG_SIZE)
  assert.ok(texts(v).every((t) => t.length > 0))
})
