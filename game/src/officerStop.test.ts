import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initialState } from '../../text-game/src/state.ts'
import { replay } from '../../text-game/src/engine.ts'
import { menu, place } from '../../text-game/src/story.ts'
import { sceneIds } from '../../text-game/src/sceneIds.ts'
import { officerTier } from '../../text-game/src/scenes/act2.ts'
import type { OfficerTier } from '../../text-game/src/scenes/act2.ts'
import type { SceneId, State } from '../../text-game/src/types.ts'
import { CAFE_SCENES } from './dottiesCafe.ts'
import { CRUISER, OFFICER, OFFICER_AT, OFFICER_SPOT, SPAWN, figures, street } from './officerStop.ts'
import { propsIn, solids, spaces } from './levels.ts'
import { townLayer } from './freezeup.ts'
import { clock, season } from '../../text-game/src/story.ts'
import { route } from './router.ts'
import type { Game } from './prologue.ts'
import { available, inWorld, interact, press, still, tick } from './prologue.ts'
import { startFrom } from './start.ts'
import { engineSenders, walk } from './notesRatchet.ts'
import type { Interactable } from './world.ts'
import { angleTo, blocked, distance, sub, vec } from './world.ts'

// The officer's stop on Second Avenue (officerStop.ts, #210): where the story puts a2_officer, Wade comes out of the
// café's door, walks to the officer at his cruiser, and the scene's own text (his read of the heat, tiered by the story)
// and its one note come up. Played headless on the text build's `--choices` paths, one per tier.

const at = (scene: SceneId): State => ({ ...initialState, scene })

test('the stop plays where the story puts it: Act 2 at the café, outside its door', () => {
  assert.equal(place(at('a2_officer')), 'nlCafe')
  assert.deepEqual(route(at('a2_officer'), 'story'), { to: 'space', space: 'street' })
  assert.equal(street.place, place(at('a2_officer')))
  assert.equal(street.act, menu(at('a2_officer')).act)
})

test('only Act 2 at the café, outside the gossip visits, routes to the street', () => {
  for (const id of sceneIds) {
    const s = at(id)
    const r = route(s, 'story')
    const here = place(s) === 'nlCafe' && menu(s).act === street.act && !CAFE_SCENES.includes(id)
    assert.equal(r.to === 'space' && r.space === 'street', here, id)
  }
})

test("he is the barfight's officer, in the same look, and the only figure on the walk", () => {
  const { at: _a, facing: _f, when: _w, ...look } = spaces.pan.figures.find((f) => f.id === OFFICER)!
  assert.equal(figures.length, 1)
  const { at: _b, facing: _g, activity: _h, ...his } = figures[0]!
  assert.deepEqual(his, look)
  assert.deepEqual(street.spots, [OFFICER_SPOT])
})

test('the walk is clear from the door to the officer, and he stands on the walk by the cruiser', () => {
  const walls = solids(spaces.street)
  for (let k = 0; k <= 20; k++) {
    const p = vec(SPAWN.x + ((OFFICER_AT.x - 0.8 - SPAWN.x) * k) / 20, SPAWN.z + ((OFFICER_AT.z + 0.3 - SPAWN.z) * k) / 20)
    assert.equal(blocked(p, walls), false, `${p.x.toFixed(2)}, ${p.z.toFixed(2)}`)
  }
  assert.ok(OFFICER_AT.z > CRUISER.z && Math.abs(OFFICER_AT.x - CRUISER.x) < 2.5, 'at the cruiser’s fender, on the walk side')
})

test("Second wears the town's freeze-up on the stop's own date (#125)", () => {
  const s = at('a2_officer')
  assert.deepEqual(propsIn(street, season(s)!, clock(s)), [...street.props, ...townLayer(season(s)!, clock(s))])
  assert.ok(townLayer(season(s)!, clock(s)).length > 0)
})

