import { test } from 'node:test'
import assert from 'node:assert/strict'
import { prologueThreads, prologueTown } from '../../text-game/src/ambient/prologueTown.ts'
import { prologueThings } from '../../text-game/src/ambient/prologueThings.ts'
import type { Pan } from './barTalk.ts'
import { DANCE, HAND, HUSH, cardPlayers, guitar, hand, overheard, pan, pickSong, reaction, roomLevel, sitAndOrder, songs, watchCards } from './barTalk.ts'
import { queue, visit } from './talk.ts'
import { interact, press, start } from './prologue.ts'
import { talk, walk } from './drive.ts'
import { BOOTH, CARD_TABLE, ORDER_STOOL, POOL_TABLE } from './silverPan.ts'
import { vec } from './world.ts'

const atBar = pan(visit(press(start(), 'close')))
const to = (p: Pan, points: readonly (readonly [number, number])[]): Pan => ({ ...p, visit: { ...p.visit, game: walk(p.visit.game, points) } })
const later = (p: Pan, seconds: number): Pan => ({ ...p, visit: { ...p.visit, clock: p.visit.clock + seconds } })
const texts = (p: Pan) => p.visit.talk.log.map((l) => l.text)
const storyLines = new Set(
  [...prologueTown, ...prologueThings].flatMap((a) => Object.values(a.lines).flatMap((bits) => bits!.flatMap((b) => [...b.lines, ...(b.reply?.lines ?? [])].map((l) => l.text)))),
)

test('sitting at the bar puts Owen on the stool and Hank says his piece, with no plot effect', () => {
  const near = to(atBar, [[-0.5, -1.8]])
  const sat = sitAndOrder(near)
  assert.equal(sat.seated, true)
  assert.deepEqual(sat.visit.game.pos, ORDER_STOOL)
  assert.deepEqual(sat.visit.talk.log.map((l) => l.who).slice(0, 2), ['hank', 'hank'])
  assert.ok(texts(sat).every((t) => storyLines.has(t)), 'every line from the story layer')
  assert.equal(sat.visit.talk.offer?.with, 'hank', 'his talk leaves a reply on offer')
  assert.deepEqual(sat.visit.game.story, atBar.visit.game.story)
  assert.deepEqual(sat.visit.game.path, [])
  assert.equal(sitAndOrder(atBar), atBar, 'from the door, nothing')
})

test('the jukebox plays the picked record; the room groans at the polka and dances to the rest', () => {
  const at = to(atBar, [[4.6, -2.2], [4.6, -1.4]])
  assert.ok(songs.length >= 4 && songs.length <= 6)
  const steel = pickSong(at, 'B7')
  assert.equal(steel.song, 'B7')
  assert.match(texts(steel).at(-1)!, /B7/, "the story's own line for B7")
  assert.equal(reaction(steel), 'dance')
  const polka = pickSong(steel, 'C3')
  assert.match(texts(polka).at(-1)!, /polka/)
  assert.equal(reaction(polka), 'groan')
  const fiddle = pickSong(at, 'A1')
  assert.match(texts(fiddle).at(-1)!, /A1/, "the story's own line for A1")
  assert.equal(reaction(later(fiddle, DANCE + 1)), undefined, 'the dancing stops')
  assert.equal(pickSong(atBar, 'B7'), atBar, 'out of reach, nothing')
  assert.deepEqual(polka.visit.game.story, atBar.visit.game.story)
})

test('the card hands play out on their own clock, the same every time', () => {
  assert.deepEqual(hand(0, 1), { n: 0, phase: 'deal', winner: 1 })
  assert.equal(hand(10, 1).phase, 'play')
  assert.equal(hand(30, 1).phase, 'show')
  assert.equal(hand(34, 1).phase, 'rake')
  assert.equal(hand(HAND + 1, 1).n, 1)
  assert.notEqual(hand(0, 1).winner, hand(HAND, 1).winner, 'the pot changes hands')
  assert.deepEqual(hand(123.4, 5), hand(123.4, 5))
})

test('watching the card game: the players talk over their cards in turn, in their own lines', () => {
  const near = to(atBar, [[-3.2, 3.0]])
  const players = cardPlayers(near.visit.game.story, near.visit.seed)
  assert.ok(players.length >= 2)
  const once = watchCards(near)
  const twice = watchCards(later(once, 8))
  const who = twice.visit.talk.log.map((l) => l.with)
  assert.ok(new Set(who).size >= 2, `two players spoke: ${who}`)
  assert.ok(who.every((w) => players.includes(w)))
  assert.ok(texts(twice).every((t) => storyLines.has(t)))
  assert.deepEqual(twice.visit.game.story, atBar.visit.game.story)
  assert.equal(watchCards(atBar), atBar, 'from the door, nothing')
  assert.ok(Math.hypot(near.visit.game.pos.x - CARD_TABLE.x, near.visit.game.pos.z - CARD_TABLE.z) < 2.2)
})

