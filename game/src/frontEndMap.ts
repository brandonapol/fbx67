import type { Place, State } from '../../text-game/src/types.ts'
import { initialState } from '../../text-game/src/state.ts'
import { goal, menu, place, send } from '../../text-game/src/story.ts'
import type { Game } from './prologue.ts'
import { spaces } from './levels.ts'
import type { Rect } from './downtown.ts'
import { FLOAT, PLAY, WATER_EDGE, avenues, buildings, streets } from './downtown.ts'
import type { Vec } from './world.ts'
import { distance, vec } from './world.ts'

// The pocket map (issue #303): Wade's folded street map of downtown, from docs/town-map.md through downtown.ts. It marks
// only the places the player has been, been near, or been pointed to, and where the player stands. The places come from
// the story's place(state); nothing here reads a gate. Pure: frontEndMapView.ts draws it.

// The map's name for each of the story's places. Places on the walkable map are drawn where they stand; the rest are
// listed in the margin with how to get there.
export const placeNames: Readonly<Record<Place, string>> = {
  silverPan: 'The Silver Pan',
  owensRoom: "Owen's boarding house",
  boardingHouse: "Owen's boarding house",
  floatDock: "The float dock (Curly's plane)",
  surveyCamp: 'The survey camp, up the river by plane',
  floodedStreet: 'The flooded streets',
  floodCabin: 'The cabin on the slough, by boat',
  helpTent: 'The help tent, south on Cushman past Fifth',
  landOffice: 'The land office',
  cityJail: 'The city jail',
  eielsonBarracks: 'Eielson AFB, 26 miles southeast',
  majorsOffice: "The Major's office, Eielson",
  squadronBuilding: 'The squadron building, Eielson',
  photoLab: 'The photo lab, Eielson',
  photoRecords: 'The photo lab records room, Eielson',
  baseHangar: 'The hangar, Eielson',
  lucysKitchen: "Lucy's kitchen",
  hotelBar: 'The hotel bar',
  communityHall: 'The community hall, edge of town',
  nlCafe: 'Northern Lights Café',
  bushStrip: 'Phillips Field, north across the river',
  richardsonHighway: 'The Richardson Highway, toward the base',
  crashSite: 'The wreck',
  searchRidge: 'The search ridge',
  hospital: "St. Joseph's Hospital, north bank",
  hospitalLot: "St. Joseph's parking lot, north bank",
  tolliversHouse: "Tolliver's house",
  tolliversOffice: "Tolliver's office",
  tolliversCabin: "Tolliver's cabin, out the road",
  troopersPost: 'The State Troopers',
}

export type Spot = Readonly<{ id: string; name: string; rect: Rect; door: Vec; places: readonly Place[] }>

const center = (r: Rect): Vec => vec((r[0] + r[1]) / 2, (r[2] + r[3]) / 2)

// Every named building, and the float dock, with the story places inside it.
export const spots: readonly Spot[] = [
  ...buildings.map((b) => ({
    id: b.id,
    name: b.name,
    rect: b.rect,
    door: b.door ?? center(b.rect),
    places: b.place === 'owensRoom' ? (['owensRoom', 'boardingHouse'] as const) : b.place ? [b.place] : [],
  })),
  { id: 'floatDock', name: placeNames.floatDock, rect: FLOAT, door: center(FLOAT), places: ['floatDock'] },
]

const spotOf = (p: Place): Spot | undefined => spots.find((s) => s.places.includes(p))

// How close the player must pass to a building's door, downtown, for it to go on the map.
export const SEEN_WITHIN = 14

export const seenAt = (seen: readonly string[], g: Game): readonly string[] => {
  if (g.space !== 'downtown') return seen
  const near = spots.filter((s) => !seen.includes(s.id) && distance(s.door, g.pos) <= SEEN_WITHIN).map((s) => s.id)
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
  if (g.space === 'downtown') return { at: g.pos, facing: g.facing }
  const p = spaces[g.space].place ?? place(g.story)
  return p ? { place: p } : undefined
}

export type Marked = Readonly<{ id: string; name: string; rect: Rect; known: boolean; here: boolean; next: boolean }>

export type Margin = Readonly<{ name: string; here: boolean; next: boolean }>

export type PocketMap = Readonly<{
  goal?: string
  spots: readonly Marked[]
  margin: readonly Margin[]
  you?: Readonly<{ at: Vec; facing: number }>
  streets: readonly Readonly<{ name: string; rect: Rect }>[]
  play: Rect
  water: number
}>

export const pocketMap = (g: Game, seen: readonly string[]): PocketMap => {
  const been = visited(g.path)
  const next = ahead(g.story)
  const here = hereOf(g)
  const herePlace = here && 'place' in here ? here.place : undefined
  const marked = spots.map((s) => {
    const has = (ps: readonly Place[]) => s.places.some((p) => ps.includes(p))
    const isNext = has(next)
    const isHere = herePlace !== undefined && s.places.includes(herePlace)
    return { id: s.id, name: s.name, rect: s.rect, known: isNext || isHere || has(been) || seen.includes(s.id), here: isHere, next: isNext }
  })
  const offMap = [...new Set([...been, ...next, ...(herePlace ? [herePlace] : [])])].filter((p) => !spotOf(p))
  const margin = [...new Set(offMap.map((p) => placeNames[p]))].map((name) => ({
    name,
    here: herePlace !== undefined && placeNames[herePlace] === name,
    next: next.some((p) => placeNames[p] === name),
  }))
  return {
    goal: goal(g.story),
    spots: marked,
    margin,
    you: here && 'at' in here ? here : undefined,
    streets: [
      ...avenues.map((a) => ({ name: a.name, rect: [a.x[0], a.x[1], a.road[0], a.road[1]] as Rect })),
      ...streets.map((s) => ({ name: s.name, rect: [s.road[0], s.road[1], s.z[0], s.z[1]] as Rect })),
    ],
    play: PLAY,
    water: WATER_EDGE,
  }
}
