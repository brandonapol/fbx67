import { argv, exit } from 'node:process'
import { follow, renderWith, sceneOf } from './engine.ts'
import { initialState } from './state.ts'
import { canonical } from './liveness.ts'
import { ending } from './logic.ts'
import { mixSeed, mulberry, pickIndex } from './random.ts'
import { int, orExit } from './args.ts'
import type { SceneId, State } from './types.ts'

const view = (s: State) => {
  const sc = sceneOf(s)
  const cs = sc.choices(s)
  return { cs, text: renderWith(s, sc, cs) }
}

const twin = (a: State, b: State, rnd: () => number, at: SceneId): string | null => {
  const va = view(a)
  const vb = view(b)
  if (va.text !== vb.text) return `render diverged at ${a.scene} (canonicalized at ${at})`
  if ((va.cs.length === 0) !== (vb.cs.length === 0)) return `end diverged at ${a.scene}`
  if (va.cs.length === 0) return ending(a) === ending(b) ? null : `ending diverged (canonicalized at ${at})`
  const n = pickIndex(rnd, va.cs.length)
  return twin(follow(a, va.cs, n), follow(b, vb.cs, n), rnd, at)
}

const trial = (seed: number): string | null => {
  const rnd = mulberry(seed)
  const walk = (s: State, depth: number): string | null => {
    const cs = sceneOf(s).choices(s)
    if (cs.length === 0) return null
    const failure = twin(s, canonical(s), mulberry(mixSeed(seed, depth)), s.scene)
    return failure ?? walk(follow(s, cs, pickIndex(rnd, cs.length)), depth + 1)
  }
  return walk(initialState, 0)
}

await orExit(() => {
  const trials = int(argv, '--trials', 2000)
  const offset = int(argv, '--seed-offset', 0)
  if (trials < 1) throw new Error('--trials must be at least 1')
  const failures = Array.from({ length: trials }, (_, i) => trial(offset + i + 1)).filter((f): f is string => f !== null)
  console.log(JSON.stringify({ trials, seedOffset: offset, failures: failures.length, examples: [...new Set(failures)].slice(0, 10) }, null, 2))
  if (failures.length) exit(1)
})
