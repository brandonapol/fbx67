import type { State } from '../../text-game/src/types.ts'
import { initialState } from '../../text-game/src/state.ts'
import { menu, send } from '../../text-game/src/story.ts'
import type { Game } from './prologue.ts'
import { failed, resume, start } from './prologue.ts'

export type Replayed = Readonly<{ story: State; path: readonly number[] }> | Readonly<{ error: string }>

// The path a link asks to start from: `#path=1,2,…` as the text build and textBuildHash write it, or `?from=1,2,…`.
export const pathParam = (hash: string, search: string): string | undefined =>
  /^#path=(.*)$/.exec(hash)?.[1] ?? new URLSearchParams(search).get('from') ?? undefined

// Replays a path through the story's menus, one note per step, and names the first step the story refuses.
export const replayPath = (raw: string): Replayed => {
  const steps = raw.trim() === '' ? [] : raw.split(',').map((x) => x.trim())
  const go = (story: State, i: number): Replayed => {
    if (i === steps.length) return { story, path: steps.map(Number) }
    const step = steps[i]
    const at = `Step ${i + 1} of the path`
    if (!/^\d+$/.test(step)) return { error: `${at} is "${step}", not a choice number.` }
    const m = menu(story)
    if (m.options.length === 0) return { error: `${at} goes past the end: "${m.title}" is an ending.` }
    const option = m.options.find((o) => o.n === Number(step))
    if (!option) return { error: `${at} is ${step}, but "${m.title}" has ${m.options.length} choices.` }
    return go(send(story, option.note), i + 1)
  }
  return go(initialState, 0)
}

export const startFrom = (hash: string, search: string): Game => {
  const raw = pathParam(hash, search)
  if (raw === undefined) return start()
  const r = replayPath(raw)
  return 'error' in r ? failed(r.error) : resume(r.story, r.path)
}
