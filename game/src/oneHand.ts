import type { State } from '../../text-game/src/types.ts'
import { oneHanded } from '../../text-game/src/story.ts'

// What one hand rules out (issue #219), game side. From the fall in a3_arm the story's oneHanded(state) is true and
// Wade's upper arm is in a sling, fully out of use (#88, design.md Systems > Broken arm). Every interaction the engine
// offers declares here whether it works one-handed. Three don't: climbing, driving a stick shift and shooting a
// rifle. Skiing, and lock or fine work, are unchanged by the owner's decision, and so is everything else.
//
// A ruled-out interaction is never offered and left to fail. Where the place has one, it becomes what #88 names
// instead: a detour (another way round a ladder or fence), a helper (someone else climbs or drives), or a staged beat
// the player watches (the Act 3 rash plans, where Wade tries anyway and it reads as hopeless). Where the place has
// none, the interaction is hidden. The game reads oneHanded(state) and never decides the arm itself.

export const interactions = [
  // The small-interaction verbs (talk.ts) and the bar fight's (fightControls.ts).
  'greet',
  'talk',
  'ask',
  'buy',
  'use',
  'shove',
  'grab',
  // Mission verbs named in docs/acts/.
  'look',
  'read',
  'step',
  'ski',
  'reach',
  'carry',
  'dig',
  'cut',
  'light',
  'feed',
  'eat',
  'workFree',
  'tieOff',
  'start',
  'steer',
  'cover',
  'shoulderCharge',
  'pickLock',
  'fineWork',
  // The three the arm rules out.
  'climb',
  'driveStick',
  'shootRifle',
] as const

export type Interaction = (typeof interactions)[number]

// What a ruled-out interaction can become, per #88.
export type Instead = 'detour' | 'helper' | 'staged'

export type Hands = Readonly<{ oneHand: 'works' }> | Readonly<{ oneHand: 'ruledOut'; instead: readonly Instead[] }>

const works: Hands = { oneHand: 'works' }

// The declaration. A Record, so an interaction without one is a type error; the test checks it at run time too.
export const hands: Readonly<Record<Interaction, Hands>> = {
  greet: works,
  talk: works,
  ask: works,
  buy: works,
  use: works,
  shove: works,
  grab: works,
  look: works,
  read: works,
  step: works,
  ski: works,
  reach: works,
  carry: works,
  dig: works,
  cut: works,
  light: works,
  feed: works,
  eat: works,
  workFree: works,
  tieOff: works,
  start: works,
  steer: works,
  cover: works,
  shoulderCharge: works,
  pickLock: works,
  fineWork: works,
  // Ladders, fences and hand over hand: a detour or a helper.
  climb: { oneHand: 'ruledOut', instead: ['detour', 'helper'] },
  // Someone else drives; in the cabin rash plan he tries and grinds the gears, staged.
  driveStick: { oneHand: 'ruledOut', instead: ['helper', 'staged'] },
  // No aim verb and no fire verb; at gunpoint he can't get it to his shoulder, staged.
  shootRifle: { oneHand: 'ruledOut', instead: ['staged'] },
}

export const ruledOut = (i: Interaction): boolean => hands[i].oneHand === 'ruledOut'

// What the player gets for an interaction at a place that offers `here` as alternatives: the verb itself, the
// first alternative #88 allows that the place has, or nothing (hidden).
export type Offer = Readonly<{ kind: 'verb' }> | Readonly<{ kind: 'instead'; via: Instead }> | Readonly<{ kind: 'hidden' }>

export const offer = (s: State, i: Interaction, here: readonly Instead[] = []): Offer => {
  const h = hands[i]
  if (h.oneHand === 'works' || !oneHanded(s)) return { kind: 'verb' }
  const via = h.instead.find((x) => here.includes(x))
  return via ? { kind: 'instead', via } : { kind: 'hidden' }
}

// The verbs the player can press at a place: ruled-out ones dropped once the arm is broken.
export const playable = (s: State, list: readonly Interaction[]): readonly Interaction[] =>
  list.filter((i) => offer(s, i).kind === 'verb')
