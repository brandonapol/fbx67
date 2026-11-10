import type { SceneId } from './sceneIds.ts'

// A mission is a stretch of scenes the engine build plays as one piece and reports with one note (docs/story-api.md,
// Rules 1 and 2). Each ending lists the choice notes it applies, in order; single-option beats between them are
// followed on the way, so only the choices the spec names are written down.
export type MissionEnding = Readonly<{ note: string; label: string; applies: readonly string[] }>

// One detail of the note and the labels it can take, as the menu reads (docs/story-api.md, Rule 2 table).
export type MissionDetail = Readonly<{ name: string; labels: readonly string[] }>

export type Mission = Readonly<{
  id: string
  title: string
  details: readonly MissionDetail[]
  // An ending outside the details' combinations (refused, skipped), as the menu reads after "or".
  or?: string
  start: SceneId
  end: SceneId
  endings: readonly MissionEnding[]
}>

// The note's menu as docs/story-api.md writes it: "Title. Detail: a / b. Detail: c / d; or e".
export const missionMenu = (m: Mission): string =>
  [m.title, ...m.details.map((d) => `${d.name}: ${d.labels.join(' / ')}`)].join('. ') + (m.or ? `; or ${m.or}` : '')

// docs/acts/act1-missions.md, section 1.
const searchForEli: Mission = {
  id: 'searchForEli',
  title: 'Search for Eli',
  details: [{ name: 'Errand', labels: ['ran it', 'skipped it'] }],
  start: 'a1_track',
  end: 'a1_body',
  endings: [
    { note: 'ranIt', label: 'ran it', applies: ['helpTent', 'envelope', 'waitBaby', 'wadeBack', 'passBags'] },
    { note: 'skippedIt', label: 'skipped it', applies: ['sendSomebody', 'tellEli', 'wadeBack', 'passBags'] },
  ],
}

// docs/acts/act1-missions.md, section 2. Both paths reach a1_body; only the choice moves trust.
const theBody: Mission = {
  id: 'theBody',
  title: 'The body',
  details: [{ name: 'Knot', labels: ['pointed it out', 'cut it silently'] }],
  start: 'a1_body',
  end: 'a1_ruling',
  endings: [
    { note: 'pointedItOut', label: 'pointed it out', applies: ['pointOutKnot', 'liftBody'] },
    { note: 'cutItSilently', label: 'cut it silently', applies: ['cutKnot'] },
  ],
}

type Pick = Readonly<{ note: string; label: string; choice?: string }>
type Detail = Readonly<{ name: string; picks: readonly Pick[] }>

const opened: Detail = { name: 'Opened', picks: [{ note: 'gotUp', label: 'got up' }, { note: 'stayedSeated', label: 'stayed seated', choice: 'stayInSeat' }] }
const move: Detail = {
  name: 'Move',
  picks: [
    { note: 'shove', label: 'shove', choice: 'shove' },
    { note: 'rack', label: 'rack', choice: 'mooseRack' },
    { note: 'bottle', label: 'bottle', choice: 'bottle' },
  ],
}
const stood: Detail = { name: 'Stood with Eli', picks: [{ note: 'stoodWithEli', label: 'yes', choice: 'stoodWithEli' }, { note: 'leftEli', label: 'no', choice: 'leftEli' }] }
const caught: Detail = { name: 'Caught', picks: [{ note: 'clean', label: 'clean', choice: 'clean' }, { note: 'redHanded', label: 'red-handed', choice: 'redHanded' }] }

// docs/acts/act1-missions.md, section 3. Every combination of the four details is a note, opened.move.stood.caught,
// and applies the scene choices in play order: stayInSeat if seated (Curly drags Wade in to the same moves), the move,
// the caught prompt, then where Wade stood. A bottle already carries the fight's one point of heat, so it skips the
// caught prompt and its clean and red-handed notes land the same. Got up, the move is recorded in barfightMove (#205);
// stayed seated, the bartender remembers the stool instead, so a seated shove and a seated rack land the same.
const barfightEndings: readonly MissionEnding[] = opened.picks.flatMap((o) =>
  move.picks.flatMap((m) =>
    stood.picks.flatMap((st) =>
      caught.picks.map((c) => ({
        note: [o, m, st, c].map((p) => p.note).join('.'),
        label: [o, m, st, c].map((p) => p.label).join(', '),
        applies: [o, m, ...(m.note === 'bottle' ? [] : [c]), st].flatMap((p) => (p.choice ? [p.choice] : [])),
      })),
    ),
  ),
)

