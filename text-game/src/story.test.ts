import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initialState } from './state.ts'
import { choicesOf, choose, replay } from './engine.ts'
import { canonicalKey } from './liveness.ts'
import { clock, goal, menu, offers, place, send, weather } from './story.ts'
import { scenes } from './scenes/index.ts'
import type { State } from './types.ts'

const talks = ['texas', 'munitions', 'round'] as const
const spots = ['stove', 'cache', 'marker'] as const

test('menu shows the scene text and one note per option', () => {
  const m = menu(initialState)
  assert.equal(m.scene, 'p_bar')
  assert.deepEqual(
    m.options.map((o) => o.note),
    [...talks],
  )
  assert.ok(m.text.includes('Silver Pan'))
})

test('send agrees with choose on every prologue route', () => {
  talks.forEach((talk, ti) =>
    spots.forEach((spot, si) => {
      const byNote = ['goodnight', 'sleep', 'fly', spot, 'continue'].reduce(send, send(initialState, talk))
      const byNumber = replay([ti + 1, 1, 1, 1, si + 1, 1]).at(-1)
      assert.deepEqual(byNote, byNumber)
      assert.equal(byNote.scene, 'a1_flood')
      assert.equal(byNote.owenCache, spot)
    }),
  )
})

test('every option in the prologue through Act 3 has a named, unique note', () => {
  const early = new Set(scenes.filter((sc) => sc.act !== 'Act 4: Breakup' && sc.act !== 'Epilogue').map((sc) => sc.id))
  const seen = new Set<string>()
  const visited = new Set<string>()
  const queue: State[] = [initialState]
  while (queue.length > 0) {
    const s = queue.pop()!
    const key = canonicalKey(s)
    if (seen.has(key) || !early.has(s.scene)) continue
    seen.add(key)
    visited.add(s.scene)
    const notes = menu(s).options.map((o) => o.note)
    notes.forEach((note) => assert.doesNotMatch(note, /^option\d+$/, `${s.scene} has an unnamed option`))
    assert.equal(new Set(notes).size, notes.length, `${s.scene} repeats a note: ${notes.join(', ')}`)
    choicesOf(s).forEach((_, i) => queue.push(choose(s, i + 1)))
  }
  early.forEach((id) => assert.ok(visited.has(id), `${id} was never reached`))
})

test('send refuses a note the menu does not offer', () => {
  assert.equal(offers(initialState, 'stove'), false)
  assert.throws(() => send(initialState, 'stove'), /does not accept note stove/)
})

test('weather follows heat and trust', () => {
  const at = (patch: Partial<State>): State => ({ ...initialState, ...patch })
  assert.equal(weather(initialState), 'clear')
  assert.equal(weather(at({ heat: 2 })), 'dusk')
  assert.equal(weather(at({ eliTrust: -1 })), 'dusk')
  assert.equal(weather(at({ heat: 4 })), 'night')
  assert.equal(weather(at({ eliTrust: -3 })), 'night')
})

const placed = scenes.filter((sc) => sc.act === 'Prologue' || sc.act === 'Act 1: Flood')

test('every prologue and Act 1 scene says where, when and what next', () => {
  assert.ok(placed.some((sc) => sc.act === 'Act 1: Flood'))
  placed.forEach((sc) => {
    assert.ok(sc.place, `${sc.id} has no place`)
    assert.match(sc.clock ?? '', /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, `${sc.id} has no clock`)
    assert.ok(sc.goal, `${sc.id} has no goal`)
  })
})

test('place, clock and goal read the current scene', () => {
  const dock = replay([1, 1, 1]).at(-1)!
  assert.equal(place(initialState), 'silverPan')
  assert.equal(clock(initialState), '1967-07-14T23:00')
  assert.equal(place(dock), 'floatDock')
  assert.equal(goal(dock), 'Fly north with Curly to the survey camp.')
  assert.equal(place(send(dock, 'fly')), 'surveyCamp')
  const flood = replay([1, 1, 1, 1, 1, 1]).at(-1)!
  assert.equal(flood.scene, 'a1_flood')
  assert.equal(place(flood), 'floodedStreet')
  assert.equal(clock(flood), '1967-08-15T09:00')
  assert.equal(goal(flood), 'Hold the sandbag line.')
})

const toFlood = [1, 1, 1, 1, 1, 1]
const openings = {
  stay: [...toFlood, 2],
  errand: [...toFlood, 1, 1, 1, 1, 1, 1, 1, 1],
  direct: [...toFlood, 1, 1, 1, 2, 1, 1, 1],
} as const

test('the three Act 1 openings reach the cabin with the trust and Joan they earned', () => {
  const at = (path: readonly number[]) => replay(path).at(-1)!
  const scenesOf = (path: readonly number[]) => replay(path).map((s) => s.scene)
  Object.values(openings).forEach((path) => assert.equal(at(path).scene, 'a1_body'))
  assert.deepEqual([at(openings.stay).eliTrust, at(openings.stay).joan], [0, 0])
  assert.deepEqual([at(openings.errand).eliTrust, at(openings.errand).joan], [1, 1])
  assert.deepEqual([at(openings.direct).eliTrust, at(openings.direct).joan], [1, 0])
  assert.ok(scenesOf(openings.errand).includes('a1_trail'))
  assert.ok(!scenesOf(openings.direct).includes('a1_errand'))
  assert.ok(!scenesOf(openings.stay).includes('a1_track'))
})

test('every opening meets Joan at the help tent and hears about the bruising', () => {
  Object.values(openings).forEach((path) =>
    [1, 2].forEach((knot) =>
      [1, 2].forEach((pick) => {
        const states = replay([...path, knot, ...(knot === 1 ? [1] : []), pick])
        const tent = states.find((s) => s.scene === 'a1_ruling')!
        assert.equal(place(tent), 'helpTent')
        assert.ok(states.at(-1)!.evidence.includes('bruising'))
      }),
    ),
  )
})

test('Wade\'s goal on the search names Eli', () => {
  const track = replay([...toFlood, 1]).at(-1)!
  assert.match(goal(track) ?? '', /Find Eli/)
})

// #205: the barfight move carries state. Shove and rack used to land the same; now Hank remembers each move.
const barfightAt = [1, 1, 1, 1, 1, 1, 2, 2, 1, 1, 1]

const toSteak = (move: number): State => {
  const go = (s: State): State =>
    s.scene === 'a2_steak' ? s : go(s.scene === 'a2_curly' ? send(s, 'steak') : choose(s, 1))
  return go(choose(replay(barfightAt).at(-1) as State, move))
}

test('the barfight move is remembered, and Hank says something different at the steak for each', () => {
  const at = replay(barfightAt).at(-1) as State
  assert.equal(at.scene, 'a1_barfight')
  const ends = [1, 2, 3, 4].map(toSteak)
  assert.deepEqual(
    ends.map((s) => s.barfightMove),
    ['shove', 'mooseRack', 'bottle', undefined],
  )
  const lines = ends.map((s) => menu(s).text)
  assert.equal(new Set(lines).size, 4)
  assert.match(lines[0], /stove/)
  assert.match(lines[1], /moose rack/)
  assert.match(lines[2], /rye/)
  assert.match(lines[3], /stool/)
})

test('the barfight move colors and locks nobody out: only the bottle adds heat', () => {
  const [shove, rack, bottle] = [1, 2, 3].map(toSteak)
  assert.deepEqual({ ...rack, barfightMove: 'shove' }, shove)
  assert.equal(bottle.heat, shove.heat + 1)
  assert.equal(canonicalKey(choose(shove, 1)), canonicalKey(choose(rack, 1)))
})
