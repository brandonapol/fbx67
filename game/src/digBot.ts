import type { CacheSpot } from '../../text-game/src/types.ts'
import type { Game } from './prologue.ts'
import { focus, interact, press, still, tick } from './prologue.ts'
import { DIG_SPOTS, HOME_NOTE, HUB, JAKE_AT, JAKE_SPOT, SPAWN, WAYS, digging, found } from './owensCamp.ts'
import type { Interactable, Vec } from './world.ts'
import { angleTo, distance, sub, vec } from './world.ts'

// Lucy's dig played by a steady player (owensCamp.ts), for the parity ratchet and the dig's tests: she digs `first`
// first, and after a wrong first dig rereads the letter and digs where its line says, then walks back to Jake and goes
// home. The line is the story's (owenCache), the same one the reread shows the player.

const DT = 1 / 30

export const walkTo = (g: Game, to: Vec): Game => {
  let cur = g
  for (let n = 0; distance(cur.pos, to) >= 0.15; n++) {
    if (n > 30 * 60) throw new Error(`stuck at ${cur.pos.x.toFixed(2)},${cur.pos.z.toFixed(2)} on the way to ${to.x},${to.z}`)
    cur = tick(cur, { dir: sub(to, cur.pos), hold: false, limit: distance(to, cur.pos) }, DT)
    if (cur.panel) return cur
  }
  return cur
}

const along = (g: Game, way: readonly Vec[]): Game => way.reduce((cur, p) => (cur.panel ? cur : walkTo(cur, p)), g)

const turnTo = (g: Game, i: Interactable): Game => tick(g, { ...still, view: angleTo(g.pos, i) }, DT)

const spotOf = (spot: CacheSpot): Interactable => DIG_SPOTS.find((d) => d.id === spot)!

// Holds interact on a spot until the dig is done, or the cold or the dark fades her back.
export const dig = (g: Game, spot: CacheSpot): Game => {
  const at = turnTo(g, spotOf(spot))
  if (focus(at)?.id !== spot) throw new Error(`cannot focus ${spot} from ${at.pos.x.toFixed(2)},${at.pos.z.toFixed(2)}`)
  let cur = interact(at)
  for (let n = 0; cur.holding && !cur.panel; n++) {
    if (n > 30 * 300) throw new Error(`the dig at ${spot} never ends`)
    cur = tick(cur, { ...still, hold: true }, DT)
  }
  return cur
}

// From the plane, or from the spot she last dug, to another spot.
export const goDig = (g: Game, spot: CacheSpot, from?: CacheSpot): Game =>
  dig(along(g, [...(from ? [...WAYS[from]].reverse() : []), HUB, ...WAYS[spot]]), spot)

// Back from the spot she dug to Jake, turned to him.
export const backToJake = (g: Game, from: CacheSpot): Game => {
  const near = along(g, [...[...WAYS[from]].reverse(), HUB, SPAWN, vec(JAKE_AT.x + 0.8, JAKE_AT.z - 0.6)])
  return turnTo(near, JAKE_SPOT)
}

// The whole dig from stepping off the plane: the first spot, the reread and the right spot if it was wrong, then home.
export const digOut = (g: Game, first: CacheSpot): Game => {
  let cur = goDig(g, first)
  if (cur.panel && digging(cur.story)) cur = press(cur, 'close')
  let last = first
  if (digging(cur.story)) {
    const right = cur.story.owenCache!
    cur = goDig(cur, right, first)
    last = right
  }
  if (!found(cur.story)) throw new Error(`the dig did not find the bundle at ${cur.story.scene}`)
  const asked = interact(backToJake(cur, last))
  return press(asked, `note:${HOME_NOTE}`)
}
