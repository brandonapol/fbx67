import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initialState } from './state.ts'
import { choicesOf, choose, replay } from './engine.ts'
import { menu, mission, send, sendMission } from './story.ts'
import { missionMenu, missions, type Mission } from './missions.ts'
import { sceneIndex } from './sceneIds.ts'
import type { SceneId, State } from './types.ts'

// Every distinct state that reaches a scene, breadth first from the start of the game.
const allAt = (id: SceneId): readonly State[] => {
  const seen = new Set<string>()
  const at: State[] = []
  const queue: State[] = [initialState]
  while (queue.length > 0) {
    const s = queue.shift() as State
    const key = JSON.stringify(s)
    if (seen.has(key)) continue
    seen.add(key)
    if (s.scene === id) at.push(s)
    else if (sceneIndex(s.scene) < sceneIndex(id)) choicesOf(s).forEach((_, i) => queue.push(choose(s, i + 1)))
  }
  return at
}

// Every state at the end scene that playing the scenes one choice at a time can produce from s.
const playedThrough = (s: State, end: SceneId): readonly State[] =>
  s.scene === end ? [s] : choicesOf(s).flatMap((_, i) => playedThrough(choose(s, i + 1), end))

// Prologue, then "Go find Eli" at a1_flood.
const atTrack = replay([1, 1, 1, 1, 1, 1, 1]).at(-1) as State

test('the search for Eli offers ran it / skipped it at a1_track', () => {
  assert.equal(atTrack.scene, 'a1_track')
  const m = mission(atTrack)
  assert.ok(m)
  assert.equal(missionMenu(m), 'Search for Eli. Errand: ran it / skipped it')
  assert.deepEqual(
    m.endings.map((e) => e.note),
    ['ranIt', 'skippedIt'],
  )
})

test('each search note agrees with playing its scenes one note at a time', () => {
  const ran = ['lacey', 'drink', 'helpTent', 'envelope', 'waitBaby', 'wadeBack', 'passBags'].reduce(send, atTrack)
  const skipped = ['lacey', 'drink', 'sendSomebody', 'tellEli', 'wadeBack', 'passBags'].reduce(send, atTrack)
  assert.deepEqual(sendMission(atTrack, 'ranIt'), ran)
  assert.deepEqual(sendMission(atTrack, 'skippedIt'), skipped)
})

test('the search moves Joan only on the errand, Eli trust by one either way, and never heat', () => {
  const ran = sendMission(atTrack, 'ranIt')
  const skipped = sendMission(atTrack, 'skippedIt')
  assert.equal(ran.scene, 'a1_body')
  assert.equal(skipped.scene, 'a1_body')
  assert.deepEqual([ran.joan - atTrack.joan, ran.eliTrust - atTrack.eliTrust, ran.heat - atTrack.heat], [1, 1, 0])
  assert.deepEqual([skipped.joan - atTrack.joan, skipped.eliTrust - atTrack.eliTrust, skipped.heat - atTrack.heat], [0, 1, 0])
})

// The search on the go path, and the stay path's single bag line, both land on a1_body.
const atBodyGo = sendMission(atTrack, 'ranIt')
const atBodyStay = replay([1, 1, 1, 1, 1, 1, 2]).at(-1) as State

test('the body offers knot: pointed it out / cut it silently at a1_body on both paths', () => {
  ;[atBodyGo, atBodyStay].forEach((s) => {
    assert.equal(s.scene, 'a1_body')
    const m = mission(s)
    assert.ok(m)
    assert.equal(missionMenu(m), 'The body. Knot: pointed it out / cut it silently')
    assert.deepEqual(
      m.endings.map((e) => e.note),
      ['pointedItOut', 'cutItSilently'],
    )
  })
})

test('each body note agrees with playing its scenes one note at a time', () => {
  ;[atBodyGo, atBodyStay].forEach((s) => {
    assert.deepEqual(sendMission(s, 'pointedItOut'), ['pointOutKnot', 'liftBody'].reduce(send, s))
    assert.deepEqual(sendMission(s, 'cutItSilently'), send(s, 'cutKnot'))
  })
})

test('the body always grants the knot, moves Eli trust only when pointed out, and never heat', () => {
  ;[atBodyGo, atBodyStay].forEach((s) => {
    const pointed = sendMission(s, 'pointedItOut')
    const cut = sendMission(s, 'cutItSilently')
    ;[pointed, cut].forEach((out) => {
      assert.equal(out.scene, 'a1_ruling')
      assert.ok(out.evidence.includes('knot'))
      assert.equal(out.heat, s.heat)
    })
    assert.equal(pointed.eliTrust - s.eliTrust, 1)
    assert.equal(cut.eliTrust, s.eliTrust)
  })
})

