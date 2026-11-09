import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import type { State } from '../../text-game/src/types.ts'
import { replay } from '../../text-game/src/engine.ts'
import { menu, send } from '../../text-game/src/story.ts'
import { mamaReply } from '../../text-game/src/scenes/mama.ts'
import { replayPath, startFrom } from './start.ts'
import type { Game } from './prologue.ts'
import { press, still, tick } from './prologue.ts'
import type { Letter } from './letters.ts'
import { WRITE_RATE, choose, finish, hands, open, sheet, turn, write, written } from './letters.ts'

// The headless letter test (#119): start from a text-build path (#110), write each letter through the view one line
// at a time, and prove the story lands where the same `--choices` path does.

const DT = 1 / 30

const best: readonly number[] = (
  JSON.parse(readFileSync(new URL('../../text-game/routes/golden.json', import.meta.url), 'utf8')) as readonly { ending: string; path: string }[]
)
  .find((r) => r.ending === 'best')!
  .path.split(',')
  .map(Number)

// The best route's steps up to each letter scene.
const upTo = (scene: State['scene']): readonly number[] => best.slice(0, replay(best).findIndex((s) => s.scene === scene))

const from = (path: readonly number[]): State => {
  const r = replayPath(path.join(','))
  if ('error' in r) throw new Error(r.error)
  return r.story
}

// Pick a line, send its note, let the pen write it at the view's pace, and turn the page.
const writeLine = (story: State, l: Letter, n: number): { story: State; letter?: Letter } => {
  const note = l.choices.find((c) => c.n === n)!.note
  let at = choose(l, note)
  const next = send(story, note)
  while (!written(at)) at = write(at, DT)
  return { story: next, letter: turn(at, next) }
}

// Write every line the path asks for, in the view; return the story and whatever letter is left open.
const writeAll = (story: State, ns: readonly number[]): { story: State; letter?: Letter } =>
  ns.reduce<{ story: State; letter?: Letter }>((acc, n) => writeLine(acc.story, acc.letter!, n), { story, letter: open(story) })

const letters = [
  { scene: 'a1_letter', topics: 1 },
  { scene: 'a2_letter_work', topics: 2 },
  { scene: 'a3_joan', topics: 1 },
] as const

const combos = (k: number): readonly (readonly number[])[] => (k === 0 ? [[]] : combos(k - 1).flatMap((c) => [1, 2, 3].map((n) => [...c, n])))

test('the letter scenes are exactly the four the story writes home in, and the hand is all that differs', () => {
  assert.deepEqual(Object.keys(hands).sort(), ['a1_letter', 'a2_letter_friends', 'a2_letter_work', 'a3_joan'])
  assert.deepEqual(new Set(Object.values(hands)), new Set(['wade', 'joan']))
  assert.equal(hands.a3_joan, 'joan', 'Joan takes it down')
  const shapes = letters.map(({ scene }) => Object.keys(open(from(upTo(scene)))!).sort())
  shapes.forEach((s) => assert.deepEqual(s, shapes[0]))
  assert.equal(open(from(best.slice(0, 14))), undefined, 'a scene that is not a letter has no letter')
})

test('every line of every letter, written in the view, lands on the same state as its --choices path', () => {
  letters.forEach(({ scene, topics }) => {
    const prefix = upTo(scene)
    combos(topics).forEach((ns) => {
      const out = writeAll(from(prefix), ns)
      assert.deepEqual(out.story, replay([...prefix, ...ns]).at(-1), `${scene} ${ns.join(',')}`)
      assert.equal(out.letter, undefined, `${scene} ${ns.join(',')}: the letter is done`)
    })
  })
})

test('the lines are the menu labels, all of them on offer and none of them the default', () => {
  letters.forEach(({ scene }) => {
    const story = from(upTo(scene))
    const s = sheet(open(story)!)
    const m = menu(story)
    assert.equal(s.title, m.title)
    assert.equal(s.said, m.text)
    assert.deepEqual(s.buttons, m.options.map((o) => ({ note: o.note, label: o.label })))
    assert.deepEqual(Object.keys(s).sort(), ['buttons', 'hand', 'lines', 'said', 'title'], 'nothing marks a default line')
  })
})

