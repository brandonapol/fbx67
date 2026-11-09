import type { Surface } from './footsteps.ts'
import { snowAt } from './footsteps.ts'
import type { Color, Layer, Noise, Spot } from './soundscape.ts'

export type Rand = () => number

export const mulberry = (seed: number): Rand => {
  const s = { a: seed >>> 0 }
  return () => {
    s.a = (s.a + 0x6d2b79f5) >>> 0
    const t1 = Math.imul(s.a ^ (s.a >>> 15), 1 | s.a)
    const t2 = (t1 + Math.imul(t1 ^ (t1 >>> 7), 61 | t1)) ^ t1
    return ((t2 ^ (t2 >>> 14)) >>> 0) / 4294967296
  }
}

export const between = (rand: Rand, lo: number, hi: number): number => lo + (hi - lo) * rand()

const pinkStep = (b: readonly number[], w: number): readonly number[] => [
  0.99886 * b[0] + w * 0.0555179,
  0.99332 * b[1] + w * 0.0750759,
  0.969 * b[2] + w * 0.153852,
  0.8665 * b[3] + w * 0.3104856,
  0.55 * b[4] + w * 0.5329522,
  -0.7616 * b[5] - w * 0.016898,
  w * 0.115926,
]

export const noiseSamples = (color: Color, n: number, seed: number): Float32Array<ArrayBuffer> => {
  const rand = mulberry(seed)
  const out = new Float32Array(n)
  const state = { pink: [0, 0, 0, 0, 0, 0, 0] as readonly number[], brown: 0 }
  out.forEach((_, i) => {
    const w = rand() * 2 - 1
    if (color === 'white') out[i] = w
    if (color === 'pink') {
      const b = state.pink
      out[i] = (b[0] + b[1] + b[2] + b[3] + b[4] + b[5] + b[6] + w * 0.5362) * 0.11
      state.pink = pinkStep(b, w)
    }
    if (color === 'brown') {
      state.brown = (state.brown + 0.02 * w) / 1.02
      out[i] = state.brown * 3.5
    }
  })
  const peak = out.reduce((m, v) => Math.max(m, Math.abs(v)), 0)
  return peak > 1 ? out.map((v) => v / peak) : out
}

export const midiHz = (m: number): number => 440 * 2 ** ((m - 69) / 12)

export const TEMPO = 104

export const TUNE: readonly Readonly<{ root: number; chord: readonly number[] }>[] = [
  { root: 43, chord: [67, 71, 74] },
  { root: 40, chord: [67, 71, 76] },
  { root: 36, chord: [64, 67, 72] },
  { root: 38, chord: [66, 69, 74] },
]

export type Beat = Readonly<{ bass: number; chord?: readonly number[] }>

export const beatAt = (i: number): Beat => {
  const bar = TUNE[Math.floor(i / 4) % TUNE.length]
  const offbeat = i % 2 === 1
  return { bass: bar.root + (i % 4 === 2 ? 7 : 0), chord: offbeat ? bar.chord : undefined }
}

export const STRUM_TEMPO = 84

export const CHANGES: readonly Readonly<{ root: number; fifth: number; chord: readonly number[] }>[] = [
  { root: 40, fifth: 47, chord: [52, 56, 59, 64] },
  { root: 45, fifth: 40, chord: [57, 61, 64, 69] },
  { root: 40, fifth: 47, chord: [52, 56, 59, 64] },
  { root: 47, fifth: 42, chord: [54, 57, 59, 63] },
]

export type Pluck = Readonly<{ bass?: number; strum?: readonly number[] }>

export const strumAt = (i: number): Pluck => {
  const bar = CHANGES[Math.floor(i / 4) % CHANGES.length]
  return i % 2 === 0 ? { bass: i % 4 === 0 ? bar.root : bar.fifth } : { strum: bar.chord }
}

export type Buffers = Readonly<Record<Color, AudioBuffer>>

const BUFFER_SECONDS = 6

export const makeBuffers = (ctx: BaseAudioContext): Buffers => {
  const n = Math.floor(ctx.sampleRate * BUFFER_SECONDS)
  const make = (color: Color, seed: number): AudioBuffer => {
    const b = ctx.createBuffer(1, n, ctx.sampleRate)
    b.copyToChannel(noiseSamples(color, n, seed), 0)
    return b
  }
  return { white: make('white', 1), pink: make('pink', 2), brown: make('brown', 3) }
}

