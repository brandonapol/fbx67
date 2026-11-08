import type { Sample } from '../src/probe.ts'

export type Limits = Readonly<{ drawCalls: number; triangles: number; textureMB: number }>

export type Budgets = Readonly<{ spaces: Readonly<Record<string, Limits>>; downloadMB: number }>

export type Spread = Readonly<{ mean: number; p95: number; max: number }>

export type SpaceStats = Readonly<{
  space: string
  frames: number
  drawCalls: Spread
  triangles: Spread
  textureMB: Spread
  vramMB: Spread
  cpuMs: Spread
  frameMs: Spread
}>

export type Report = Readonly<{ downloadMB: number; spaces: readonly SpaceStats[] }>

const MB = 1024 * 1024

const cells = (line: string): readonly string[] => line.split('|').slice(1, -1).map((c) => c.trim())

const number = (cell: string): number => {
  const n = Number(cell.replace(/[,_\s]/g, ''))
  if (!Number.isFinite(n)) throw new Error(`docs/perf.md: ${cell} is not a number`)
  return n
}

export const parseBudgets = (md: string): Budgets => {
  const rows = md.split('\n').filter((l) => l.trim().startsWith('|')).map((l) => cells(l.trim()))
  const spaces = Object.fromEntries(
    rows
      .filter((r) => r.length === 4 && /^`[a-z]+`$/.test(r[0] ?? ''))
      .map((r) => [r[0]!.slice(1, -1), { drawCalls: number(r[1]!), triangles: number(r[2]!), textureMB: number(r[3]!) }] as const),
  )
  const download = rows.find((r) => r[0] === 'Initial download')
  if (!download?.[1]) throw new Error('docs/perf.md: no "Initial download" row')
  if (Object.keys(spaces).length === 0) throw new Error('docs/perf.md: no per-space budget rows')
  return { spaces, downloadMB: number(download[1]) }
}

export const spread = (xs: readonly number[]): Spread => {
  if (xs.length === 0) return { mean: 0, p95: 0, max: 0 }
  const sorted = [...xs].sort((a, b) => a - b)
  return {
    mean: xs.reduce((a, b) => a + b, 0) / xs.length,
    p95: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))]!,
    max: sorted[sorted.length - 1]!,
  }
}

export const summarize = (samples: readonly Sample[], order: readonly string[]): readonly SpaceStats[] =>
  order.map((space) => {
    const mine = samples.filter((s) => s.space === space)
    const of = (f: (s: Sample) => number) => spread(mine.map(f))
    return {
      space,
      frames: mine.length,
      drawCalls: of((s) => s.drawCalls),
      triangles: of((s) => s.triangles),
      textureMB: of((s) => s.textureBytes / MB),
      vramMB: of((s) => s.vramBytes / MB),
      cpuMs: of((s) => s.cpuMs),
      frameMs: of((s) => s.frameMs),
    }
  })

export const breaches = (report: Report, budgets: Budgets): readonly string[] => [
  ...(report.downloadMB > budgets.downloadMB
    ? [`initial download is ${report.downloadMB.toFixed(2)} MB, budget ${budgets.downloadMB} MB`]
    : []),
  ...Object.keys(budgets.spaces)
    .filter((id) => !report.spaces.some((s) => s.space === id && s.frames > 0))
    .map((id) => `${id}: no frames recorded`),
  ...report.spaces.flatMap((s) => {
    const limit = budgets.spaces[s.space]
    if (!limit) return [`${s.space}: no budget row in docs/perf.md`]
    const over = (what: string, got: number, max: number, unit = '') =>
      got > max ? [`${s.space}: ${what} peaked at ${Math.round(got)}${unit}, budget ${max}${unit}`] : []
    return [
      ...over('draw calls', s.drawCalls.max, limit.drawCalls),
      ...over('triangles', s.triangles.max, limit.triangles),
      ...over('texture memory', s.textureMB.max, limit.textureMB, ' MB'),
    ]
  }),
]

const fixed = (n: number, d = 1): string => n.toFixed(d)

export const perfMarkdown = (report: Report, budgets: Budgets): string => {
  const failed = breaches(report, budgets)
  const head = [
    '### Frame budget',
    '',
    `Initial download: ${fixed(report.downloadMB, 2)} MB of ${budgets.downloadMB} MB.`,
    '',
    '| Space | Frames | Draw calls (max) | Triangles (max) | Texture MB (max) | VRAM MB (max) | CPU ms (mean / p95) |',
    '| ----- | -----: | ---------------: | --------------: | ---------------: | ------------: | ------------------: |',
  ]
  const rows = report.spaces.map((s) => {
    const l = budgets.spaces[s.space]
    const of = (got: number, max: number | undefined, d = 0) => `${fixed(got, d)}${max === undefined ? '' : ` / ${max}`}`
    return `| ${s.space} | ${s.frames} | ${of(s.drawCalls.max, l?.drawCalls)} | ${of(s.triangles.max, l?.triangles)} | ${of(s.textureMB.max, l?.textureMB, 1)} | ${fixed(s.vramMB.max)} | ${fixed(s.cpuMs.mean)} / ${fixed(s.cpuMs.p95)} |`
  })
  const tail = failed.length
    ? ['', '**Over budget:**', '', ...failed.map((f) => `- ${f}`)]
    : ['', 'Every space is within budget. CPU frame time is reported only: headless Chromium renders in software.']
  return [...head, ...rows, ...tail, ''].join('\n')
}
