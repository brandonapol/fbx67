import type { Game } from './prologue.ts'
import { dateCard } from './room.ts'
import { send } from '../../text-game/src/story.ts'

// Sleeping in Owen's room: the screen fades to black, the morning's date card holds over it, and then the story moves
// on to the morning at the boarding house door (issue #43, #47). The note is sent at the end, not at the bed.
export const SLEEP_FADE = 1.2
export const SLEEP_TIME = 4

export const sleeping = (g: Game): boolean => g.sleeping !== undefined

// How black the screen is while Owen sleeps: to full black over SLEEP_FADE, then held.
export const sleepFade = (g: Game): number => (g.sleeping === undefined ? 0 : Math.min(1, g.sleeping / SLEEP_FADE))

// The card over the black: only once the fade has finished, and only on the step that is the night going to sleep.
export const sleepCard = (g: Game): string | undefined =>
  g.sleeping !== undefined && g.sleeping >= SLEEP_FADE ? dateCard(g.story, send(g.story, 'sleep')) : undefined