export type Voice = Readonly<{ out: AudioNode; stop: (at: number) => void; tick?: (now: number) => void }>

const QUIET = 0.0001

export const RUMBLE_CUT = 70

const envelope = (p: AudioParam, at: number, peak: number, attack: number, decay: number): number => {
  p.setValueAtTime(QUIET, at)
  p.exponentialRampToValueAtTime(Math.max(QUIET, peak), at + attack)
  p.exponentialRampToValueAtTime(QUIET, at + attack + decay)
  return at + attack + decay
}

const filter = (ctx: BaseAudioContext, type: BiquadFilterType, freq: number, q = 0.7): BiquadFilterNode => {
  const f = ctx.createBiquadFilter()
  f.type = type
  f.frequency.value = freq
  f.Q.value = q
  return f
}

const gainNode = (ctx: BaseAudioContext, v: number): GainNode => {
  const g = ctx.createGain()
  g.gain.value = v
  return g
}

const lfo = (ctx: BaseAudioContext, rate: number, depth: number, target: AudioParam): OscillatorNode => {
  const o = ctx.createOscillator()
  o.frequency.value = rate
  o.connect(gainNode(ctx, depth)).connect(target)
  return o
}

const loop = (ctx: BaseAudioContext, buffer: AudioBuffer): AudioBufferSourceNode => {
  const s = ctx.createBufferSource()
  s.buffer = buffer
  s.loop = true
  return s
}

const noiseVoice = (ctx: BaseAudioContext, buffers: Buffers, l: Noise, rand: Rand): Voice => {
  const src = loop(ctx, buffers[l.color])
  const f = filter(ctx, l.filter, l.freq, l.q)
  const g = gainNode(ctx, l.gain)
  const head = l.color === 'brown' ? src.connect(filter(ctx, 'highpass', RUMBLE_CUT)) : src
  head.connect(f).connect(g)
  const w = l.wobble
  const mod = w ? lfo(ctx, w.rate, w.on === 'gain' ? l.gain * w.depth : l.freq * w.depth, w.on === 'gain' ? g.gain : f.frequency) : undefined
  src.start(ctx.currentTime, between(rand, 0, BUFFER_SECONDS))
  mod?.start()
  return { out: g, stop: (at) => [src, mod].forEach((n) => n?.stop(at)) }
}

const wallaVoice = (ctx: BaseAudioContext, buffers: Buffers, l: Extract<Layer, { kind: 'walla' }>, rand: Rand): Voice => {
  const out = filter(ctx, 'lowpass', 2600)
  const g = gainNode(ctx, l.gain / Math.sqrt(l.voices))
  out.connect(g)
  const nodes = Array.from({ length: l.voices }, () => {
    const src = loop(ctx, buffers.pink)
    const f1 = filter(ctx, 'bandpass', between(rand, 380, 820), 5)
    const f2 = filter(ctx, 'bandpass', between(rand, 1100, 2300), 7)
    const syllable = gainNode(ctx, 0.5)
    const turn = gainNode(ctx, 0.5)
    src.connect(f1).connect(syllable)
    src.connect(f2).connect(syllable)
    syllable.connect(turn).connect(out)
    const mods = [
      lfo(ctx, between(rand, 3, 6), 0.5, syllable.gain),
      lfo(ctx, between(rand, 0.08, 0.3), 0.5, turn.gain),
      lfo(ctx, between(rand, 0.8, 1.6), 140, f1.frequency),
    ]
    src.start(ctx.currentTime, between(rand, 0, BUFFER_SECONDS))
    mods.forEach((m) => m.start(ctx.currentTime + between(rand, 0, 1)))
    return [src, ...mods]
  }).flat()
  return { out: g, stop: (at) => nodes.forEach((n) => n.stop(at)) }
}

const tone = (
  ctx: BaseAudioContext,
  dest: AudioNode,
  type: OscillatorType,
  freq: number,
  at: number,
  peak: number,
  attack: number,
  decay: number,
  endFreq?: number,
): number => {
  const o = ctx.createOscillator()
  o.type = type
  o.frequency.setValueAtTime(freq, at)
  if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, at + attack + decay)
  const g = ctx.createGain()
  const end = envelope(g.gain, at, peak, attack, decay)
  o.connect(g).connect(dest)
  o.start(at)
  o.stop(end + 0.05)
  return end
}

