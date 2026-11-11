import { test } from 'node:test'
import assert from 'node:assert/strict'
import { surfaceAt } from './footsteps.ts'
import type { Soundscape, Spot } from './soundscape.ts'
import { BOATS_AT, LINE_AT, RADIATOR_AT, RACK_AT, RIVER_Z, STOVE_AT, act1Soundscapes, soundscapes } from './soundscape.ts'
import { BOOTS, ROAR_SECONDS, bootGain, footstep, layerVoice, makeBuffers, mulberry, spot } from './synth.ts'
import { vec } from './world.ts'
import type { Tread } from './cast.ts'
import { bodies } from './cast.ts'
import { fakeContext } from './fake-audio.ts'

const spots = (s: Soundscape): readonly Spot[] => s.events.map((e) => e.spot)

const busOf = (s: Soundscape, which: Spot) => s.events.find((e) => e.spot === which)?.bus

test('every Act 1 space has an ambience bed', () => {
  Object.entries(act1Soundscapes).forEach(([id, scape]) =>
    assert.ok(scape.layers.some((l) => l.bus === 'ambience'), `${id} has no ambience bed`),
  )
})

test('the flood work: rain, outboards on the river, sandbags on the line, shouting across water', () => {
  const { line } = act1Soundscapes
  assert.ok(line.layers.some((l) => l.kind === 'recording' && l.clip === 'rain' && l.bus === 'ambience'), 'no rain')
  const river = line.layers.find((l) => l.kind === 'recording' && l.clip === 'flood')
  assert.ok(river?.kind === 'recording' && river.alongX && river.at?.z === RIVER_Z, 'the river runs along the line')
  const boats = line.layers.filter((l) => l.kind === 'outboard')
  assert.equal(boats.length, BOATS_AT.length)
  boats.forEach((b) => assert.ok('at' in b && b.at.z < RIVER_Z && b.bus === 'ambience'))
  assert.equal(busOf(line, 'sandbag'), 'sfx')
  assert.deepEqual(line.events.find((e) => e.spot === 'sandbag')?.at, LINE_AT)
  assert.equal(busOf(line, 'shout'), 'voice')
  assert.equal(line.events.find((e) => e.spot === 'shout')?.at?.z, RIVER_Z)
  assert.equal(surfaceAt(line.ground, vec(0, 0)), 'mud')
  assert.equal(surfaceAt(line.ground, vec(0, RIVER_Z)), 'water')
})

test('the hospital: an emptied hallway that drips, on a hard floor', () => {
  const { hospital } = act1Soundscapes
  assert.ok(spots(hospital).filter((s) => s === 'drip').length >= 2)
  assert.equal(busOf(hospital, 'drip'), 'ambience')
  assert.ok(!hospital.layers.some((l) => l.kind === 'walla'), 'an emptied hallway has no crowd')
  assert.equal(surfaceAt(hospital.ground, vec(0, 0)), 'concrete')
})

test('the barfight: the crowd swells on voices, the fight foley on effects, the mud floor', () => {
  const { barfight } = act1Soundscapes
  assert.ok(barfight.layers.some((l) => l.kind === 'walla' && l.bus === 'voice'))
  assert.equal(busOf(barfight, 'roar'), 'voice')
  ;(['shove', 'stove', 'bottle', 'antlers'] satisfies Spot[]).forEach((s) => assert.equal(busOf(barfight, s), 'sfx', s))
  assert.deepEqual(barfight.events.find((e) => e.spot === 'stove')?.at, STOVE_AT)
  assert.deepEqual(barfight.events.find((e) => e.spot === 'antlers')?.at, RACK_AT)
  assert.equal(surfaceAt(barfight.ground, vec(0, 0)), 'mud')
})

test('the cell: a radiator, keys and Barnette coming down the corridor', () => {
  const { cell } = act1Soundscapes
  assert.deepEqual(cell.events.find((e) => e.spot === 'knock')?.at, RADIATOR_AT)
  assert.equal(busOf(cell, 'knock'), 'ambience')
  assert.equal(busOf(cell, 'keys'), 'sfx')
  assert.equal(busOf(cell, 'boots'), 'sfx')
  assert.equal(surfaceAt(cell.ground, vec(0, 0)), 'concrete')
})

