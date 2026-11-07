import { test } from 'node:test'
import assert from 'node:assert/strict'
import { replay } from '../../text-game/src/engine.ts'
import { initialState } from '../../text-game/src/state.ts'
import { available, ended, focus, interact, press, seen, start, still, textBuildHash, tick } from './prologue.ts'
import { back, hold, holdWhenSafe, holdWhenWatched, playPrologue, routes, talk, walk } from './drive.ts'

const talks = ['texas', 'munitions', 'round'] as const
const spots = ['stove', 'cache', 'marker'] as const

talks.forEach((who, ti) =>
  spots.forEach((spot, si) =>
    test(`playing ${who} then hiding at the ${spot} matches text path ${ti + 1},1,${si + 1},1`, () => {
      const g = playPrologue(who, spot)
      assert.ok(ended(g))
      assert.deepEqual(g.path, [ti + 1, 1, si + 1, 1])
      assert.deepEqual(g.story, replay(g.path).at(-1))
      assert.equal(g.story.scene, 'a1_flood')
      assert.equal(g.story.owenCache, spot)
      assert.equal(textBuildHash(g), `#path=${ti + 1},1,${si + 1},1`)
      assert.equal(g.busts, 0)
    }),
  ),
)

const atCamp = () => {
  const bar = talk(start(), 'texas')
  const room = interact(walk(bar, [[0, 4.2]]))
  return press(interact(walk(room, [[1.6, -0.8]])), 'fly')
}

test('the door only opens after a conversation, and Hank only sells the round before one', () => {
  const g = press(start(), 'close')
  assert.deepEqual(available(g).map((i) => i.id).sort(), ['curly', 'hank', 'wade'])
  const after = talk(start(), 'texas')
  assert.deepEqual(available(after).map((i) => i.id).sort(), ['curly', 'door', 'wade'])
})

test('the letter is read in the room and no hiding note is sent there', () => {
  const room = interact(walk(talk(start(), 'munitions'), [[0, 4.2]]))
  const desk = interact(walk(room, [[1.6, -0.8]]))
  assert.equal(desk.panel?.title, 'Owen: A Letter to Lucy')
  assert.deepEqual(desk.panel?.buttons.map((b) => b.id), ['fly'])
  assert.equal(desk.story.owenCache, undefined)
})

spots.forEach((spot) =>
  test(`hiding at the ${spot} while Curly looks over the camp gets you busted, and the story never hears`, () => {
    const camp = walk(atCamp(), routes[spot])
    const caught = holdWhenWatched(camp)
    assert.equal(caught.panel?.kind, 'busted')
    assert.equal(caught.hidden, undefined)
    assert.deepEqual(caught.story, replay([1, 1]).at(-1))
    const retried = press(caught, 'retry')
    assert.equal(retried.space, 'camp')
    assert.equal(retried.panel, undefined)
    assert.equal(retried.busts, 1)
    const done = holdWhenSafe(walk(retried, routes[spot]))
    assert.equal(done.hidden, spot)
    assert.equal(done.story.owenCache, spot)
  }),
)

test('letting go of E stops hiding without sending anything', () => {
  const camp = walk(atCamp(), routes.stove)
  const started = interact(camp)
  assert.ok(started.hiding)
  const released = tick(started, still, 1 / 30)
  const walked = walk(released, [[5.6, 1.5]])
  assert.equal(walked.hiding, undefined)
  assert.equal(walked.story.owenCache, undefined)
})

test('the plane only takes Owen home once the notes are hidden', () => {
  const camp = atCamp()
  assert.ok(!available(camp).some((i) => i.id === 'plane'))
  const hidden = holdWhenSafe(walk(camp, routes.cache))
  const home = walk(hidden, back('cache'))
  assert.equal(focus(home)?.id, 'plane')
  assert.equal(interact(home).space, 'flood')
})

test('Curly cannot see through the cook tent', () => {
  const camp = walk(atCamp(), [[-6, 2], [-2, -1.5], [6, -4.6]])
  const t = Array.from({ length: 300 }, (_, i) => i * 0.03)
  assert.ok(t.every((tt) => !seen({ ...camp, t: tt })))
})

test('a hold with nothing nearby is refused', () => {
  assert.throws(() => hold(press(start(), 'close')), /nothing to hide/)
  assert.deepEqual(start().story, initialState)
})
