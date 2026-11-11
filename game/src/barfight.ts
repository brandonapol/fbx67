import type { State } from '../../text-game/src/types.ts'
import { menu, mission } from '../../text-game/src/story.ts'
import type { Fight, Fighter, Intent, Room, Thing } from './combat.ts'
import { STAGGER, details, fighter, haul, idle, start, step } from './combat.ts'
import type { Figure, Prop } from './levels.ts'
import { COUNTER, MOOSE_RACK, STOVE } from './silverPan.ts'
import type { Vec } from './world.ts'
import { add, angleTo, vec } from './world.ts'

// The barfight at the Silver Pan (#176; docs/acts/act1-missions.md, section 3): Saturday after the water went down, mud
// on the floor. Hank's speech first, as the scene's own text over the bar; then the drunk shoves Eli, Wade gets up or
// stays on his stool, and the fight plays on the combat core (combat.ts) until Officer Peter comes through the door.
// Stayed seated, Curly drags him in a few seconds later and the fight plays the same way, on the same clock.
//
// Nothing here decides what the fight means for the story. The core tallies the details the spec names; this file
// spells them as the mission's note (`opened.move.stood.caught`) and reads, from the mission's own data, which scene
// notes that note applies, in order. The game sends those through sendNote (prologue.ts).
//
// This file imports levels.ts for types only: levels.ts stands these figures in the bar without a cycle.

export type Opened = 'gotUp' | 'stayedSeated'

export const MISSION = 'theBarfight'

// The spec's clock: the warning (headlights, a siren) at 65 s from the shove, the law through the door at 75 s.
export const WARN_AT = 65
export const ENDS_AT = 75
// Stayed seated: Curly comes off his stool yelling "Texas!" this long after the shove.
export const CURLY_AT = 5
// After the whistle: the fight has stopped and the officer stands in the door, before the ride to the cell.
export const OUT_TIME = 2.5

export const PLAYER = 'wade'

// Where everyone is when the drunk shoves Eli: Wade on a stool at the bar, Eli on the next one with his soda, Curly
// down the bar, the drunk behind Eli, his two friends behind him. Hank is behind the bar, out of it.
export const WADE_STOOL = vec(0.5, -2.35)
export const ELI_STOOL = vec(-0.5, -2.35)
export const CURLY_STOOL = vec(1.5, -2.35)
export const HANK_AT = vec(-1.5, -4.0)
// The door the law comes in by.
export const DOOR = vec(0, 4.3)

const N = Math.PI

export const fighters = (opened: Opened): readonly Fighter[] => [
  fighter(PLAYER, 'us', WADE_STOOL, 0, opened === 'stayedSeated' ? { stance: 'seated', timer: Infinity } : {}),
  // Eli defends himself and doesn't throw the first punch; the drunk's shove is the first hand laid on him.
  fighter('eli', 'us', add(ELI_STOOL, vec(0, 0.35)), 0, { answers: true, struck: true, stance: 'staggered', timer: STAGGER, target: 'friend' }),
  fighter('curly', 'us', CURLY_STOOL, 0, { target: 'friend2' }),
  fighter('drunk', 'them', vec(-0.5, -0.9), N, { target: 'eli', cool: 1 }),
  fighter('friend', 'them', vec(-1.7, -0.6), N, { target: 'eli', cool: 2 }),
  fighter('friend2', 'them', vec(1.2, -0.4), N, { target: PLAYER, cool: 2 }),
]

// The rack over the door, and the bottles along the bar.
export const things: readonly Thing[] = [
  { id: 'rack', kind: 'rack', pos: MOOSE_RACK },
  ...[-3.6, -2.2, -1.2, 1.2].map((x, i): Thing => ({ id: `bottle${i + 1}`, kind: 'bottle', pos: vec(x, COUNTER.z + 0.3) })),
]

// The room the core fights in, from the space's own props and people: every solid stops a man, and so does anyone
// sitting it out (Hank, Jake, the card game); the bar is the counter a bottle breaks on, the oil stove is hot, and the
// mud is slick.
const SEATED = 0.5

export const roomOf = (props: readonly Prop[], people: readonly Figure[] = []): Room => {
  const solid = props.filter((p) => p.solid).map((p) => p.box)
  const fighting = new Set([...fighters('gotUp').map((x) => x.id), OFFICER])
  const out = people.filter((f) => !fighting.has(f.id)).map((f) => ({ x: f.at.x, z: f.at.z, w: SEATED, d: SEATED }))
  return { walls: [...solid.filter((b) => b !== COUNTER && b !== STOVE), ...out], counters: [COUNTER], stove: STOVE, friction: 3, slips: true }
}

export type Brawl = Readonly<{ opened: Opened; fight: Fight; out?: number }>

export const begin = (opened: Opened, room: Room): Brawl => ({
  opened,
  fight: start({ room, player: PLAYER, stand: 'eli', fighters: fighters(opened), things, warnAt: WARN_AT, endsAt: ENDS_AT }),
})

export const who = (b: Brawl, id: string): Fighter | undefined => b.fight.fighters.find((x) => x.id === id)

export const wade = (b: Brawl): Fighter => who(b, PLAYER)!

// Curly hauls Wade off his stool by the collar, toward Eli.
const dragIn = (f: Fight): Fight => {
  const curly = f.fighters.find((x) => x.id === 'curly')!
  const at = add(WADE_STOOL, vec(0, 0.7))
  return haul(f, PLAYER, at, angleTo(at, curly.pos))
}

