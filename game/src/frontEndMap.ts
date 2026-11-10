import type { Place, State } from '../../text-game/src/types.ts'
import { initialState } from '../../text-game/src/state.ts'
import { goal, menu, place, send } from '../../text-game/src/story.ts'
import type { Game } from './prologue.ts'
import { spaces } from './levels.ts'
import type { Rect } from './downtown.ts'
import type { Chart, Spot } from './pocketMapCharts.ts'
import { baseChart, chartOf, placeNames, spotOn, townChart } from './pocketMapCharts.ts'
import type { Vec } from './world.ts'
import { distance } from './world.ts'

// The pocket map (issue #303): Wade's folded street map, the downtown sheet off docs/town-map.md and, at Eielson, the
// base sheet off docs/base-map.md (pocketMapCharts.ts). It marks only the places the player has been, been near, or
// been pointed to, and where the player stands. The places come from the story's place(state); nothing here reads a
// gate. Pure: frontEndMapView.ts draws it.

export { placeNames } from './pocketMapCharts.ts'
export type { Spot } from './pocketMapCharts.ts'

// The town sheet's buildings, and the float dock, with the story places inside each.
export const spots: readonly Spot[] = townChart.spots

// How close the player must pass to a building's door, downtown or on the base, for it to go on the map.
export const SEEN_WITHIN = 14

// The sheet a walkable space is drawn on.
export const walkedChart = (g: Game): Chart | undefined => (g.space === 'downtown' ? townChart : g.space === 'eielson' ? baseChart : undefined)

export const seenAt = (seen: readonly string[], g: Game): readonly string[] => {
  const c = walkedChart(g)
  if (!c) return seen
  const near = c.spots.filter((s) => !seen.includes(s.id) && distance(s.door, g.pos) <= SEEN_WITHIN).map((s) => s.id)
  return near.length ? [...seen, ...near] : seen
}

// The places of the scenes the path went through, the one now among them.
export const visited = (path: readonly number[]): readonly Place[] => {
  const walk = (s: State, i: number, out: readonly Place[]): readonly Place[] => {
    const p = place(s)
    const next = p && !out.includes(p) ? [...out, p] : out
    const o = i < path.length ? menu(s).options.find((x) => x.n === path[i]) : undefined
    return o ? walk(send(s, o.note), i + 1, next) : next
  }
  return walk(initialState, 0, [])
}

// Where the story points next: the places of the scenes the current menu leads to, other than the one the player is in.
export const ahead = (s: State): readonly Place[] => {
  const here = place(s)
  return [...new Set(menu(s).options.flatMap((o) => place(send(s, o.note)) ?? []))].filter((p) => p !== here)
}

// Where the player is on the map: their own position downtown, or the place of the space they are in.
export type Here = Readonly<{ at: Vec; facing: number }> | Readonly<{ place: Place }> | undefined

export const hereOf = (g: Game): Here => {
  if (walkedChart(g)) return { at: g.pos, facing: g.facing }
  const p = spaces[g.space].place ?? place(g.story)
  return p ? { place: p } : undefined
}

export type Marked = Readonly<{ id: string; name: string; rect: Rect; known: boolean; here: boolean; next: boolean }>

export type Margin = Readonly<{ name: string; here: boolean; next: boolean }>

export type PocketMap = Readonly<{
  title: string
  goal?: string
  spots: readonly Marked[]
  margin: readonly Margin[]
  you?: Readonly<{ at: Vec; facing: number }>
  streets: readonly Readonly<{ name: string; rect: Rect }>[]
  play: Rect
  water?: number
}>

// The sheet unfolded: the one the player walks, else the one the place they are at is drawn on, else downtown.
export const chartFor = (g: Game): Chart => {
  const here = hereOf(g)
  return walkedChart(g) ?? (here && 'place' in here ? chartOf(here.place) : undefined) ?? townChart
}

export const pocketMap = (g: Game, seen: readonly string[]): PocketMap => {
  const been = visited(g.path)
  const next = ahead(g.story)
  const here = hereOf(g)
  const herePlace = here && 'place' in here ? here.place : undefined
  const chart = chartFor(g)
  const marked = chart.spots.map((s) => {
    const has = (ps: readonly Place[]) => s.places.some((p) => ps.includes(p))
    const isNext = has(next)
    const isHere = herePlace !== undefined && s.places.includes(herePlace)
    return { id: s.id, name: s.name, rect: s.rect, known: isNext || isHere || has(been) || seen.includes(s.id), here: isHere, next: isNext }
  })
  const offMap = [...new Set([...been, ...next, ...(herePlace ? [herePlace] : [])])].filter((p) => !spotOn(chart, p))
  const margin = [...new Set(offMap.map((p) => placeNames[p]))].map((name) => ({
    name,
    here: herePlace !== undefined && placeNames[herePlace] === name,
    next: next.some((p) => placeNames[p] === name),
  }))
  return {
    title: chart.title,
    goal: goal(g.story),
    spots: marked,
    margin,
    you: here && 'at' in here ? here : undefined,
    streets: chart.ways.map((w) => ({ name: w.name, rect: w.road })),
    play: chart.play,
    ...(chart.water === undefined ? {} : { water: chart.water }),
  }
}
