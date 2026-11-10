import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import type { Ambient, Thread } from './format.ts'
import { MAX_LINE } from './format.ts'
import { lintAmbient, placedStates } from './lint.ts'
import { initialState } from '../state.ts'
import { place } from '../story.ts'
import { airman, barNight, bartender, fixture, threads } from './fixture.ts'

const source = readFileSync(new URL('./fixture.ts', import.meta.url), 'utf8')
const states = placedStates()

const withGreet = (text: string): Ambient => ({ ...bartender, lines: { greet: [{ id: 'bad', lines: [{ by: 'them', text }] }] } })

const lint = (cast: readonly Ambient[], ts: readonly Thread[] = [], src = '') => lintAmbient(cast, ts, src, states)

test('the placed walk covers every prologue scene with a place, and stops where places end', () => {
  const scenes = new Set(states.map((s) => s.scene))
  for (const id of ['p_bar', 'p_talk_texas', 'p_talk_munitions', 'p_talk_round', 'p_letter', 'p_dock', 'p_camp', 'p_end'])
    assert.ok(scenes.has(id as never), id)
  assert.ok(states.every((s) => place(s) !== undefined))
  assert.equal(placedStates(initialState).length, states.length)
})

test('the fixture cast and its threads are clean', () => {
  assert.deepEqual(lintAmbient(fixture, threads, source, states), [])
})

test('a deliberate oil rush line in the prologue fails', () => {
  assert.deepEqual(lint([withGreet('Everybody in town is talking about the oil rush.')]), [
    'bartender greet bad: oil rule /\\boil (rush|boom|strike|money)\\b/i',
  ])
  const thread: Thread = { ...threads[0], lines: [...threads[0].lines, { who: 'airman', text: 'Prudhoe, they say.' }] }
  assert.deepEqual(lint(fixture, [thread]), ['thread shift line 3: oil rule /\\bPrudhoe\\b/i'])
})

test('plain oil is fine before Act 4', () => {
  assert.deepEqual(lint([withGreet('Smells like stove oil in here.')]), [])
})

test('a literal placeholder name in the source fails; one from names.ts passes', () => {
  assert.deepEqual(lint(fixture, [], "name: 'Hank Lyle',"), [
    'source line 1: Hank is a placeholder name; use names.ts',
    'source line 1: Lyle is a placeholder name; use names.ts',
  ])
  assert.deepEqual(lint(fixture, [], 'name: N.bartender,'), [])
})

test('a speaker name must come from names.ts or be a role name', () => {
  assert.deepEqual(lint([{ ...airman, name: 'Bob' }]), ['airman: name "Bob" is neither in names.ts nor a role name'])
})

test('placeholder tokens, empty lines and long lines fail', () => {
  assert.match(lint([withGreet('Hello, undefined.')])[0], /placeholder token/)
  assert.match(lint([withGreet('Hello, ${N.owenShort}.')])[0], /placeholder token/)
  assert.match(lint([withGreet('TODO write this')])[0], /placeholder token/)
  assert.match(lint([withGreet('  ')])[0], /empty line/)
  assert.deepEqual(lint([withGreet('x'.repeat(MAX_LINE))]), [])
  assert.match(lint([withGreet('x'.repeat(MAX_LINE + 1))])[0], /over 120/)
})

test('an exchange has one to three lines', () => {
  const four = { by: 'them', text: 'Yes.' } as const
  assert.deepEqual(lint([{ ...bartender, lines: { talk: [{ id: 'long', lines: [four, four, four, four] }] } }]), [
    'bartender talk long: 4 lines, not 1-3',
  ])
})

test('a line nobody can hear fails: wrong place, wrong hour, or a gate that never holds', () => {
  const unheard = ['bartender greet bad: never heard at any place and time the story reaches']
  assert.deepEqual(lint([{ ...withGreet('Hi.'), at: [{ ...barNight, place: 'landOffice' }] }]), unheard)
  assert.deepEqual(lint([{ ...withGreet('Hi.'), at: [{ ...barNight, from: '1968-01-01T00:00', to: '1968-01-02T00:00' }] }]), unheard)
  assert.deepEqual(lint([{ ...bartender, lines: { greet: [{ id: 'bad', lines: [{ by: 'them', text: 'Hi.' }], when: () => false }] } }]), unheard)
})

test('a thread names known people and is heard somewhere', () => {
  const stranger: Thread = { ...threads[0], lines: [{ who: 'ghost', text: 'Boo.' }, threads[0].lines[1]] }
  assert.deepEqual(lint(fixture, [stranger]), ['thread shift line 1: "ghost" is not in the cast'])
  const nowhere: Thread = { ...threads[0], at: { ...barNight, place: 'cityJail' } }
  assert.deepEqual(lint(fixture, [nowhere]), ['thread shift: never heard at any place and time the story reaches'])
  assert.deepEqual(lint(fixture, [{ ...threads[0], lines: threads[0].lines.slice(0, 1) }]), [
    'thread shift: 1 lines; a thread is between two people',
  ])
})

test('ids are unique', () => {
  assert.deepEqual(lint([airman, airman]), ['duplicate ambient id airman'])
  assert.deepEqual(lint(fixture, [threads[0], threads[0]]), ['duplicate thread id shift'])
})

test('a player line is only said where the story is played as that player', () => {
  const reply = (by: 'owen' | 'wade'): Ambient => ({
    ...bartender,
    lines: { talk: [{ id: 'sun', lines: [{ by: 'them', text: 'Slow night.' }], reply: { label: 'Yes.', lines: [{ by, text: 'Yes.' }] } }] },
  })
  assert.deepEqual(lint([reply('owen')]), [])
  assert.deepEqual(lint([reply('wade')]), ['bartender talk sun: a line by wade, heard where the player is owen'])
})
