import { createInterface } from 'node:readline/promises'
import { stdin, stdout, argv, exit } from 'node:process'
import { choicesOf, choose, isEnd, render, replay } from './engine.ts'
import { initialState } from './state.ts'
import { ending, missingForBest } from './logic.ts'
import type { State } from './types.ts'

const arg = (name: string): string | undefined => {
  const i = argv.indexOf(name)
  return i >= 0 ? argv[i + 1] : undefined
}

const flag = (name: string): boolean => argv.includes(name)

const parsePath = (raw: string | undefined): readonly number[] =>
  (raw ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .map(Number)

const summary = (s: State) => ({
  ...s,
  ending: isEnd(s) ? ending(s) : null,
  missingForBest: isEnd(s) ? missingForBest(s) : null,
})

const footer = (path: readonly number[], s: State): string =>
  isEnd(s)
    ? `\nPATH: ${path.join(',')}\nENDING: ${ending(s)}`
    : `\nPATH: ${path.join(',') || '(start)'}\nNEXT: rerun with --choices ${[...path, 'N'].join(',')} where N is 1-${choicesOf(s).length}`

const mulberry = (seed: number) => () => {
  let t = (seed += 0x6d2b79f5)
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const randomPath = (seed: number): readonly number[] => {
  const rnd = mulberry(seed)
  const walk = (s: State, acc: readonly number[]): readonly number[] =>
    isEnd(s) ? acc : ((n) => walk(choose(s, n), [...acc, n]))(1 + Math.floor(rnd() * choicesOf(s).length))
  return walk(initialState, [])
}

const runReplay = (path: readonly number[]) => {
  const states = replay(path)
  const last = states[states.length - 1]
  if (flag('--state')) return console.log(JSON.stringify(summary(last), null, 2))
  const shown = flag('--last') ? [last] : states
  console.log(shown.map(render).join('\n\n'))
  console.log(footer(path, last))
}

const interactive = async () => {
  const rl = createInterface({ input: stdin, output: stdout })
  const loop = async (s: State, path: readonly number[]): Promise<void> => {
    console.log('\n' + render(s))
    if (isEnd(s)) {
      console.log(`\nPATH: ${path.join(',')}`)
      return rl.close()
    }
    const answer = await rl.question('\n> ')
    const n = Number(answer.trim())
    const valid = Number.isInteger(n) && n >= 1 && n <= choicesOf(s).length
    return valid ? loop(choose(s, n), [...path, n]) : (console.log('Pick one of the numbers.'), loop(s, path))
  }
  await loop(initialState, [])
}

const main = async () => {
  try {
    if (argv.includes('--random')) {
      const path = randomPath(Number(arg('--seed') ?? Date.now()))
      return runReplay(path)
    }
    if (argv.includes('--choices')) return runReplay(parsePath(arg('--choices')))
    await interactive()
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e))
    exit(1)
  }
}

await main()
