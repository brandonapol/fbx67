import { test } from 'node:test'
import assert from 'node:assert/strict'
import { replay } from '../../text-game/src/engine.ts'
import { menu, mission, sendMission } from '../../text-game/src/story.ts'
import type { Game, Input } from './prologue.ts'
import { available, canLight, focus, interact, label, press, still, tick } from './prologue.ts'
import { startFrom } from './start.ts'
import { present, solids, spaces } from './levels.ts'
import type { Brawl } from './barfight.ts'
import { CURLY_AT, ENDS_AT, JOINERS, everybodys,  FACING_HANK, HANK_SPOT, OFFICER, OUT_TIME, WADE_STOOL, WARN_AT, begin, canRestart, checkpoint, noteOf, placed, play, restart, roomOf, sceneNotes, wade, who } from './barfight.ts'
import { DT, PLANS, inputFor, listen, noteFor, playOut } from './barfightBot.ts'
import type { Fight } from './combat.ts'
import { idle } from './combat.ts'
import { COUNTER, MOOSE_RACK, STOVE } from './silverPan.ts'
import { blocked, hits, vec } from './world.ts'
import { lighting } from './lighting.ts'

// The barfight at the Silver Pan (#176): Hank's speech on arrival, the shove, then the fight on the combat core until
// the law comes in, played headless through the game's own tick. Each of the mission's notes is driven by play and
// checked against the text build on the same `--choices` path.

const hash = (path: readonly number[]): string => `#path=${path.join(',')}`
const textBuild = (g: Game) => replay(g.path).at(-1)!

// `node src/cli.ts --choices <TO_PAN>` ends on a1_barfight, Saturday at the Silver Pan.
const TO_PAN = Array.from({ length: 19 }, () => 1)
const arrived = startFrom(hash(TO_PAN), '')
const opening = listen(arrived)

const room = roomOf(spaces.pan.props, spaces.pan.figures)

// Every frame of a fight from the opening prompt, with the scripted player's plan or a fixed input.
const frames = (g0: Game, opened: 'gotUp' | 'stayedSeated', input: (b: Brawl) => Input): readonly Game[] => {
  const out: Game[] = []
  let g = press(g0, `fight:${opened}`)
  while (g.brawl) {
    out.push(g)
    g = tick(g, input(g.brawl), DT)
  }
  return [...out, g]
}

test('arriving at the Silver Pan, Wade is on his stool facing Hank across the bar, with nothing open: the bar goes on', () => {
  assert.equal(arrived.space, 'pan')
  assert.equal(arrived.panel, undefined)
  assert.deepEqual([arrived.pos, arrived.facing], [WADE_STOOL, FACING_HANK])
  assert.deepEqual(available(arrived), [HANK_SPOT], 'Hank is the one thing to turn to')
  assert.equal(focus(arrived)?.id, 'hank', 'from the stool, without a step')
  assert.equal(label(arrived, focus(arrived)!), HANK_SPOT.prompt)
  assert.deepEqual(interact(arrived), opening)
  assert.deepEqual(available(press(opening, 'fight:gotUp')), [], 'once the fight is on there is nothing to listen to')
})

test("listening to Hank, his speech plays as the scene's own text over the bar, with the shove's prompt", () => {
  assert.equal(opening.story.scene, 'a1_barfight')
  assert.equal(opening.space, 'pan')
  assert.equal(focus(opening), undefined, 'nothing to focus under the speech')
  assert.equal(mission(opening.story)?.id, 'theBarfight')
  assert.deepEqual(opening.pos, WADE_STOOL, 'on his stool at the bar')
  assert.equal(opening.panel?.kind, 'story')
  assert.equal(opening.panel?.title, menu(opening.story).title)
  assert.equal(opening.panel?.text, menu(opening.story).text, "the scene's text, not a copy")
  assert.deepEqual(opening.panel?.buttons.map((b) => b.id), ['fight:gotUp', 'fight:stayedSeated'])
  assert.equal(opening.panel?.buttons[1]?.label, menu(opening.story).options.find((o) => o.note === 'stayInSeat')?.label, "staying seated is the story's own choice")
  assert.equal(opening.brawl, undefined, 'no fight under the speech')
  const waited = tick(opening, still, 30)
  assert.deepEqual([waited.story, waited.path, waited.brawl], [opening.story, opening.path, undefined], 'the speech waits for the player')
})