const burst = (
  ctx: BaseAudioContext,
  buffers: Buffers,
  dest: AudioNode,
  color: Color,
  type: BiquadFilterType,
  freq: number,
  q: number,
  at: number,
  peak: number,
  attack: number,
  decay: number,
  rand: Rand,
  endFreq?: number,
): number => {
  const s = ctx.createBufferSource()
  s.buffer = buffers[color]
  const f = filter(ctx, type, freq, q)
  if (endFreq) f.frequency.exponentialRampToValueAtTime(endFreq, at + attack + decay)
  const g = ctx.createGain()
  const end = envelope(g.gain, at, peak, attack, decay)
  s.connect(f).connect(g).connect(dest)
  s.start(at, between(rand, 0, BUFFER_SECONDS - 1))
  s.stop(end + 0.05)
  return end
}

const jukeboxVoice = (ctx: BaseAudioContext, l: Extract<Layer, { kind: 'jukebox' }>): Voice => {
  const cabinet = filter(ctx, 'lowpass', 3000, 0.9)
  const g = gainNode(ctx, l.gain)
  cabinet.connect(g)
  const beat = 60 / TEMPO
  const s = { i: 0, next: ctx.currentTime + 0.1, stopped: false }
  const tick = (now: number): void => {
    if (s.stopped) return
    if (s.next < now) s.next = now + 0.05
    while (s.next < now + 0.25) {
      const b = beatAt(s.i)
      tone(ctx, cabinet, 'triangle', midiHz(b.bass), s.next, 0.3, 0.01, beat * 0.8)
      b.chord?.forEach((m) => tone(ctx, cabinet, 'square', midiHz(m), s.next, 0.3, 0.01, beat * 0.45))
      s.i += 1
      s.next += beat
    }
  }
  return { out: g, tick, stop: () => (s.stopped = true) }
}

const reelVoice = (ctx: BaseAudioContext, buffers: Buffers, l: Extract<Layer, { kind: 'reel' }>, rand: Rand): Voice => {
  const g = gainNode(ctx, l.gain)
  const hiss = loop(ctx, buffers.white)
  const hissGain = gainNode(ctx, 0.25)
  hiss.connect(filter(ctx, 'highpass', 5000)).connect(hissGain).connect(g)
  const hum = ctx.createOscillator()
  hum.frequency.value = 60
  const humGain = gainNode(ctx, 0.5)
  hum.connect(humGain).connect(g)
  const motor = ctx.createOscillator()
  motor.type = 'sawtooth'
  motor.frequency.value = 120
  const motorGain = gainNode(ctx, 0.05)
  motor.connect(filter(ctx, 'lowpass', 400)).connect(motorGain).connect(g)
  const flutter = lfo(ctx, 5.5, 1.2, motor.frequency)
  const nodes = [hiss, hum, motor, flutter]
  hiss.start(ctx.currentTime, between(rand, 0, BUFFER_SECONDS))
  nodes.slice(1).forEach((n) => n.start())
  return { out: g, stop: (at) => nodes.forEach((n) => n.stop(at)) }
}

const idleVoice = (ctx: BaseAudioContext, buffers: Buffers, l: Extract<Layer, { kind: 'idle' }>, rand: Rand): Voice => {
  const g = gainNode(ctx, l.gain)
  const engine = ctx.createOscillator()
  engine.type = 'sawtooth'
  engine.frequency.value = (l.rpm / 60) * 2
  const lumpy = lfo(ctx, between(rand, 0.4, 0.9), 1.5, engine.frequency)
  engine.connect(filter(ctx, 'lowpass', 160, 1.2)).connect(gainNode(ctx, 0.5)).connect(g)
  const exhaust = loop(ctx, buffers.brown)
  exhaust.connect(filter(ctx, 'highpass', RUMBLE_CUT)).connect(filter(ctx, 'lowpass', 240)).connect(gainNode(ctx, 0.5)).connect(g)
  exhaust.start(ctx.currentTime, between(rand, 0, BUFFER_SECONDS))
  const nodes = [engine, lumpy, exhaust]
  nodes.slice(0, 2).forEach((n) => n.start())
  return { out: g, stop: (at) => nodes.forEach((n) => n.stop(at)) }
}

