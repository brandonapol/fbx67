import type { Sample } from '../src/probe.ts'

export type Limits = Readonly<{ drawCalls: number; triangles: number; textureMB: number }>

export type Budgets = Readonly<{ spaces: Readonly<Record<string, Limits>>; downloadMB: number }>

export type Spread = Readonly<{ median: number; p95: number; max: number }>

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

export const MB = 1e6

const SPACE_HEADER = ['Space', 'Draw calls', 'Triangles', 'Texture memory (MB)']
const DOWNLOAD_HEADER = ['Download', 'Limit (MB)']

const fail = (why: string): never => {
  throw new Error(`docs/perf.md: ${why}`)
}

const cells = (line: string): readonly string[] => line.trim().split('|').slice(1, -1).map((c) => c.trim())

const number = (cell: string): number => {
  const n = Number(cell.replace(/[,_\s]/g, ''))
  return Number.isFinite(n) && cell.trim() !== '' ? n : fail(`${cell} is not a number`)
}

const section = (md: string, heading: string): readonly string[] => {
  const lines = md.split('\n')
  const start = lines.findIndex((l) => l.trim() === heading)
  if (start < 0) fail(`no ${heading} section`)
  const rest = lines.slice(start + 1)
  const end = rest.findIndex((l) => /^#{1,2} /.test(l))
  return end < 0 ? rest : rest.slice(0, end)
}

const tables = (lines: readonly string[]): readonly (readonly (readonly string[])[])[] =>
  lines
    .reduce<string[][]>((acc, l, i) => {
      if (!l.trim().startsWith('|')) return acc
      if (i > 0 && lines[i - 1]!.trim().startsWith('|')) acc[acc.length - 1]!.push(l)
      else acc.push([l])
      return acc
    }, [])
    .map((t) => t.map(cells))

const body = (t: readonly (readonly string[])[], header: readonly string[]): readonly (readonly string[])[] => {
  if (t[0]?.join('|') !== header.join('|')) fail(`expected a table headed | ${header.join(' | ')} |`)
  if (!t[1]?.every((c) => /^:?-+:?$/.test(c))) fail(`the ${header[0]} table has no separator row`)
  return t.slice(2)
}

const spaceRow = (r: readonly string[]): readonly [string, Limits] => {
  if (r.length !== 4) fail(`a budget row has ${r.length} cells, expected 4: ${r.join(' | ')}`)
  const id = /^`([a-z]+)`$/.exec(r[0]!)?.[1] ?? fail(`${r[0]} is not a backticked space id`)
  return [id, { drawCalls: number(r[1]!), triangles: number(r[2]!), textureMB: number(r[3]!) }]
}

export const parseBudgets = (md: string): Budgets => {
  const found = tables(section(md, '## Budgets'))
  const spaceTable = found.find((t) => t[0]?.[0] === SPACE_HEADER[0]) ?? fail('no per-space budget table')
  const downloadTable = found.find((t) => t[0]?.[0] === DOWNLOAD_HEADER[0]) ?? fail('no download budget table')
  const rows = body(spaceTable, SPACE_HEADER).map(spaceRow)
  if (rows.length === 0) fail('the per-space table is empty')
  const ids = rows.map(([id]) => id)
  if (new Set(ids).size !== ids.length) fail('a space has two budget rows')
  const download = body(downloadTable, DOWNLOAD_HEADER).find((r) => r[0] === 'Initial download') ?? fail('no "Initial download" row')
  return { spaces: Object.fromEntries(rows), downloadMB: number(download[1] ?? '') }
}

const rank = (sorted: readonly number[], q: number): number => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))]!

export const spread = (xs: readonly number[]): Spread => {
  if (xs.length === 0) return { median: 0, p95: 0, max: 0 }
  const sorted = [...xs].sort((a, b) => a - b)
  return { median: rank(sorted, 0.5), p95: rank(sorted, 0.95), max: sorted[sorted.length - 1]! }
}

export const summarize = (samples: readonly Sample[], known: readonly string[]): readonly SpaceStats[] =>
  [...new Set([...known, ...samples.map((s) => s.space)])].map((space) => {
    const mine = samples.filter((s) => s.space === space)
    const over = (f: (s: Sample) => number) => spread(mine.map(f))
    return {
      space,
      frames: mine.length,
      drawCalls: over((s) => s.drawCalls),
      triangles: over((s) => s.triangles),
      textureMB: over((s) => s.textureBytes / MB),
      vramMB: over((s) => s.vramBytes / MB),
      cpuMs: over((s) => s.cpuMs),
      frameMs: over((s) => s.frameMs),
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
    const exceeds = (what: string, got: number, max: number, unit = '') =>
      got > max ? [`${s.space}: ${what} peaked at ${Math.round(got)}${unit}, budget ${max}${unit}`] : []
    return [
      ...exceeds('draw calls', s.drawCalls.max, limit.drawCalls),
      ...exceeds('triangles', s.triangles.max, limit.triangles),
      ...exceeds('texture memory', s.textureMB.max, limit.textureMB, ' MB'),
    ]
  }),
]

const fixed = (n: number, d = 1): string => n.toFixed(d)

export const perfMarkdown = (report: Report, budgets: Budgets): string => {
  const failed = breaches(report, budgets)
  const head = [
    '### Frame budget',
    '',
    `Initial download: ${fixed(report.downloadMB, 2)} MB of ${budgets.downloadMB} MB (1 MB = 10^6 bytes).`,
    '',
    '| Space | Frames | Draw calls (max) | Triangles (max) | Texture MB (max) | VRAM MB (max) | CPU ms (median / p95 / max) |',
    '| ----- | -----: | ---------------: | --------------: | ---------------: | ------------: | --------------------------: |',
  ]
  const rows = report.spaces.map((s) => {
    const l = budgets.spaces[s.space]
    const against = (got: number, max: number | undefined, d = 0) => `${fixed(got, d)}${max === undefined ? '' : ` / ${max}`}`
    const cpu = [s.cpuMs.median, s.cpuMs.p95, s.cpuMs.max].map((n) => fixed(n)).join(' / ')
    return `| ${s.space} | ${s.frames} | ${against(s.drawCalls.max, l?.drawCalls)} | ${against(s.triangles.max, l?.triangles)} | ${against(s.textureMB.max, l?.textureMB, 1)} | ${fixed(s.vramMB.max)} | ${cpu} |`
  })
  const tail = failed.length
    ? ['', '**Over budget:**', '', ...failed.map((f) => `- ${f}`)]
    : ['', 'Every space is within budget. CPU frame time is reported only: headless Chromium renders in software.']
  return [...head, ...rows, ...tail, ''].join('\n')
}
