import type { Pov } from '../queries.ts'
import type { State } from '../types.ts'
import type { Ambient, Bit } from './format.ts'

// The pieces a town's cast is written with (prologueTown.ts, floodTown.ts). Each person carries a role, a want and a
// habit, for the writers and for the game's idle animation.

export type Townsperson = Ambient & Readonly<{ role: string; want: string; habit: string }>

// A pool entry the person says alone.
export const line = (id: string, text: string, when?: (s: State) => boolean): Bit => ({
  id,
  lines: [{ by: 'them', text }],
  ...(when ? { when } : {}),
})

// A short exchange with one reply the player can give, said in the player's own voice.
export const talker =
  (by: Pov) =>
  (id: string, texts: readonly string[], reply: string, answer: string, when?: (s: State) => boolean): Bit => ({
    id,
    lines: texts.map((text) => ({ by: 'them' as const, text })),
    reply: { label: reply, lines: [{ by, text: reply }, { by: 'them', text: answer }] },
    ...(when ? { when } : {}),
  })

export const person = (p: Omit<Townsperson, 'kind'>): Townsperson => ({ kind: 'person', ...p })
