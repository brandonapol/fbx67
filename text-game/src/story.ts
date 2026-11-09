import type { Act, Clock, Place, State } from './types.ts'
import { choicesOf, follow, sceneOf } from './engine.ts'
import { HEAT_LIMIT } from './logic.ts'
import { BOUNDS } from './state.ts'
import { missions, type Mission } from './missions.ts'

export type Weather = 'clear' | 'dusk' | 'night'

export type Option = Readonly<{ n: number; note: string; label: string }>

export type Menu = Readonly<{
  scene: State['scene']
  act: Act
  title: string
  text: string
  options: readonly Option[]
}>

export const noteOf = (n: number, note: string | undefined): string => note ?? `option${n}`

export const menu = (s: State): Menu => {
  const sc = sceneOf(s)
  return {
    scene: sc.id,
    act: sc.act,
    title: sc.title,
    text: sc.text(s).trim(),
    options: sc.choices(s).map((c, i) => ({ n: i + 1, note: noteOf(i + 1, c.note), label: c.label })),
  }
}

export const offers = (s: State, note: string): boolean => menu(s).options.some((o) => o.note === note)

export const send = (s: State, note: string): State => {
  const option = menu(s).options.find((o) => o.note === note)
  if (!option) throw new Error(`Scene ${s.scene} does not accept note ${note} (${menu(s).options.map((o) => o.note).join(', ')})`)
  return follow(s, choicesOf(s), option.n)
}

// The mission that starts at this scene, if any: its note's menu for the engine (Rules 1 and 2).
export const mission = (s: State): Mission | undefined => missions.find((m) => m.start === s.scene)

const reach = (s: State, note: string): State => {
  if (offers(s, note)) return send(s, note)
  const { options } = menu(s)
  if (options.length !== 1) throw new Error(`Scene ${s.scene} does not offer ${note} (${options.map((o) => o.note).join(', ')})`)
  return reach(send(s, options[0].note), note)
}

// Applies a mission's ending note from its start scene: the ending's choices in order, following the single-option
// beats between them, and lands on the mission's end scene.
export const sendMission = (s: State, note: string): State => {
  const m = mission(s)
  if (!m) throw new Error(`No mission starts at ${s.scene}`)
  const ending = m.endings.find((e) => e.note === note)
  if (!ending) throw new Error(`Mission ${m.id} does not accept note ${note} (${m.endings.map((e) => e.note).join(', ')})`)
  const out = ending.applies.reduce(reach, s)
  if (out.scene !== m.end) throw new Error(`Mission ${m.id} note ${note} ends at ${out.scene}, not ${m.end}`)
  return out
}

export const weather = (s: State): Weather =>
  s.heat > HEAT_LIMIT || s.eliTrust <= BOUNDS.eliTrust[0]
    ? 'night'
    : s.heat >= HEAT_LIMIT - 1 || s.eliTrust < 0
      ? 'dusk'
      : 'clear'

export const place = (s: State): Place | undefined => sceneOf(s).place

export const clock = (s: State): Clock | undefined => sceneOf(s).clock

export const goal = (s: State): string | undefined => sceneOf(s).goal

export { boughtRound, notebook, oneHanded, pov, season } from './queries.ts'
export type { NotebookEntry, Pov, Season } from './queries.ts'
export type { Mission, MissionEnding } from './missions.ts'
