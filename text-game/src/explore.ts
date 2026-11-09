import { argv, exit } from 'node:process'
import { readFileSync, writeFileSync } from 'node:fs'
import { getHeapStatistics } from 'node:v8'
import { allSceneIds, choicesOf, choose, render, sceneOf } from './engine.ts'
import { backwardClock } from './clock.ts'
import { initialState } from './state.ts'
import { ending, type Ending } from './logic.ts'
import { canonical } from './liveness.ts'
import type { State } from './types.ts'
import { value } from './args.ts'
import { budgetFailures, budgetTable, parseBudget } from './budget.ts'

const KEYED = {
  scene: true,
  owenCache: true,
  barfight: true,
  barfightMove: true,
  momHonesty: true,
  leakedFlightDate: true,
  photoLab: true,
  coJob: true,
  curlyPlan: true,
  eliTrespass: true,
  rashPlan: true,
  afterConfession: true,
  offer: true,
  testified: true,
  sharedWreck: true,
  evidence: true,
  heat: true,
  lucyHeat: true,
  eliTrust: true,
  joan: true,
} as const satisfies Record<keyof State, true>

const FIELDS = Object.keys(KEYED) as readonly (keyof State)[]

const known: ReadonlySet<string> = new Set<string>(FIELDS)

const enc = (v: unknown): string => (v === undefined ? '' : Array.isArray(v) ? v.join('+') : String(v))

const packedKey = (s: State): string => {
  const stray = Object.keys(s).find((k) => !known.has(k))
  if (stray !== undefined) throw new Error(`explore key does not cover state field ${stray}`)
  return FIELDS.map((f) => enc(s[f])).join(',')
}

const endings: readonly Ending[] = ['best', 'good', 'middle', 'bad']

