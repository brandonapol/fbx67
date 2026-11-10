import { test } from 'node:test'
import assert from 'node:assert/strict'
import { replay } from '../../text-game/src/engine.ts'
import { menu, place } from '../../text-game/src/story.ts'
import type { Game } from './prologue.ts'
import { available, focus, handedOff, press, still, tick } from './prologue.ts'
import { startFrom } from './start.ts'
import { jailTalk } from './drive.ts'
import { present, solids, spaces } from './levels.ts'
import { CELL_SPAWN, inCell } from './jail.ts'
import { blocked } from './world.ts'

// The drunk tank and Ashby at the desk (#118): from the first choice of every Act 1 menu up to the cell, played in the
// engine build's logic headless, and checked against the text build on the same `--choices` path.

// `node src/cli.ts --choices <TO_TANK>` ends on the cell, with Barnette at the bars.
const TO_TANK = Array.from({ length: 22 }, () => 1)
const hash = (path: readonly number[]): string => `#path=${path.join(',')}`

const textBuild = (g: Game) => replay(g.path).at(-1)!

const cell = startFrom(hash(TO_TANK), '')

const answers = menu(cell.story).options.map((o) => o.note)

const answer = (note: string): Game => press(jailTalk(cell, 'barnette'), `note:${note}`)

const shown = (g: Game): readonly string[] =>
  spaces.jail.figures
    .filter((f) => present(f, g.story))
    .map((f) => f.id)
    .sort()

test('the path to the cell puts Wade in the jail, in the cell, with no menu open', () => {
  assert.equal(place(cell.story), 'cityJail')
  assert.equal(cell.space, 'jail')
  assert.equal(cell.panel, undefined)
  assert.deepEqual(cell.pos, CELL_SPAWN)
  assert.ok(inCell(cell.pos))
  assert.deepEqual(cell.story, textBuild(cell))
})

test("the jail's place id has a spawn point, clear of every solid and figure", () => {
  assert.equal(spaces.jail.place, 'cityJail')
  assert.equal(blocked(spaces.jail.spawn, solids(spaces.jail, cell.story)), false)
})

test('the cell holds Wade: he cannot walk through the bars to the desk', () => {
  const g = Array.from({ length: 300 }).reduce<Game>((acc) => tick(acc, { dir: { x: 1, z: 0 }, hold: false }, 1 / 30), cell)
  assert.ok(inCell(g.pos), `at ${g.pos.x},${g.pos.z}`)
})

test('Barnette at the bars is the only one to talk to, and he asks for a name with every answer the story offers', () => {
  assert.deepEqual(available(cell).map((i) => i.id), ['barnette'])
  const asked = jailTalk(cell, 'barnette')
  assert.equal(asked.panel?.title, menu(cell.story).title)
  assert.equal(asked.panel?.text, menu(cell.story).text)
  assert.deepEqual(asked.panel?.buttons.map((b) => b.id), answers.map((n) => `note:${n}`), 'every decision 1 note, and no way to walk off')
})

test('decision 1 is held and not timed: ten minutes at the bars sends no note', () => {
  const asked = jailTalk(cell, 'barnette')
  const waited = Array.from({ length: 30 * 600 }).reduce<Game>((acc) => tick(acc, still, 1 / 30), asked)
  assert.deepEqual(waited.path, asked.path)
  assert.deepEqual(waited.story, asked.story)
  assert.deepEqual(waited.panel, asked.panel)
  assert.deepEqual(waited.pos, asked.pos)
})

answers.forEach((note) =>
  test(`${note}: Wade is let out to the desk, and the state is the text build's`, () => {
    const out = answer(note)
    assert.deepEqual(out.story, textBuild(out))
    assert.equal(out.story.barfight, note)
    assert.equal(out.space, 'jail')
    assert.equal(out.panel, undefined)
    assert.ok(!inCell(out.pos))
    assert.deepEqual(available(out).map((i) => i.id), ['ashby'])
  }),
)

test('before the answer: Barnette at the bars, Eli and Curly in the cell, no one at the desk', () => {
  assert.deepEqual(shown(cell), ['barnette', 'curly', 'eli'])
})

test("the text's variants play out from state: Eli stays when blamed, Curly claps your back when you side with him", () => {
  assert.deepEqual(shown(answer('coverEli')), ['ashby', 'barnetteDesk', 'curly', 'eliOut'])
  assert.deepEqual(shown(answer('blameEli')), ['ashby', 'barnetteDesk', 'curly', 'eli'])
  assert.deepEqual(shown(answer('sideCurly')), ['ashby', 'barnetteDesk', 'curlyOut', 'eliOut'])
  const eli = spaces.jail.figures.find((f) => f.id === 'eli')!
  assert.ok(inCell(eli.at), 'the Eli who stays is behind the bars')
  const clap = spaces.jail.figures.find((f) => f.id === 'curlyOut')!
  const out = answer('sideCurly')
  assert.ok(Math.hypot(clap.at.x - out.pos.x, clap.at.z - out.pos.z) < 1.2, "Curly is at Wade's shoulder")
})

answers.forEach((note, i) =>
  test(`${note}: Ashby at the desk, then parity at the letter home`, () => {
    const desk = jailTalk(answer(note), 'ashby')
    assert.equal(focus({ ...desk, panel: undefined })?.id, 'ashby')
    assert.equal(desk.panel?.title, menu(desk.story).title)
    assert.equal(desk.panel?.text, menu(desk.story).text, "the scene's own text: the torn charge sheet, the card")
    const thanks = desk.panel!.buttons.find((b) => b.id.startsWith('note:'))!
    const letter = press(desk, thanks.id)
    assert.equal(place(letter.story), 'eielsonBarracks')
    assert.deepEqual(letter.path, [...TO_TANK, i + 1, 1], 'the same --choices path as the text build')
    assert.deepEqual(letter.story, textBuild(letter))
    assert.deepEqual(letter.story, startFrom(hash(letter.path), '').story)
    assert.equal(handedOff(letter), false)
    assert.equal(letter.panel?.title, menu(letter.story).title, 'the letter plays as its menu')
  }),
)
