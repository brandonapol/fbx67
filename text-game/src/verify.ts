import { argv, exit } from 'node:process'
import { choicesOf, choose, isEnd, render } from './engine.ts'
import { initialState } from './state.ts'
import { canonical } from './liveness.ts'
import { ending } from './logic.ts'
import type { State } from './types.ts'

const mulberry = (seed: number) => () => {
  let t = (seed += 0x6d2b79f5)
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const pick = (rnd: () => number, s: State): number => 1 + Math.floor(rnd() * choicesOf(s).length)

const twin = (a: State, b: State, rnd: () => number, at: string): string | null => {
  if (render(a) !== render(b)) return `render diverged at ${a.scene} (canonicalized at ${at})`
  if (isEnd(a) !== isEnd(b)) return `end diverged at ${a.scene}`
  if (isEnd(a)) return ending(a) === ending(b) ? null : `ending diverged (canonicalized at ${at})`
  const n = pick(rnd, a)
  return twin(choose(a, n), choose(b, n), rnd, at)
}

const trial = (seed: number): string | null => {
  const rnd = mulberry(seed)
  const walk = (s: State): string | null => {
    if (isEnd(s)) return null
    const failure = twin(s, canonical(s), mulberry(seed * 7919 + s.scene.length), s.scene)
    return failure ?? walk(choose(s, pick(rnd, s)))
  }
  return walk(initialState)
}

const trials = Number(argv[argv.indexOf('--trials') + 1]) || 2000
const failures = Array.from({ length: trials }, (_, i) => trial(i + 1)).filter((f): f is string => f !== null)

console.log(JSON.stringify({ trials, failures: failures.length, examples: [...new Set(failures)].slice(0, 10) }, null, 2))
if (failures.length) exit(1)
