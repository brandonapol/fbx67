import type { SceneId, State } from '../../text-game/src/types.ts'
import { sceneIndex } from '../../text-game/src/sceneIds.ts'
import { missions } from '../../text-game/src/missions.ts'
import { place } from '../../text-game/src/story.ts'
import type { Figure, Prop, Space } from './levels.ts'
import { CENTER, SIZE, pieces } from './downtown.ts'
import { standing } from './freezeup.ts'
import { streetWater } from './highwater.ts'
import type { Interactable } from './world.ts'
import { vec } from './world.ts'
import { TENT_WAY, before } from './trail.ts'

// Act 1 opens on the flooded town: the same July downtown under the August water as the prologue's last night
// (highwater.ts), the morning after, and Wade wades it. The sandbag line runs across Cushman just south of Second,
// thigh-deep, from the Federal Building's wall to a gap at the east curb where he can step off the end; the sergeant
// stands behind it, the airmen pass bags along it, and the woman from Minto has stopped at Wade. The search for Eli
// (docs/acts/act1-missions.md, section 1) walks from there: north to the Ptarmigan's corner, east along Second toward
// Lacey, back and up Cushman to a porch short of Third, the corner of Third, up to the help tent past Fifth and back,
// and Fifth. Depth follows docs/town-map.md through depthAt; wading slows Wade above the knee (trail.ts).
//
// Who stands where comes from the story's scenes: each townsperson stands from the scene that brings them on, and
// each scene's menu opens at its stop (STOPS). The scenes' menus still show as panels there; nothing here decides
// what anyone says or what a choice does.

export const LINE_Z = 64.8
const BAGS_EAST = 5.0

export const LINE_SPAWN = vec(3.4, 66.3)
export const WOMAN_AT = vec(4.1, 65.6)
export const SERGEANT_AT = vec(-2.6, 68.6)
export const LINE_LAMP = vec(-6.5, 69)
export const LAMP_HEAD = 4

const MATTRESS_AT = vec(6.2, 46.4)
const WINDOW_AT = vec(68, 63.4)
export const PORCH_AT = vec(6.0, 93.5)
const THIRD_BOAT = vec(-1.6, 104)
const BOY_AT = vec(10.5, 104.5)
const FIFTH_BOAT = vec(-1.8, 137)

const bags = '#8a7a5a'
const hull = '#6a6e64'
const boards = '#7a6248'

const person = (x: number, z: number, y: number, coat: string, h = 1.7): readonly Prop[] => [
  { box: { x, z, w: 0.45, d: 0.4 }, h: h * 0.62, y, color: coat, shape: 'cylinder' },
  { box: { x, z, w: 0.24, d: 0.26 }, h: 0.28, y: y + h * 0.66, color: '#d2a684' },
]