const theBarfight: Mission = {
  id: 'theBarfight',
  title: 'The barfight',
  details: [opened, move, stood, caught].map((d) => ({ name: d.name, labels: d.picks.map((p) => p.label) })),
  start: 'a1_barfight',
  end: 'a1_tank',
  endings: barfightEndings,
}

// Every combination of two two-way details, as notes a.b with labels "a, b", applying each pick's choice in order.
const combos = (first: Detail, second: Detail): readonly MissionEnding[] =>
  first.picks.flatMap((a) =>
    second.picks.map((b) => ({
      note: `${a.note}.${b.note}`,
      label: `${a.label}, ${b.label}`,
      applies: [a, b].flatMap((p) => (p.choice ? [p.choice] : [])),
    })),
  )

const wayIn: Detail = { name: 'Way in', picks: [{ note: 'lunch', label: 'lunch', choice: 'lunch' }, { note: 'key', label: 'key', choice: 'afterLockup' }] }
const drawers: Detail = {
  name: 'Drawers',
  picks: [
    { note: 'crossChecked', label: 'cross-checked', choice: 'crossCheck' },
    { note: 'pulledAll', label: 'pulled all', choice: 'pullAll' },
  ],
}

// docs/acts/act2-missions.md, section 1. The key's heat comes later, when it is missed (photoLab, keyMissed).
const thePhotoLab: Mission = {
  id: 'thePhotoLab',
  title: 'The photo lab',
  details: [wayIn, drawers].map((d) => ({ name: d.name, labels: d.picks.map((p) => p.label) })),
  or: 'refused',
  start: 'a2_photos',
  end: 'a2_hotel',
  endings: [...combos(wayIn, drawers), { note: 'refused', label: 'refused', applies: ['refuse'] }],
}

// docs/acts/act2-missions.md, section 2. How well Wade plays and how close he sits decide what he hears; the text
// build asks where he sits. Only hearing most of it gives the hotelTalk evidence.
const theHotelBar: Mission = {
  id: 'theHotelBar',
  title: 'The hotel bar',
  details: [{ name: 'Heard', labels: ['most', 'pieces'] }],
  or: 'skipped',
  start: 'a2_hotel',
  end: 'a2_chiefs',
  endings: [
    { note: 'heardMost', label: 'most', applies: ['guitar', 'sitClose', 'tellLucy'] },
    { note: 'heardPieces', label: 'pieces', applies: ['guitar', 'sitFar', 'tellLucy'] },
    { note: 'skipped', label: 'skipped', applies: ['skip'] },
  ],
}

const gotIn: Detail = { name: 'Got in', picks: [{ note: 'code', label: 'code', choice: 'combo' }, { note: 'forced', label: 'forced', choice: 'forced' }] }
const seen: Detail = { name: 'Seen', picks: [{ note: 'seen', label: 'yes', choice: 'goNow' }, { note: 'unseen', label: 'no', choice: 'getOut' }] }

// docs/acts/act2-missions.md, section 3. Each way in and getaway applies search, the way in, then the getaway; seen
// plays the duty desk's beat. Refused, Lucy goes in herself and is seen (lucyHeat).
const theMajorsCabinet: Mission = {
  id: 'theMajorsCabinet',
  title: 'The Major\'s cabinet',
  details: [gotIn, seen].map((d) => ({ name: d.name, labels: d.picks.map((p) => p.label) })),
  or: 'refused (Lucy goes herself)',
  start: 'a2_co_ask',
  end: 'a2_curly',
  endings: [
    ...combos(gotIn, seen).map((e) => ({ ...e, applies: ['search', ...e.applies, ...(e.applies.includes('goNow') ? ['continue'] : [])] })),
    { note: 'refused', label: 'refused', applies: ['refuse', 'continue'] },
  ],
}

// docs/acts/act3-missions.md, section 1. The note is the spot Lucy dug first. The story checks it against owenCache:
// a wrong spot plays a3_wrong_spot and its one dig before a3_found, then home. The wrong dig costs light and fingers inside the
// mission only, so all three notes land on the same state: the tapes, and owenCache cleared.
const lucysDig: Mission = {
  id: 'lucysDig',
  title: 'Lucy\'s dig',
  details: [{ name: 'First dig', labels: ['stove', 'cache', 'marker'] }],
  start: 'a3_camp',
  end: 'a3_crash',
  endings: ['stove', 'cache', 'marker'].map((spot) => ({ note: spot, label: spot, applies: [spot, 'home'] })),
}

export const missions: readonly Mission[] = [searchForEli, theBody, theBarfight, thePhotoLab, theHotelBar, theMajorsCabinet, lucysDig]
