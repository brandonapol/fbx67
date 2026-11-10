import type { PNG } from 'pngjs'

// The pass test against a target frame (docs/art/README.md#target-frames): the 1st, 50th and 99th percentile of Rec.709
// luma on the final sRGB frame, and the hue of the frame's mean sRGB color.

export type Look = Readonly<{ p1: number; p50: number; p99: number; hue: number }>

export const TOLERANCE = Object.freeze({ luma: 10, hue: 8 })

// Measured on the targets (docs/art/README.md, "Measured on the targets").
export const TARGETS: Readonly<Record<'silverPan' | 'secondAve' | 'surveyCamp', Look>> = {
  silverPan: { p1: 28, p50: 68, p99: 193, hue: 27 },
  secondAve: { p1: 32, p50: 88, p99: 205, hue: 22 },
  surveyCamp: { p1: 33, p50: 78, p99: 196, hue: 32 },
}

const hueOf = (r: number, g: number, b: number): number => {
  const [max, min] = [Math.max(r, g, b), Math.min(r, g, b)]
  const d = max - min
  if (d === 0) return 0
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return (h * 60 + 360) % 360
}

export const lookOf = (png: Pick<PNG, 'width' | 'height' | 'data'>): Look => {
  const n = png.width * png.height
  const counts = new Array<number>(256).fill(0)
  const sum = [0, 0, 0]
  for (let i = 0; i < n; i++) {
    const [r, g, b] = [png.data[i * 4], png.data[i * 4 + 1], png.data[i * 4 + 2]]
    counts[Math.min(255, Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b))]++
    sum[0] += r
    sum[1] += g
    sum[2] += b
  }
  const percentile = (q: number): number => {
    const want = q * n
    const go = (v: number, seen: number): number => (v >= 255 || seen + counts[v] >= want ? v : go(v + 1, seen + counts[v]))
    return go(0, 0)
  }
  return { p1: percentile(0.01), p50: percentile(0.5), p99: percentile(0.99), hue: Math.round(hueOf(sum[0] / n, sum[1] / n, sum[2] / n)) }
}

const hueGap = (a: number, b: number): number => Math.abs(((a - b + 540) % 360) - 180)

// What is out of tolerance, as lines a report can print; empty when the frame passes.
export const misses = (got: Look, target: Look): readonly string[] => [
  ...(['p1', 'p50', 'p99'] as const)
    .filter((k) => Math.abs(got[k] - target[k]) > TOLERANCE.luma)
    .map((k) => `${k} luma ${got[k]}, target ${target[k]} ± ${TOLERANCE.luma}`),
  ...(hueGap(got.hue, target.hue) > TOLERANCE.hue ? [`mean hue ${got.hue}°, target ${target.hue}° ± ${TOLERANCE.hue}°`] : []),
]
