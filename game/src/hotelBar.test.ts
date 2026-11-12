import { test } from 'node:test'
import assert from 'node:assert/strict'
import { replay } from '../../text-game/src/engine.ts'
import { menu, mission, place, send, sendMission } from '../../text-game/src/story.ts'
import { notebook } from '../../text-game/src/queries.ts'
import type { SceneId } from '../../text-game/src/types.ts'
import { ACT2_PATH } from '../smoke/act2Plan.ts'
import type { Bar, SeatId } from './hotelBar.ts'
import {
  BEAT,
  BEATS,
  BOOTH,
  CAUGHT_TIME,
  LEAD,
  QUIET_AT,
  QUIET_FACING,
  SONGS,
  SONG_TIME,
  SPAWN,
  arrival,
  barSpot,
  begin,
  carries,
  cover,
  finished,
  fragment,
  heardMost,
  hotelBar,
  lines,
  overheard,
  restart,
  seats,
  setNote,
  sit,
  stared,
  step,
  strum,
  toNextBeat,
} from './hotelBar.ts'
import type { Box } from './world.ts'
import { angleTo, blocked, distance, hits, lineOfSight, sub, vec } from './world.ts'
import type { Game } from './prologue.ts'
import { available, interact, press, still, tick } from './prologue.ts'
import { startFrom } from './start.ts'
import { route, spaceFor } from './router.ts'
import { solids, spaces } from './levels.ts'
import { TABLE_SPOT } from './kitchen.ts'
import { SET, engineSenders, walk as ratchetWalk } from './notesRatchet.ts'
import { act as barAct, barNext, playBar } from './hotelBarBot.ts'

// The hotel bar's run (hotelBar.ts), played as pure logic: the stools, the rhythm, what comes through from the booth,
// the stare and its retry, and the staging rule that keeps the quiet man's face out of every view.

const DT = 1 / 60

const pathTo = (scene: SceneId): readonly number[] => {
  const path = ACT2_PATH.split(',').map(Number)
  for (let n = 0; replay(path).at(-1)!.scene !== scene; n++) {
    if (n > 40) throw new Error(`no first-choice path to ${scene}`)
    path.push(1)
  }
  return path
}

const hotel = replay(pathTo('a2_hotel')).at(-1)!
const set = send(hotel, 'guitar')

// Plays on, strumming on each beat `plays` keeps (every one by default), or not at all.
const run = (bar: Bar, seconds: number, strumming: boolean, plays: (beat: number) => boolean = () => true): Bar => {
  let b = bar
  for (let t = 0; t < seconds && b.song && b.caught === undefined; t += DT) {
    const next = toNextBeat(b)
    b = strumming && next !== undefined && Math.abs(next) < DT / 2 + 1e-9 && plays(b.song!.judged) ? strum(b) : b
    b = step(b, DT)
  }
  return b
}

// Plays the whole set on one stool, keeping time on the beats `plays` keeps.
const playSet = (seat: SeatId, plays?: (beat: number) => boolean): Bar => {
  let b = begin()
  for (let i = 0; i < SONGS; i++) b = run(sit(b, seat), SONG_TIME + 1, true, plays)
  return b
}

test('the hotel bar is a2_hotel_set\'s place and the set starts there; later scenes have no run', () => {
  assert.equal(set.scene, 'a2_hotel_set')
  assert.equal(hotelBar.place, 'hotelBar')
  assert.equal(hotelBar.act, menu(set).act)
  assert.ok(arrival(set))
  assert.equal(arrival(send(set, 'sitClose')), undefined)
})

test('the place id has a spawn point clear of every solid, inside the room', () => {
  const solids = hotelBar.props.filter((p) => p.solid).map((p) => p.box)
  assert.equal(blocked(SPAWN, solids), false)
  assert.ok(Math.abs(SPAWN.x) < hotelBar.size.w / 2 && Math.abs(SPAWN.z) < hotelBar.size.d / 2)
  seats.forEach((s) => assert.equal(blocked(s.at, solids.filter((b) => !(b.x === s.at.x && b.z === s.at.z))), false, `${s.id} is clear`))
})

