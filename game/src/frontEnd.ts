import type { State } from '../../text-game/src/types.ts'
import { initialState } from '../../text-game/src/state.ts'
import { goal, menu, notebook, send } from '../../text-game/src/story.ts'
import { N } from '../../text-game/src/names.ts'
import { prologueTown } from '../../text-game/src/ambient/prologueTown.ts'
import { floodTown } from '../../text-game/src/ambient/floodTown.ts'
import type { Game } from './prologue.ts'
import { spaces } from './levels.ts'
import { spawnAt, yawOf } from './downtown.ts'
import { start } from './prologue.ts'
import { vec } from './world.ts'
import { castIds, clipIds } from './cast.ts'
import { replayPath } from './start.ts'

// The frame around the game (issue #51): title, loading, pause, the objective line and the journal. Pure: main.ts and
// frontEndView.ts draw it. Every line it shows comes from the story's queries (goal, menu titles, notebook) or from what
// the player was actually shown; nothing here reads a gate or copies scene text.

// What is on screen. Only 'play' runs the game's clock; the rest pause it.
export type Screen = 'title' | 'play' | 'pause' | 'journal' | 'map'

export const runs = (s: Screen): boolean => s === 'play'

// Esc from each screen: back one step, and from the pause menu back to the game. The title stays put.
export const back = (s: Screen): Screen => (s === 'title' ? 'title' : s === 'journal' || s === 'map' ? 'pause' : 'play')

// The first screen: a link that names a path, or the test harness, starts in the game; anything else on the title.
export const firstScreen = (hash: string, search: string): Screen => {
  const q = new URLSearchParams(search)
  return q.get('test') === '1' || q.has('from') || /^#path=/.test(hash) ? 'play' : 'title'
}

// --- The objective line: goal(state), shown when the scene's goal changes and on demand, then fades.

export const OBJECTIVE_TIME = 6

export type Objective = Readonly<{ scene: string; text?: string; until: number }>

export const objectiveFor = (o: Objective | undefined, story: State, now: number): Objective => {
  if (o?.scene === story.scene) return o
  const text = goal(story)
  const fresh = text !== undefined && text !== o?.text
  return { scene: story.scene, text, until: fresh ? now + OBJECTIVE_TIME : (o?.until ?? now) }
}

export const recall = (o: Objective, now: number): Objective => ({ ...o, until: now + OBJECTIVE_TIME })

export const objectiveShown = (o: Objective | undefined, now: number): string | undefined =>
  o?.text !== undefined && now < o.until ? o.text : undefined

// --- The journal: Owen's notebook (the scenes the player has been through, by their titles), the people he has spoken
// to, what he has overheard, and what he knows (notebook(state)).

export type Heard = Readonly<{ who: string; text: string }>

export type Log = Readonly<{ met: readonly string[]; heard: readonly Heard[] }>

export const emptyLog: Log = { met: [], heard: [] }

const capital = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)

export const meet = (log: Log, name: string): Log => (log.met.includes(capital(name)) ? log : { ...log, met: [...log.met, capital(name)] })

export const hear = (log: Log, lines: readonly Heard[]): Log => ({
  ...log,
  heard: [...log.heard, ...lines.filter((l) => !log.heard.some((h) => h.who === l.who && h.text === l.text))],
})

const named: Readonly<Record<string, string>> = N

const townNames: ReadonlyMap<string, string> = new Map([...floodTown, ...prologueTown].map((a) => [a.id, a.name] as const))

// A figure's name, from the story's names or its ambient cast; undefined for one the story never names.
export const nameOf = (id: string): string | undefined => named[id] ?? townNames.get(id)

// The person the player just interacted with, if the thing in front of him was one of the space's figures.
export const metAt = (log: Log, g: Game, id: string | undefined): Log => {
  const who = id && spaces[g.space].figures.some((f) => f.id === id) ? nameOf(id) : undefined
  return who ? meet(log, who) : log
}

// A talk panel (the landlady at the parlor door): the person, and each paragraph as heard, by "Name: line" where the
// panel names its speaker and from the person otherwise.
export const talkHeard = (log: Log, title: string, text: string): Log =>
  hear(
    meet(log, title),
    text
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => {
        const m = /^([^:]{1,60}): (.+)$/s.exec(p)
        return m ? { who: m[1], text: m[2] } : { who: capital(title), text: p }
      }),
  )

