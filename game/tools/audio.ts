// Rebuilds game/public/audio and game/src/takes.ts from CC0 freesound recordings. Each source is the sound's HQ
// preview, downloaded once into game/.cache/audio and checked against its pinned MD5. A bed is trimmed, crossfaded
// end into start so it loops without a seam, and normalized to BED_RMS; a set of takes is cut at hand-picked onsets,
// each take faded and normalized to SHOT_PEAK, and packed into one file. Everything encodes as Opus in WebM.
// Run through `make generate/audio`; every source here has a row in docs/audio/sources.md.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const RATE = 48000
export const BED_RMS = 0.1
export const SHOT_PEAK = 0.5
export const CEILING = 0.95
const GAP = 0.05
const FADE_IN = 0.005
const FADE_OUT = 0.03

export type Slice = readonly [start: number, length: number]
export type Channels = readonly Float32Array[]

type Source = Readonly<{ id: number; preview: string; md5: string }>
type BedCut = Readonly<{ kind: 'bed'; source: Source; start: number; length: number; fade: number; kbps: number }>
type ShotCut = Readonly<{ kind: 'shots'; source: Source; takes: readonly Slice[]; kbps: number }>
type Cut = BedCut | ShotCut

const preview = (id: number, file: string, md5: string): Source => ({
  id,
  preview: `https://cdn.freesound.org/previews/${Math.floor(id / 1000)}/${file}-hq.ogg`,
  md5,
})

// Onsets were read off a 5 ms peak envelope; each take starts 10 ms before its onset.
const at = (onsets: readonly number[], length: number): readonly Slice[] => onsets.map((t) => [t - 0.01, length] as const)

export const CUTS: Readonly<Record<string, Cut>> = {
  walla: { kind: 'bed', source: preview(455732, '455732_612689', '9ac51007a2c5fd19459a3ac05b1a662b'), start: 1, length: 27, fade: 1.5, kbps: 64 },
  creek: { kind: 'bed', source: preview(231536, '231536_4034520', '41acdffdd15dbe2121b3808ecfd2b24b'), start: 0.5, length: 33, fade: 2, kbps: 64 },
  spruce: { kind: 'bed', source: preview(403051, '403051_338690', 'cfa7bcf1dc783fb5af0c42c7c31981e8'), start: 0, length: 78, fade: 2.5, kbps: 48 },
  rain: { kind: 'bed', source: preview(405630, '405630_5923045', '52fb0ff8877ac0ca9c3629430dfcc349'), start: 2, length: 38, fade: 2, kbps: 64 },
  flood: { kind: 'bed', source: preview(721098, '721098_2061858', 'f84e4ce8a1b555e4039c672bedf7eef1'), start: 36, length: 40, fade: 2, kbps: 64 },
  clink: {
    kind: 'shots',
    source: preview(325195, '325195_2291325', '91141b40293bb4f3a9dc754eede8ba80'),
    takes: at([3.98, 5.13, 6.19, 7.55, 8.62, 10.22, 16.08, 20.11, 21.16, 22.07, 24.05, 26.77, 29.23], 0.7),
    kbps: 48,
  },
  screen: { kind: 'shots', source: preview(45643, '45643_515803', '2bb1a503ea7b23bb32a9017093f22f28'), takes: [[0.6, 7.5]], kbps: 48 },
  wood: {
    kind: 'shots',
    source: preview(208104, '208104_2943165', 'd882acbbd8227757f8df4c5fd4d62d55'),
    takes: at([0.96, 1.92, 2.9, 3.79, 4.69, 5.67, 6.75, 7.89, 9.1, 10.65, 11.54, 12.89], 0.35),
    kbps: 48,
  },
  gravel: {
    kind: 'shots',
    source: preview(353799, '353799_5337613', 'aeff4ce1ca495922565b33f85963d486'),
    takes: at([0.34, 2.29, 3.21, 4.19, 5.16], 0.4),
    kbps: 48,
  },
}

export const rms = (ch: Channels): number => {
  const n = ch.reduce((a, c) => a + c.length, 0)
  const sum = ch.reduce((a, c) => c.reduce((s, v) => s + v * v, a), 0)
  return n ? Math.sqrt(sum / n) : 0
}

export const peak = (ch: Channels): number => ch.reduce((a, c) => c.reduce((m, v) => Math.max(m, Math.abs(v)), a), 0)

export const scale = (ch: Channels, k: number): Channels => ch.map((c) => c.map((v) => v * k))

export const KNEE = 0.8

// Above the knee a sample bends smoothly toward the ceiling and never past it.
export const limit = (ch: Channels, knee = KNEE, ceiling = CEILING): Channels =>
  ch.map((c) =>
    c.map((v) => {
      const a = Math.abs(v)
      return a <= knee ? v : Math.sign(v) * (knee + (ceiling - knee) * Math.tanh((a - knee) / (ceiling - knee)))
    }),
  )

// To the target RMS, then the rare transient that would clip (a big drop of rain, a laugh) is limited, not the bed
// turned down to fit it.
export const normalizeRms = (ch: Channels, target: number): Channels => {
  const r = rms(ch)
  return r ? limit(scale(ch, target / r)) : ch
}

export const normalizePeak = (ch: Channels, target: number): Channels => {
  const p = peak(ch)
  return p ? scale(ch, target / p) : ch
}

