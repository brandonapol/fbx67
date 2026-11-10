import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initialState } from './state.ts'
import { choicesOf, choose, render, replay, sceneOf } from './engine.ts'
import { menu, mission, oneHanded, send, sendMission } from './story.ts'
import { endsOf, missionMenu, missions, type Mission } from './missions.ts'
import { sceneIndex } from './sceneIds.ts'
import { canonical } from './liveness.ts'
import { councilmanFlips } from './logic.ts'
import type { SceneId, State } from './types.ts'

// Every distinct state that reaches a scene, breadth first from the start of the game, canonicalized as the sweep is
// (liveness.ts): a dropped field no longer changes what any later scene shows or offers. Without it Act 3 is out of
// reach of a unit test. Each scene is walked once.
const walked = new Map<SceneId, readonly State[]>()
const allAt = (id: SceneId): readonly State[] => {
  const known = walked.get(id)
  if (known) return known
  const seen = new Set<string>()
  const at: State[] = []
  let queue: State[] = [initialState]
  while (queue.length > 0) {
    const next: State[] = []
    queue.forEach((raw) => {
      const s = canonical(raw)
      const key = JSON.stringify(s)
      if (seen.has(key)) return
      seen.add(key)
      if (s.scene === id) at.push(s)
      else if (sceneIndex(s.scene) < sceneIndex(id)) choicesOf(s).forEach((_, i) => next.push(choose(s, i + 1)))
    })
    queue = next
  }
  walked.set(id, at)
  return at
}

// Every state at an end scene that playing the scenes one choice at a time can produce from s.
const playedThrough = (s: State, ends: readonly SceneId[]): readonly State[] =>
  ends.includes(s.scene) ? [s] : choicesOf(s).flatMap((_, i) => playedThrough(choose(s, i + 1), ends))

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

// Notes may land the same where a detail carries no state on that path (the barfight's move when seated), so the
// check is on the states: every way through matches a note, and every note is a way through.
test('every mission note ends at its end scene, and the notes cover every way through', () => {
  missions.forEach((m) => {
    const starts = allAt(m.start)
    assert.ok(starts.length > 0, `${m.id}: nothing reaches ${m.start}`)
    starts.forEach((start) => {
      const byNote = new Set(m.endings.map((e) => JSON.stringify(sendMission(start, e.note))))
      const played = new Set(playedThrough(start, endsOf(m)).map((p) => JSON.stringify(p)))
      assert.deepEqual([...played].filter((p) => !byNote.has(p)), [], `${m.id}: a path to ${endsOf(m).join(' or ')} matches no note`)
      assert.deepEqual([...byNote].filter((n) => !played.has(n)), [], `${m.id}: a note lands where no path does`)
    })
  })
})

// A refusal or a skip may land where a detail does (the hotel bar's pieces and skipped, at heat 0), so only the
// single-detail missions without one are held to a state per note. Lucy's dig keeps nothing of the spot she tried
// first (docs/acts/act3-missions.md, section 1), and the ski search's route is color (section 3), so their notes share a
// state by design.
const sharedState = new Set(['lucysDig', 'theSkiSearch'])

