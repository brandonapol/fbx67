import { test } from 'node:test'
import assert from 'node:assert/strict'
import { replay } from '../../text-game/src/engine.ts'
import { menu, place } from '../../text-game/src/story.ts'
import type { SceneId } from '../../text-game/src/types.ts'
import type { Game } from './prologue.ts'
import { available, focus, interact, label, press, shows, still, tick } from './prologue.ts'
import { startFrom } from './start.ts'
import { route } from './router.ts'
import { spaces } from './levels.ts'
import { BOOTH_SPOT, CURLY_SPOT, DOOR_H, HANGAR_SPAWN, JAKE_HEIGHT, JAKE_SPOT, PAN_SPAWN, STRIP_SPAWN, TIE_SHOT, WATCH_SPOT, loop, rollOut, tail, tieShot } from './bushStrip.ts'
import { engineSenders, walk } from './notesRatchet.ts'
import { lighting } from './lighting.ts'
import { ACT2_PATH } from '../smoke/act2Plan.ts'
import type { Vec } from './world.ts'
import { angleTo, distance, sub, vec } from './world.ts'

// Curly's November (bushStrip.ts, #131): the bush strip (a2_curly), the steak at the Silver Pan (a2_steak), Jake at the
// base hangar and decision 3 (a2_jake), and the steak-night confrontation (a2_confront, a2_confront_knot). Played
// headless: Wade walks to what each space offers, the scene's own menu opens there, and every note lands where the
// text build's `--choices` path does.

const DT = 1 / 30
const hash = (path: readonly number[]): string => `#path=${path.join(',')}`
const textBuild = (g: Game) => replay(g.path).at(-1)!

// The Act 2 start's path, then `picks` where given and else the first choice, on to the scene asked for.
const pathTo = (scene: SceneId, picks: Readonly<Record<string, number>> = {}): readonly number[] => {
  const path = ACT2_PATH.split(',').map(Number)
  for (let n = 0; replay(path).at(-1)!.scene !== scene; n++) {
    if (n > 60) throw new Error(`no path to ${scene}`)
    path.push(picks[replay(path).at(-1)!.scene] ?? 1)
  }
  return path
}

const walkTo = (g: Game, to: Vec): Game => {
  let cur = g
  for (let n = 0; distance(cur.pos, to) >= 0.15; n++) {
    if (n > 30 * 60) throw new Error(`stuck at ${cur.pos.x.toFixed(2)},${cur.pos.z.toFixed(2)}`)
    cur = tick(cur, { dir: sub(to, cur.pos), hold: false, limit: distance(to, cur.pos) }, DT)
  }
  return cur
}

// Walks to a standing place and turns to the spot, as a player does.
const approach = (g: Game, stand: Vec, spot: Vec): Game => {
  const near = walkTo(g, stand)
  return tick(near, { ...still, view: angleTo(near.pos, spot) }, DT)
}

// Round the bench's west end, not through it.
const atCurly = (g: Game): Game => approach(walkTo(g, vec(-3.4, 3.4)), vec(-0.5, 3.0), CURLY_SPOT)
const atBench = (g: Game): Game => approach(g, vec(-2.8, 6.0), WATCH_SPOT)
const atBooth = (g: Game): Game => approach(g, vec(1.6, 0.8), BOOTH_SPOT)
const atJake = (g: Game): Game => approach(g, vec(JAKE_SPOT.x, JAKE_SPOT.z + 1.5), JAKE_SPOT)

const pressNote = (g: Game, note: string): Game => {
  assert.ok(g.panel?.buttons.some((b) => b.id === `note:${note}`), `${g.story.scene} offers ${note}`)
  const next = press(g, `note:${note}`)
  assert.deepEqual(next.story, textBuild(next), `parity with the text build at ${next.story.scene}`)
  return next
}

const curly = startFrom(hash(pathTo('a2_curly')), '')

// --- The bush strip (#182) ---

