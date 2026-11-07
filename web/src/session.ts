import { choose } from '../../text-game/src/engine.ts'
import { initialState } from '../../text-game/src/state.ts'
import type { State } from '../../text-game/src/types.ts'

export type Path = readonly number[]

export type Run = Readonly<{ path: Path; state: State }>

const storageKey = 'second-rush:path'

export const parsePath = (raw: string): Path =>
  raw
    .split(',')
    .map((x) => x.trim())
    .filter((x) => /^\d+$/.test(x))
    .map(Number)

export const formatPath = (path: Path): string => path.join(',')

export const start: Run = { path: [], state: initialState }

export const step = (run: Run, n: number): Run => ({ path: [...run.path, n], state: choose(run.state, n) })

export const replayValid = (path: Path): Run =>
  path.reduce<Readonly<{ run: Run; ok: boolean }>>(
    (acc, n) => {
      if (!acc.ok) return acc
      try {
        return { run: step(acc.run, n), ok: true }
      } catch {
        return { run: acc.run, ok: false }
      }
    },
    { run: start, ok: true },
  ).run

export const hashPath = (hash: string): Path | undefined => {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const raw = params.get('path')
  return raw === null ? undefined : parsePath(raw)
}

export const hashFor = (path: Path): string => (path.length ? `#path=${formatPath(path)}` : '')

export const loadSaved = (): Path | undefined => {
  try {
    const raw = window.localStorage.getItem(storageKey)
    return raw === null ? undefined : parsePath(raw)
  } catch {
    return undefined
  }
}

export const save = (path: Path): void => {
  try {
    if (path.length) window.localStorage.setItem(storageKey, formatPath(path))
    else window.localStorage.removeItem(storageKey)
  } catch {
    return
  }
}