test('the Pan is Act 1 at the Silver Pan: its people stand clear of the room, and Wade starts clear of every solid', () => {
  assert.equal(spaces.pan.act, 'Act 1: Flood')
  assert.equal(spaces.pan.place, 'silverPan')
  assert.equal(blocked(WADE_STOOL, solids(spaces.pan)), false)
  // The fighters stand clear of every solid; the people sitting it out are seated, in the booth and at the cards.
  begin('gotUp', room).fight.fighters.forEach((x) => assert.deepEqual(room.walls.filter((b) => hits(x.pos, b)), [], x.id))
  spaces.pan.figures.forEach((f) => assert.deepEqual(roomOf(spaces.pan.props).walls.filter((b) => hits(f.at, b, 0.2)), [], f.id))
  assert.ok(room.walls.length > roomOf(spaces.pan.props).walls.length, 'the people sitting it out are in the way')
  assert.ok(!present(spaces.pan.figures.find((f) => f.id === OFFICER)!, opening.story), 'the officer is not in the bar until the law comes in')
})

test("the room: mud on the floor, the bar to break a bottle on, the oil stove hot, the moose rack and the bottles to grab", () => {
  assert.equal(room.slips, true)
  assert.ok(room.friction < 4, 'a shoved man slides')
  assert.deepEqual(room.counters, [COUNTER])
  assert.equal(room.stove, STOVE)
  assert.ok(!room.walls.includes(COUNTER) && !room.walls.includes(STOVE))
  const b = begin('gotUp', room)
  assert.deepEqual(b.fight.things.find((t) => t.kind === 'rack')?.pos, MOOSE_RACK)
  assert.equal(b.fight.things.filter((t) => t.kind === 'bottle').length, 4)
  assert.deepEqual([b.fight.warnAt, b.fight.endsAt], [WARN_AT, ENDS_AT], "the spec's clock")
})

PLANS.forEach((plan) => {
  const note = noteFor(plan)
  test(`${note}: played to the law, the note's scene notes are sent and the state at a1_tank is the text build's`, () => {
    const last = frames(opening, plan.opened, (b) => inputFor(plan, b))
    const fought = last.at(-2)!.brawl!
    assert.equal(noteOf(fought), note, 'the fight went the way the plan played it')
    const end = last.at(-1)!
    assert.equal(end.story.scene, 'a1_tank')
    assert.equal(end.space, 'jail')
    assert.deepEqual(end.story, sendMission(opening.story, note), "where the mission's note lands")
    assert.deepEqual(end.story, textBuild(end), 'the same state as the text build on the same --choices path')
    assert.deepEqual(end.path.slice(0, TO_PAN.length), TO_PAN)
    assert.equal(end.path.length - TO_PAN.length, sceneNotes(opening.story, note).length, 'one choice per menu the note applies')
    assert.ok(last.slice(0, -1).every((g) => g.path.length === TO_PAN.length), 'nothing is sent before the officer is in')
  })
})

// Who is in the fight this frame: everyone not sitting it out.
const inIt = (f: Fight): readonly string[] => f.fighters.filter((x) => x.stance !== 'seated').map((x) => x.id)
const sideOf = (f: Fight, id: string): string => f.fighters.find((x) => x.id === id)!.side

