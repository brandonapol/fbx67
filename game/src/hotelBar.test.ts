import { test } from 'node:test'
import assert from 'node:assert/strict'
import { replay } from '../../text-game/src/engine.ts'
import { menu, send, sendMission } from '../../text-game/src/story.ts'
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
import { blocked, hits, lineOfSight, vec } from './world.ts'

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