const humVoice = (ctx: BaseAudioContext, l: Extract<Layer, { kind: 'hum' }>): Voice => {
  const g = gainNode(ctx, l.gain)
  const mains = [60, 120, 180].map((f, i) => {
    const o = ctx.createOscillator()
    o.frequency.value = f
    o.connect(gainNode(ctx, [0.6, 0.3, 0.12][i])).connect(g)
    return o
  })
  const ballast = ctx.createOscillator()
  ballast.type = 'square'
  ballast.frequency.value = 120
  ballast.connect(filter(ctx, 'bandpass', 1800, 2)).connect(gainNode(ctx, 0.05 * l.buzz)).connect(g)
  const nodes = [...mains, ballast]
  nodes.forEach((n) => n.start())
  return { out: g, stop: (at) => nodes.forEach((n) => n.stop(at)) }
}

const STRING_GAP = 0.014

const guitarVoice = (ctx: BaseAudioContext, l: Extract<Layer, { kind: 'guitar' }>, rand: Rand): Voice => {
  const body = filter(ctx, 'lowpass', 2400, 0.8)
  const g = gainNode(ctx, l.gain)
  body.connect(g)
  const beat = 60 / STRUM_TEMPO
  const s = { i: 0, next: ctx.currentTime + 0.1, stopped: false }
  const pluck = (m: number, at: number, peak: number, ring: number): number =>
    Math.max(tone(ctx, body, 'sawtooth', midiHz(m), at, peak, 0.003, ring), tone(ctx, body, 'triangle', midiHz(m) * 2, at, peak * 0.3, 0.002, ring * 0.4))
  const tick = (now: number): void => {
    if (s.stopped) return
    if (s.next < now) s.next = now + 0.05
    while (s.next < now + 0.25) {
      const p = strumAt(s.i)
      if (p.bass) pluck(p.bass, s.next, 0.16, beat * 1.6)
      p.strum?.forEach((m, k) => pluck(m, s.next + k * STRING_GAP + between(rand, 0, 0.004), 0.07, beat * 0.9))
      s.i += 1
      s.next += beat
    }
  }
  return { out: g, tick, stop: () => (s.stopped = true) }
}

const outboardVoice = (ctx: BaseAudioContext, buffers: Buffers, l: Extract<Layer, { kind: 'outboard' }>, rand: Rand): Voice => {
  const g = gainNode(ctx, l.gain)
  const motor = ctx.createOscillator()
  motor.type = 'sawtooth'
  motor.frequency.value = l.rpm / 60
  const throttle = lfo(ctx, between(rand, 0.1, 0.3), (l.rpm / 60) * 0.08, motor.frequency)
  motor.connect(filter(ctx, 'bandpass', 700, 1.4)).connect(gainNode(ctx, 0.6)).connect(g)
  const rasp = loop(ctx, buffers.white)
  rasp.connect(filter(ctx, 'bandpass', 2400, 0.9)).connect(gainNode(ctx, 0.12)).connect(g)
  rasp.start(ctx.currentTime, between(rand, 0, BUFFER_SECONDS))
  const nodes = [motor, throttle, rasp]
  nodes.slice(0, 2).forEach((n) => n.start())
  return { out: g, stop: (at) => nodes.forEach((n) => n.stop(at)) }
}

export const layerVoice = (ctx: BaseAudioContext, buffers: Buffers, l: Layer, rand: Rand): Voice => {
  if (l.kind === 'noise') return noiseVoice(ctx, buffers, l, rand)
  if (l.kind === 'walla') return wallaVoice(ctx, buffers, l, rand)
  if (l.kind === 'jukebox') return jukeboxVoice(ctx, l)
  if (l.kind === 'idle') return idleVoice(ctx, buffers, l, rand)
  if (l.kind === 'hum') return humVoice(ctx, l)
  if (l.kind === 'guitar') return guitarVoice(ctx, l, rand)
  if (l.kind === 'outboard') return outboardVoice(ctx, buffers, l, rand)
  return reelVoice(ctx, buffers, l, rand)
}

const latest = (ends: readonly number[], at: number): number => ends.reduce((a, b) => Math.max(a, b), at)

const concreteStep = (ctx: BaseAudioContext, buffers: Buffers, dest: AudioNode, rand: Rand, at: number, scale: number): number => {
  const k = between(rand, 0.85, 1.15)
  return Math.max(
    burst(ctx, buffers, dest, 'white', 'bandpass', 2600 * k, 1.8, at, 0.22 * scale, 0.001, 0.035, rand),
    burst(ctx, buffers, dest, 'brown', 'lowpass', 260 * k, 1, at, 0.5 * scale, 0.003, 0.07, rand),
  )
}