// Notes may land the same where a detail carries no state yet (the barfight's move, #205), so the check is on the states:
// every way through matches a note, and every note is a way through.
test('every mission note ends at its end scene, and the notes cover every way through', () => {
  missions.forEach((m) => {
    const starts = allAt(m.start)
    assert.ok(starts.length > 0, `${m.id}: nothing reaches ${m.start}`)
    starts.forEach((start) => {
      const byNote = new Set(m.endings.map((e) => JSON.stringify(sendMission(start, e.note))))
      const played = new Set(playedThrough(start, m.end).map((p) => JSON.stringify(p)))
      assert.deepEqual([...played].filter((p) => !byNote.has(p)), [], `${m.id}: a path to ${m.end} matches no note`)
      assert.deepEqual([...byNote].filter((n) => !played.has(n)), [], `${m.id}: a note lands where no path does`)
    })
  })
})

test('the single-detail missions give every note its own state', () => {
  missions
    .filter((m) => m.details.length === 1)
    .forEach((m) =>
      allAt(m.start).forEach((start) => {
        assert.equal(new Set(m.endings.map((e) => JSON.stringify(sendMission(start, e.note)))).size, m.endings.length, `${m.id}: two notes give the same state`)
        assert.equal(playedThrough(start, m.end).length, m.endings.length, `${m.id}: paths through and notes differ`)
      }),
    )
})

test('no mission outside its start scene, and unknown notes are refused', () => {
  assert.equal(mission(initialState), undefined)
  assert.throws(() => sendMission(initialState, 'ranIt'), /No mission starts at p_bar/)
  assert.throws(() => sendMission(atTrack, 'stayOnLine'), /does not accept note stayOnLine/)
  assert.deepEqual(
    menu(atTrack).options.map((o) => o.note),
    ['lacey'],
  )
})

// Every state that reaches the barfight, from both search paths and both answers to Lucy.
const atBarfight = allAt('a1_barfight')
const delta = (from: State, to: State) => [to.eliTrust - from.eliTrust, to.heat - from.heat]
const note = (opened: string, move: string, stood: string, caught: string) => [opened, move, stood, caught].join('.')

test('the barfight offers opened, move, stood with Eli and caught at a1_barfight', () => {
  assert.ok(atBarfight.length > 0)
  atBarfight.forEach((s) => {
    const m = mission(s)
    assert.ok(m)
    assert.equal(missionMenu(m), 'The barfight. Opened: got up / stayed seated. Move: shove / rack / bottle. Stood with Eli: yes / no. Caught: clean / red-handed')
    assert.equal(m.endings.length, 24)
    m.endings.forEach((e) => assert.equal(sendMission(s, e.note).scene, 'a1_tank'))
  })
})

test('standing with Eli is +1 Eli trust, and staying seated is -1', () => {
  const s = atBarfight[0]
  assert.deepEqual(delta(s, sendMission(s, note('gotUp', 'shove', 'stoodWithEli', 'clean'))), [1, 0])
  assert.deepEqual(delta(s, sendMission(s, note('gotUp', 'shove', 'leftEli', 'clean'))), [0, 0])
  assert.deepEqual(delta(s, sendMission(s, note('stayedSeated', 'rack', 'leftEli', 'clean'))), [-1, 0])
  assert.deepEqual(delta(s, sendMission(s, note('stayedSeated', 'rack', 'stoodWithEli', 'clean'))), [0, 0])
})

test('red-handed is +1 heat, shared with the bottle: both together are still +1', () => {
  const s = atBarfight[0]
  ;['gotUp', 'stayedSeated'].forEach((o) => {
    assert.equal(sendMission(s, note(o, 'shove', 'leftEli', 'redHanded')).heat - s.heat, 1)
    assert.equal(sendMission(s, note(o, 'rack', 'leftEli', 'redHanded')).heat - s.heat, 1)
    assert.equal(sendMission(s, note(o, 'rack', 'leftEli', 'clean')).heat - s.heat, 0)
    assert.equal(sendMission(s, note(o, 'bottle', 'leftEli', 'clean')).heat - s.heat, 1)
    assert.equal(sendMission(s, note(o, 'bottle', 'leftEli', 'redHanded')).heat - s.heat, 1)
  })
})

test('the fight adds at most 1 heat and moves Eli trust between -1 and +1', () => {
  atBarfight.forEach((s) =>
    (mission(s) as Mission).endings.forEach((e) => {
      const [trust, heat] = delta(s, sendMission(s, e.note))
      assert.ok(heat >= 0 && heat <= 1, `${e.note}: heat ${heat}`)
      assert.ok(trust >= -1 && trust <= 1, `${e.note}: trust ${trust}`)
    }),
  )
})

test('the seated path offers the same moves as getting up', () => {
  const s = atBarfight[0]
  const seated = send(s, 'stayInSeat')
  assert.equal(seated.scene, 'a1_tank_sat')
  assert.deepEqual(
    menu(seated).options.map((o) => o.note),
    ['shove', 'mooseRack', 'bottle'],
  )
  assert.deepEqual(
    menu(s).options.map((o) => o.note),
    ['shove', 'mooseRack', 'bottle', 'stayInSeat'],
  )
})
