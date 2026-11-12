import { test } from 'node:test'
import assert from 'node:assert/strict'
import { replay } from '../../text-game/src/engine.ts'
import { menu, sendMission } from '../../text-game/src/story.ts'
import type { CacheSpot, State } from '../../text-game/src/types.ts'
import { route } from './router.ts'
import type { Game } from './prologue.ts'
import { READ_LETTER, available, canRead, canWarmHands, inWorld, interact, press, still, tick } from './prologue.ts'
import { startFrom } from './start.ts'
import { starts } from '../smoke/starts.ts'
import { DIG_SPOTS, DIG_TIME, JAKE_SPOT, LETTER_TITLE, READ_TIME, SPAWN, WARM_HANDS, WARM_PROMPT, letterLine } from './owensCamp.ts'
import { HANDS_IN_PARKA } from './lucyAid.ts'
import { backToJake, digOut, goDig } from './digBot.ts'
import { engineSenders, walk } from './notesRatchet.ts'

// Lucy's dig played in the engine (owensCamp.ts, #139), headless, against the text build's `--choices` paths: for each
// place Owen hid his notes in the prologue, each place Lucy digs first. The game sends the story's notes and reads its
// state; the right spot is owenCache's, never the game's own memory.

const SPOTS: readonly CacheSpot[] = ['stove', 'cache', 'marker']

// The a3_camp start's path, with the prologue's hiding choice changed to `hid`.
const base = starts.find((s) => s.scene === 'a3_camp')!.path.split(',').map(Number)
const states = replay(base)
const hideAt = states.findIndex((s) => menu(s).options.map((o) => o.note).join() === SPOTS.join())
const pathFor = (hid: CacheSpot): readonly number[] => base.map((n, i) => (i === hideAt ? SPOTS.indexOf(hid) + 1 : n))
const choice = (s: State, note: string): number => menu(s).options.find((o) => o.note === note)!.n

const DT = 1 / 30

test('the dig plays where the story puts it: Act 3 at the survey camp, in the winter camp', () => {
  assert.ok(hideAt >= 0, 'the prologue hides the notes on the a3_camp start')
  const s = states.at(-1)!
  assert.equal(s.scene, 'a3_camp')
  assert.deepEqual(route(s, 'story'), { to: 'space', space: 'owensCamp' })
  for (const n of [choice(s, 'stove'), choice(s, 'cache'), choice(s, 'marker')]) {
    const next = replay([...base, n]).at(-1)!
    assert.deepEqual(route(next, 'owensCamp'), { to: 'space', space: 'owensCamp' }, next.scene)
  }
})

SPOTS.forEach((hid) =>
  SPOTS.forEach((first) => {
    test(`hidden at the ${hid}, dug first at the ${first}: the same notes and state as the text build`, () => {
      const path = pathFor(hid)
      const text = replay(path).at(-1)!
      assert.equal(text.scene, 'a3_camp')
      assert.equal(text.owenCache, hid)

      const g = startFrom(`#path=${path.join(',')}`, '')
      assert.equal(g.space, 'owensCamp')
      assert.deepEqual(g.pos, SPAWN)
      assert.equal(g.panel, undefined, 'nothing comes up: she steps off the plane')
      assert.equal(inWorld(g), true)
      assert.deepEqual(available(g).map((i) => i.id), SPOTS)

      const wrong = first !== hid
      const dug = goDig(g, first)
      const afterFirst = [...path, choice(text, first)]
      assert.deepEqual(dug.story, replay(afterFirst).at(-1), 'the first dig is a3_camp’s note')
      assert.deepEqual(dug.path, afterFirst)
      assert.equal(dug.story.scene, wrong ? 'a3_wrong_spot' : 'a3_found')
      if (wrong) {
        // The wrong spot's beat: the scene's own text and the line from the letter, twenty minutes and her fingers.
        assert.equal(dug.panel?.title, menu(dug.story).title)
        assert.ok(dug.panel?.text.startsWith(menu(dug.story).text), 'the scene’s own text')
        assert.ok(dug.panel?.text.endsWith(letterLine(dug.story)), 'and the line from the letter')
        assert.equal(dug.dig?.body.hands, 'white')
        assert.deepEqual(available(press(dug, 'close')).map((i) => i.id), SPOTS.filter((s) => s !== first))
      } else {
        assert.equal(dug.panel, undefined, 'the bundle is in her parka; she walks back to Jake')
        assert.deepEqual(available(dug).map((i) => i.id), [JAKE_SPOT.id])
      }

      const home = digOut(g, first)
      const full = wrong ? [...afterFirst, 1, 1] : [...afterFirst, 1]
      assert.deepEqual(home.path, full, 'the same notes as the text build’s path')
      assert.deepEqual(home.story, replay(full).at(-1), 'the same state as the text build')
      assert.deepEqual(home.story, sendMission(text, first), 'and as the mission’s note')
      assert.equal(home.story.scene, 'a3_crash')
      assert.equal(home.story.owenCache, undefined)
      assert.notEqual(home.space, 'owensCamp')
    })
  }),
)

