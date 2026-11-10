import type { Place } from '../../text-game/src/types.ts'
import type { Rect } from './downtown.ts'
import { FLOAT, PLAY as TOWN, WATER_EDGE, avenues, buildings, streets } from './downtown.ts'
import { DORM, HANGAR, LAB, PLAY as BASE, SQUADRON, doors as baseDoors } from './eielson.ts'
import type { Vec } from './world.ts'
import { vec } from './world.ts'

// The two sheets of Wade's pocket map (issue #303): downtown Fairbanks off docs/town-map.md, and Eielson off
// docs/base-map.md. A chart is data only: its named ways, its buildings with the story places inside them, and its
// edges. The pocket map (frontEndMap.ts), the street signs (streetSigns.ts) and the directions people give
// (directions.ts) all read the same chart, so what a sign says, what the map shows and what a stranger tells Wade agree.

// The map's name for each of the story's places. Places on a chart are drawn where they stand; the rest are listed in
// the margin with how to get there.
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

// A named way: an avenue runs east-west, a street north-south. `row` is its right of way, `road` its roadway.
export type Way = Readonly<{ name: string; short: string; runs: 'ew' | 'ns'; row: Rect; road: Rect }>

export type Spot = Readonly<{ id: string; name: string; rect: Rect; door: Vec; places: readonly Place[] }>

export type ChartId = 'town' | 'base'

export type Chart = Readonly<{ id: ChartId; title: string; play: Rect; water?: number; ways: readonly Way[]; spots: readonly Spot[] }>

const center = (r: Rect): Vec => vec((r[0] + r[1]) / 2, (r[2] + r[3]) / 2)

const shortOf = (name: string): string => name.replace(/ (Avenue|Street|Road)$/, '')

export const townChart: Chart = {
  id: 'town',
  title: 'Downtown Fairbanks',
  play: TOWN,
  water: WATER_EDGE,
  ways: [
    ...avenues.map((a): Way => ({ name: a.name, short: shortOf(a.name), runs: 'ew', row: [a.x[0], a.x[1], a.row[0], a.row[1]], road: [a.x[0], a.x[1], a.road[0], a.road[1]] })),
    ...streets.map((s): Way => ({ name: s.name, short: shortOf(s.name), runs: 'ns', row: [s.row[0], s.row[1], s.z[0], s.z[1]], road: [s.road[0], s.road[1], s.z[0], s.z[1]] })),
  ],
  spots: [
    ...buildings.map((b) => ({
      id: b.id,
      name: b.name,
      rect: b.rect,
      door: b.door ?? center(b.rect),
      places: b.place === 'owensRoom' ? (['owensRoom', 'boardingHouse'] as const) : b.place ? [b.place] : [],
    })),
    { id: 'floatDock', name: placeNames.floatDock, rect: FLOAT, door: center(FLOAT), places: ['floatDock'] },
  ],
}

const baseDoor = (id: string): Vec => {
  const d = baseDoors.find((x) => x.id === id)
  if (!d) throw new Error(`no base door ${id}`)
  return d.at
}

// Eielson's ways and buildings, from the base map's street and places tables. The rectangles are eielson.ts's own
// where it exports them; the rest are the base map's.
export const baseChart: Chart = {
  id: 'base',
  title: 'Eielson Air Force Base',
  play: BASE,
  ways: [
    { name: 'Gate road', short: 'the gate road', runs: 'ew', row: [BASE[0], 250, -7, 7], road: [BASE[0], 250, -5, 5] },
    { name: 'Dorm Street', short: 'Dorm Street', runs: 'ns', row: [104, 114, BASE[2], BASE[3]], road: [104, 114, BASE[2], BASE[3]] },
    { name: 'Flight Line Road', short: 'Flight Line Road', runs: 'ns', row: [240, 250, BASE[2], BASE[3]], road: [240, 250, BASE[2], BASE[3]] },
    { name: 'Munitions road', short: 'the munitions road', runs: 'ew', row: [250, 290, 96, 104], road: [250, 290, 96, 104] },
    { name: 'Service lane', short: 'the service lane', runs: 'ns', row: [190, 196, 8, 70], road: [190, 196, 8, 70] },
  ],
  spots: [
    { id: 'baseGate', name: 'The gate', rect: [-3, 3, -1.5, 1.5], door: vec(0, 0), places: [] },
    { id: 'passOffice', name: 'Pass office', rect: [-18, -6, 12, 22], door: vec(-12, 12), places: [] },
    { id: 'baseDorm', name: "Wade's dormitory", rect: DORM, door: baseDoor('dormFront'), places: ['eielsonBarracks'] },
    { id: 'diningHall', name: 'Dining hall', rect: [30, 90, 30, 60], door: vec(60, 30), places: [] },
    { id: 'baseSquadron', name: 'Squadron building', rect: SQUADRON, door: baseDoor('squadronFront'), places: ['squadronBuilding', 'majorsOffice'] },
    { id: 'baseLab', name: 'Photo lab', rect: LAB, door: baseDoor('labFront'), places: ['photoLab', 'photoRecords'] },
    { id: 'baseHangar', name: 'Hangar', rect: HANGAR, door: baseDoor('hangar'), places: ['baseHangar'] },
    { id: 'munitions', name: 'Munitions storage (fenced)', rect: [290, 340, 60, 140], door: vec(290, 100), places: [] },
  ],
}

export const charts: readonly Chart[] = [townChart, baseChart]

export const spotOn = (c: Chart, p: Place): Spot | undefined => c.spots.find((s) => s.places.includes(p))

// The chart a place is drawn on, if any.
export const chartOf = (p: Place): Chart | undefined => charts.find((c) => spotOn(c, p))