export const BOOTS = 6

export const bootGain = (i: number): number => Math.sin(((i + 0.5) / BOOTS) * Math.PI)

export const ROAR_SECONDS: readonly [number, number] = [1.2, 2.2]

const act1Spot = (ctx: BaseAudioContext, buffers: Buffers, which: Spot, dest: AudioNode, rand: Rand, at: number): number | undefined => {
  if (which === 'sandbag')
    return Math.max(
      burst(ctx, buffers, dest, 'brown', 'lowpass', between(rand, 130, 190), 1, at, 0.9, 0.005, 0.25, rand),
      burst(ctx, buffers, dest, 'white', 'bandpass', 1800, 1.2, at, 0.07, 0.003, 0.12, rand),
      rand() < 0.4 ? burst(ctx, buffers, dest, 'pink', 'bandpass', 700, 3, at + 0.05, 0.12, 0.02, 0.2, rand, 300) : at,
    )
  if (which === 'shout') {
    const mouth = filter(ctx, 'lowpass', 1800)
    const f1 = filter(ctx, 'bandpass', between(rand, 600, 800), 3)
    const f2 = filter(ctx, 'bandpass', between(rand, 1100, 1400), 4)
    f1.connect(mouth)
    f2.connect(mouth)
    mouth.connect(dest)
    const f = between(rand, 140, 220)
    const calls = 1 + Math.floor(rand() * 2)
    return latest(
      Array.from({ length: calls }, (_, i) => {
        const t = at + i * between(rand, 0.55, 0.8)
        const len = between(rand, 0.3, 0.5)
        return Math.max(tone(ctx, f1, 'sawtooth', f, t, 0.3, 0.06, len, f * 0.82), tone(ctx, f2, 'sawtooth', f, t, 0.15, 0.06, len, f * 0.82))
      }),
      at,
    )
  }
  if (which === 'drip') {
    const f = between(rand, 900, 1500)
    const peak = between(rand, 0.03, 0.07)
    return Math.max(tone(ctx, dest, 'sine', f, at, peak, 0.001, 0.06, f * 1.6), tone(ctx, dest, 'sine', f, at + 0.12, peak * 0.25, 0.001, 0.08, f * 1.6))
  }
  if (which === 'shove')
    return Math.max(
      burst(ctx, buffers, dest, 'pink', 'bandpass', 600, 1, at, 0.25, 0.04, 0.15, rand, 1400),
      burst(ctx, buffers, dest, 'brown', 'lowpass', 200, 1, at + 0.12, 0.7, 0.004, 0.18, rand),
    )
  if (which === 'stove') {
    const hit = burst(ctx, buffers, dest, 'brown', 'lowpass', 300, 1, at, 0.8, 0.003, 0.15, rand)
    return latest([hit, ...[180, 437, 692].map((f, i) => tone(ctx, dest, 'sine', f * between(rand, 0.97, 1.03), at, [0.2, 0.12, 0.07][i], 0.002, 1.1 - i * 0.3))], at)
  }
  if (which === 'bottle') {
    const shards = Array.from({ length: 5 }, (_, i) =>
      burst(ctx, buffers, dest, 'white', 'highpass', between(rand, 3000, 7000), 0.8, at + i * between(rand, 0.01, 0.04), between(rand, 0.08, 0.25), 0.001, between(rand, 0.03, 0.09), rand),
    )
    const rings = Array.from({ length: 3 }, () => tone(ctx, dest, 'sine', between(rand, 2600, 4200), at + between(rand, 0, 0.12), 0.05, 0.001, between(rand, 0.1, 0.25)))
    return latest([...shards, ...rings], at)
  }
  if (which === 'antlers') {
    const knocks = 3 + Math.floor(rand() * 2)
    const clatter = Array.from({ length: knocks }, (_, i) =>
      burst(ctx, buffers, dest, 'pink', 'bandpass', between(rand, 600, 1100), 6, at + i * between(rand, 0.06, 0.14), between(rand, 0.2, 0.4), 0.002, 0.05, rand),
    )
    return latest([...clatter, burst(ctx, buffers, dest, 'brown', 'lowpass', 180, 1, at + knocks * 0.1, 0.6, 0.004, 0.2, rand)], at)
  }
  if (which === 'roar') {
    const rise = between(rand, ROAR_SECONDS[0], ROAR_SECONDS[1])
    const fall = rise * 1.5
    return Math.max(
      burst(ctx, buffers, dest, 'pink', 'bandpass', 700, 0.9, at, 0.35, rise, fall, rand, 1100),
      burst(ctx, buffers, dest, 'pink', 'bandpass', 1600, 1.4, at, 0.15, rise, fall, rand, 2100),
    )
  }
  if (which === 'knock') {
    const knocks = 1 + Math.floor(rand() * 3)
    return latest(
      Array.from({ length: knocks }, (_, i) => {
        const t = at + i * between(rand, 0.15, 0.4)
        return Math.max(
          tone(ctx, dest, 'triangle', between(rand, 80, 110), t, 0.2, 0.002, 0.18),
          burst(ctx, buffers, dest, 'white', 'bandpass', between(rand, 1000, 1400), 8, t, 0.3, 0.001, 0.12, rand),
        )
      }),
      at,
    )
  }
  if (which === 'keys') {
    const ring = 6 + Math.floor(rand() * 4)
    return latest(
      Array.from({ length: ring }, () => tone(ctx, dest, 'sine', between(rand, 3000, 6000), at + between(rand, 0, 0.4), between(rand, 0.02, 0.05), 0.001, between(rand, 0.08, 0.2))),
      at,
    )
  }
  if (which === 'boots') {
    const stride = between(rand, 0.5, 0.6)
    return latest(
      Array.from({ length: BOOTS }, (_, i) => concreteStep(ctx, buffers, dest, rand, at + i * stride, 1.4 * bootGain(i))),
      at,
    )
  }
  return undefined
}

