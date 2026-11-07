import { argv, exit } from 'node:process'
import { allSceneIds, choicesOf, choose, isEnd } from './engine.ts'
import { initialState } from './state.ts'
import { ending, type Ending } from './logic.ts'
import type { State } from './types.ts'
import { canonical, canonicalKey } from './liveness.ts'

type Node = Readonly<{ state: State; paths: bigint; sample: readonly number[] }>

const key = canonicalKey

const expand = (frontier: ReadonlyMap<string, Node>) => {
  const next = new Map<string, Node>()
  const terminals: Node[] = []
  const errors: string[] = []
  const seenScenes = new Set<string>()
  frontier.forEach((node) => {
    seenScenes.add(node.state.scene)
    if (isEnd(node.state)) return void terminals.push(node)
    choicesOf(node.state).forEach((_, i) => {
      try {
        const s = canonical(choose(node.state, i + 1))
        const k = key(s)
        const prev = next.get(k)
        next.set(k, prev ? { ...prev, paths: prev.paths + node.paths } : { state: s, paths: node.paths, sample: [...node.sample, i + 1] })
      } catch (e) {
        errors.push(`${node.state.scene} choice ${i + 1}: ${e instanceof Error ? e.message : String(e)} (path ${node.sample.join(',')})`)
      }
    })
  })
  return { next, terminals, errors, seenScenes }
}

const explore = () => {
  const start: Node = { state: initialState, paths: 1n, sample: [] }
  const run = (
    frontier: ReadonlyMap<string, Node>,
    depth: number,
    acc: { terminals: Node[]; errors: string[]; scenes: Set<string>; maxStates: number },
  ): typeof acc & { depth: number } => {
    if (frontier.size === 0) return { ...acc, depth }
    if (argv.includes('--verbose')) console.error(`depth ${depth}: ${frontier.size} states`)
    const r = expand(frontier)
    r.seenScenes.forEach((x) => acc.scenes.add(x))
    r.terminals.forEach((t) => acc.terminals.push(t))
    r.errors.forEach((x) => acc.errors.push(x))
    return run(r.next, depth + 1, {
      terminals: acc.terminals,
      errors: acc.errors,
      scenes: acc.scenes,
      maxStates: Math.max(acc.maxStates, r.next.size),
    })
  }
  return run(new Map([[key(initialState), start]]), 0, { terminals: [], errors: [], scenes: new Set(), maxStates: 1 })
}

const r = explore()
const endings: readonly Ending[] = ['best', 'good', 'middle', 'bad']
const byEnding = endings.map((e) => {
  const ts = r.terminals.filter((t) => ending(t.state) === e)
  return { ending: e, distinctStates: ts.length, paths: ts.reduce((a, t) => a + t.paths, 0n), sample: ts[0]?.sample.join(',') ?? '(unreachable)' }
})
const totalPaths = r.terminals.reduce((a, t) => a + t.paths, 0n)
const unreachable = allSceneIds().filter((id) => !r.scenes.has(id))

const report = {
  totalPaths: totalPaths.toString(),
  distinctEndStates: r.terminals.length,
  maxDepth: r.depth,
  peakFrontier: r.maxStates,
  endings: byEnding.map((b) => ({
    ...b,
    paths: b.paths.toString(),
    share: totalPaths ? `${((Number((b.paths * 10000n) / totalPaths)) / 100).toFixed(2)}%` : '0%',
  })),
  unreachableScenes: unreachable,
  errors: r.errors.slice(0, 20),
  errorCount: r.errors.length,
}

console.log(JSON.stringify(report, null, 2))

const failures = [
  ...(r.errors.length ? ['choice errors'] : []),
  ...(unreachable.length ? ['unreachable scenes'] : []),
  ...byEnding.filter((b) => b.distinctStates === 0).map((b) => `ending ${b.ending} unreachable`),
]

if (argv.includes('--strict') && failures.length) {
  console.error(`FAIL: ${failures.join('; ')}`)
  exit(1)
}
