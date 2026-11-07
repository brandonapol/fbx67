import type { Choice, Scene, State } from './types.ts'
import { initialState } from './state.ts'
import { scenes } from './scenes/index.ts'

const byId: ReadonlyMap<string, Scene> = new Map(scenes.map((sc) => [sc.id, sc]))

export const sceneOf = (s: State): Scene => {
  const sc = byId.get(s.scene)
  if (!sc) throw new Error(`Unknown scene: ${s.scene}`)
  return sc
}

export const choicesOf = (s: State): readonly Choice[] => sceneOf(s).choices(s)

export const isEnd = (s: State): boolean => choicesOf(s).length === 0

export const choose = (s: State, n: number): State => {
  const cs = choicesOf(s)
  const c = cs[n - 1]
  if (!c) throw new Error(`Choice ${n} is not available in ${s.scene} (1-${cs.length})`)
  const applied = c.apply ? c.apply(s) : s
  const next = typeof c.next === 'string' ? c.next : c.next(applied)
  if (!byId.has(next)) throw new Error(`Scene ${s.scene} points to unknown scene ${next}`)
  return { ...applied, scene: next }
}

export const replay = (path: readonly number[]): readonly State[] =>
  path.reduce<State[]>((acc, n) => [...acc, choose(acc[acc.length - 1], n)], [initialState])

export const render = (s: State): string => {
  const sc = sceneOf(s)
  const header = `== ${sc.act} :: ${sc.title} ==`
  const cs = choicesOf(s)
  const options = cs.map((c, i) => `  ${i + 1}. ${c.label}`).join('\n')
  return [header, '', sc.text(s).trim(), '', cs.length ? options : '  [THE END]'].join('\n')
}

export const allSceneIds = (): readonly string[] => [...byId.keys()]