const props: readonly Prop[] = [
  // The sandbag line, two courses high, and the streetlight by the Federal Building.
  { box: { x: (-7 + BAGS_EAST) / 2, z: LINE_Z, w: BAGS_EAST + 7, d: 0.7 }, h: 0.6, color: bags, solid: true },
  { box: { x: (-7 + BAGS_EAST) / 2, z: LINE_Z, w: BAGS_EAST + 6.6, d: 0.5 }, h: 0.25, y: 0.6, color: '#9a8a68', solid: true },
  { box: { x: -5.2, z: LINE_Z + 1.6, w: 1.8, d: 1.2 }, h: 0.7, color: bags },
  { box: { x: LINE_LAMP.x, z: LINE_LAMP.z, w: 0.3, d: 0.3 }, h: LAMP_HEAD, color: '#3a3a3a' },
  { box: { x: LINE_LAMP.x, z: LINE_LAMP.z, w: 0.5, d: 0.3 }, h: 0.3, y: LAMP_HEAD, color: '#ffd28a', glow: true },
  // The porch roof at the Ptarmigan's corner, where the mattress goes, with the mattress on it.
  { box: { x: 7.7, z: 45.4, w: 1.4, d: 3.2 }, h: 0.15, y: 2.6, color: '#5e4a36' },
  { box: { x: 7.8, z: 45.4, w: 0.9, d: 1.9 }, h: 0.18, y: 2.75, color: '#c9c0a8' },
  // The upstairs window on Second toward Lacey, lit, the woman in it, and her cups on a string.
  { box: { x: WINDOW_AT.x, z: 63.95, w: 1.2, d: 0.1 }, h: 1.0, y: 3.3, color: '#ffd9a0', glow: true },
  ...person(WINDOW_AT.x, 63.7, 3.1, '#8a4a4a', 1.3),
  { box: { x: WINDOW_AT.x + 0.3, z: 63.4, w: 0.02, d: 0.02 }, h: 2.3, y: 1.0, color: '#d8d0bc' },
  { box: { x: WINDOW_AT.x + 0.3, z: 63.4, w: 0.18, d: 0.18 }, h: 0.22, y: 0.8, color: '#efe6cf', shape: 'cylinder' },
  // The porch short of Third, its top step just clear of the water.
  { box: { x: 6.33, z: PORCH_AT.z, w: 1.45, d: 2.6 }, h: 0.34, color: boards, solid: true },
  { box: { x: 5.4, z: PORCH_AT.z, w: 0.5, d: 2.2 }, h: 0.17, color: boards },
  // Eli's riverboat at the corner of Third: a long flat-bottomed freighter, low with somebody's furniture.
  { box: { x: THIRD_BOAT.x, z: THIRD_BOAT.z, w: 1.9, d: 6.4 }, h: 0.5, color: hull, solid: true },
  { box: { x: THIRD_BOAT.x, z: THIRD_BOAT.z - 1.6, w: 1.0, d: 0.6 }, h: 0.9, y: 0.5, color: '#5a3f2a' },
  { box: { x: THIRD_BOAT.x, z: THIRD_BOAT.z + 3.3, w: 0.3, d: 0.35 }, h: 0.5, y: 0.35, color: '#3a3c3e' },
  // The boy's skiff on Third, east of the corner.
  { box: { x: BOY_AT.x, z: BOY_AT.z, w: 3.6, d: 1.3 }, h: 0.4, color: '#8a8a7e', solid: true },
  // Fifth, at the south end of Cushman: the riverboat under the roof where a family waves a sheet.
  { box: { x: FIFTH_BOAT.x, z: FIFTH_BOAT.z, w: 1.9, d: 5.0 }, h: 0.5, color: hull, solid: true },
  { box: { x: FIFTH_BOAT.x, z: FIFTH_BOAT.z + 2.6, w: 0.3, d: 0.35 }, h: 0.5, y: 0.35, color: '#3a3c3e' },
  ...person(-9.6, 136.4, 3.5, '#5a6578'),
  ...person(-10.6, 137.2, 3.5, '#8a7a5c', 1.5),
  ...person(-11.4, 136.6, 3.5, '#c9a73a', 1.0),
  { box: { x: -8.6, z: 135.6, w: 1.3, d: 0.05 }, h: 1.0, y: 4.2, color: '#ece8dc' },
  // The way up to the help tent: the street rising out of the water past Fifth.
  { box: { x: TENT_WAY.x, z: 139.6, w: 6, d: 0.8 }, h: 0.05, y: 0.33, color: '#6a5f4a', flat: true },
]

const airman = { coat: '#56603f', skin: '#d8ad88', hair: '#4a3626', height: 1.78 } as const
const townsman = { skin: '#d8ad88', hair: '#4a3626', height: 1.75 } as const

// The search, from the story's mission data: it runs to the mission's end scene, where no one is left on the street.
const search = missions.find((m) => m.id === 'searchForEli')
if (!search) throw new Error('no searchForEli mission')

// Who comes onto the street in each scene and stays there through the search; who is gone from it by a scene; and
// where Eli's riverboat is, by the scene that finds it. He stays at the boat through the scene right after (the
// message), wherever Wade caught up with him.
const arrives: Readonly<Partial<Record<SceneId, readonly string[]>>> = {
  a1_flood: ['woman'],
  a1_track: ['mattressMan'],
  a1_couple: ['oldMan', 'oldWoman'],
  a1_trail: ['boy'],
}
const leaves: Readonly<Partial<Record<SceneId, readonly string[]>>> = { a1_line: ['woman'] }
const boats: Readonly<Partial<Record<SceneId, string>>> = { a1_eli: 'eliThird', a1_trail: 'eliFifth' }

const sceneWhere = (table: Readonly<Partial<Record<SceneId, string | readonly string[]>>>, id: string): SceneId | undefined =>
  (Object.entries(table) as [SceneId, string | readonly string[]][]).find(([, who]) => who === id || (Array.isArray(who) && who.includes(id)))?.[0]

const at = (s: State, from: SceneId | undefined, until: SceneId): boolean =>
  from !== undefined && sceneIndex(s.scene) >= sceneIndex(from) && sceneIndex(s.scene) < sceneIndex(until)

// Whether a townsperson of the search stands on the street at this state of the story (path: the choices that led
// there, for where Eli was found).
export const onStreet = (id: string, s: State, path?: readonly number[]): boolean => {
  if (Object.values(boats).includes(id)) {
    const prior = path === undefined ? undefined : before(path)
    return boats[s.scene] === id || (prior !== undefined && boats[prior.scene] === id)
  }
  return at(s, sceneWhere(arrives, id), sceneWhere(leaves, id) ?? search.end)
}