test("Barnette's footsteps come up and go away: loudest mid-corridor, quiet at both ends", () => {
  const gains = Array.from({ length: BOOTS }, (_, i) => bootGain(i))
  const mid = Math.floor((BOOTS - 1) / 2)
  gains.slice(0, mid).forEach((g, i) => assert.ok(g < gains[i + 1]))
  gains.slice(mid + 1).forEach((g, i) => assert.ok(g <= gains[mid + i]))
  assert.ok(gains.every((g) => g > 0 && g <= 1))
})

test('the crowd swells and dies: the roar rises and falls within a few seconds', () => {
  const { ctx } = fakeContext()
  const buffers = makeBuffers(ctx)
  const dest = ctx.createGain()
  const rand = mulberry(3)
  Array.from({ length: 20 }, () => spot(ctx, buffers, 'roar', dest, rand)).forEach((end) => {
    const len = end - ctx.currentTime
    assert.ok(len >= ROAR_SECONDS[0] * 2.5 && len <= ROAR_SECONDS[1] * 2.5 + 0.02, `${len}`)
  })
})

const nodesFor = (scape: Soundscape): number => {
  const { ctx, times } = fakeContext()
  const buffers = makeBuffers(ctx)
  const before = times.nodes
  scape.layers.forEach((l) => layerVoice(ctx, buffers, l, mulberry(1)))
  return times.nodes - before
}

test('no Act 1 bed builds more nodes than the prologue bar, the heaviest bed on the phone tier', () => {
  const ceiling = nodesFor(soundscapes.bar)
  Object.entries(act1Soundscapes).forEach(([id, scape]) => assert.ok(nodesFor(scape) <= ceiling, `${id}: ${nodesFor(scape)} > ${ceiling}`))
})

test('every Act 1 layer, spot and the concrete step build and schedule finite times', () => {
  const { ctx, times } = fakeContext()
  const buffers = makeBuffers(ctx)
  const rand = mulberry(11)
  const dest = ctx.createGain()
  Object.values(act1Soundscapes).forEach((scape) => {
    scape.layers.forEach((l) => {
      const v = layerVoice(ctx, buffers, l, rand)
      v.tick?.(1)
      v.stop(4)
    })
    scape.events.forEach((e) => assert.ok(Number.isFinite(spot(ctx, buffers, e.spot, dest, rand))))
  })
  ;(['sandbag', 'shout', 'drip', 'shove', 'stove', 'bottle', 'antlers', 'roar', 'knock', 'keys', 'boots'] satisfies Spot[]).forEach((s) =>
    assert.ok(spot(ctx, buffers, s, dest, rand) > 1, s),
  )
  assert.ok(footstep(ctx, buffers, 'concrete', dest, rand) > 1)
  assert.ok(times.t.length > 0)
  assert.ok(times.t.every(Number.isFinite))
})

test("Wade's footsteps in the flood sound his own: higher and lighter than Owen's, from the same rolls", () => {
  const step = (tread: Tread) => {
    const { ctx } = fakeContext()
    const made: AudioNode[] = []
    const keep = <K extends 'createGain' | 'createBiquadFilter'>(k: K): void => {
      const make = ctx[k].bind(ctx)
      Object.assign(ctx, { [k]: () => made[made.push(make()) - 1] })
    }
    keep('createGain')
    keep('createBiquadFilter')
    footstep(ctx, makeBuffers(ctx), 'water', ctx.createGain(), mulberry(5), undefined, tread)
    const freqs = made.flatMap((n) => ('frequency' in n ? [(n as BiquadFilterNode).frequency.value] : [])).filter((f) => f > 0)
    const gains = made.map((n) => (n as GainNode).gain.value)
    return { freqs, gains }
  }
  const owen = step(bodies.owen.tread)
  const wade = step(bodies.wade.tread)
  assert.ok(owen.freqs.length > 0)
  owen.freqs.forEach((f, i) => assert.ok(Math.abs(wade.freqs[i] - f * bodies.wade.tread.pitch) < 1e-6, `band ${i}`))
  assert.ok(wade.gains.includes(bodies.wade.tread.weight))
  assert.ok(owen.gains.includes(bodies.owen.tread.weight))
})
