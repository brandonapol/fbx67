import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initialState } from './state.ts'
import { choicesOf, choose, replay } from './engine.ts'
import { canonicalKey } from './liveness.ts'
import { clock, goal, menu, offers, place, send, weather } from './story.ts'
import { scenes } from './scenes/index.ts'
import type { Scene, State } from './types.ts'
import { prologueThreads } from './ambient/prologueTown.ts'
import { N } from './names.ts'

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

const placedActs: readonly Scene['act'][] = ['Prologue', 'Act 1: Flood', 'Act 2: Freeze-up', 'Act 3: Deep Winter']
const placed = scenes.filter((sc) => placedActs.includes(sc.act))

test('every scene from the prologue through Act 3 says where, when and what next', () => {
  placedActs.forEach((act) => assert.ok(placed.some((sc) => sc.act === act), `no ${act} scenes`))
  placed.forEach((sc) => {
    assert.ok(sc.place, `${sc.id} has no place`)
    assert.match(sc.clock ?? '', /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, `${sc.id} has no clock`)
    assert.ok(sc.goal, `${sc.id} has no goal`)
  })
})

test('a café visit is at the café, keeps the goal of the decision it puts off, and comes after it', () => {
  const byId = (id: string) => scenes.find((sc) => sc.id === id)!
  ;[['a2_co_ask', 'a2_co_gossip'], ['a2_heat', 'a2_heat_gossip'], ['a3_rash', 'a3_rash_gossip']].forEach(([from, cafe]) => {
    assert.equal(byId(cafe).place, 'nlCafe')
    assert.equal(byId(cafe).goal, byId(from).goal)
    assert.ok(byId(cafe).clock! > byId(from).clock!, `${cafe} runs before ${from}`)
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

// #208: the survival night's order and signal carry state. The best route (Lucy goes in herself and is let go), with
// the night's two choices swapped in.
const best = [1, 1, 1, 1, 1, 1, 2, 2, 1, 1, 1, 3, 1, 2, 1, 1, 1, 3, 2, 1, 1, 2, 1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
const atCrash = best.slice(0, 33)
const nightRun = (order: number, signal: number): readonly State[] => replay([...atCrash, order, signal, ...best.slice(35)])
const reach = (order: number, signal: number, id: State['scene']): State =>
  nightRun(order, signal).find((s) => s.scene === id) as State

test('the night keeps its order and signal from the crash', () => {
  assert.equal((replay(atCrash).at(-1) as State).scene, 'a3_crash')
  const s = reach(1, 2, 'a3_search')
  assert.deepEqual([s.nightOrder, s.nightSignal], ['fire', 'stampX'])
  assert.deepEqual([reach(2, 1, 'a3_search').nightOrder, reach(2, 3, 'a3_search').nightSignal], ['jake', 'saveFire'])
})

test('fire first leaves Jake frostbitten at the wreck and three toes short in Act 4', () => {
  const [fireWreck, jakeWreck] = [1, 2].map((o) => menu(reach(o, 1, 'a3_wreck')).text)
  assert.match(fireWreck, /candle wax/)
  assert.match(jakeWreck, /both boots on/)
  const [fire, jake] = [1, 2].map((o) => menu(reach(o, 1, 'a4_news')).text)
  assert.match(fire, /three toes off/)
  assert.match(jake, /both feet whole/)
})

test('the signal changes how long the search takes, and the night locks nobody out', () => {
  const homes = [1, 2, 3].map((sig) => menu(reach(1, sig, 'a3_home')).text)
  assert.match(homes[0], /three hours after it set out/)
  assert.match(homes[1], /five hours after it set out/)
  assert.match(homes[2], /seven hours after it set out/)
  const ends = [1, 2].flatMap((o) => [1, 2, 3].map((sig) => nightRun(o, sig).at(-1) as State))
  assert.equal(new Set(ends.map(canonicalKey)).size, 1)
})

test('each overheard prologue thread pays off in a line of its act, heard or not', () => {
  const payoffs: Readonly<Record<string, readonly [string, RegExp]>> = {
    whichRoom: ['a1_ruling', /didn't ask me which room this time/],
    gravelCash: ['a2_hotel_set', /new bills, in order[\s\S]*"Seen that kind of money before\."/],
    shortCount: ['a3_confession_none', /count short week after week, and every short sheet initialed/],
  }
  assert.deepEqual(Object.keys(payoffs).sort(), prologueThreads.map((t) => t.id).sort())
  for (const t of prologueThreads) {
    const [id, line] = payoffs[t.id]
    const sc = scenes.find((x) => x.id === id)!
    assert.equal(sc.act, t.paysOff, `${t.id} pays off in ${t.paysOff}`)
    assert.match(sc.text({ ...initialState, scene: sc.id }), line, `${t.id} in ${id}`)
  }
})

// #345: Joan stays at the tarp after Barnette leaves, not after Owen (the landlady's paragraph comes just before).
test('Joan lingers at the tarp after Barnette has gone, on both of her branches', () => {
  const sc = scenes.find((x) => x.id === 'a1_ruling')!
  ;[0, 1].forEach((joanLevel) => {
    const text = sc.text({ ...initialState, scene: sc.id, joan: joanLevel })
    assert.match(text, new RegExp(`still at the tarp after ${N.barnette} has gone`), `joan=${joanLevel}`)
    assert.doesNotMatch(text, /after he's gone/)
  })
})

// The issue paths: the Chiefs meeting, and the photo lab's two ways in (#338, #343).
const toChiefs = [1, 1, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
const toPhotoLab = [1, 1, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1]

test('Eli\'s speech at the Chiefs keeps the flood night he tells nobody until Act 3', () => {
  const s = replay(toChiefs).at(-1) as State
  assert.equal(s.scene, 'a2_chiefs')
  assert.doesNotMatch(menu(s).text, /flood/)
})

test('the records room is at lunch on the clerk\'s lunch and after lockup on the borrowed key', () => {
  const [lunch, key] = [1, 2].map((way) => replay([...toPhotoLab, way]).at(-1) as State)
  assert.equal(place(lunch), 'photoRecords')
  assert.equal(place(key), 'photoRecords')
  assert.ok((clock(lunch) ?? '') < '1967-09-14T13:00', `lunch clock ${clock(lunch)}`)
  assert.ok((clock(key) ?? '') > '1967-09-14T17:00', `key clock ${clock(key)}`)
  assert.equal(menu(lunch).text, menu(key).text)
})

// #346: the Major's files were copied in late October, so the forged sign-outs cannot run on past it.
test('the forged sign-outs end by the date the files were copied', () => {
  const ids = scenes.filter((x) => x.id.startsWith('a3_confession_'))
  assert.ok(ids.length >= 3)
  for (const sc of ids) {
    const text = sc.text({ ...initialState, scene: sc.id })
    assert.match(text, /dozens of them, all through October/, sc.id)
    assert.doesNotMatch(text, /going back to October/, sc.id)
  }
})

// #104: Lucy's after-hours search runs only while she keeps the land-office job, and sets the logbook flag.
const atMinto = (lucyHeat: number): State => ({ ...initialState, scene: 'a2_minto', lucyHeat })

test('Lucy searches the land office after hours while she has the job, and finds the logbook entry', () => {
  for (const way of ['streetlight', 'mapRoom']) {
    const search = send(atMinto(0), 'leave')
    assert.equal(search.scene, 'a2_records')
    const log = send(search, way)
    assert.equal(log.scene, 'a2_records_log')
    assert.equal(log.recordsLog, 0)
    assert.match(menu(log).text, /RECEIVED[\s\S]*never comes back/)
    assert.doesNotMatch(menu(search).text + menu(log).text, /Ashby|\boil\b/i)
    const out = send(log, 'putBack')
    assert.deepEqual([out.scene, out.recordsLog], ['a2_jake', 1])
  }
  assert.equal(send(atMinto(1), 'leave').scene, 'a2_records')
})

test('at Lucy heat 2 or more the records thread is closed: no search, and the logbook flag stays 0', () => {
  for (const h of [2, 3, 4]) {
    const out = send(send(atMinto(h), 'leave'), 'carryHome')
    assert.deepEqual([out.scene, out.recordsLog], ['a2_jake', 0])
  }
})

test('the epilogue moves the claim\'s date by the logbook, in good and best only', () => {
  const won: State = {
    ...initialState,
    scene: 'end',
    curlyPlan: 'warn',
    eliTrespass: 'quiet',
    afterConfession: 'stay',
    offer: 'refuse',
    testified: true,
    sharedWreck: true,
  }
  const text = (patch: Partial<State>): string => menu({ ...won, ...patch }).text
  assert.match(text({ recordsLog: 1 }), /takes two more years[\s\S]*old sign-out book/)
  assert.match(text({ recordsLog: 0 }), /takes three more years/)
  assert.doesNotMatch(text({ recordsLog: 0 }), /sign-out book/)
  assert.match(text({ recordsLog: 1, curlyPlan: 'confront' }), /about three years[\s\S]*old sign-out book/)
  assert.match(text({ recordsLog: 0, curlyPlan: 'confront' }), /It takes years/)
  assert.equal(text({ recordsLog: 1, testified: false }), text({ recordsLog: 0, testified: false }))
})

// #342: Lucy does not rub frozen toes while keeping Jake's frozen foot from the fire; she checks, finds Wade's numb, and warms them.
test('Lucy checks and warms Wade\'s numb toes at the wreck, on every route there', () => {
  const text = (id: State['scene'], s: State): string => (scenes.find((sc) => sc.id === id) as Scene).text(s)
  const wrecks = [1, 2].map((o) => text('a3_wreck', reach(o, 1, 'a3_wreck')))
  for (const w of wrecks) {
    assert.doesNotMatch(w, /works the feeling back|frozen toes/)
    assert.match(w, /numb but not frozen/)
    assert.match(w, /against her stomach/)
  }
  const s = reach(1, 1, 'a3_wreck')
  assert.match(text('a3_ski_down', s), /toes go numb/)
  assert.match(text('a3_ski_up', s), /toes go numb/)
})

// #344: Jake's honesty is shown by what he says about his uncle, not labeled.
test('Jake is introduced without the "straight arrow" label', () => {
  const jake = scenes.find((sc) => sc.id === 'a2_jake') as Scene
  const intro = jake.text(initialState)
  assert.match(intro, /Bush pilot, mechanic\./)
  assert.match(intro, /they don't talk/)
  assert.doesNotMatch(intro, /straight arrow/)
})

// #213: if Lucy was let go before Act 3, the confession carries it: the folder comes from her trunk, not her desk, and
// she says once that the job went for the cabinet. The talk between is the same, and Wade is not asked to fix it.
test('Lucy\'s confession changes weight when she has lost her job, and only there', () => {
  for (const sc of scenes.filter((x) => x.id.startsWith('a3_confession_'))) {
    const [kept, lost] = [0, 2].map((lucyHeat) => sc.text({ ...initialState, scene: sc.id, lucyHeat }))
    assert.match(kept, /bottom drawer of her desk at the land office/, sc.id)
    assert.doesNotMatch(kept, /cedar trunk|let me go/, sc.id)
    assert.match(lost, /cedar trunk at the foot of her bed/, sc.id)
    assert.doesNotMatch(lost, /drawer of her desk/, sc.id)
    assert.equal(lost.match(/let me go over that cabinet[\s\S]*I'd go in again/g)?.length, 1, sc.id)
    assert.doesNotMatch(lost, /\boil\b|sorry about the job/i, sc.id)
    const talk = (t: string): string => t.slice(t.indexOf('It\'s the Major\'s files'), t.indexOf('that\'s how they picked you too.'))
    assert.equal(talk(lost), talk(kept), sc.id)
    assert.equal(sc.text({ ...initialState, scene: sc.id, lucyHeat: 1 }), kept, `${sc.id} at Lucy heat 1`)
  }
})