// A loop of `length` samples from `start`: the `fade` samples after the end are crossfaded, equal power, over the
// head, so the last sample runs straight into the first.
export const loopSeam = (ch: Channels, start: number, length: number, fade: number): Channels => {
  if (start < 0 || fade > length || start + length + fade > (ch[0]?.length ?? 0)) throw new Error('loop runs past the source')
  return ch.map((c) =>
    Float32Array.from({ length }, (_, i) => {
      if (i >= fade) return c[start + i]
      const t = i / fade
      return c[start + i] * Math.sqrt(t) + c[start + length + i] * Math.sqrt(1 - t)
    }),
  )
}

export const fadeEdges = (ch: Channels, fadeIn: number, fadeOut: number): Channels =>
  ch.map((c) => c.map((v, i) => v * Math.min(1, (i + 1) / Math.max(1, fadeIn), (c.length - i) / Math.max(1, fadeOut))))

const take = (ch: Channels, [start, length]: Slice): Channels => {
  const a = Math.max(0, Math.round(start * RATE))
  const b = Math.min(ch[0].length, a + Math.round(length * RATE))
  return ch.map((c) => c.slice(a, b))
}

// The takes back to back with a short silence between, and where each now sits in the packed file.
export const pack = (takes: readonly Channels[], gap: number): Readonly<{ channels: Channels; slices: readonly Slice[] }> => {
  const width = takes[0]?.length ?? 1
  const gapN = Math.round(gap * RATE)
  const starts = takes.reduce<number[]>((acc, t, i) => [...acc, i ? acc[i - 1] + takes[i - 1][0].length + gapN : 0], [])
  const total = takes.length ? starts[starts.length - 1] + takes[takes.length - 1][0].length : 0
  const channels = Array.from({ length: width }, (_, c) => {
    const out = new Float32Array(total)
    takes.forEach((t, i) => out.set(t[c], starts[i]))
    return out
  })
  const round = (s: number) => Math.round(s * 1e4) / 1e4
  return { channels, slices: takes.map((t, i) => [round(starts[i] / RATE), round(t[0].length / RATE)] as const) }
}

export const shots = (ch: Channels, takes: readonly Slice[]) =>
  pack(
    takes.map((s) => normalizePeak(fadeEdges(take(ch, s), FADE_IN * RATE, FADE_OUT * RATE), SHOT_PEAK)),
    GAP,
  )

export const bed = (ch: Channels, cut: Pick<BedCut, 'start' | 'length' | 'fade'>): Channels =>
  normalizeRms(loopSeam(ch, Math.round(cut.start * RATE), Math.round(cut.length * RATE), Math.round(cut.fade * RATE)), BED_RMS)

const here = dirname(fileURLToPath(import.meta.url))
const cacheDir = join(here, '..', '.cache', 'audio')
const outDir = join(here, '..', 'public', 'audio')
const takesPath = join(here, '..', 'src', 'takes.ts')

const md5 = (b: Uint8Array): string => createHash('md5').update(b).digest('hex')

const fetchSource = async (s: Source): Promise<string> => {
  const path = join(cacheDir, `${s.id}.ogg`)
  const cached = await stat(path).then(() => true, () => false)
  if (!cached) {
    const res = await fetch(s.preview)
    if (!res.ok) throw new Error(`${s.preview}: ${res.status}`)
    await writeFile(path, new Uint8Array(await res.arrayBuffer()))
  }
  const sum = md5(await readFile(path))
  if (sum !== s.md5) throw new Error(`${s.id}: md5 ${sum}, pinned ${s.md5}`)
  return path
}

const decode = (path: string, channels: number): Channels => {
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', path, '-ac', String(channels), '-ar', String(RATE), '-f', 'f32le', '-'], {
    maxBuffer: 1 << 30,
  })
  const all = new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4)
  const n = all.length / channels
  return Array.from({ length: channels }, (_, c) => Float32Array.from({ length: n }, (_, i) => all[i * channels + c]))
}

const encode = (ch: Channels, kbps: number, path: string): void => {
  const n = ch[0].length
  const inter = new Float32Array(n * ch.length)
  ch.forEach((c, k) => c.forEach((v, i) => (inter[i * ch.length + k] = v)))
  execFileSync(
    'ffmpeg',
    ['-v', 'error', '-y', '-f', 'f32le', '-ar', String(RATE), '-ac', String(ch.length), '-i', '-', '-c:a', 'libopus', '-b:a', `${kbps}k`,
      '-application', 'audio', '-map_metadata', '-1', '-fflags', '+bitexact', '-flags:a', '+bitexact', path],
    { input: new Uint8Array(inter.buffer) },
  )
}

const main = async (): Promise<void> => {
  await mkdir(cacheDir, { recursive: true })
  await mkdir(outDir, { recursive: true })
  const seconds: Record<string, number> = {}
  const slices: Record<string, readonly Slice[]> = {}
  for (const [name, cut] of Object.entries(CUTS)) {
    const path = await fetchSource(cut.source)
    const out = join(outDir, `${name}.webm`)
    if (cut.kind === 'bed') {
      const ch = bed(decode(path, 2), cut)
      encode(ch, cut.kbps, out)
      seconds[name] = Math.round((ch[0].length / RATE) * 1e4) / 1e4
    } else {
      const packed = shots(decode(path, 1), cut.takes)
      encode(packed.channels, cut.kbps, out)
      slices[name] = packed.slices
    }
    console.log(`${name}: ${(await stat(out)).size} bytes`)
  }
  const json = (v: unknown) => JSON.stringify(v).replace(/"(\w+)":/g, '$1: ').replace(/,(?=[\w[])/g, ', ')
  await writeFile(
    takesPath,
    `// Generated by game/tools/audio.ts (make generate/audio): do not edit by hand.\n` +
      `export const takes = {\n  seconds: ${json(seconds)},\n  slices: ${json(slices)},\n} as const\n`,
  )
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main()
