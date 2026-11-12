import type { Game } from './prologue.ts'
import { press, still, tick } from './prologue.ts'
import type { Signal } from './survivalPlay.ts'
import { nextPress } from './survivalPlay.ts'

// A steady player for the long night through the wired game (prologue.ts), for the headless runs (notesRatchet.ts and
// the tests): presses what survivalPlay.ts's nextPress picks, taking `signal` at the prompt, and lets the night run
// between, until first light has sent the mission's notes. A game with no night under way is returned as it is.
const DT = 1 / 30

export const nightOut = (g: Game, signal?: Signal, limit = 200000): Game => {
  let cur = g
  for (let k = 0; cur.night && k < limit; k++) {
    const id = nextPress(cur.night, signal)
    cur = id ? press(cur, id) : tick(cur, still, DT)
  }
  return cur
}
