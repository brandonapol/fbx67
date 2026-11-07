import { argv, exit } from 'node:process'
import { allSceneIds, choicesOf, choose, isEnd } from './engine.ts'
import { initialState } from './state.ts'
import { ending, type Ending } from './logic.ts'
import { canonical, canonicalKey } from './liveness.ts'
import type { State } from './types.ts'

type Trail = Readonly<{ n: number; prev: Trail | null }> | null

type Node = Readonly<{ state: State; paths: bigint; trail: Trail }>

type Tally = { distinctStates: number; paths: bigint; sample: Trail | undefined }

const unwind = (t: Trail): readonly number[] => (t ? [...unwind(t.prev), t.n] : [])

const endings: readonly Ending[] = ['best', 'good', 'middle', 'bad']

const tallies: Record<Ending, Tally> = Object.fromEntries(
  endings.map((e) => [e, { distinctStates: 0, paths: 0n, sample: undefined }]),
) as Record<Ending, Tally>

const errors: string[] = []
const scenesSeen = new Set<string>()
const verbose = argv.includes('--verbose')

const step = (frontier: ReadonlyMap<string, Node>): Map<string, Node> => {
  const next = new Map<string, Node>()
  frontier.forEach((node) => {
    scenesSeen.add(node.state.scene)
    if (isEnd(node.state)) {
      const t = tallies[ending(node.state)]
      t.distinctStates += 1
      t.paths += node.paths
      t.sample ??= node.trail
      return
    }
    choicesOf(node.state).forEach((_, i) => {
      try {
        const s = canonical(choose(node.state, i + 1))
        const k = canonicalKey(s)
        const prev = next.get(k)
        next.set(k, prev ? { ...prev, paths: prev.paths + node.paths } : { state: s, paths: node.paths, trail: { n: i + 1, prev: node.trail } })
      } catch (e) {
        errors.push(`${node.state.scene} choice ${i + 1}: ${e instanceof Error ? e.message : String(e)} (path ${unwind(node.trail).join(',')})`)
      }
    })
  })
  return next
}

const run = (frontier: Map<string, Node>, depth: number, peak: number): { depth: number; peak: number } => {
  if (frontier.size === 0) return { depth, peak }
  if (verbose) console.error(`depth ${depth}: ${frontier.size} states`)
  return run(step(frontier), depth + 1, Math.max(peak, frontier.size))
}

const { depth, peak } = run(new Map([[canonicalKey(initialState), { state: initialState, paths: 1n, trail: null }]]), 0, 1)

const totalPaths = endings.reduce((a, e) => a + tallies[e].paths, 0n)
const unreachable = allSceneIds().filter((id) => !scenesSeen.has(id))

console.log(
  JSON.stringify(
    {
      totalPaths: totalPaths.toString(),
      distinctEndStates: endings.reduce((a, e) => a + tallies[e].distinctStates, 0),
      maxDepth: depth,
      peakFrontier: peak,
      endings: endings.map((e) => ({
        ending: e,
        distinctStates: tallies[e].distinctStates,
        paths: tallies[e].paths.toString(),
        share: totalPaths ? `${(Number((tallies[e].paths * 10000n) / totalPaths) / 100).toFixed(2)}%` : '0%',
        sample: tallies[e].sample === undefined ? '(unreachable)' : unwind(tallies[e].sample).join(','),
      })),
      unreachableScenes: unreachable,
      errors: errors.slice(0, 20),
      errorCount: errors.length,
    },
    null,
    2,
  ),
)

const failures = [
  ...(errors.length ? ['choice errors'] : []),
  ...(unreachable.length ? ['unreachable scenes'] : []),
  ...endings.filter((e) => tallies[e].distinctStates === 0).map((e) => `ending ${e} unreachable`),
]

if (argv.includes('--strict') && failures.length) {
  console.error(`FAIL: ${failures.join('; ')}`)
  exit(1)
}