// The titles of the scenes the path went through, in order, without the one the player is in now.
export const storySoFar = (path: readonly number[]): readonly string[] => {
  const walk = (s: State, i: number, out: readonly string[]): readonly string[] => {
    if (i >= path.length) return out
    const m = menu(s)
    const o = m.options.find((x) => x.n === path[i])
    if (!o) return out
    return walk(send(s, o.note), i + 1, out.at(-1) === m.title ? out : [...out, m.title])
  }
  return walk(initialState, 0, [])
}

export type Journal = Readonly<{ sofar: readonly string[]; now: string; goal?: string; known: readonly string[]; met: readonly string[]; heard: readonly Heard[] }>

export const journal = (g: Game, log: Log): Journal => ({
  sofar: storySoFar(g.path),
  now: menu(g.story).title,
  goal: goal(g.story),
  known: notebook(g.story).map((e) => e.line),
  met: log.met,
  heard: log.heard,
})

// --- Saving: the path played so far, in the text build's format, kept per scene so Continue (and the text build)
// resume from the same point.

export const SAVE_KEY = 'second-rush.path'

export const savePath = (path: readonly number[]): string => path.join(',')

// A saved path Continue can start from: one the story still accepts, with at least one step.
export const savedPath = (raw: string | null): string | undefined =>
  raw !== null && /^\d+(,\d+)*$/.test(raw) && !('error' in replayPath(raw)) ? raw : undefined

// The journal's people and lines go with the save, kept for the path they were written at.
export const JOURNAL_KEY = 'second-rush.journal'

export const saveLog = (path: readonly number[], log: Log): string => JSON.stringify({ path: savePath(path), ...log })

const isHeard = (h: unknown): h is Heard =>
  typeof h === 'object' && h !== null && typeof (h as Heard).who === 'string' && typeof (h as Heard).text === 'string'

export const parseLog = (raw: string | null, path: string): Log => {
  try {
    const l = JSON.parse(raw ?? 'null') as { path?: unknown; met?: unknown; heard?: unknown } | null
    if (!l || l.path !== path || !Array.isArray(l.met) || !Array.isArray(l.heard)) return emptyLog
    return { met: l.met.filter((m): m is string => typeof m === 'string'), heard: l.heard.filter(isHeard) }
  } catch {
    return emptyLog
  }
}

// --- The title: Owen on Second Avenue under the midnight sun, the camera turning slowly around him. Shown, never played.

export const TITLE_TURN = 0.05

export const titleScene = (): Game => {
  const s = spawnAt('secondAve')
  const facing = yawOf(s.facing)
  return { ...start(), space: 'downtown', pos: vec(s.x, s.z), facing, view: facing }
}

// --- Settings the front end owns: text size and reduced motion. The controls (input.ts) and the volumes (mixer.ts)
// keep their own keys.

export const PREFS_KEY = 'second-rush.prefs'

export type TextSize = 'normal' | 'large'

// Reduced motion follows the system unless the player sets it.
export type Motion = 'system' | 'on' | 'off'

export type Prefs = Readonly<{ text: TextSize; motion: Motion }>

export const defaultPrefs: Prefs = { text: 'normal', motion: 'system' }

export const parsePrefs = (raw: string | null): Prefs => {
  try {
    const p = JSON.parse(raw ?? '{}') as Partial<Record<keyof Prefs, unknown>>
    return {
      text: p.text === 'large' ? 'large' : 'normal',
      motion: p.motion === 'on' || p.motion === 'off' ? p.motion : 'system',
    }
  } catch {
    return defaultPrefs
  }
}

export const reduced = (p: Prefs, system: boolean): boolean => (p.motion === 'system' ? system : p.motion === 'on')

// --- Loading: the cast streams in as one model and one file per clip each; the bar fills as those files arrive.

export const castFiles = castIds.length * (1 + clipIds.length)

export const loadShare = (done: number, total: number = castFiles): number => (total <= 0 ? 1 : Math.min(1, Math.max(0, done / total)))

export const isCastFile = (url: string): boolean => /\/characters\/.*\.glb(\?|$)/.test(url)

// The standard gamepad's Start and Back buttons: Start pauses, Back recalls the objective.
export const PAD_START = 9
export const PAD_BACK = 8
