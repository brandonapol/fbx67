import { argv } from 'node:process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { choicesOf, choose, isEnd, render, replay } from './engine.ts'
import { initialState } from './state.ts'
import { canonical } from './liveness.ts'
import { HEAT_LIMIT, ending, missingForBest, pendingHeat } from './logic.ts'
import { flag, int, orExit, value } from './args.ts'
import type { State } from './types.ts'

const sigFields = ['barfight', 'coJob', 'leakedFlightDate', 'curlyPlan', 'eliTrespass', 'rashPlan', 'afterConfession', 'offer', 'testified', 'sharedWreck'] as const

type SigField = (typeof sigFields)[number]

type Sig = Readonly<Pick<State, SigField>>

const isSigField = (k: string): k is SigField => sigFields.some((f) => f === k)

// A path is its last choice and the path before it, so nodes share their prefixes instead of each copying the whole
// path: the frontier is hundreds of thousands of nodes deep into Act 4, and copies ran CI out of heap.
type Path = Readonly<{ up: Path; choice: number }> | undefined

const choicesIn = (p: Path, acc: readonly number[] = []): readonly number[] => (p ? choicesIn(p.up, [p.choice, ...acc]) : acc)

type Node = Readonly<{ state: State; sig: Sig; sample: Path }>

const sigOf = (prev: Sig, s: State): Sig => ({
  barfight: s.barfight ?? prev.barfight,
  coJob: s.coJob ?? prev.coJob,
  leakedFlightDate: prev.leakedFlightDate || s.leakedFlightDate,
  curlyPlan: prev.curlyPlan ?? s.curlyPlan,
  eliTrespass: prev.eliTrespass ?? s.eliTrespass,
  rashPlan: prev.rashPlan ?? s.rashPlan,
  afterConfession: prev.afterConfession ?? s.afterConfession,
  offer: prev.offer ?? s.offer,
  testified: prev.testified ?? s.testified,
  sharedWreck: prev.sharedWreck || s.sharedWreck,
})

const sigKey = (g: Sig): string =>
  [g.barfight, g.coJob, g.leakedFlightDate ? 'leak' : 'noleak', g.curlyPlan, g.eliTrespass, g.rashPlan, g.afterConfession, g.offer, g.testified ? 'testify' : 'silent', g.sharedWreck ? 'shared' : 'kept'].join('|')

const run = (frontier: ReadonlyMap<string, Node>, found: Map<string, Node>): Map<string, Node> => {
  if (frontier.size === 0) return found
  const next = new Map<string, Node>()
  frontier.forEach((node) => {
    if (isEnd(node.state)) {
      const k = `${sigKey(node.sig)}#${node.state.heat > HEAT_LIMIT ? 'hot' : 'cool'}`
      if (!found.has(k)) found.set(k, node)
      return
    }
    choicesOf(node.state).forEach((_, i) => {
      const raw = choose(node.state, i + 1)
      const sig = sigOf(node.sig, raw)
      const s = canonical(raw)
      // Heat still to come is part of the key, or a path owing it merges with one that doesn't (the borrowed key).
      const k = `${sigKey(sig)}#${s.scene}#${s.heat}#${pendingHeat(s)}`
      if (!next.has(k)) next.set(k, { state: s, sig, sample: { up: node.sample, choice: i + 1 } })
    })
  })
  return run(next, found)
}

const found = run(new Map([['start', { state: initialState, sig: sigOf({ leakedFlightDate: false, sharedWreck: false }, initialState), sample: undefined }]]), new Map())

const rows = [...found.values()]
  .map((n) => {
    const sample = choicesIn(n.sample)
    const full = replay(sample)
    const last = full[full.length - 1]
    return {
      decisions: n.sig,
      heat: last.heat > HEAT_LIMIT ? 'hot' : 'cool',
      ending: ending(last),
      missingForBest: missingForBest(last),
      path: sample.join(','),
    }
  })
  .sort((a, b) => sigKey(a.decisions).localeCompare(sigKey(b.decisions)))