// The staging rule: the quiet man sits facing into the alcove, the booth solid in front of him from his knees to the
// wall, and a partition to the ceiling on its open side. From anywhere in the room outside the booth, either the point
// is behind the plane through his head, or the partition hides him: no camera there can see his face.
test('the quiet man\'s face is never visible from anywhere in the room', () => {
  const occluders = hotelBar.props.filter((p) => p.occludes).map((p) => p.box)
  const faceDir = vec(Math.sin(QUIET_FACING), Math.cos(QUIET_FACING))
  const inside = (b: Box, x: number, z: number) => Math.abs(x - b.x) < b.w / 2 && Math.abs(z - b.z) < b.d / 2
  let sampled = 0
  for (let x = -hotelBar.size.w / 2 + 0.15; x < hotelBar.size.w / 2; x += 0.1) {
    for (let z = -hotelBar.size.d / 2 + 0.15; z < hotelBar.size.d / 2; z += 0.1) {
      if (inside(BOOTH, x, z) || occluders.some((b) => inside(b, x, z))) continue
      sampled++
      const p = vec(x, z)
      const ahead = (x - QUIET_AT.x) * faceDir.x + (z - QUIET_AT.z) * faceDir.z
      assert.ok(ahead <= 0 || !lineOfSight(QUIET_AT, p, occluders), `his face shows from ${x.toFixed(2)},${z.toFixed(2)}`)
    }
  }
  assert.ok(sampled > 5000)
  assert.ok(hits(QUIET_AT, { ...BOOTH, w: BOOTH.w + 0.4, x: BOOTH.x - 0.2 }), 'the booth starts at his knees')
})

test('the booth\'s lines are the heard scene\'s quoted speech, Tolliver\'s and the quiet man\'s', () => {
  const l = lines(set)
  const heard = menu(send(set, 'sitClose')).text
  assert.ok(heard.includes(`"${l.tolliver}"`))
  assert.ok(heard.includes(`"${l.quiet}"`))
  assert.match(l.tolliver, /my land/)
  // The words the notebook keeps from that night are the quiet man's.
  const words = notebook(sendMission(hotel, 'heardMost')).find((e) => e.id === 'hotelTalk')!.line
  assert.ok(words.includes(l.quiet.split('. ').at(-1)!), words)
})

test('a fragment fills in word by word with how much came through', () => {
  const line = 'one two three four'
  assert.equal(fragment(line, 0), '')
  assert.equal(fragment(line, 0.25), 'one...')
  assert.equal(fragment(line, 0.6), 'one two...')
  assert.equal(fragment(line, 1), line)
})

test('the voices carry: Tolliver across the room, the quiet man only to the booth stool', () => {
  const at = (id: SeatId) => seats.find((s) => s.id === id)!.at
  assert.equal(carries('quiet', at('boothStool')), 1)
  assert.equal(carries('quiet', at('barStool')), 0)
  assert.equal(carries('quiet', at('doorStool')), 0)
  assert.ok(carries('tolliver', at('boothStool')) > carries('tolliver', at('barStool')))
  assert.ok(carries('tolliver', at('barStool')) > carries('tolliver', at('doorStool')))
  assert.ok(carries('tolliver', at('doorStool')) > 0)
})

test('a strum on the beat is clean and lifts the playing; off it is a clam and the booth goes quiet', () => {
  const b = sit(begin(), 'boothStool')
  const onBeat = strum(step(b, LEAD))
  assert.equal(onBeat.song!.judged, 1)
  assert.ok(onBeat.song!.groove > b.song!.groove)
  const off = strum(step(b, LEAD + BEAT / 2))
  assert.ok(off.song!.groove < b.song!.groove)
  assert.ok(off.song!.hush > 0)
  assert.ok(cover(onBeat) > cover(off), 'the guitar covers the room by how well it is played')
  assert.equal(cover(begin()), 0, 'no song, no cover')
})

test('a clean set at the booth stool hears every word of both lines: heard most, sitClose', () => {
  const b = playSet('boothStool')
  assert.ok(finished(b))
  assert.equal(b.heard.quiet, 1)
  assert.equal(b.heard.tolliver, 1)
  assert.ok(heardMost(b))
  assert.equal(setNote(set, b), 'sitClose')
  assert.deepEqual(overheard(set, b).map((o) => o.text), [lines(set).tolliver, lines(set).quiet])
})

