import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { INDOOR_PACE, JOG_SPEED, RUN_SPEED, WALK_SPEED, bodies, castFor, castIds, clipFor, clipIds, clipUrl, playbackRate } from './cast.ts'

const still = { speed: 0, sneaking: false, activity: 'stand', talking: false } as const

test('castFor maps the core cast and nothing else', () => {
  assert.equal(castFor('curly'), 'curly')
  assert.equal(castFor('hooded'), undefined)
})

test('speed picks idle, walk, sneak, jog and run', () => {
  assert.equal(clipFor(still), 'idle')
  assert.equal(clipFor({ ...still, speed: 1.4 }), 'walk')
  assert.equal(clipFor({ ...still, speed: 1.4, sneaking: true }), 'sneak')
  assert.equal(clipFor({ ...still, speed: 2.2 }), 'walk')
  assert.equal(clipFor({ ...still, speed: 2.7 }), 'jog')
  assert.equal(clipFor({ ...still, speed: JOG_SPEED }), 'jog')
  assert.equal(clipFor({ ...still, speed: RUN_SPEED }), 'run')
})

test('the paces rise walk, indoor, jog, run, and the indoor pace still plays the walk', () => {
  assert.ok(WALK_SPEED < INDOOR_PACE && INDOOR_PACE < JOG_SPEED && JOG_SPEED < RUN_SPEED)
  assert.equal(clipFor({ ...still, speed: INDOOR_PACE }), 'walk')
})

test('each moving clip plays at its own speed, so the town jog is not a slowed sprint', () => {
  assert.equal(playbackRate('run', RUN_SPEED), 1)
  assert.ok(playbackRate('run', JOG_SPEED) < 0.7 + 1e-9, 'the sprint clip at the town pace would skate')
  assert.ok(playbackRate('jog', JOG_SPEED) > 0.8 && playbackRate('jog', JOG_SPEED) <= 1)
  assert.ok(playbackRate('jog', 2.7) < playbackRate('jog', JOG_SPEED))
})

const manifest = JSON.parse(readFileSync(new URL('../assets/characters.json', import.meta.url), 'utf8')) as {
  characters: Record<string, unknown>
  clips: Record<string, unknown>
}

test('the game loads every clip the library ships, and every cast member is in the manifest', () => {
  assert.deepEqual([...clipIds].sort(), Object.keys(manifest.clips).sort())
  castIds.forEach((who) => assert.ok(who in manifest.characters, who))
})

test('seated people stay seated while talking; standing people gesture', () => {
  assert.equal(clipFor({ ...still, activity: 'sit', talking: true }), 'sit')
  assert.equal(clipFor({ ...still, activity: 'sitDrink' }), 'sitDrink')
  assert.equal(clipFor({ ...still, talking: true }), 'talk')
  assert.equal(clipFor({ ...still, activity: 'drink' }), 'drink')
})

test('walk playback follows speed within limits', () => {
  assert.equal(playbackRate('walk', 1.4), 1)
  assert.equal(playbackRate('walk', 10), 1.6)
  assert.equal(playbackRate('idle', 3), 1)
  assert.equal(playbackRate('sneak', 0.7), 0.5)
})

test('clip urls are per character', () => {
  assert.equal(clipUrl('/fbx67/play/', 'wade', 'sit'), '/fbx67/play/characters/anims/wade/sit.glb')
})

test('each point of view has its body: Owen and Wade their own model and clips, Wade higher-eyed and lighter-footed', () => {
  assert.equal(bodies.owen.cast, 'owen')
  assert.equal(bodies.wade.cast, 'wade')
  assert.equal(bodies.lucy.cast, undefined, 'no Lucy model yet')
  assert.ok(bodies.wade.eye > bodies.owen.eye)
  assert.ok(bodies.wade.tread.pitch > bodies.owen.tread.pitch)
  assert.ok(bodies.wade.tread.weight < bodies.owen.tread.weight)
})