type Row = (typeof rows)[number]

type Summary = Readonly<{ decisionCombinations: number; byEnding: Readonly<Record<string, number>> }>

const parseWhere = (raw: string): readonly Readonly<{ k: string; v: string }>[] =>
  raw
    .split(',')
    .filter((x) => x.includes('='))
    .map((x) => {
      const [k = '', v = ''] = x.split('=')
      if (k !== 'ending' && k !== 'heat' && !isSigField(k)) throw new Error(`--where: unknown field "${k}"`)
      return { k, v }
    })

const fieldOf = (r: Row, k: string): string =>
  k === 'ending' ? r.ending : k === 'heat' ? r.heat : isSigField(k) ? String(r.decisions[k]) : ''

const transcript = (path: string): string => replay(path.split(',').map(Number)).map(render).join('\n\n')

const golden = (): readonly Row[] => {
  const firstOf = (pred: (r: Row) => boolean) => rows.find(pred)
  const perEnding = (['best', 'good', 'middle', 'bad'] as const).map((e) => firstOf((r) => r.ending === e))
  const perValue = sigFields.flatMap((f) =>
    [...new Set(rows.map((r) => String(r.decisions[f])))].map((v) => firstOf((r) => String(r.decisions[f]) === v && r.ending !== 'bad') ?? firstOf((r) => String(r.decisions[f]) === v)),
  )
  const hot = firstOf((r) => r.heat === 'hot' && r.missingForBest.length === 1)
  return [...new Map([...perEnding, ...perValue, hot].filter((r): r is Row => !!r).map((r) => [r.path, r])).values()]
}

const writeGolden = (file: string, gs: readonly Row[]): void => {
  const dir = join(dirname(file), 'transcripts')
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  const entries = gs.map((r, i) => ({ ...r, transcript: `transcripts/${String(i + 1).padStart(2, '0')}-${r.ending}.txt` }))
  entries.forEach((r) => writeFileSync(join(dirname(file), r.transcript), transcript(r.path) + '\n'))
  writeFileSync(file, JSON.stringify(entries, null, 2) + '\n')
}

const summaryOf = (rs: readonly Row[]): Summary => ({
  decisionCombinations: rs.length,
  byEnding: rs.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.ending]: (acc[r.ending] ?? 0) + 1 }), {}),
})

const sameSummary = (a: Summary, b: Summary): boolean =>
  a.decisionCombinations === b.decisionCombinations &&
  [...new Set([...Object.keys(a.byEnding), ...Object.keys(b.byEnding)])].every((k) => a.byEnding[k] === b.byEnding[k])

await orExit(() => {
  const summary = summaryOf(rows)
  const goldenOut = value(argv, '--golden')
  if (goldenOut) writeGolden(goldenOut, golden())
  const where = value(argv, '--where')
  if (where !== undefined) {
    const conds = parseWhere(where)
    const limit = int(argv, '--limit', 5)
    console.log(JSON.stringify(rows.filter((r) => conds.every(({ k, v }) => fieldOf(r, k) === v)).slice(0, limit), null, 2))
  }
  const out = value(argv, '--out')
  if (out) writeFileSync(out, JSON.stringify(rows, null, 2))
  const summaryOut = value(argv, '--write-summary')
  if (summaryOut) writeFileSync(summaryOut, JSON.stringify(summary, null, 2) + '\n')
  console.log(JSON.stringify({ ...summary, written: flag(argv, '--out') ? out : null }, null, 2))
  const check = value(argv, '--check')
  if (check) {
    const expected: Summary = JSON.parse(readFileSync(check, 'utf8'))
    if (!sameSummary(summary, expected)) throw new Error(`Matrix summary differs from ${check}: expected ${JSON.stringify(expected)}`)
  }
})
