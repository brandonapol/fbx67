import type { SceneId, State } from '../../text-game/src/types.ts'
import type { Option } from '../../text-game/src/story.ts'
import { menu } from '../../text-game/src/story.ts'

// Letters home (#119): one view for every letter Wade writes to Mama. The story's menu is the letter: its title heads
// the page, its text is what is said or read before the pen moves (Mama's reply, when Joan reads it aloud, is part of
// it), and its options are the lines Wade can write. Choosing a line sends its note and writes it on the page in the
// letter's hand. Every option is on offer at once, none picked ahead of the player, the flight date included.

export type Hand = 'wade' | 'joan'

// The one thing that differs between letters: whose hand writes them. A lookup by scene id, as `pov` is.
export const hands: Readonly<Partial<Record<SceneId, Hand>>> = {
  a1_letter: 'wade',
  a2_letter_work: 'wade',
  a2_letter_friends: 'wade',
  a3_joan: 'joan',
}

export const handFor = (s: State): Hand | undefined => hands[s.scene]

// Characters of handwriting a second.
export const WRITE_RATE = 40

export type Writing = Readonly<{ note: string; line: string; shown: number }>

export type Letter = Readonly<{
  hand: Hand
  title: string
  said: string
  // The lines already on the page: a letter written over two topics keeps the first topic's line above the second.
  page: readonly string[]
  choices: readonly Option[]
  writing?: Writing
}>

// The letter at this scene, carrying the lines already written when it goes on from an earlier topic.
export const open = (s: State, page: readonly string[] = []): Letter | undefined => {
  const hand = handFor(s)
  if (!hand) return undefined
  const m = menu(s)
  return { hand, title: m.title, said: m.text, page, choices: m.options }
}

// The player picks a line: the caller sends its note to the story, and the pen starts on it. While it writes, no
// other line can be picked.
export const choose = (l: Letter, note: string): Letter => {
  if (l.writing) throw new Error(`${l.title}: already writing ${l.writing.note}`)
  const o = l.choices.find((c) => c.note === note)
  if (!o) throw new Error(`${l.title} does not offer ${note} (${l.choices.map((c) => c.note).join(', ')})`)
  return { ...l, writing: { note, line: o.label, shown: 0 } }
}

export const written = (l: Letter): boolean => l.writing !== undefined && l.writing.shown >= l.writing.line.length

export const write = (l: Letter, dt: number): Letter =>
  l.writing ? { ...l, writing: { ...l.writing, shown: Math.min(l.writing.line.length, l.writing.shown + WRITE_RATE * dt) } } : l

export const finish = (l: Letter): Letter => (l.writing ? { ...l, writing: { ...l.writing, shown: l.writing.line.length } } : l)

// Once the line is written, the letter goes on to the story's next topic in the same hand, with the page so far, or
// is done (undefined) and the game moves on.
export const turn = (l: Letter, next: State): Letter | undefined => {
  if (!l.writing || !written(l)) return l
  return handFor(next) === l.hand ? open(next, [...l.page, l.writing.line]) : undefined
}

// What the view draws: the page in the letter's hand, the line being written as far as the pen has got, and every
// line on offer as a button while none is being written. No button is marked as the default.
export type Sheet = Readonly<{
  hand: Hand
  title: string
  said: string
  lines: readonly string[]
  buttons: readonly Readonly<{ note: string; label: string }>[]
}>

export const sheet = (l: Letter): Sheet => ({
  hand: l.hand,
  title: l.title,
  said: l.said,
  lines: l.writing ? [...l.page, l.writing.line.slice(0, Math.floor(l.writing.shown))] : l.page,
  buttons: l.writing ? [] : l.choices.map((c) => ({ note: c.note, label: c.label })),
})