const townsperson = (f: Figure): Figure => ({ ...f, when: (s, path) => onStreet(f.id, s, path) })

const figures: readonly Figure[] = [
  townsperson({ id: 'woman', at: WOMAN_AT, facing: -Math.PI / 4, coat: '#3d4038', skin: '#a8754f', hair: '#1e1a17', height: 1.6 }),
  { id: 'sergeant', at: SERGEANT_AT, facing: -Math.PI / 2, ...airman, coat: '#4a5236', height: 1.8 },
  { id: 'airman1', at: vec(-0.6, 65.6), facing: Math.PI / 2, ...airman },
  { id: 'airman2', at: vec(-2.1, 65.6), facing: Math.PI / 2, ...airman, hair: '#7a5a34' },
  { id: 'airman3', at: vec(-3.6, 65.6), facing: Math.PI / 2, ...airman, skin: '#8a5d3d', hair: '#1c1a18' },
  townsperson({ id: 'mattressMan', at: MATTRESS_AT, facing: -0.44, ...townsman, coat: '#5a5048' }),
  townsperson({ id: 'oldMan', at: vec(6.5, 93.0), facing: -Math.PI / 2, coat: '#4e4a42', skin: '#e0b48f', hair: '#bdb8ae', height: 1.25, activity: 'sit' }),
  townsperson({ id: 'oldWoman', at: vec(6.5, 94.0), facing: -Math.PI / 2, coat: '#6a4a5a', skin: '#e2b994', hair: '#c8c2b8', height: 1.15, activity: 'sit' }),
  townsperson({ id: 'eliThird', at: vec(THIRD_BOAT.x, THIRD_BOAT.z + 2.6), facing: Math.PI, coat: '#4a4f3a', skin: '#a8754f', hair: '#1e1a17', height: 1.76 }),
  townsperson({ id: 'boy', at: BOY_AT, facing: -Math.PI / 2, coat: '#c9a73a', skin: '#dcb08a', hair: '#7a5a34', height: 1.3 }),
  townsperson({ id: 'eliFifth', at: vec(FIFTH_BOAT.x, FIFTH_BOAT.z + 1.9), facing: Math.PI, coat: '#4a4f3a', skin: '#a8754f', hair: '#1e1a17', height: 1.76 }),
]

export type StopId = 'woman' | 'mattress' | 'window' | 'porch' | 'boat' | 'fifth' | 'sergeant'

// Where each scene of the search opens its menu: at whoever the scene has Wade talk to. A scene with no stop (the
// message, when Wade has just caught up with Eli) opens where he stands.
export const STOPS: Readonly<Partial<Record<SceneId, StopId>>> = {
  a1_flood: 'woman',
  a1_track: 'mattress',
  a1_track_2: 'window',
  a1_couple: 'porch',
  a1_eli: 'boat',
  a1_trail: 'fifth',
  a1_line: 'sergeant',
}

const spots: readonly Interactable[] = [
  { id: 'woman', x: WOMAN_AT.x, z: WOMAN_AT.z, r: 1.9, prompt: 'Hear her out' },
  { id: 'mattress', x: MATTRESS_AT.x, z: MATTRESS_AT.z, r: 1.9, prompt: 'Ask about Eli' },
  { id: 'window', x: WINDOW_AT.x, z: WINDOW_AT.z, r: 1.6, prompt: 'Call up to the window' },
  { id: 'porch', x: PORCH_AT.x, z: PORCH_AT.z, r: 1.9, prompt: 'Ask the couple on the porch' },
  { id: 'boat', x: THIRD_BOAT.x + 1.1, z: THIRD_BOAT.z, r: 1.9, prompt: 'Catch the gunwale' },
  { id: 'fifth', x: FIFTH_BOAT.x + 1.1, z: FIFTH_BOAT.z, r: 1.9, prompt: 'Wade up to the riverboat' },
  { id: 'sergeant', x: SERGEANT_AT.x, z: SERGEANT_AT.z, r: 1.9, prompt: 'Report to the sergeant' },
  { id: 'tent', x: TENT_WAY.x, z: TENT_WAY.z, r: 1.4, prompt: 'Go up to the help tent' },
]

// A spot is live when the story is at its scene; the way up to the tent, while the story is at the tent and Wade is
// still in the street.
export const searchSpot = (s: State, id: string): boolean => (id === 'tent' ? place(s) === 'helpTent' : STOPS[s.scene] === id)

export const line: Space = {
  id: 'line',
  act: 'Act 1: Flood',
  place: 'floodedStreet',
  name: 'The flooded town',
  interior: false,
  size: SIZE,
  center: CENTER,
  ground: '#4a4234',
  spawn: LINE_SPAWN,
  props: [...pieces, ...standing, ...streetWater, ...props],
  figures,
  spots,
}