export const spot = (ctx: BaseAudioContext, buffers: Buffers, which: Spot, dest: AudioNode, rand: Rand): number => {
  const at = ctx.currentTime + 0.01
  const act1 = act1Spot(ctx, buffers, which, dest, rand, at)
  if (act1 !== undefined) return act1
  if (which === 'clink') {
    const f = between(rand, 2400, 3600)
    const peak = between(rand, 0.04, 0.12)
    return Math.max(tone(ctx, dest, 'sine', f, at, peak, 0.002, 0.3), tone(ctx, dest, 'sine', f * 2.76, at, peak * 0.4, 0.002, 0.15))
  }
  if (which === 'crackle') return burst(ctx, buffers, dest, 'white', 'highpass', between(rand, 1500, 4000), 0.7, at, between(rand, 0.03, 0.2), 0.001, between(rand, 0.005, 0.02), rand)
  if (which === 'mosquito') {
    const len = between(rand, 1.2, 3.2)
    const o = ctx.createOscillator()
    o.type = 'sawtooth'
    o.frequency.value = between(rand, 560, 680)
    const vib = lfo(ctx, between(rand, 5, 8), 14, o.frequency)
    const g = ctx.createGain()
    g.gain.setValueAtTime(QUIET, at)
    g.gain.exponentialRampToValueAtTime(0.025, at + len * 0.4)
    g.gain.exponentialRampToValueAtTime(QUIET, at + len)
    o.connect(filter(ctx, 'bandpass', 1300, 1.5)).connect(g).connect(dest)
    ;[o, vib].forEach((n) => {
      n.start(at)
      n.stop(at + len + 0.05)
    })
    return at + len
  }
  if (which === 'car') return burst(ctx, buffers, dest, 'pink', 'lowpass', 180, 1, at, 0.35, 2.2, 2.4, rand, 650)
  if (which === 'typewriter') {
    const end = Math.max(
      burst(ctx, buffers, dest, 'white', 'bandpass', 3200, 1.5, at, between(rand, 0.15, 0.3), 0.001, 0.025, rand),
      tone(ctx, dest, 'square', between(rand, 140, 190), at, 0.06, 0.001, 0.03),
    )
    return rand() < 0.04 ? Math.max(end, tone(ctx, dest, 'sine', 2100, at + 0.08, 0.15, 0.002, 0.9)) : end
  }
  if (which === 'glug') {
    const f = between(rand, 220, 320)
    return Math.max(
      tone(ctx, dest, 'sine', f, at, 0.3, 0.01, 0.14, f * 0.45),
      burst(ctx, buffers, dest, 'brown', 'bandpass', f * 2, 3, at, 0.25, 0.01, 0.1, rand),
      tone(ctx, dest, 'triangle', 1900, at, 0.02, 0.002, 0.25),
    )
  }
  if (which === 'raven') {
    const throat = filter(ctx, 'bandpass', between(rand, 1000, 1400), 2.5)
    throat.connect(dest)
    const f = between(rand, 380, 520)
    const calls = 1 + Math.floor(rand() * 3)
    return Array.from({ length: calls }, (_, i) =>
      tone(ctx, throat, 'sawtooth', f, at + i * between(rand, 0.32, 0.45), 0.35, 0.02, 0.24, f * 0.78),
    ).reduce((a, b) => Math.max(a, b), at)
  }
  if (which === 'perk') {
    const pops = 2 + Math.floor(rand() * 3)
    return Array.from({ length: pops }, (_, i) => {
      const f = between(rand, 500, 900)
      return tone(ctx, dest, 'sine', f, at + i * between(rand, 0.03, 0.09), between(rand, 0.03, 0.08), 0.002, 0.04, f * 1.9)
    }).reduce((a, b) => Math.max(a, b), at)
  }
  const creak = tone(ctx, dest, 'sawtooth', between(rand, 90, 120), at, 0.05, 0.25, 0.45, between(rand, 130, 160))
  const thump = burst(ctx, buffers, dest, 'brown', 'lowpass', 220, 1, creak, 0.9, 0.005, 0.3, rand)
  return Math.max(thump, tone(ctx, dest, 'square', 1800, creak + 0.02, 0.03, 0.001, 0.02))
}