PLANS.forEach((plan) => {
  const note = noteFor(plan)
  test(`${note}: the bar picks sides as the scene has it: Curly on Wade's, the patrons joining, swelling and breaking off`, () => {
    const fights = frames(opening, plan.opened, (b) => inputFor(plan, b)).filter((g) => g.brawl).map((g) => g.brawl!.fight)
    const start = everybodys(plan.opened)
    // Got up, Wade and Curly are in it from the shove. Stayed seated, Eli takes the first punch alone: Wade and Curly
    // on their stools until Curly comes off his yelling "Texas!", and only then is it everybody's fight.
    const first = fights.filter((f) => f.t < start + DT)
    assert.ok(first.length > 0)
    const opening6 = plan.opened === 'gotUp' ? ['wade', 'eli', 'curly', 'drunk', 'friend', 'friend2'] : ['eli', 'drunk', 'friend', 'friend2']
    first.filter((f) => f.t < start).forEach((f) => assert.deepEqual(inIt(f), opening6, `at ${f.t.toFixed(2)} s`))
    fights.forEach((f) => assert.equal(sideOf(f, 'curly'), 'us', "Curly is on Wade's side"))
    if (plan.opened === 'stayedSeated') {
      fights.filter((f) => f.t < CURLY_AT).forEach((f) => assert.deepEqual(inIt(f).filter((id) => sideOf(f, id) === 'us'), ['eli'], 'Eli alone'))
      assert.ok(fights.filter((f) => f.t >= CURLY_AT + DT).every((f) => inIt(f).includes('curly')), 'then Curly is in it')
    }
    // The patrons: each sits it out until his moment after the fight became everybody's, then comes in on his side.
    // Both sides gain men: the whole bar picks sides, not one side.
    assert.ok(JOINERS.some((j) => j.side === 'us') && JOINERS.some((j) => j.side === 'them'))
    JOINERS.forEach((j) => {
      const before = fights.filter((f) => f.t < start + j.joins - DT)
      assert.ok(before.length > 0 && before.every((f) => !inIt(f).includes(j.id)), `${j.id} sits it out at first`)
      const joined = fights.findIndex((f) => f.events.some((e) => e.kind === 'join' && e.who === j.id))
      assert.ok(joined >= 0, `${j.id} joins`)
      assert.equal(sideOf(fights[joined]!, j.id), j.side, `${j.id} on his side`)
      // Once out of it, out for good: a patron who sits down in the mud does not come back in.
      const out = fights.findIndex((f, i) => i > joined && !inIt(f).includes(j.id))
      assert.ok(out > joined, `${j.id} breaks off before the law`)
      assert.ok(fights.slice(out).every((f) => !inIt(f).includes(j.id)), `${j.id} stays out`)
    })
    // Swelling and breaking off: the fight grows past its six, then thins before the headlights.
    const counts = fights.map((f) => inIt(f).length)
    const peak = Math.max(...counts)
    assert.ok(peak > 6, 'the fight swells')
    assert.ok(fights.filter((f) => f.t >= WARN_AT).every((f) => inIt(f).length < peak), 'and has broken off some by the headlights')
  })
})

test('a patron in it who goes down sits out the rest in the mud, where he fell', () => {
  const j = JOINERS[0]!
  const b0 = play(begin('gotUp', room), idle, DT)
  const b1 = Array.from({ length: Math.ceil((j.joins + 1) / DT) }).reduce<Brawl>((b) => play(b, idle, DT), b0)
  assert.notEqual(who(b1, j.id)!.stance, 'seated', 'in it')
  const downed = { ...b1, fight: { ...b1.fight, fighters: b1.fight.fighters.map((x) => (x.id === j.id ? { ...x, stance: 'down' as const, timer: 1, vel: vec(0, 0) } : x)) } }
  const b2 = play(downed, idle, DT)
  const x = who(b2, j.id)!
  assert.equal(x.stance, 'seated')
  assert.deepEqual(x.pos, who(downed, j.id)!.pos, 'where he fell')
  assert.equal(placed(b2, j.id)?.seated, true, 'drawn sitting')
})

test('the patrons are people in the Pan: each is drawn, seated where he sits it out before he joins', () => {
  const b = begin('gotUp', room)
  JOINERS.forEach((j) => {
    const f = spaces.pan.figures.find((x) => x.id === j.id)
    assert.ok(f, `${j.id} is a figure in the Pan`)
    assert.deepEqual(placed(b, j.id), { at: f!.at, facing: f!.facing, down: false, seated: true, speed: 0 })
    assert.ok(!room.walls.some((w) => hits(f!.at, w, -0.05)), `${j.id} sits clear of the room's solids`)
  })
})

