import { test } from 'node:test'
import assert from 'node:assert/strict'
import { castFor, clipFor, clipUrl, playbackRate } from './cast.ts'

const still = { speed: 0, sneaking: false, activity: 'stand', talking: false } as const

test('castFor maps the core cast and nothing else', () => {
  assert.equal(castFor('curly'), 'curly')
  assert.equal(castFor('hooded'), undefined)
})

test('speed picks idle, walk, sneak and run', () => {
  assert.equal(clipFor(still), 'idle')
  assert.equal(clipFor({ ...still, speed: 1.4 }), 'walk')
  assert.equal(clipFor({ ...still, speed: 1.4, sneaking: true }), 'sneak')
  assert.equal(clipFor({ ...still, speed: 3.5 }), 'run')
  assert.equal(clipFor({ ...still, speed: 2.2 }), 'walk')
  assert.equal(clipFor({ ...still, speed: 2.7 }), 'run')
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
})

test('clip urls are per character', () => {
  assert.equal(clipUrl('/fbx67/play/', 'wade', 'sit'), '/fbx67/play/characters/anims/wade/sit.glb')
})