const BROKEN_TEXT = /undefined|NaN|\[object Object\]|\$\{/

const textProblem = (s: State): string | null => {
  try {
    const shown = render(s)
    const bad = shown.match(BROKEN_TEXT)
    return bad ? `${s.scene} renders "${bad[0]}"` : null
  } catch (e) {
    return `${s.scene} render threw: ${e instanceof Error ? e.message : String(e)}`
  }
}

type Graph = {
  ids: Map<string, number>
  parent: number[]
  via: number[]
  edges: number[][]
  postorder: number[]
  endingOf: (Ending | null)[]
  scenes: Set<string>
  errors: string[]
  rendered: number
  peakHeap: number
}

const HEAP_SAMPLE_EVERY = 4096

const sampleHeap = (g: Graph): void => {
  g.peakHeap = Math.max(g.peakHeap, getHeapStatistics().used_heap_size)
}

const trailOf = (g: Graph, id: number): readonly number[] =>
  id <= 0 ? [] : [...trailOf(g, g.parent[id]), g.via[id]]

const intern = (g: Graph, key: string, parent: number, via: number): [number, boolean] => {
  const seen = g.ids.get(key)
  if (seen !== undefined) return [seen, false]
  const id = g.ids.size
  g.ids.set(key, id)
  g.parent.push(parent)
  g.via.push(via)
  g.edges.push([])
  g.endingOf.push(null)
  return [id, true]
}

const visit = (g: Graph, id: number, s: State): void => {
  g.scenes.add(s.scene)
  g.rendered += 1
  if (g.rendered % HEAP_SAMPLE_EVERY === 0) sampleHeap(g)
  const broken = textProblem(s)
  if (broken) g.errors.push(`${broken} (path ${trailOf(g, id).join(',')})`)
  const choices = choicesOf(s)
  if (choices.length === 0) {
    g.endingOf[id] = ending(s)
    g.postorder.push(id)
    return
  }
  choices.forEach((_, i) => {
    try {
      const next = canonical(choose(s, i + 1))
      const backward = backwardClock(sceneOf(s), sceneOf(next))
      if (backward) g.errors.push(`${backward} (path ${[...trailOf(g, id), i + 1].join(',')})`)
      const [child, fresh] = intern(g, packedKey(next), id, i + 1)
      g.edges[id].push(child)
      if (fresh) visit(g, child, next)
    } catch (e) {
      g.errors.push(`${s.scene} choice ${i + 1}: ${e instanceof Error ? e.message : String(e)} (path ${[...trailOf(g, id), i + 1].join(',')})`)
    }
  })
  g.postorder.push(id)
}

const popcount = (m: bigint): number => m.toString(2).split('').filter((c) => c === '1').length

const explore = () => {
  const g: Graph = {
    ids: new Map(),
    parent: [],
    via: [],
    edges: [],
    postorder: [],
    endingOf: [],
    scenes: new Set(),
    errors: [],
    rendered: 0,
    peakHeap: 0,
  }
  const start = canonical(initialState)
  const [root] = intern(g, packedKey(start), -1, 0)
  visit(g, root, start)

  sampleHeap(g)
  const n = g.ids.size
  const paths: bigint[] = Array.from({ length: n }, () => 0n)
  const depths: bigint[] = Array.from({ length: n }, () => 0n)
  paths[root] = 1n
  depths[root] = 1n
  const topological = [...g.postorder].reverse()
  topological.forEach((id) =>
    g.edges[id].forEach((child) => {
      paths[child] += paths[id]
      depths[child] |= depths[id] << 1n
    }),
  )

  const allDepths = depths.reduce((a, m) => a | m, 0n)
  const maxDepth = allDepths.toString(2).length
  const widths = Array.from({ length: maxDepth }, (_, d) => depths.reduce((a, m) => a + Number((m >> BigInt(d)) & 1n), 0))

  const ends = g.endingOf.flatMap((e, id) => (e ? [{ id, e }] : []))
  const tally = (e: Ending) => {
    const mine = ends.filter((x) => x.e === e)
    return {
      distinctStates: mine.reduce((a, x) => a + popcount(depths[x.id]), 0),
      mergedStates: mine.length,
      paths: mine.reduce((a, x) => a + paths[x.id], 0n),
      sample: mine.length ? trailOf(g, mine[0].id).join(',') : '(unreachable)',
    }
  }
  sampleHeap(g)
  return { g, maxDepth, widths, tallies: endings.map((e) => ({ e, ...tally(e) })) }
}

const t0 = performance.now()
const { g, maxDepth, widths, tallies } = explore()
const seconds = (performance.now() - t0) / 1000

if (argv.includes('--verbose')) widths.forEach((w, d) => console.error(`depth ${d}: ${w} states`))

const totalPaths = tallies.reduce((a, t) => a + t.paths, 0n)
const unreachable = allSceneIds().filter((id) => !g.scenes.has(id))
const measured = { mergedStates: g.ids.size, peakHeapMB: Math.round(g.peakHeap / 2 ** 20) }
const budget = parseBudget(readFileSync(new URL('../explore-budget.json', import.meta.url), 'utf8'))
const overBudget = budgetFailures(measured, budget)
const tableOut = value(argv, '--budget-table')
if (tableOut !== undefined) writeFileSync(tableOut, `${budgetTable(measured, budget)}\n`)

console.log(
  JSON.stringify(
    {
      totalPaths: totalPaths.toString(),
      distinctEndStates: tallies.reduce((a, t) => a + t.distinctStates, 0),
      maxDepth,
      peakFrontier: Math.max(...widths),
      mergedStates: measured.mergedStates,
      edges: g.edges.reduce((a, e) => a + e.length, 0),
      renderedStates: g.rendered,
      seconds: Number(seconds.toFixed(1)),
      peakHeapMB: measured.peakHeapMB,
      peakRssMB: Math.round(process.resourceUsage().maxRSS / 1024),
      endings: tallies.map((t) => ({
        ending: t.e,
        distinctStates: t.distinctStates,
        mergedStates: t.mergedStates,
        paths: t.paths.toString(),
        share: totalPaths ? `${(Number((t.paths * 10000n) / totalPaths) / 100).toFixed(2)}%` : '0%',
        sample: t.sample,
      })),
      unreachableScenes: unreachable,
      errors: g.errors.slice(0, 20),
      errorCount: g.errors.length,
      budget: { limit: budget.limit, baseline: budget.baseline, over: overBudget },
    },
    null,
    2,
  ),
)

const failures = [
  ...(g.errors.length ? ['choice, text or clock errors'] : []),
  ...(unreachable.length ? ['unreachable scenes'] : []),
  ...tallies.filter((t) => t.mergedStates === 0).map((t) => `ending ${t.e} unreachable`),
  ...overBudget,
]

if (argv.includes('--strict') && failures.length) {
  failures.forEach((f) => console.error(`FAIL: ${f}`))
  exit(1)
}