test('a second wrong dig costs light and fingers, never story', () => {
  const [hid, first, second] = ['stove', 'cache', 'marker'] as const
  const g = press(goDig(startFrom(`#path=${pathFor(hid).join(',')}`, ''), first), 'close')
  const again = goDig(g, second, first)
  assert.deepEqual(again.story, g.story)
  assert.deepEqual(again.path, g.path)
  assert.ok(again.dig!.played >= g.dig!.played + 2 * DIG_TIME, 'white hands dig at half speed')
  assert.deepEqual(available(again).map((i) => i.id), [hid])
})

test('her white fingers warmed inside her parka: a minute of light, mitts on, and the next dig at full speed; no story', () => {
  const [hid, first, second] = ['stove', 'cache', 'marker'] as const
  const dug = press(goDig(startFrom(`#path=${pathFor(hid).join(',')}`, ''), first), 'close')
  assert.equal(dug.dig?.body.hands, 'white')
  const g = { ...dug, pos: SPAWN }
  assert.equal(canWarmHands(g), true)
  let cur = interact(g)
  assert.equal(cur.holding?.id, WARM_HANDS, 'the held interact warms her hands before it reads the letter')
  assert.equal(cur.holding?.time, HANDS_IN_PARKA)
  for (let t = 0; t < HANDS_IN_PARKA + 0.1; t += DT) cur = tick(cur, { ...still, hold: true }, DT)
  assert.equal(cur.holding, undefined)
  assert.equal(cur.dig?.body.hands, 'fine')
  assert.equal(cur.dig?.body.bare, 0, 'mitts on: her hands inside her parka')
  assert.ok(cur.dig!.played >= g.dig!.played + HANDS_IN_PARKA - 2 * DT, 'it costs the light')
  assert.deepEqual(cur.story, g.story)
  assert.deepEqual(cur.path, g.path)
  assert.equal(canWarmHands(cur), false)
  assert.equal(canRead(cur), true, 'with her fingers back, the hold reads the letter again')
  const next = goDig(cur, second, first)
  assert.ok(next.dig!.played < cur.dig!.played + 2 * DIG_TIME, 'warm hands dig at full speed')
  assert.doesNotMatch(WARM_PROMPT, /Wade/)
})

test('reading the letter mitts off, before any dig, shows the line for the spot Owen chose and sends nothing', () => {
  SPOTS.forEach((hid) => {
    const g = startFrom(`#path=${pathFor(hid).join(',')}`, '')
    assert.equal(canRead(g), true)
    let cur = interact(g)
    assert.equal(cur.holding?.id, READ_LETTER)
    for (let t = 0; t < READ_TIME + 0.1; t += DT) cur = tick(cur, { ...still, hold: true }, DT)
    assert.equal(cur.panel?.title, LETTER_TITLE)
    assert.equal(cur.panel?.text, letterLine(cur.story))
    assert.deepEqual(cur.story, g.story)
    assert.ok(cur.dig!.body.bare > 0, 'mitts off')
  })
})

test('Jake has the engine warm only once the bundle is found, and his panel is the scene’s own', () => {
  const g = startFrom(`#path=${pathFor('marker').join(',')}`, '')
  const found = goDig(g, 'marker')
  const asked = interact(backToJake(found, 'marker'))
  assert.equal(asked.panel?.title, menu(found.story).title)
  assert.equal(asked.panel?.text, menu(found.story).text)
  assert.ok(asked.panel?.buttons.some((b) => b.id === 'note:home'))
})

test('standing about too long whites out and fades back to stepping off the plane, with the story untouched', () => {
  const g = startFrom(`#path=${pathFor('stove').join(',')}`, '')
  let cur: Game = g
  for (let n = 0; n < 30 * 60 * 15 && !cur.panel; n++) cur = tick(cur, still, DT)
  assert.equal(cur.panel?.kind, 'busted')
  assert.deepEqual(cur.pos, SPAWN)
  assert.deepEqual(cur.story, g.story)
  assert.equal(cur.dig?.played, 0)
  assert.equal(press(cur, 'close').panel, undefined)
})

test("the ratchet counts the camp's dig as the sender of all three lucysDig notes", () => {
  const senders = engineSenders(walk()).filter((s) => s.key.startsWith('lucysDig:'))
  assert.deepEqual([...new Set(senders.map((s) => s.key))].sort(), ['lucysDig:cache', 'lucysDig:marker', 'lucysDig:stove'])
  senders.forEach((s) => assert.equal(s.space, 'owensCamp'))
  assert.ok(DIG_SPOTS.length === 3)
})