// One frame. Seated, nothing the player presses does anything until Curly drags him in. Once the law is in, the out
// beat runs.
export const play = (b: Brawl, intent: Intent, dt: number): Brawl => {
  if (b.fight.over) return { ...b, fight: { ...b.fight, events: [] }, out: (b.out ?? 0) + dt }
  const seated = wade(b).stance === 'seated'
  const hauled = seated && b.fight.t + dt >= CURLY_AT
  const f = hauled ? dragIn(b.fight) : b.fight
  const stepped = step(f, seated && !hauled ? idle : intent, dt)
  // The core's step starts each frame's events afresh; the haul is this frame's too.
  return { ...b, fight: hauled ? { ...stepped, events: [...f.events.filter((e) => e.kind === 'haul'), ...stepped.events] } : stepped }
}

export const done = (b: Brawl): boolean => (b.out ?? 0) >= OUT_TIME

// The mission's note for the fight as it went (docs/story-api.md: `opened.move.stood.caught`).
export const noteOf = (b: Brawl): string => {
  const d = details(b.fight)
  return [b.opened, d.move, d.stood ? 'stoodWithEli' : 'leftEli', d.redHanded ? 'redHanded' : 'clean'].join('.')
}

// The scene notes the mission's ending applies, in play order: the story's data, not this file's.
export const sceneNotes = (s: State, note: string): readonly string[] => {
  const m = mission(s)
  const e = m?.id === MISSION ? m.endings.find((x) => x.note === note) : undefined
  if (!e) throw new Error(`${s.scene} has no barfight ending ${note}`)
  return e.applies
}

export const starts = (s: State): boolean => mission(s)?.id === MISSION

// The opening: the scene's own text (Hank's speech, the drunk, the shove) and its prompt, get up or stay seated. The
// seated label is the story's own choice; getting up is any of the fight's moves, so it is the game's.
export const GET_UP = 'Get up.'

export const openingButtons = (s: State): readonly Readonly<{ id: string; label: string }>[] => [
  { id: 'fight:gotUp', label: GET_UP },
  { id: 'fight:stayedSeated', label: menu(s).options.find((o) => o.note === 'stayInSeat')?.label ?? 'Stay in your seat.' },
]

export const openedOf = (button: string): Opened | undefined =>
  button === 'fight:gotUp' ? 'gotUp' : button === 'fight:stayedSeated' ? 'stayedSeated' : undefined

// The people in the Pan on Saturday night: the fighters, Hank behind the bar, Jake folded into the booth, the card
// game, and the officer in the door at the end. The fighters stand where the fight puts them (render.ts).
const looks = {
  eli: { coat: '#4a4f3a', skin: '#a8754f', hair: '#1e1a17', height: 1.76 },
  curly: { coat: '#8a5a2a', skin: '#e3b28a', hair: '#c8873f', height: 1.75 },
  drunk: { coat: '#6a3a2a', skin: '#d9a07a', hair: '#4a3420', height: 1.84 },
  friend: { coat: '#5a5a48', skin: '#e0b090', hair: '#2a2018', height: 1.8 },
  friend2: { coat: '#3e4a5a', skin: '#d8a880', hair: '#8a6a40', height: 1.78 },
} as const

export const OFFICER = 'cop'

export const figures: readonly Figure[] = [
  ...fighters('gotUp')
    .filter((x) => x.id !== PLAYER)
    .map((x): Figure => ({ id: x.id, at: x.pos, facing: x.facing, ...looks[x.id as keyof typeof looks] })),
  { id: 'hank', at: HANK_AT, facing: 0, coat: '#e8e1d2', skin: '#e0b48f', hair: '#9a9a9a', height: 1.8, activity: 'stand' },
  { id: 'jake', at: vec(4.9, 4.35), facing: N, coat: '#5a4a32', skin: '#d8a880', hair: '#6a5a40', height: 1.8, activity: 'sitDrink' },
  { id: 'cards1', at: vec(-4.2, 0.75), facing: 0, coat: '#4a5a3a', skin: '#e0b48f', hair: '#3a2c20', height: 1.75, activity: 'sitDrink' },
  { id: 'cards2', at: vec(-4.2, 2.85), facing: N, coat: '#6b3a2a', skin: '#c99a76', hair: '#2a2420', height: 1.78, activity: 'sitDrink' },
  { id: OFFICER, at: DOOR, facing: N, coat: '#27304a', skin: '#e0b48f', hair: '#3a2c20', height: 1.85, when: () => false },
]

// Where a figure stands this frame: a fighter where the fight has him, the officer in the door once the law is in.
export type Placed = Readonly<{ at: Vec; facing: number; down: boolean; seated: boolean; speed: number }>

export const placed = (b: Brawl, id: string): Placed | undefined => {
  if (id === OFFICER) return b.fight.over ? { at: DOOR, facing: N, down: false, seated: false, speed: 0 } : undefined
  const x = who(b, id)
  if (!x) return undefined
  return { at: x.pos, facing: x.facing, down: x.stance === 'down' || x.stance === 'rising', seated: x.stance === 'seated', speed: Math.hypot(x.vel.x, x.vel.z) }
}

export const officerIn = (b: Brawl | undefined): boolean => !!b?.fight.over