test('from the door Wade hears a few of Tolliver\'s words and nothing of the quiet man: pieces, sitFar', () => {
  const b = playSet('doorStool')
  assert.ok(finished(b))
  assert.equal(b.heard.quiet, 0)
  assert.ok(b.heard.tolliver > 0 && b.heard.tolliver < 0.5)
  assert.equal(setNote(set, b), 'sitFar')
  assert.deepEqual(overheard(set, b).map((o) => o.who), ['tolliver'])
  assert.match(overheard(set, b)[0]!.text, /^\.\.\.my land,.*\.\.\.$/)
})

test('playing sloppily at the booth stool leaves the quiet man\'s line unfinished: pieces', () => {
  const b = playSet('boothStool', (k) => k % 3 !== 2)
  assert.ok(finished(b))
  assert.ok(b.heard.quiet < 1)
  assert.equal(setNote(set, b), 'sitFar')
})

test('each stool is there between songs only, and the set is three songs', () => {
  const b = begin()
  assert.ok(barSpot(set, b, 'barStool'))
  const playing = sit(b, 'barStool')
  assert.equal(barSpot(set, playing, 'boothStool'), false)
  const after = run(playing, SONG_TIME + 1, true)
  assert.equal(after.songs, 1)
  assert.ok(barSpot(set, after, 'boothStool'), 'between songs he can take another stool')
  assert.equal(barSpot(send(set, 'sitFar'), after, 'boothStool'), false)
  assert.equal(barSpot(set, playSet('barStool'), 'barStool'), false, 'the set is done')
})

test('stopping dead by the booth gets Wade stared at, and busted retries from the start of that song', () => {
  const first = run(sit(begin(), 'boothStool'), SONG_TIME + 1, true)
  const second = sit(first, 'boothStool')
  const stopped = run(second, SONG_TIME, false)
  assert.equal(stopped.caught, 0)
  assert.equal(stared(stopped, CAUGHT_TIME + DT), 'busted')
  const retried = restart(stopped)
  assert.equal(retried.songs, 1)
  assert.deepEqual(retried.heard, first.heard, 'what he had heard by the start of the song')
  assert.equal(retried.song, undefined)
  assert.equal(retried.seat, 'boothStool')
})

test('stopping dead by the door costs only what Wade hears: nobody stares', () => {
  const stopped = run(sit(begin(), 'doorStool'), SONG_TIME + 1, false)
  assert.equal(stopped.caught, undefined)
  assert.equal(stopped.songs, 1)
  assert.equal(stopped.heard.tolliver, 0)
})

test('the song is BEATS chords on the beat after the lead-in', () => {
  assert.equal(SONG_TIME, LEAD + BEATS * BEAT)
})

// --- The mission, played headless in the engine build and checked against the text build ---

const hash = (path: readonly number[]): string => `#path=${path.join(',')}`
const textBuild = (g: Game) => replay(g.path).at(-1)!
const GDT = 1 / 30

const walkTo = (g: Game, to: { x: number; z: number }): Game => {
  let cur = g
  for (let n = 0; distance(cur.pos, to) >= 0.15 && !cur.panel; n++) {
    if (n > 30 * 60) throw new Error(`stuck at ${cur.pos.x.toFixed(2)},${cur.pos.z.toFixed(2)}`)
    cur = tick(cur, { dir: sub(vec(to.x, to.z), cur.pos), hold: false, limit: distance(to, cur.pos) }, GDT)
  }
  return cur
}

// Lucy's table, where she asks; bringing the guitar takes Wade to the hotel bar's door.
const atKitchen = startFrom(hash(pathTo('a2_hotel')), '')
const asked = (() => {
  const near = walkTo(atKitchen, vec(-0.5, 0))
  return interact(tick(near, { ...still, view: angleTo(near.pos, TABLE_SPOT) }, GDT))
})()
const inBar = press(asked, 'note:guitar')

test('bringing the guitar takes Wade from Lucy\'s table to the hotel bar\'s door, the stools to choose from', () => {
  assert.equal(inBar.story.scene, 'a2_hotel_set')
  assert.deepEqual(inBar.story, textBuild(inBar))
  assert.deepEqual(route(inBar.story, 'kitchen'), { to: 'space', space: 'hotelBar' })
  assert.equal(inBar.space, 'hotelBar')
  assert.deepEqual(inBar.pos, SPAWN)
  assert.equal(inBar.panel, undefined, 'no menu: where he sits is played, not picked')
  assert.deepEqual(available(inBar).map((i) => i.id).sort(), seats.map((s) => s.id).sort())
  assert.equal(spaceFor('Act 2: Freeze-up', 'hotelBar'), 'hotelBar')
  assert.equal(blocked(spaces.hotelBar.spawn, solids(spaces.hotelBar)), false)
})