export const footstep = (ctx: BaseAudioContext, buffers: Buffers, surface: Surface, dest: AudioNode, rand: Rand, tempF?: number): number => {
  const at = ctx.currentTime + 0.005
  const k = between(rand, 0.8, 1.2)
  if (surface === 'snow') {
    const snow = snowAt(tempF)
    const crunch = Array.from({ length: snow.grains }, (_, i) =>
      burst(ctx, buffers, dest, 'white', 'bandpass', snow.freq * between(rand, 0.8, 1.25), 1.5 + 2 * snow.squeak, at + i * between(rand, 0.012, 0.03), between(rand, 0.08, 0.18), 0.004, snow.decay / 2, rand),
    ).reduce((a, b) => Math.max(a, b), at)
    const pack = burst(ctx, buffers, dest, 'brown', 'lowpass', 380 * k, 1, at, 0.4 * (1 - snow.squeak * 0.6), 0.02, snow.decay, rand)
    const squeak = snow.squeak > 0.3 ? tone(ctx, dest, 'triangle', between(rand, 1500, 2100), at + 0.03, 0.04 * snow.squeak, 0.01, 0.07) : at
    return Math.max(crunch, pack, squeak)
  }
  if (surface === 'concrete') return concreteStep(ctx, buffers, dest, rand, at, 1)
  if (surface === 'wood')
    return Math.max(
      burst(ctx, buffers, dest, 'brown', 'bandpass', 200 * k, 2.5, at, 0.7, 0.003, 0.09, rand),
      burst(ctx, buffers, dest, 'white', 'lowpass', 1400 * k, 0.7, at, 0.06, 0.001, 0.03, rand),
    )
  if (surface === 'gravel')
    return Array.from({ length: 7 }, (_, i) =>
      burst(ctx, buffers, dest, 'white', 'bandpass', between(rand, 2200, 5200), 1.2, at + i * between(rand, 0.008, 0.018), between(rand, 0.06, 0.2), 0.001, 0.02, rand),
    ).reduce((a, b) => Math.max(a, b), at)
  if (surface === 'mud')
    return Math.max(
      burst(ctx, buffers, dest, 'brown', 'lowpass', 500 * k, 1, at, 0.6, 0.03, 0.16, rand),
      burst(ctx, buffers, dest, 'pink', 'bandpass', 900 * k, 4, at + 0.06, 0.12, 0.02, 0.12, rand, 300),
    )
  return Math.max(
    burst(ctx, buffers, dest, 'pink', 'bandpass', 1600 * k, 3, at, 0.35, 0.01, 0.22, rand, 380),
    burst(ctx, buffers, dest, 'brown', 'lowpass', 420, 1, at, 0.4, 0.02, 0.25, rand),
  )
}
