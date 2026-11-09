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
  start: SceneId
  end: SceneId
  endings: readonly MissionEnding[]
}>

// The note's menu as docs/story-api.md writes it: "Title. Detail: a / b. Detail: c / d".
export const missionMenu = (m: Mission): string => [m.title, ...m.details.map((d) => `${d.name}: ${d.labels.join(' / ')}`)].join('. ')

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
// caught prompt and its clean and red-handed notes land the same; shove and rack land the same until the move carries
// state (#205).
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

export const missions: readonly Mission[] = [searchForEli, theBody, theBarfight]