test('the flight date is a line on offer after every work line, never hidden or defaulted, and it leaks only when picked', () => {
  const work = from(upTo('a2_letter_work'))
  ;[1, 2, 3].forEach((w) => {
    const { story, letter } = writeLine(work, open(work)!, w)
    assert.equal(story.scene, 'a2_letter_friends')
    const buttons = sheet(letter!).buttons
    assert.deepEqual(buttons, menu(story).options.map((o) => ({ note: o.note, label: o.label })))
    const leak = buttons.find((b) => /flying north on the 12th/.test(b.label))
    assert.ok(leak, `after work line ${w}, the flight date is on offer`)
    buttons.forEach((b) => {
      const after = writeLine(story, letter!, letter!.choices.find((c) => c.note === b.note)!.n).story
      assert.equal(after.leakedFlightDate, b === leak, `${b.note}: leaks the date only when written`)
    })
  })
})

test('the handwriting appears as the line is picked, and nothing else can be picked while the pen moves', () => {
  const story = from(upTo('a1_letter'))
  const l = open(story)!
  const label = l.choices.find((c) => c.note === 'soft')!.label
  const picked = choose(l, 'soft')
  assert.deepEqual(sheet(picked).lines, [''])
  assert.deepEqual(sheet(picked).buttons, [])
  assert.throws(() => choose(picked, 'lie'), /already writing/)
  const half = write(picked, label.length / 2 / WRITE_RATE)
  assert.equal(sheet(half).lines[0], label.slice(0, Math.floor(label.length / 2)))
  assert.equal(turn(half, send(story, 'soft')), half, 'the page does not turn mid-line')
  assert.deepEqual(sheet(finish(picked)).lines, [label])
  assert.throws(() => choose(l, 'nope'), /does not offer nope/)
})

test('the Act 2 letter is two topics on one page: the work line stays above the friends lines', () => {
  const work = from(upTo('a2_letter_work'))
  const first = open(work)!
  const { letter } = writeLine(work, first, 2)
  assert.equal(letter!.hand, 'wade')
  assert.deepEqual(letter!.page, [first.choices[1].label])
  assert.deepEqual(sheet(letter!).lines, [first.choices[1].label])
})

test("Joan writes the Act 3 letter, after reading Mama's reply aloud", () => {
  const story = from(upTo('a3_joan'))
  const l = open(story)!
  assert.equal(l.hand, 'joan')
  assert.ok(l.said.includes(mamaReply(0)(story)), "Mama's reply is read before the pen moves")
  assert.equal(sheet(l).hand, 'joan')
})

// The game itself: start at the letter from its path link, pick each line by its note, let the pen write, and the game
// moves on with the same story and path as the text build.
const playLetter = (g: Game, n: number): Game => {
  const note = g.home!.choices.find((c) => c.n === n)!.note
  let at = press(g, `note:${note}`)
  assert.equal(at.home?.writing?.note, note, 'the pen starts on the picked line')
  for (let i = 0; at.home?.writing && i < 10_000; i++) at = tick(at, still, DT)
  return at
}

test('the game plays every letter through the view and lands on the --choices path, path and all', () => {
  letters.forEach(({ scene, topics }) => {
    const prefix = upTo(scene)
    combos(topics).forEach((ns) => {
      const g = startFrom(`#path=${prefix.join(',')}`, '')
      assert.equal(g.home?.hand, hands[scene])
      assert.equal(g.panel?.kind, 'home')
      assert.deepEqual(g.panel?.buttons, [], 'no panel button stands in for a line, so no key picks one by default')
      const out = ns.reduce(playLetter, g)
      assert.equal(out.home, undefined, `${scene} ${ns.join(',')}: the letter is done`)
      assert.deepEqual(out.story, replay([...prefix, ...ns]).at(-1), `${scene} ${ns.join(',')}`)
      assert.deepEqual(out.path, [...prefix, ...ns])
    })
  })
})

test('in the game, a second pick while the pen moves is ignored, and finishing the line turns the page', () => {
  const g = startFrom(`#path=${upTo('a2_letter_work').join(',')}`, '')
  const picked = press(g, 'note:soft')
  assert.equal(press(picked, 'note:lie'), picked)
  const turned = tick(press(picked, 'finish'), still, DT)
  assert.equal(turned.story.scene, 'a2_letter_friends')
  assert.equal(turned.home?.writing, undefined)
  assert.deepEqual(turned.home?.page, [g.home!.choices[1].label])
})
