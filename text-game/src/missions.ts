import type { SceneId } from './sceneIds.ts'

// A mission is a stretch of scenes the engine build plays as one piece and reports with one note (docs/story-api.md,
// Rules 1 and 2). Each ending lists the choice notes it applies, in order; single-option beats between them are
// followed on the way, so only the choices the spec names are written down.
export type MissionEnding = Readonly<{ note: string; label: string; applies: readonly string[] }>

export type Mission = Readonly<{
  id: string
  title: string
  detail: string
  start: SceneId
  end: SceneId
  endings: readonly MissionEnding[]
}>

// docs/acts/act1-missions.md, section 1.
const searchForEli: Mission = {
  id: 'searchForEli',
  title: 'Search for Eli',
  detail: 'Errand',
  start: 'a1_track',
  end: 'a1_body',
  endings: [
    { note: 'ranIt', label: 'ran it', applies: ['helpTent', 'envelope', 'waitBaby', 'wadeBack', 'passBags'] },
    { note: 'skippedIt', label: 'skipped it', applies: ['sendSomebody', 'tellEli', 'wadeBack', 'passBags'] },
  ],
}

export const missions: readonly Mission[] = [searchForEli]