test('a2_curly routes to the bush strip: Wade comes in on the snow with Curly and his bench to walk to', () => {
  assert.equal(curly.story.scene, 'a2_curly')
  assert.equal(place(curly.story), 'bushStrip')
  assert.deepEqual(route(curly.story, 'story'), { to: 'space', space: 'strip' })
  assert.equal(curly.space, 'strip')
  assert.deepEqual(curly.pos, STRIP_SPAWN)
  assert.equal(curly.panel, undefined, 'no menu until he walks to Curly')
  assert.deepEqual(available(curly).map((i) => i.id), [CURLY_SPOT.id, WATCH_SPOT.id])
  assert.equal(focus(atCurly(curly))?.id, CURLY_SPOT.id)
  assert.equal(label(atCurly(curly), CURLY_SPOT), CURLY_SPOT.prompt)
})

test("watching Curly work is only a look: the camera on his hands at the post, no note, nothing that names the knot", () => {
  const watching = interact(atBench(curly))
  assert.equal(watching.look, 'tie')
  assert.deepEqual(tieShot(watching.look, watching.space), TIE_SHOT)
  assert.deepEqual(watching.story, curly.story, 'watching sends nothing')
  assert.deepEqual(watching.panel?.buttons.map((b) => b.id), ['close'])
  assert.equal(watching.panel?.text, '')
  assert.doesNotMatch(`${watching.panel?.title} ${WATCH_SPOT.prompt} ${watching.panel?.buttons[0].label}`, /knot|bowline|loop|tail/i)
  const away = press(watching, 'close')
  assert.equal(away.look, undefined)
  assert.equal(away.panel, undefined)
})

test("the line at the post is the backward bowline: the tail leaves the loop outside it", () => {
  const center = vec(loop.reduce((s, p) => s + p.x, 0) / loop.length, loop.reduce((s, p) => s + p.z, 0) / loop.length)
  const r = distance(loop[0], center)
  assert.ok(distance(tail.at(-1)!, center) > r + 0.05)
})

// Watching is optional: the story grants Curly's knot as evidence on either answer, watched or not.
test('the strip sends both answers to Curly, watched or not, on the text build\'s path, with his knot as evidence', () => {
  ;[curly, press(interact(atBench(curly)), 'close')].forEach((from) => {
    const asked = interact(atCurly(from))
    assert.equal(asked.panel?.title, menu(curly.story).title)
    assert.deepEqual(asked.panel?.buttons.map((b) => b.id), ['note:steak', 'note:excuse', 'close'])
    ;['steak', 'excuse'].forEach((note) => {
      const g = pressNote(asked, note)
      assert.ok(g.story.evidence.includes('curlyKnot'), note)
    })
  })
})

test('making an excuse takes Wade to Lucy\'s kitchen for Minto', () => {
  const g = pressNote(interact(atCurly(curly)), 'excuse')
  assert.equal(g.story.scene, 'a2_minto')
  assert.equal(g.space, 'kitchen')
})

// --- The steak at the Silver Pan (#183) ---

test('taking Curly up on the steak takes Wade into the Pan, Curly at the booth with his roll of twenties out', () => {
  const g = pressNote(interact(atCurly(curly)), 'steak')
  assert.equal(g.story.scene, 'a2_steak')
  assert.equal(g.space, 'steak')
  assert.deepEqual(g.pos, PAN_SPAWN)
  assert.equal(g.panel, undefined)
  assert.deepEqual(available(g), [BOOTH_SPOT])
  assert.ok(rollOut(g.story))
  assert.ok(shows(g, 'roll'))
  const sat = interact(atBooth(g))
  assert.equal(sat.panel?.title, menu(g.story).title)
  const on = pressNote(sat, 'continue')
  assert.equal(on.story.scene, 'a2_minto')
  assert.equal(on.space, 'kitchen')
})

// Regression: the Pan's booth was lit as outdoors, the freeze-up air falling through the room, because it had no
// practical of its own.
test("the Pan's booth is lit by its bulbs, as an interior, and the strip and the hangar by the sky", () => {
  assert.ok(spaces.steak.interior)
  assert.ok(lighting('steak', 'freezeup', 'clear').lamp, 'the booth has its bulbs')
  ;(['strip', 'hangar'] as const).forEach((id) => assert.ok(!spaces[id].interior && !lighting(id, 'freezeup', 'clear').lamp, id))
})

