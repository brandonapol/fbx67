// The sweep's budget: how big the merged state graph and its heap may grow before the explore job fails.
// The numbers live in explore-budget.json; raising them is a deliberate, reviewed change (see README "Checks").

export const BUDGETED = ['mergedStates', 'peakHeapMB'] as const

export type Budgeted = (typeof BUDGETED)[number]

export type Measured = Readonly<Record<Budgeted, number>>

export type Budget = {
  readonly why: string
  readonly baseline: Measured & { readonly measured: string }
  readonly limit: Measured
}

const isMeasured = (v: unknown): v is Measured =>
  typeof v === 'object' && v !== null && BUDGETED.every((k) => Number.isFinite((v as Record<string, unknown>)[k]))

export const parseBudget = (text: string): Budget => {
  const raw: unknown = JSON.parse(text)
  const b = raw as Partial<Budget>
  if (typeof raw !== 'object' || raw === null || !isMeasured(b.baseline) || !isMeasured(b.limit))
    throw new Error(`explore-budget.json needs baseline and limit with ${BUDGETED.join(' and ')}`)
  return raw as Budget
}

const n = (x: number): string => x.toLocaleString('en-US')

export const budgetFailures = (now: Measured, budget: Budget): readonly string[] =>
  BUDGETED.filter((k) => now[k] > budget.limit[k]).map(
    (k) =>
      `${k} ${n(now[k])} exceeds the budget of ${n(budget.limit[k])} in explore-budget.json. ` +
      'Mark more fields dead in src/liveness.ts so equivalent states merge, ' +
      'or raise the budget on purpose in a PR that says why (README "Checks").',
  )

const pct = (part: number, whole: number): string => (whole ? `${Math.round((part / whole) * 100)}%` : 'n/a')

const growth = (now: number, then: number): string => {
  if (!then) return 'n/a'
  const d = Math.round(((now - then) / then) * 100)
  return d > 0 ? `+${d}%` : `${d}%`
}

export const budgetTable = (now: Measured, budget: Budget): string =>
  [
    `| | baseline (${budget.baseline.measured}) | now | change | budget | used |`,
    '| --- | ---: | ---: | ---: | ---: | ---: |',
    ...BUDGETED.map(
      (k) =>
        `| ${k} | ${n(budget.baseline[k])} | ${n(now[k])} | ${growth(now[k], budget.baseline[k])} | ` +
        `${n(budget.limit[k])} | ${pct(now[k], budget.limit[k])} |`,
    ),
  ].join('\n')
