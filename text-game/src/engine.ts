import type { Choice, Scene, SceneId, State } from './types.ts'
import { initialState } from './state.ts'
import { scenes } from './scenes/index.ts'
import { sceneIds, sceneIndex } from './sceneIds.ts'

export const registryProblems = (registered: readonly SceneId[]): readonly string[] => [
  ...sceneIds.filter((id) => !registered.includes(id)).map((id) => `scene ${id} has no definition`),
  ...registered.filter((id, i) => registered.indexOf(id) !== i).map((id) => `scene ${id} is defined twice`),
  ...registered.filter((id, i) => sceneIds[i] !== id).slice(0, 1).map((id) => `scene ${id} is out of play order`),
]

const problems = registryProblems(scenes.map((sc) => sc.id))
if (problems.length) throw new Error(`Scene registry: ${problems.join('; ')}`)

const byId: ReadonlyMap<SceneId, Scene> = new Map(scenes.map((sc) => [sc.id, sc]))

export const sceneOf = (s: State): Scene => {
  const sc = byId.get(s.scene)
  if (!sc) throw new Error(`Unknown scene: ${s.scene}`)
  return sc
}

export const choicesOf = (s: State): readonly Choice[] => sceneOf(s).choices(s)

export const isEnd = (s: State): boolean => choicesOf(s).length === 0

export const follow = (s: State, cs: readonly Choice[], n: number): State => {
  const c = Number.isInteger(n) ? cs[n - 1] : undefined
  if (!c) throw new Error(`Choice ${n} is not available in ${s.scene} (1-${cs.length})`)
  const applied = c.apply ? c.apply(s) : s
  const next = typeof c.next === 'string' ? c.next : c.next(applied)
  if (!byId.has(next)) throw new Error(`Scene ${s.scene} points to unknown scene ${next}`)
  if (sceneIndex(next) <= sceneIndex(s.scene)) throw new Error(`Scene ${s.scene} goes back to earlier scene ${next}`)
  return { ...applied, scene: next }
}

export const choose = (s: State, n: number): State => follow(s, choicesOf(s), n)

export const replay = (path: readonly number[]): readonly State[] =>
  path.reduce<State[]>((acc, n) => [...acc, choose(acc[acc.length - 1], n)], [initialState])

export const renderWith = (s: State, sc: Scene, cs: readonly Choice[]): string => {
  const header = `== ${sc.act} :: ${sc.title} ==`
  const options = cs.map((c, i) => `  ${i + 1}. ${c.label}`).join('\n')
  return [header, '', sc.text(s).trim(), '', cs.length ? options : '  [THE END]'].join('\n')
}

export const render = (s: State): string => {
  const sc = sceneOf(s)
  return renderWith(s, sc, sc.choices(s))
}

export const allSceneIds = (): readonly SceneId[] => sceneIds
