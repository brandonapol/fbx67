import type { Act, Clock, Place, State } from './types.ts'
import { choicesOf, follow, sceneOf } from './engine.ts'
import { HEAT_LIMIT } from './logic.ts'
import { BOUNDS } from './state.ts'

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

export const weather = (s: State): Weather =>
  s.heat > HEAT_LIMIT || s.eliTrust <= BOUNDS.eliTrust[0]
    ? 'night'
    : s.heat >= HEAT_LIMIT - 1 || s.eliTrust < 0
      ? 'dusk'
      : 'clear'

export const place = (s: State): Place | undefined => sceneOf(s).place

export const clock = (s: State): Clock | undefined => sceneOf(s).clock

export const goal = (s: State): string | undefined => sceneOf(s).goal
