import type { Box } from './world.ts'
import { vec } from './world.ts'
import type { Fight, Room } from './combat.ts'
import { fighter, start } from './combat.ts'

// The test space for the combat core (fight.html): a plain room, not the Silver Pan, with one of each thing the core
// knows: a counter along the north wall with bottles on it, a stove in the east, a rack on the west wall, a mud floor.
// The player and one man against him. The clock is the barfight spec's: the warning at 65 s, the end at 75 s.

export const W = 12
export const D = 9

const T = 0.3

export const walls: readonly Box[] = [
  { x: 0, z: -D / 2, w: W, d: T },
  { x: 0, z: D / 2, w: W, d: T },
  { x: -W / 2, z: 0, w: T, d: D },
  { x: W / 2, z: 0, w: T, d: D },
]

export const counter: Box = { x: -1, z: -D / 2 + 0.8, w: 6, d: 0.7 }

export const stove: Box = { x: W / 2 - 1.2, z: 0.5, w: 0.8, d: 0.8 }

export const room: Room = { walls, counters: [counter], stove, friction: 3, slips: true }

export const WARN_AT = 65
export const ENDS_AT = 75

export const PLAYER = 'wade'
export const OPPONENT = 'drunk'

export const testFight = (): Fight =>
  start({
    room,
    player: PLAYER,
    fighters: [fighter(PLAYER, 'us', vec(0, 2), Math.PI), fighter(OPPONENT, 'them', vec(0, -1.5), 0)],
    things: [
      { id: 'rack', kind: 'rack', pos: vec(-W / 2 + 0.4, 0.5) },
      { id: 'bottle1', kind: 'bottle', pos: vec(-2.5, counter.z) },
      { id: 'bottle2', kind: 'bottle', pos: vec(0.5, counter.z) },
    ],
    warnAt: WARN_AT,
    endsAt: ENDS_AT,
  })