test('sitting it out never skips the fight: Wade stays on his stool until Curly drags him in, and the fight runs its whole clock', () => {
  const all = frames(opening, 'stayedSeated', () => ({ ...still, dir: vec(1, 0), run: true, verbs: { shove: true, grab: true, use: true } }))
  const fights = all.filter((g) => g.brawl).map((g) => g.brawl!)
  const before = fights.filter((b) => b.fight.t < CURLY_AT)
  assert.ok(before.length > 0)
  before.forEach((b) => {
    assert.equal(wade(b).stance, 'seated')
    assert.deepEqual(wade(b).pos, WADE_STOOL, 'pressing everything does not get him up')
  })
  assert.ok(fights.some((b) => b.fight.events.some((e) => e.kind === 'haul' && e.who === 'wade')), 'Curly hauls him in')
  const after = fights.filter((b) => b.fight.t >= CURLY_AT + DT)
  assert.ok(after.every((b) => wade(b).stance !== 'seated'), 'and from then he is in it')
  assert.ok(fights.at(-1)!.fight.over && fights.at(-1)!.fight.t >= ENDS_AT, 'to the law at the same time as getting up')
  assert.ok(fights.some((b) => b.fight.events.some((e) => e.kind === 'warning')), 'the headlights come on the seated path too')
  const end = all.at(-1)!
  assert.equal(end.story.scene, 'a1_tank')
  assert.equal(end.path[TO_PAN.length], menu(opening.story).options.find((o) => o.note === 'stayInSeat')!.n, 'stayInSeat goes first')
  assert.deepEqual(end.story, textBuild(end))
})

test('seated and idle the whole way, the fight still plays out and lands on the cell', () => {
  const end = frames(opening, 'stayedSeated', () => still).at(-1)!
  assert.equal(end.story.scene, 'a1_tank')
  assert.deepEqual(end.story, textBuild(end))
})

test('no softlock: knocked down and never getting up, or mashing every verb, the law comes in at the same time', () => {
  const lying = frames(opening, 'gotUp', () => still)
  const mashing = frames(opening, 'gotUp', (b) => ({ dir: vec(Math.sin(b.fight.t * 3), Math.cos(b.fight.t * 2)), hold: true, run: true, verbs: { shove: true, grab: b.fight.t % 1 < 0.5, use: true } }))
  ;[lying, mashing].forEach((all) => {
    assert.equal(all.at(-1)!.story.scene, 'a1_tank')
    assert.ok(all.length <= Math.ceil((ENDS_AT + OUT_TIME) / DT) + 2, 'no longer than the clock and the out beat')
  })
})

test('bounds: through a whole fight every man stays inside the bar and out of its solids', () => {
  const plays = [PLANS[0]!, PLANS.find((p) => p.move === 'rack')!, PLANS.find((p) => p.move === 'bottle' && !p.stood)!]
  plays.forEach((plan) =>
    frames(opening, plan.opened, (b) => inputFor(plan, b)).forEach((g) =>
      g.brawl?.fight.fighters.forEach((x) => {
        assert.ok(Math.abs(x.pos.x) < spaces.pan.size.w / 2 && Math.abs(x.pos.z) < spaces.pan.size.d / 2, `${x.id} outside at ${x.pos.x},${x.pos.z}`)
        assert.ok(![...room.walls, ...room.counters, room.stove!].some((b) => hits(x.pos, b, -0.05)), `${x.id} inside a solid at ${x.pos.x},${x.pos.z}`)
      }),
    ),
  )
})

test("the game follows the fight: Wade's position is his fighter's, and he can't light a cigarette mid-fight", () => {
  const g = tick(press(opening, 'fight:gotUp'), { ...still, dir: vec(0, 1) }, 0.5)
  assert.deepEqual(g.pos, wade(g.brawl!).pos)
  assert.ok(g.pos.z > WADE_STOOL.z, 'he walked')
  assert.equal(canLight(g), false)
  assert.equal(g.panel, undefined)
})

test('the stove: shoved into the oil stove a man yelps and is out of it, and the move is a shove', () => {
  const b0 = begin('gotUp', room)
  const near = vec(STOVE.x + 0.95, STOVE.z - 0.6)
  const me = vec(near.x + 0.8, near.z - 0.5)
  const facing = Math.atan2(near.x - me.x, near.z - me.z)
  const fight = {
    ...b0.fight,
    fighters: b0.fight.fighters.map((x) => (x.id === 'wade' ? { ...x, pos: me, facing } : x.id === 'drunk' ? { ...x, pos: near, target: 'wade', cool: 9 } : x)),
  }
  const b1 = play({ ...b0, fight }, { ...idle, shove: true }, DT)
  const burned = Array.from({ length: 60 }).reduce<Brawl>((b) => play(b, idle, DT), b1)
  assert.equal(who(burned, 'drunk')!.stance, 'burned')
  assert.equal(burned.fight.tally.first, 'stove')
})

