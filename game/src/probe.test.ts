import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { AnimLayerLike } from './probe.ts'
import { freezeAnims, posed, poses } from './probe.ts'
import { spaces } from './levels.ts'
import { start } from './prologue.ts'

type Log = string[]

const layer = (log: Log, name: string, state: string | null, transitioning = false): AnimLayerLike => {
  const l = {
    activeState: state,
    transitioning,
    time: 3.7,
    get activeStateCurrentTime() {
      return l.time
    },
    set activeStateCurrentTime(t: number) {
      log.push(`${name} time ${t}`)
      l.time = t
    },
    transition: (to: string, time = 0) => {
      log.push(`${name} transition ${to} ${time}`)
      l.transitioning = false
    },
    update: (dt: number) => {
      log.push(`${name} update ${dt}`)
    },
  }
  return l
}

test('freezeAnims cuts blends, rewinds every active layer to 0 and evaluates once', () => {
  const log: Log = []
  const walk = layer(log, 'owen.base', 'walk', true)
  const idle = layer(log, 'curly.base', 'idle')
  const wave = layer(log, 'curly.arms', 'wave')
  const empty = layer(log, 'curly.face', null)
  const off = layer(log, 'hank.base', 'pour')
  const n = freezeAnims([
    { enabled: true, layers: [walk] },
    { enabled: true, layers: [idle, wave, empty] },
    { enabled: false, layers: [off] },
  ])
  assert.equal(n, 3)
  assert.deepEqual(log, [
    'owen.base transition walk 0',
    'owen.base time 0',
    'owen.base update 0',
    'curly.base time 0',
    'curly.base update 0',
    'curly.arms time 0',
    'curly.arms update 0',
  ])
  assert.equal(off.activeStateCurrentTime, 3.7)
})

test('every capture pose stands inside its space', () => {
  Object.entries(poses).forEach(([name, p]) => {
    const s = spaces[p.space]
    assert.ok(Math.abs(p.pos.x) < s.size.w / 2 && Math.abs(p.pos.z) < s.size.d / 2, `${name} is outside ${p.space}`)
  })
})

test('a pose replaces position, facing and time, and refuses the wrong space', () => {
  const g = { ...start(), holding: { id: 'stove', note: 'stove', progress: 1, time: 2.4 } }
  const p = posed(g, poses.bar!)
  assert.deepEqual([p.pos, p.facing, p.t, p.holding, p.story], [poses.bar!.pos, poses.bar!.facing, 0, undefined, g.story])
  assert.throws(() => posed(g, poses.letter!), /pose is for room/)
})
