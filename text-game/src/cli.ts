import { createInterface } from 'node:readline/promises'
import { stdin, stdout, argv } from 'node:process'
import { choicesOf, follow, isEnd, render, replay } from './engine.ts'
import { initialState } from './state.ts'
import { ending, missingForBest } from './logic.ts'
import { mulberry, pickIndex } from './random.ts'
import { choicePath, flag, int, orExit, value } from './args.ts'
import { mission } from './story.ts'
import { missionMenu } from './missions.ts'
import type { State } from './types.ts'

const summary = (s: State) => ({
  ...s,
  ending: isEnd(s) ? ending(s) : null,
  missingForBest: isEnd(s) ? missingForBest(s) : null,
})

const footer = (path: readonly number[], s: State): string =>
  isEnd(s)
    ? `\nPATH: ${path.join(',')}\nENDING: ${ending(s)}`
    : `\nPATH: ${path.join(',') || '(start)'}\nNEXT: rerun with --choices ${[...path, 'N'].join(',')} where N is 1-${choicesOf(s).length}`

// The engine build sends one of these notes for the whole mission; the text build plays its scenes one by one.
const missionLine = (s: State): string => {
  const m = mission(s)
  return m ? `\n\nMISSION: ${missionMenu(m)}\nNOTES: ${m.endings.map((e) => e.note).join(' / ')}` : ''
}

const randomPath = (seed: number): readonly number[] => {
  const rnd = mulberry(seed)
  const walk = (s: State, acc: readonly number[]): readonly number[] => {
    const cs = choicesOf(s)
    if (cs.length === 0) return acc
    const n = pickIndex(rnd, cs.length)
    return walk(follow(s, cs, n), [...acc, n])
  }
  return walk(initialState, [])
}

const runReplay = (path: readonly number[]) => {
  const states = replay(path)
  const last = states[states.length - 1]
  if (flag(argv, '--state')) return console.log(JSON.stringify(summary(last), null, 2))
  const shown = flag(argv, '--last') ? [last] : states
  console.log(shown.map(render).join('\n\n') + missionLine(last))
  console.log(footer(path, last))
}

const interactive = async () => {
  const rl = createInterface({ input: stdin, output: stdout })
  const loop = async (s: State, path: readonly number[]): Promise<void> => {
    const cs = choicesOf(s)
    console.log('\n' + render(s) + missionLine(s))
    if (cs.length === 0) {
      console.log(`\nPATH: ${path.join(',')}`)
      return rl.close()
    }
    const answer = await rl.question('\n> ')
    const n = Number(answer.trim())
    const valid = Number.isInteger(n) && n >= 1 && n <= cs.length
    return valid ? loop(follow(s, cs, n), [...path, n]) : (console.log('Pick one of the numbers.'), loop(s, path))
  }
  await loop(initialState, [])
}

await orExit(async () => {
  if (flag(argv, '--random')) return runReplay(randomPath(int(argv, '--seed', Date.now())))
  if (flag(argv, '--choices')) return runReplay(choicePath(value(argv, '--choices') ?? ''))
  await interactive()
})