test('skipping it at Lucy\'s table lands where the skipped note does', () => {
  const g = press(asked, 'note:skip')
  assert.deepEqual(g.story, sendMission(hotel, 'skipped'))
  assert.deepEqual(g.story, textBuild(g))
})

const ends = { boothStool: 'heardMost', doorStool: 'heardPieces' } as const

Object.entries(ends).forEach(([seat, note]) => {
  test(`the whole set on the ${seat}: the story hears ${note}, on the text build's path`, () => {
    const played = playBar(inBar, seat as SeatId)
    assert.equal(played.space, 'hotelBar')
    assert.equal(played.panel?.title, menu(played.story).title, 'what he heard is the scene\'s own text')
    assert.equal(played.panel?.text, menu(played.story).text)
    assert.deepEqual(played.story, textBuild(played))
    const told = press(played, `note:${played.panel!.buttons[0]!.id.slice(5)}`)
    assert.deepEqual(told.story, sendMission(hotel, note))
    assert.deepEqual(told.story, textBuild(told), 'parity with the text build')
    assert.equal(told.space, 'hall', 'out of the bar, Wade goes on to the Chiefs meeting in its hall (chiefsMeeting.ts)')
  })
})

test('mid-song nothing reaches the story: strums and songs send no note until the set is done', () => {
  let g = inBar
  for (let n = 0; n < 400 && !(g.bar?.songs === SONGS - 1 && g.bar.song === undefined); n++) g = barAct(g, barNext(g, 'barStool'))
  assert.equal(g.bar?.songs, SONGS - 1)
  assert.deepEqual(g.story, inBar.story)
  assert.deepEqual(g.path, inBar.path)
})

test('stared at by the booth: busted, and the retry is the start of that song, with the story untouched', () => {
  const firstSong = (() => {
    let g = inBar
    for (let n = 0; n < 200 && g.bar?.songs !== 1; n++) g = barAct(g, barNext(g, 'boothStool'))
    return g
  })()
  const sat = interact(firstSong)
  assert.ok(sat.bar?.song, 'sitting again starts the next song')
  let g = sat
  for (let n = 0; n < 30 * 30 && !g.panel; n++) g = tick(g, still, GDT)
  assert.equal(g.panel?.kind, 'busted')
  assert.equal(g.busts, inBar.busts + 1)
  assert.deepEqual(g.story, inBar.story)
  const retried = press(g, 'retry')
  assert.equal(retried.panel, undefined)
  assert.equal(retried.bar?.songs, 1)
  assert.equal(retried.bar?.song, undefined)
  assert.deepEqual(retried.bar?.heard, firstSong.bar?.heard)
  const done = playBar(retried, 'boothStool')
  const told = press(done, `note:${done.panel!.buttons[0]!.id.slice(5)}`)
  assert.deepEqual(told.story, sendMission(hotel, 'heardMost'), 'and the set can still be played to the end')
})

test('a link straight to what Wade heard opens its menu in the bar, with no set to play', () => {
  const g = startFrom(hash([...pathTo('a2_hotel'), 1, 1]), '')
  assert.equal(place(g.story), 'hotelBar')
  assert.equal(g.space, 'hotelBar')
  assert.equal(g.bar, undefined)
  assert.equal(g.panel?.title, menu(g.story).title)
})

test('the ratchet counts the hotel bar\'s set as the sender of heard most and heard pieces', () => {
  const at = engineSenders(ratchetWalk().filter((s) => mission(s.state)?.id === 'theHotelBar'))
  assert.deepEqual([...new Set(at.filter((s) => s.space === 'hotelBar').map((s) => s.key))].sort(), ['theHotelBar:heardMost', 'theHotelBar:heardPieces'])
  assert.deepEqual([...new Set(at.filter((s) => s.key === 'theHotelBar:skipped').map((s) => `${s.space}/${s.spot}`))], [`kitchen/${TABLE_SPOT.id}`])
  assert.ok(at.every((s) => s.key === 'theHotelBar:skipped' || (s.space === 'hotelBar' && s.spot === SET)), 'heard most and pieces only from the set')
})