// The story's own paths to each tier (text-game/src/story.test.ts, #215): first choice everywhere but where noted.
const PATHS: Readonly<Record<OfficerTier, readonly number[]>> = {
  curious: [1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 4, 1, 1, 1, 2, 1, 1, 1, 3, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  counting: [1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  hanging: [1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 1, 1, 1],
}

const DT = 1 / 30

const walkTo = (g: Game, to: { x: number; z: number }): Game => {
  let cur = g
  for (let n = 0; distance(cur.pos, to) >= 0.15; n++) {
    if (n > 30 * 60) throw new Error(`stuck at ${cur.pos.x.toFixed(2)},${cur.pos.z.toFixed(2)}`)
    cur = tick(cur, { dir: sub(vec(to.x, to.z), cur.pos), hold: false, limit: distance(to, cur.pos) }, DT)
  }
  return cur
}

// Stands just short of a spot, looking at it, as the ratchet does (notesRatchet.ts), so the engine's own focus picks it.
const facingSpot = (g: Game, i: Interactable): Game => {
  const pos = vec(i.x, i.z - Math.min(0.2, i.r / 2))
  const view = angleTo(pos, i)
  return { ...g, pos, facing: view, view, vel: vec(0, 0) }
}

// From the café's door along the walk to the officer, turned to him.
const atOfficer = (g: Game): Game => {
  const near = walkTo(g, vec(OFFICER_AT.x - 1.0, OFFICER_AT.z + 0.3))
  return tick(near, { ...still, view: angleTo(near.pos, OFFICER_SPOT) }, DT)
}

Object.entries(PATHS).forEach(([tier, path]) => {
  test(`${tier}: Wade comes out of the café, the officer's read is the story's, and walking on lands where the text build does`, () => {
    const text = replay(path)
    const there = text.at(-1)!
    assert.equal(there.scene, 'a2_officer')
    assert.equal(officerTier(there), tier)

    // Arriving the way the engine plays it: the note before the stop sent from where it was offered.
    const before = startFrom(`#path=${path.slice(0, -1).join(',')}`, '')
    const panels = before.panel ? [before] : available(before).map((i) => interact(facingSpot(before, i)))
    const leads = (o: Game) => o.panel?.buttons.find((b) => b.id.startsWith('note:') && press(o, b.id).story.scene === 'a2_officer')
    const offered = panels.find(leads)!
    const sent = offered && leads(offered)
    assert.ok(sent, `${there.scene} is reached by a note the engine offers at ${before.story.scene}`)
    const g = press(offered!, sent.id)
    assert.deepEqual(g.story, there, 'the same state as the text build at the stop')
    assert.equal(g.space, 'street')
    assert.deepEqual(g.pos, SPAWN)
    assert.equal(g.panel, undefined, 'nothing comes up until he walks to the officer')
    assert.equal(inWorld(g), true)
    assert.deepEqual(available(g), [OFFICER_SPOT])

    const heard = interact(atOfficer(g))
    assert.deepEqual(heard.story, there, 'hearing him out sends nothing')
    assert.equal(heard.panel?.title, menu(there).title)
    assert.equal(heard.panel?.text, menu(there).text, 'his lines are the scene’s own text')
    assert.deepEqual(heard.panel?.buttons.map((b) => b.id), menu(there).options.map((o) => `note:${o.note}`), 'he has his say: no stepping back')

    const on = press(heard, 'note:walkOn')
    const after = replay([...path, 1])
    assert.deepEqual(on.story, after.at(-1), 'the same state as the text build after walking on')
    assert.deepEqual(on.path, [...path, 1], 'the same notes as the text build’s path')
    assert.notEqual(on.space, 'street')
  })
})

test("his tiers are the story's at every heat: the officer's text is the scene's", () => {
  const g = startFrom(`#path=${PATHS.counting.join(',')}`, '')
  const tiers = new Set<OfficerTier>()
  for (let heat = 0; heat <= 6; heat++) {
    const s = { ...g, story: { ...g.story, heat } }
    tiers.add(officerTier(s.story))
    assert.equal(interact(atOfficer(s)).panel?.text, menu(s.story).text, `heat ${heat}`)
  }
  assert.deepEqual([...tiers], ['curious', 'counting', 'hanging'])
})

test('the ratchet counts the officer as the sender of a2_officer:walkOn', () => {
  const senders = engineSenders(walk()).filter((s) => s.key.startsWith('a2_officer:'))
  assert.deepEqual([...new Set(senders.map((s) => s.key))], ['a2_officer:walkOn'])
  senders.forEach((s) => assert.deepEqual([s.space, s.spot], ['street', OFFICER_SPOT.id]))
})