test("eavesdropping: a table's thread fades in as Owen comes close, line by line from the story", () => {
  const s = atBar.visit.game.story
  assert.deepEqual(overheard(s, vec(0, 3), 0), [], 'from the door, nothing carries')
  const booth = overheard(s, vec(BOOTH.x - 1.2, BOOTH.z), 0)
  assert.equal(booth.length, 1)
  assert.equal(booth[0].thread, 'gravelCash')
  assert.equal(booth[0].alpha, 1)
  const half = overheard(s, vec(BOOTH.x - 2.7, BOOTH.z), 0)[0]
  assert.ok(half.alpha > 0 && half.alpha < 1, `faint at a distance: ${half.alpha}`)
  const lines = prologueThreads.find((t) => t.id === 'gravelCash')!.lines
  const heard = new Set(Array.from({ length: 60 }, (_, i) => overheard(s, vec(BOOTH.x - 1.2, BOOTH.z), i)[0].text))
  assert.ok(heard.size > 2, 'the talk moves on')
  for (const t of heard) assert.ok(lines.some((l) => l.text === t))
  assert.equal(overheard(s, vec(POOL_TABLE.x + 1.6, POOL_TABLE.z), 0)[0].thread, 'shortCount', 'the airmen at the pool table')
})

test("Wade plays after the talk and the room quiets; the door says goodnight onto Second Avenue", () => {
  const before = atBar.visit.game
  assert.equal(guitar(before.story), false)
  assert.equal(roomLevel(before.story), 1)
  const after = talk(before, 'texas')
  assert.equal(guitar(after.story), true)
  assert.equal(roomLevel(after.story), HUSH)
  const out = interact(walk(after, [[0, 4.2]]))
  assert.equal(out.space, 'downtown', 'out the door onto the street, not a cut')
  assert.equal(out.panel, undefined)
})

test('new lines in play: a card-game line over the cards, and a record aside for each record the story now has', () => {
  const near = to(atBar, [[-3.2, 3.0]])
  const cardBarks = ['reporter', 'foreman'].flatMap((id) => prologueTown.find((a) => a.id === id)!.lines.bark!.filter((b) => b.id.startsWith('card')))
  assert.ok(cardBarks.length >= 4, 'the deal, a bet, a show, the rake')
  const cardText = new Set(cardBarks.flatMap((b) => b.lines.map((l) => l.text)))
  const watched = watchCards(near)
  assert.ok(cardText.has(texts(watched)[0]), `the first thing overheard is a card line: ${texts(watched)[0]}`)
  assert.deepEqual(watched.visit.game.story, atBar.visit.game.story, 'no plot effect')

  const juke = prologueThings.find((a) => a.id === 'jukebox')!
  for (const id of ['fiddle', 'ballad', 'rockabilly']) {
    const bit = juke.lines.use!.find((b) => b.id === id)
    assert.ok(bit, `${id} has an aside`)
    const t = queue(atBar.visit.talk, juke, bit.lines, atBar.visit.clock)
    assert.equal(t.log.at(-1)!.text, bit.lines[0].text)
    assert.equal(t.log.at(-1)!.with, 'jukebox')
  }
  const guitarBarks = ['hank', 'airmanJukebox', 'pilotGray'].filter((id) => prologueTown.find((a) => a.id === id)!.lines.bark!.some((b) => b.id.startsWith('guitar') || b.id === 'quiet'))
  assert.equal(guitarBarks.length, 3, 'the room reacts to the guitar')
})

test('every jukebox record in the story has a game-side song that plays its aside', () => {
  const juke = prologueThings.find((a) => a.id === 'jukebox')!
  // The records are the jukebox's use asides; the coin return is the machine failing, not a record.
  const records = juke.lines.use!.filter((b) => b.id !== 'coinReturn')
  assert.ok(records.length >= 5)
  for (const record of records) {
    const song = songs.find((s) => s.bit === record.id)
    assert.ok(song, `record ${record.id} has no song in barTalk.ts`)
    const at = to(atBar, [[4.6, -2.2], [4.6, -1.4]])
    assert.equal(texts(pickSong(at, song.key)).at(-1), record.lines.at(-1)!.text, `${song.key} plays the story's aside`)
  }
})
