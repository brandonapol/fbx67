import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'

export const THRESHOLD = 0.1
export const MAX_CHANGED = 0.002

export type Verdict = 'same' | 'changed' | 'missing' | 'updated'

export type FrameResult = Readonly<{ name: string; verdict: Verdict; changed: number; ratio: number }>

export type Diff = Readonly<{ changed: number; ratio: number; image?: PNG }>

export const diff = (before: PNG, after: PNG): Diff => {
  if (before.width !== after.width || before.height !== after.height) return { changed: Infinity, ratio: 1 }
  const image = new PNG({ width: after.width, height: after.height })
  const changed = pixelmatch(before.data, after.data, image.data, after.width, after.height, { threshold: THRESHOLD })
  return { changed, ratio: changed / (after.width * after.height), image }
}

export type FrameDirs = Readonly<{ baselines: string; report: string; update: boolean }>

export const checkFrame = (dirs: FrameDirs, name: string, shot: Buffer): FrameResult => {
  const file = `${name}.png`
  const frames = join(dirs.report, 'frames')
  mkdirSync(frames, { recursive: true })
  writeFileSync(join(frames, file), shot)
  const baseline = join(dirs.baselines, file)
  if (dirs.update) {
    mkdirSync(dirs.baselines, { recursive: true })
    writeFileSync(baseline, shot)
    return { name, verdict: 'updated', changed: 0, ratio: 0 }
  }
  if (!existsSync(baseline)) return { name, verdict: 'missing', changed: Infinity, ratio: 1 }
  const before = readFileSync(baseline)
  const d = diff(PNG.sync.read(before), PNG.sync.read(shot))
  if (d.ratio <= MAX_CHANGED) return { name, verdict: 'same', changed: d.changed, ratio: d.ratio }
  const out = join(dirs.report, 'diff')
  mkdirSync(out, { recursive: true })
  writeFileSync(join(out, `${name}.before.png`), before)
  writeFileSync(join(out, `${name}.after.png`), shot)
  if (d.image) writeFileSync(join(out, `${name}.diff.png`), PNG.sync.write(d.image))
  return { name, verdict: 'changed', changed: d.changed, ratio: d.ratio }
}

const percent = (r: number): string => `${(r * 100).toFixed(3)}%`

export const framesMarkdown = (results: readonly FrameResult[], artifact: string): string => {
  const bad = results.filter((r) => r.verdict === 'changed' || r.verdict === 'missing')
  const rows = results.map((r) => `| ${r.name} | ${r.verdict} | ${Number.isFinite(r.changed) ? percent(r.ratio) : 'n/a'} |`)
  const images = bad.flatMap((r) =>
    r.verdict === 'missing'
      ? [`- \`${r.name}\`: no baseline; \`frames/${r.name}.png\``]
      : [`- \`${r.name}\`: \`diff/${r.name}.before.png\`, \`diff/${r.name}.after.png\`, \`diff/${r.name}.diff.png\``],
  )
  return [
    '### Frames',
    '',
    `Tolerance: ${percent(MAX_CHANGED)} of pixels past a pixelmatch threshold of ${THRESHOLD}.`,
    '',
    '| Frame | Verdict | Changed |',
    '| ----- | ------- | ------: |',
    ...rows,
    '',
    ...(bad.length
      ? [
          `**${bad.length} frame(s) changed.** Images are in the \`${artifact}\` artifact:`,
          '',
          ...images,
          '',
          'If the change is meant, run `make generate/baselines` and commit `game/smoke/baselines/`, or copy the',
          "artifact's `frames/*.png` there.",
          '',
        ]
      : []),
  ].join('\n')
}