test('the officer stands in the door once the law is in, and the notes go after the out beat', () => {
  const all = frames(opening, 'gotUp', () => still)
  const over = all.filter((g) => g.brawl?.fight.over)
  assert.ok(over.length > 0)
  assert.ok(over.every((g) => placed(g.brawl!, OFFICER) !== undefined))
  assert.ok(all.filter((g) => g.brawl && !g.brawl.fight.over).every((g) => placed(g.brawl!, OFFICER) === undefined))
  assert.ok(over.length * DT >= OUT_TIME - DT, 'the out beat holds before the ride to the cell')
})

test("a link into the fight's later scenes opens their menu in the Pan", () => {
  const headlights = startFrom(hash([...TO_PAN, 1]), '')
  assert.equal(headlights.story.scene, 'a1_headlights')
  assert.equal(headlights.space, 'pan')
  assert.deepEqual(headlights.panel?.buttons.map((b) => b.id), menu(headlights.story).options.map((o) => `note:${o.note}`))
})

test('every plan lands a different note, and the scripted player plays from the prompt to the cell', () => {
  assert.equal(new Set(PLANS.map(noteFor)).size, mission(opening.story)!.endings.length)
  assert.deepEqual([...PLANS.map(noteFor)].sort(), mission(opening.story)!.endings.map((e) => e.note).sort())
  assert.equal(playOut(opening, PLANS[0]!).story.scene, 'a1_tank')
  assert.deepEqual(playOut(arrived, PLANS[0]!).story, playOut(opening, PLANS[0]!).story, 'from arriving too: it listens to Hank first')
})

// Regression: the Pan had no interior lamp, so in the flood it was lit as outdoors, with rain falling inside the bar.
test('no rain falls inside the Silver Pan in the flood: it is lit as an interior, by its bulbs', () => {
  ;(['clear', 'dusk', 'night'] as const).forEach((w) => assert.equal(lighting('pan', 'flood', w).rain, false, w))
  assert.ok(lighting('pan', 'flood', 'clear').lamp, 'the bar is lit by its bulbs')
})

// Drives the game the way main.ts does, keeping the checkpoint beside it: the press that opens the fight, then ticks
// with the scripted player until `stop` says so.
const kept = (opened: 'gotUp' | 'stayedSeated', stop: (g: Game) => boolean) => {
  const plan = PLANS.find((p) => p.opened === opened && p.move === 'bottle' && p.redHanded)!
  let g = press(opening, `fight:${opened}`)
  let shove = checkpoint(undefined, opening, g)
  while (g.brawl && !stop(g)) {
    const next = tick(g, inputFor(plan, g.brawl), DT)
    shove = checkpoint(shove, g, next)
    g = next
  }
  return { g, shove }
}

test('the pause menu restarts the fight from the shove: mid-fight or with the law in the door, back to the opening prompt', () => {
  const stops: readonly ((g: Game) => boolean)[] = [(g) => g.brawl!.fight.t > 20, (g) => g.brawl!.fight.over, (g) => (g.brawl!.out ?? 0) > OUT_TIME / 2]
  for (const opened of ['gotUp', 'stayedSeated'] as const)
    for (const stop of stops) {
      const { g, shove } = kept(opened, stop)
      assert.ok(g.brawl, 'still in the fight')
      assert.ok(canRestart(g, shove), 'the restart is offered in the fight')
      const back = restart(g, shove)
      assert.deepEqual(back, opening, 'the game as it stood at the shove')
      assert.deepEqual([back.story, back.path], [opening.story, opening.path], 'the story heard nothing')
      assert.deepEqual(back.panel?.buttons.map((b) => b.id), ['fight:gotUp', 'fight:stayedSeated'], 'get up or stay seated, again')
      assert.deepEqual(playOut(back, PLANS[0]!).path, playOut(opening, PLANS[0]!).path, 'the fight plays again from there')
    }
})

test('the restart is offered only during the fight, and the checkpoint goes once the notes are sent', () => {
  assert.equal(checkpoint(undefined, arrived, opening), undefined, 'no checkpoint under the speech')
  assert.equal(canRestart(opening, opening), false, 'not at the prompt')
  assert.equal(restart(opening, opening), opening)
  const { g, shove } = kept('gotUp', () => false)
  assert.equal(g.brawl, undefined, 'on to the cell')
  assert.equal(shove, undefined, 'nothing to go back to once the story has the note')
  assert.equal(canRestart(g, opening), false)
})