// --- Jake and decision 3 (#183) ---

const jake = startFrom(hash(pathTo('a2_jake')), '')

test('a2_jake routes outside the base hangar: Jake in the door, taller than it', () => {
  assert.equal(jake.story.scene, 'a2_jake')
  assert.deepEqual(route(jake.story, 'story'), { to: 'space', space: 'hangar' })
  assert.equal(jake.space, 'hangar')
  assert.deepEqual(jake.pos, HANGAR_SPAWN)
  assert.equal(jake.panel, undefined)
  assert.deepEqual(available(jake), [JAKE_SPOT])
  assert.ok(JAKE_HEIGHT > DOOR_H)
  assert.ok(spaces.hangar.figures.some((f) => f.id === 'jake' && f.height === JAKE_HEIGHT))
})

test('decision 3 is deliberate and untimed: its three notes and no way to walk off, and the clock changes nothing', () => {
  const asked = interact(atJake(jake))
  assert.equal(asked.panel?.title, menu(jake.story).title)
  assert.deepEqual(asked.panel?.buttons.map((b) => b.id), ['note:warn', 'note:confront', 'note:ignore'])
  const later = tick(asked, still, 600)
  assert.deepEqual(later.story, asked.story)
  assert.deepEqual(later.panel, asked.panel)
})

test('warning Lucy and letting it go go on to the officer over the story backdrop, on the text build\'s path', () => {
  ;['warn', 'ignore'].forEach((note) => {
    const g = pressNote(interact(atJake(jake)), note)
    assert.equal(g.story.scene, 'a2_officer')
    assert.equal(g.space, 'story')
    assert.equal(g.panel?.title, menu(g.story).title)
  })
})

// --- The confront path (#183) ---

test('confronting Curly takes Wade back to the Pan for steak night: leaning on him, or letting it drop', () => {
  const g = pressNote(interact(atJake(jake)), 'confront')
  assert.equal(g.story.scene, 'a2_confront')
  assert.equal(g.space, 'steak')
  assert.ok(!shows(g, 'roll'), 'the roll is not out tonight')
  const sat = interact(atBooth(g))
  assert.deepEqual(sat.panel?.buttons.map((b) => b.id), ['note:leanOnHim', 'note:letDrop', 'close'])
  const dropped = pressNote(sat, 'letDrop')
  assert.equal(dropped.story.scene, 'a2_officer')
  const leaned = pressNote(sat, 'leanOnHim')
  assert.equal(leaned.story.scene, 'a2_confront_knot')
  assert.equal(leaned.space, 'steak')
  assert.equal(leaned.panel?.title, menu(leaned.story).title, 'Curly is gone: the scene plays as its menu where Wade sits')
  const on = pressNote(leaned, 'continue')
  assert.equal(on.story.scene, 'a2_officer')
})

test('the ratchet counts the strip, the booth and Jake as the senders of every note from a2_curly to a2_confront_knot', () => {
  const scenes: Readonly<Record<string, readonly [string, string]>> = {
    a2_curly: ['strip', CURLY_SPOT.id],
    a2_steak: ['steak', BOOTH_SPOT.id],
    a2_jake: ['hangar', JAKE_SPOT.id],
    a2_confront: ['steak', BOOTH_SPOT.id],
    a2_confront_knot: ['steak', BOOTH_SPOT.id],
  }
  const stops = walk()
  const at = engineSenders(stops).filter((s) => s.key.split(':')[0] in scenes)
  const all = stops.flatMap((s) => s.offers.map((o) => o.key)).filter((k) => k.split(':')[0] in scenes)
  assert.deepEqual([...new Set(at.map((s) => s.key))].sort(), [...new Set(all)].sort())
  at.forEach((s) => assert.deepEqual([s.space, s.spot], scenes[s.key.split(':')[0]], s.key))
})