test('the single-detail missions give every note its own state', () => {
  missions
    .filter((m) => m.details.length === 1 && !m.or && !sharedState.has(m.id))
    .forEach((m) =>
      allAt(m.start).forEach((start) => {
        assert.equal(new Set(m.endings.map((e) => JSON.stringify(sendMission(start, e.note)))).size, m.endings.length, `${m.id}: two notes give the same state`)
        assert.equal(playedThrough(start, endsOf(m)).length, m.endings.length, `${m.id}: paths through and notes differ`)
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

test('getting up records the move for Hank; staying seated leaves him the stool', () => {
  const s = atBarfight[0]
  const moves = ['shove', 'rack', 'bottle'] as const
  assert.deepEqual(
    moves.map((m) => sendMission(s, note('gotUp', m, 'leftEli', 'clean')).barfightMove),
    ['shove', 'mooseRack', 'bottle'],
  )
  assert.deepEqual(
    moves.map((m) => sendMission(s, note('stayedSeated', m, 'leftEli', 'clean')).barfightMove),
    [undefined, undefined, undefined],
  )
})

// Act 2. Every state that reaches the photo lab, from every Act 1 path.
const atPhotos = allAt('a2_photos')
const photoNotes = ['lunch.crossChecked', 'lunch.pulledAll', 'key.crossChecked', 'key.pulledAll', 'refused']

test('the photo lab offers way in, drawers, or refused at a2_photos', () => {
  const s = replay([1, 1, 1, 1, 1, 1, 2, 2, 1, 1, 1, 3, 1, 2, 1, 1, 1]).at(-1) as State
  assert.equal(s.scene, 'a2_photos')
  const m = mission(s)
  assert.ok(m)
  assert.equal(missionMenu(m), 'The photo lab. Way in: lunch / key. Drawers: cross-checked / pulled all; or refused')
  assert.deepEqual(
    m.endings.map((e) => e.note),
    photoNotes,
  )
})

test('each photo lab note agrees with playing its scenes one note at a time', () => {
  const s = atPhotos[0]
  assert.deepEqual(sendMission(s, 'lunch.crossChecked'), ['lunch', 'crossCheck'].reduce(send, s))
  assert.deepEqual(sendMission(s, 'key.pulledAll'), ['afterLockup', 'pullAll'].reduce(send, s))
  assert.deepEqual(sendMission(s, 'refused'), send(s, 'refuse'))
})

test('the photo lab gives every note its own state, and the photos on every way in', () => {
  atPhotos.forEach((s) => {
    const outs = photoNotes.map((n) => sendMission(s, n))
    assert.equal(new Set(outs.map((o) => JSON.stringify(o))).size, photoNotes.length)
    outs.forEach((o, i) => assert.equal(o.evidence.includes('aerialPhotos'), photoNotes[i] !== 'refused'))
  })
})

test('the drawers carry the heat now; the borrowed key adds none until it is missed', () => {
  const s = atPhotos[0]
  const heatOf = (n: string) => sendMission(s, n).heat - s.heat
  assert.deepEqual(photoNotes.map(heatOf), [1, 2, 1, 2, 0])
  assert.deepEqual(
    photoNotes.map((n) => sendMission(s, n).photoLab),
    ['lunch', 'lunch', 'key', 'key', undefined],
  )
})

test('the borrowed key is missed at a2_flight: one more heat, and the sergeant has Wade\'s name', () => {
  const key: State = { ...initialState, scene: 'a2_flight', photoLab: 'key', heat: 2 }
  const lunch: State = { ...key, photoLab: 'lunch' }
  assert.match(render(key), /key sign-out sheet/)
  assert.doesNotMatch(render(lunch), /sign-out sheet/)
  assert.equal(send(key, 'writeMama').heat - key.heat, 1)
  assert.equal(send(lunch, 'writeMama').heat, lunch.heat)
})

// Every state that reaches the hotel bar: each photo lab note from every way into Act 2.
const atHotel = allAt('a2_hotel')

test('the hotel bar offers heard: most / pieces, or skipped at a2_hotel', () => {
  const s = replay([1, 1, 1, 1, 1, 1, 2, 2, 1, 1, 1, 3, 1, 2, 1, 1, 1, 3]).at(-1) as State
  assert.equal(s.scene, 'a2_hotel')
  const m = mission(s)
  assert.ok(m)
  assert.equal(missionMenu(m), 'The hotel bar. Heard: most / pieces; or skipped')
  assert.deepEqual(
    m.endings.map((e) => e.note),
    ['heardMost', 'heardPieces', 'skipped'],
  )
})

test('each hotel bar note agrees with playing its scenes one note at a time', () => {
  const s = atHotel[0]
  assert.deepEqual(sendMission(s, 'heardMost'), ['guitar', 'sitClose', 'tellLucy'].reduce(send, s))
  assert.deepEqual(sendMission(s, 'heardPieces'), ['guitar', 'sitFar', 'tellLucy'].reduce(send, s))
  assert.deepEqual(sendMission(s, 'skipped'), send(s, 'skip'))
})

test('only hearing most of it gives the hotel talk; only skipping moves heat', () => {
  atHotel.forEach((s) => {
    const [most, pieces, skipped] = ['heardMost', 'heardPieces', 'skipped'].map((n) => sendMission(s, n))
    assert.deepEqual([most, pieces, skipped].map((o) => o.evidence.includes('hotelTalk')), [true, false, false])
    assert.deepEqual([most.heat, pieces.heat], [s.heat, s.heat])
    assert.equal(skipped.heat, Math.max(0, s.heat - 1))
    assert.equal(JSON.stringify(pieces) === JSON.stringify(skipped), s.heat === 0)
  })
})

test('Lucy repeats the quiet man\'s words only when Wade heard most of it', () => {
  const s = atHotel[0]
  const toOffice = (n: string) => ['listen', 'continue'].reduce(send, sendMission(s, n))
  assert.equal(toOffice('heardMost').scene, 'a2_co_ask')
  assert.match(render(toOffice('heardMost')), /Before is what counts/)
  assert.doesNotMatch(render(toOffice('heardPieces')), /Before is what counts/)
})

// Every state that reaches the Major's office, across the photo lab, the hotel bar and the Chiefs.
const atOffice = allAt('a2_co_ask')
const cabinetNotes = ['code.seen', 'code.unseen', 'forced.seen', 'forced.unseen', 'refused']

test('the Major\'s cabinet offers got in, seen, or refused at a2_co_ask', () => {
  const s = replay([1, 1, 1, 1, 1, 1, 2, 2, 1, 1, 1, 3, 1, 2, 1, 1, 1, 3, 2, 1, 1]).at(-1) as State
  assert.equal(s.scene, 'a2_co_ask')
  const m = mission(s)
  assert.ok(m)
  assert.equal(missionMenu(m), 'The Major\'s cabinet. Got in: code / forced. Seen: yes / no; or refused (Lucy goes herself)')
  assert.deepEqual(
    m.endings.map((e) => e.note),
    cabinetNotes,
  )
})

test('each cabinet note agrees with playing its scenes one note at a time', () => {
  const s = atOffice[0]
  assert.deepEqual(sendMission(s, 'code.unseen'), ['search', 'combo', 'getOut'].reduce(send, s))
  assert.deepEqual(sendMission(s, 'forced.seen'), ['search', 'forced', 'goNow', 'continue'].reduce(send, s))
  assert.deepEqual(sendMission(s, 'refused'), ['refuse', 'continue'].reduce(send, s))
})

test('the cabinet: code +1 heat, forced +2, seen +1 more; refused puts the heat on Lucy instead', () => {
  const s = { ...atOffice[0], heat: 0, lucyHeat: 0 }
  const out = cabinetNotes.map((n) => sendMission(s, n))
  assert.deepEqual(out.map((o) => o.heat), [2, 1, 3, 2, 0])
  assert.deepEqual(out.map((o) => o.lucyHeat), [0, 0, 0, 0, 2])
  assert.deepEqual(out.map((o) => o.coJob), ['wade', 'wade', 'wade', 'wade', 'lucy'])
  out.forEach((o) => assert.ok(o.evidence.includes('coFiles')))
  // The way in and the getaway carry only heat, so the code and seen land where forcing it unseen does.
  assert.deepEqual(out[0], out[3])
  assert.equal(new Set(out.map((o) => JSON.stringify(o))).size, cabinetNotes.length - 1)
})

test('seen plays the duty desk: the duty log, never Wade\'s face', () => {
  const s = ['search', 'combo', 'goNow'].reduce(send, atOffice[0])
  assert.equal(s.scene, 'a2_co_seen')
  assert.match(render(s), /never saw your face/)
})

test('every state reaching a2_flight has the Major\'s cabinet job set, so its "files" line always shows', () => {
  const atFlight = allAt('a2_flight')
  assert.ok(atFlight.length > 0)
  atFlight.forEach((s) => {
    assert.ok(s.coJob === 'wade' || s.coJob === 'lucy')
    assert.ok(render(s).includes('She hasn\'t finished reading the Major\'s files.'))
  })
})

// Act 3. Lucy's dig, from a3_camp, with each spot the player hid the notes in as Owen.
const atCamp = replay([1, 1, 1, 1, 1, 1, 2, 2, 1, 1, 1, 3, 1, 2, 1, 1, 1, 3, 2, 1, 1, 2, 1, 2, 1, 1, 1, 1, 1, 1, 2, 1]).at(-1) as State
const spots = ['stove', 'cache', 'marker'] as const
const campWith = (spot: (typeof spots)[number]): State => ({ ...atCamp, owenCache: spot })

test('Lucy\'s dig offers first dig: stove / cache / marker at a3_camp', () => {
  assert.equal(atCamp.scene, 'a3_camp')
  assert.ok(atCamp.owenCache)
  const m = mission(atCamp)
  assert.ok(m)
  assert.equal(missionMenu(m), 'Lucy\'s dig. First dig: stove / cache / marker')
  assert.deepEqual(
    m.endings.map((e) => e.note),
    [...spots],
  )
})

test('each dig note agrees with playing its scenes: the right spot straight to the cache, a wrong one by the letter', () => {
  spots.forEach((hidden) => {
    const s = campWith(hidden)
    spots.forEach((first) => {
      const played = first === hidden ? ['home'] : ['dig', 'home']
      assert.equal(send(s, first).scene, first === hidden ? 'a3_found' : 'a3_wrong_spot')
      assert.deepEqual(sendMission(s, first), [first, ...played].reduce(send, s))
    })
  })
})

test('every dig lands on a3_crash with the tapes, owenCache cleared, and nothing else moved', () => {
  spots.forEach((hidden) => {
    const s = campWith(hidden)
    const outs = spots.map((n) => sendMission(s, n))
    outs.forEach((o) => {
      assert.equal(o.scene, 'a3_crash')
      assert.ok(o.evidence.includes('tapes'))
      assert.equal(o.owenCache, undefined)
      assert.deepEqual(delta(s, o), [0, 0])
      assert.equal(o.lucyHeat, s.lucyHeat)
    })
    // The wrong spot costs light and fingers inside the mission only: the story keeps no trace of it.
    assert.equal(new Set(outs.map((o) => JSON.stringify(o))).size, 1)
  })
})

// Act 3. The rash plans, from a3_rash after every answer to Eli.
const atRash = allAt('a3_rash')
const rashNotes = ['safe', 'burn', 'gunpoint', 'stayedOut']
const confessionOf: Readonly<Record<string, SceneId>> = {
  safe: 'a3_confession_safe',
  burn: 'a3_confession_burn',
  gunpoint: 'a3_confession_gun',
  stayedOut: 'a3_confession_none',
}

test('the rash plan offers plan: safe / burn / gunpoint, or stayed out at a3_rash', () => {
  const s = replay([1, 1, 1, 1, 1, 1, 2, 2, 1, 1, 1, 3, 1, 2, 1, 1, 1, 3, 2, 1, 1, 2, 1, 2, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]).at(-1) as State
  assert.equal(s.scene, 'a3_rash')
  const m = mission(s)
  assert.ok(m)
  assert.equal(missionMenu(m), 'The rash plan. Plan: safe / burn / gunpoint; or stayed out')
  assert.deepEqual(
    m.endings.map((e) => e.note),
    rashNotes,
  )
})

test('each rash plan note agrees with playing its scenes, the café first or not', () => {
  atRash.forEach((s) => {
    const viaCafe = send(s, 'gossip')
    assert.equal(viaCafe.scene, 'a3_rash_gossip')
    ;[
      ['safe', ['safe', 'go']],
      ['burn', ['burn', 'go']],
      ['gunpoint', ['gunpoint', 'go']],
      ['stayedOut', ['none', 'letHerIn']],
    ].forEach(([n, played]) => {
      assert.deepEqual(sendMission(s, n as string), (played as string[]).reduce(send, s))
      assert.deepEqual(sendMission(s, n as string), (played as string[]).reduce(send, viaCafe))
    })
  })
})

test('a plan is +1 heat and its rashPlan; staying out is neither', () => {
  const s = { ...atRash[0], heat: 0 }
  const out = rashNotes.map((n) => sendMission(s, n))
  assert.deepEqual(out.map((o) => o.heat), [1, 1, 1, 0])
  assert.deepEqual(out.map((o) => o.rashPlan), ['safe', 'burn', 'gunpoint', 'none'])
  out.forEach((o, i) => {
    assert.deepEqual([o.eliTrust, o.lucyHeat, o.evidence], [s.eliTrust, s.lucyHeat, s.evidence])
    assert.equal(o.scene, confessionOf[rashNotes[i]])
  })
})

// The story side of the acceptance criterion (the engine's interception line and timer are its own): nothing in a
// lead-in gets past Lucy. Every way out of a3_rash, café or not, reaches its plan's confession, Lucy stepping out of
// the dark, before any other scene, and no lead-in offers more than walking into her.
test('every way through a rash plan is intercepted by Lucy at its own confession', () => {
  const confessions = Object.values(confessionOf)
  const leadIns: Readonly<Record<string, SceneId>> = { a3_rash_safe: 'a3_confession_safe', a3_rash_burn: 'a3_confession_burn', a3_rash_gun: 'a3_confession_gun', a3_rash_none: 'a3_confession_none' }
  atRash.forEach((s) => {
    const visit = (c: State, lead?: SceneId): void => {
      if (confessions.includes(c.scene)) {
        assert.ok(lead, `${c.scene} reached without a lead-in`)
        assert.equal(c.scene, leadIns[lead])
        assert.match(sceneOf(c).text(c), /She must have followed you|beside you in the dark|She drives/)
        return
      }
      assert.ok(['a3_rash', 'a3_rash_gossip', ...Object.keys(leadIns)].includes(c.scene), `${c.scene} reached before Lucy`)
      if (c.scene in leadIns) assert.equal(choicesOf(c).length, 1, `${c.scene} offers a way around her`)
      choicesOf(c).forEach((_, i) => visit(choose(c, i + 1), c.scene in leadIns ? c.scene : lead))
    }
    visit(s)
  })
})

test('the lead-ins stage what the arm rules out: no climb, no stick shift driven, no shot fired', () => {
  const s = atRash[0]
  const lead = (n: string) => render(send(s, n))
  assert.match(lead('safe'), /ground floor/)
  assert.match(lead('burn'), /stalls/)
  assert.match(lead('gunpoint'), /won't come to your shoulder/)
  ;['safe', 'burn', 'gunpoint'].forEach((n) => assert.doesNotMatch(lead(n), /oil rush/i))
})

// Act 3. The ski search, from a3_search after each of Lucy's signals and both orders of the night.
const searchPath = [1, 1, 1, 1, 1, 1, 2, 2, 1, 1, 1, 3, 1, 2, 1, 1, 1, 3, 2, 1, 1, 2, 1, 2, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1]
const atSearch = allAt('a3_search')
const skiNotes = ['ridge', 'creek']

test('the ski search offers route: ridge / creek at a3_search', () => {
  const s = replay(searchPath).at(-1) as State
  assert.equal(s.scene, 'a3_search')
  const m = mission(s)
  assert.ok(m)
  assert.equal(missionMenu(m), 'The ski search. Route: ridge / creek')
  assert.deepEqual(
    m.endings.map((e) => e.note),
    skiNotes,
  )
})

test('each ski note agrees with playing its scenes: the ridge downhill, the creek climbing', () => {
  atSearch.forEach((s) => {
    assert.equal(send(s, 'downhill').scene, 'a3_ski_down')
    assert.equal(send(s, 'climb').scene, 'a3_ski_up')
    assert.deepEqual(sendMission(s, 'ridge'), ['downhill', 'follow'].reduce(send, s))
    assert.deepEqual(sendMission(s, 'creek'), ['climb', 'follow'].reduce(send, s))
  })
})

// The route is color (#87): it moves nothing, and both reach the wreck the same way. The signal is the night's, not
// the route's.
test('both routes reach a3_arm on the same state, with nothing moved and the night\'s signal kept', () => {
  atSearch.forEach((s) => {
    const [ridge, creek] = skiNotes.map((n) => sendMission(s, n))
    assert.equal(ridge.scene, 'a3_arm')
    assert.deepEqual(ridge, creek)
    assert.deepEqual({ ...ridge, scene: s.scene }, s)
  })
})

test('every signal shows the search something to follow on both routes, and the fall comes after', () => {
  const signals = new Set(atSearch.map((s) => s.nightSignal))
  assert.deepEqual([...signals].sort(), ['saveFire', 'smoke', 'stampX'])
  atSearch.forEach((s) => {
    ;['downhill', 'climb'].forEach((n) => {
      const out = send(s, n)
      assert.match(render(out), /smell smoke|smell it/)
      assert.equal(oneHanded(out), false, `${out.scene} is before the fall`)
    })
  })
  assert.match(render(atSearch[0]), /cable bindings/)
})

// Act 3. The wreck, from a3_arm after every way through the search.
const atArm = allAt('a3_arm')

test('the wreck offers Jake: shown / not shown at a3_arm', () => {
  const s = replay([...searchPath, 1, 1]).at(-1) as State
  assert.equal(s.scene, 'a3_arm')
  const m = mission(s)
  assert.ok(m)
  assert.equal(missionMenu(m), 'The wreck. Jake: shown / not shown')
  assert.deepEqual(
    m.endings.map((e) => e.note),
    ['shown', 'notShown'],
  )
})

test('each wreck note agrees with playing its scenes, through the fall', () => {
  atArm.forEach((s) => {
    assert.deepEqual(sendMission(s, 'shown'), ['yell', 'wakeJake'].reduce(send, s))
    assert.deepEqual(sendMission(s, 'notShown'), ['yell', 'keepIt'].reduce(send, s))
  })
})

test('both wreck notes give the wreck proof; only showing Jake shares it, which the councilman reads', () => {
  atArm.forEach((s) => {
    const [shown, notShown] = ['shown', 'notShown'].map((n) => sendMission(s, n))
    ;[shown, notShown].forEach((o) => {
      assert.equal(o.scene, 'a3_home')
      assert.ok(o.evidence.includes('wreckProof'))
      assert.deepEqual([o.heat, o.eliTrust, o.lucyHeat], [s.heat, s.eliTrust, s.lucyHeat])
    })
    assert.deepEqual([shown.sharedWreck, notShown.sharedWreck], [true, false])
    assert.deepEqual([councilmanFlips(shown), councilmanFlips(notShown)], [true, false])
  })
})

// The arm (#88): one-handed from the fall at a3_arm on, the upper arm in a sling.
test('Wade is one-handed from a3_arm on, and the wreck puts the upper arm in a sling', () => {
  const s = atArm[0]
  assert.equal(oneHanded(s), true)
  const wreck = send(s, 'yell')
  assert.equal(wreck.scene, 'a3_wreck')
  assert.equal(oneHanded(wreck), true)
  assert.match(render(wreck), /upper arm/)
  assert.match(render(wreck), /sling/)
  ;['shown', 'notShown'].forEach((n) => assert.equal(oneHanded(sendMission(s, n)), true))
})

// Busted is a retry only (#86): neither menu has a note for getting caught, and no ending moves heat.
test('the search and the wreck have no caught note and add no heat', () => {
  ;[...atSearch, ...atArm].forEach((s) => {
    const m = mission(s) as Mission
    assert.deepEqual(m.endings.filter((e) => /caught|busted|froze|lost/i.test(e.note)), [])
    m.endings.forEach((e) => assert.equal(sendMission(s, e.note).heat, s.heat))
  })
  ;[...atSearch, ...atArm].forEach((s) => assert.doesNotMatch(render(s), /oil rush/i))
})
