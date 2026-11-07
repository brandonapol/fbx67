import { argv, exit } from 'node:process'
import { readFileSync, writeFileSync } from 'node:fs'
import { choicesOf, choose, isEnd, replay } from './engine.ts'
import { initialState } from './state.ts'
import { canonical } from './liveness.ts'
import { HEAT_LIMIT, ending, missingForBest } from './logic.ts'
import type { State } from './types.ts'

type Sig = Readonly<{
  barfight?: string
  coJob?: string
  leakedFlightDate: boolean
  curlyPlan?: string
  eliTrespass?: string
  rashPlan?: string
  afterConfession?: string
  offer?: string
  testified?: boolean
  sharedWreck: boolean
}>

type Node = Readonly<{ state: State; sig: Sig; sample: readonly number[] }>

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
      const k = `${sigKey(sig)}#${s.scene}#${s.heat}`
      if (!next.has(k)) next.set(k, { state: s, sig, sample: [...node.sample, i + 1] })
    })
  })
  return run(next, found)
}

const found = run(new Map([['start', { state: initialState, sig: sigOf({ leakedFlightDate: false, sharedWreck: false }, initialState), sample: [] }]]), new Map())

const rows = [...found.values()]
  .map((n) => {
    const full = replay(n.sample)
    const last = full[full.length - 1]
    return {
      decisions: n.sig,
      heat: last.heat > HEAT_LIMIT ? 'hot' : 'cool',
      ending: ending(last),
      missingForBest: missingForBest(last),
      path: n.sample.join(','),
    }
  })
  .sort((a, b) => sigKey(a.decisions).localeCompare(sigKey(b.decisions)))

const where = (argv[argv.indexOf('--where') + 1] ?? '')
  .split(',')
  .filter((x) => argv.includes('--where') && x.includes('='))
  .map((x) => x.split('=') as [string, string])

const matches = (r: (typeof rows)[number]): boolean =>
  where.every(([k, v]) =>
    k === 'ending' ? r.ending === v : k === 'heat' ? r.heat === v : String((r.decisions as Record<string, unknown>)[k]) === v,
  )

const golden = (): readonly (typeof rows)[number][] => {
  const firstOf = (pred: (r: (typeof rows)[number]) => boolean) => rows.find(pred)
  const fields = ['barfight', 'coJob', 'leakedFlightDate', 'curlyPlan', 'eliTrespass', 'rashPlan', 'afterConfession', 'offer', 'testified', 'sharedWreck'] as const
  const perEnding = (['best', 'good', 'middle', 'bad'] as const).map((e) => firstOf((r) => r.ending === e))
  const perValue = fields.flatMap((f) =>
    [...new Set(rows.map((r) => String(r.decisions[f])))].map((v) => firstOf((r) => String(r.decisions[f]) === v && r.ending !== 'bad') ?? firstOf((r) => String(r.decisions[f]) === v)),
  )
  const hot = firstOf((r) => r.heat === 'hot' && r.missingForBest.length === 1)
  return [...new Map([...perEnding, ...perValue, hot].filter((r): r is (typeof rows)[number] => !!r).map((r) => [r.path, r])).values()]
}

if (argv.includes('--golden')) writeFileSync(argv[argv.indexOf('--golden') + 1], JSON.stringify(golden(), null, 2) + '\n')

if (argv.includes('--where')) {
  const limit = Number(argv[argv.indexOf('--limit') + 1]) || 5
  console.log(JSON.stringify(rows.filter(matches).slice(0, limit), null, 2))
}

const counts = rows.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.ending]: (acc[r.ending] ?? 0) + 1 }), {})

const out = argv[argv.indexOf('--out') + 1]
if (argv.includes('--out') && out) writeFileSync(out, JSON.stringify(rows, null, 2))

console.log(JSON.stringify({ decisionCombinations: rows.length, byEnding: counts, written: argv.includes('--out') ? out : null }, null, 2))

const summary = JSON.stringify(
  { decisionCombinations: rows.length, byEnding: Object.fromEntries((['best', 'good', 'middle', 'bad'] as const).map((e) => [e, counts[e] ?? 0])) },
  null,
  2,
) + '\n'

if (argv.includes('--summary')) writeFileSync(argv[argv.indexOf('--summary') + 1], summary)

if (argv.includes('--check')) {
  const file = argv[argv.indexOf('--check') + 1]
  const committed = readFileSync(file, 'utf8')
  if (committed !== summary) {
    console.error(`FAIL: matrix summary differs from ${file}. If the change is intended, run npm run matrix:summary and commit it.\n${summary}`)
    exit(1)
  }
}
