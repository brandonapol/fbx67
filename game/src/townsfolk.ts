import type { Figure } from './levels.ts'
import type { Game } from './prologue.ts'
import { focus } from './prologue.ts'
import { lookOf, poses } from './ambient.ts'
import type { Target, Visit } from './talk.ts'
import { targets } from './talk.ts'
import { askWay } from './directions.ts'
import type { Interactable } from './world.ts'
import { pick } from './world.ts'

// The town's people on the street (issue #374): the ambient schedule (ambient.ts) places them downtown on the
// prologue's walks, the view stands them there, and the player can stop one and ask the way (directions.ts). The bar
// seats its own patrons (silverPan.ts); this is the street. Pure.

// The seed the live game places the town with, so the people the view draws are the people the player can ask.
export const TOWN_SEED = 1

// The spaces where the town stands on the street.
const STREETS: ReadonlySet<Game['space']> = new Set(['downtown'])

// How close the player stands to ask: the reach askWay takes.
export const ASK_REACH = 1.6

export const ASK_PROMPT = 'Ask the way'

// Everyone the schedule places in the player's space now, as figures the view can stand, in their own look.
export const townsfolk = (g: Game, seed = TOWN_SEED): readonly Figure[] =>
  STREETS.has(g.space)
    ? poses(g.story, seed, g.t)
        .filter((p) => p.space === g.space)
        .map((p) => ({ id: p.who, at: p.at, facing: p.yaw, activity: p.activity, ...lookOf(p.who) }))
    : []

// The townsperson the player would ask: one standing in the street in front of them, when nothing of the space's own
// (a door, a figure, the post box) is.
export const asker = (v: Visit): Target | undefined => {
  const g = v.game
  if (g.panel || focus(g)) return undefined
  const drawn = new Set(townsfolk(g, v.seed).map((f) => f.id))
  const folk = targets(v).filter((t) => drawn.has(t.id) && t.ambient.kind === 'person')
  const spots: readonly Interactable[] = folk.map((t) => ({ id: t.id, x: t.x, z: t.z, r: Math.max(t.r, ASK_REACH) }))
  const best = pick(g.pos, g.view, g.facing, spots)
  return folk.find((t) => t.id === best?.id)
}

// Ask whoever is in front of the player the way; with nobody there, nothing happens.
export const ask = (v: Visit): Visit => {
  const t = asker(v)
  return t ? askWay(v, t.id) : v
}
