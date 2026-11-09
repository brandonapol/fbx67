import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initialState } from './state.ts'
import { choicesOf, choose, replay } from './engine.ts'
import { menu, mission, send, sendMission } from './story.ts'
import { missions } from './missions.ts'
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
  assert.equal(`${m.title}. ${m.detail}: ${m.endings.map((e) => e.label).join(' / ')}`, 'Search for Eli. Errand: ran it / skipped it')
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
    assert.equal(`${m.title}. ${m.detail}: ${m.endings.map((e) => e.label).join(' / ')}`, 'The body. Knot: pointed it out / cut it silently')
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

test('every mission note ends at its end scene, and the notes cover every way through', () => {
  missions.forEach((m) => {
    const starts = allAt(m.start)
    assert.ok(starts.length > 0, `${m.id}: nothing reaches ${m.start}`)
    starts.forEach((start) => {
      const byNote = m.endings.map((e) => sendMission(start, e.note))
      const played = playedThrough(start, m.end)
      played.forEach((p) => assert.equal(byNote.filter((s) => JSON.stringify(s) === JSON.stringify(p)).length, 1, `${m.id}: a path to ${m.end} matches no single note`))
      assert.equal(new Set(byNote.map((s) => JSON.stringify(s))).size, m.endings.length, `${m.id}: two notes give the same state`)
      assert.equal(played.length, m.endings.length, `${m.id}: ${played.length} paths through, ${m.endings.length} notes`)
    })
  })
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
