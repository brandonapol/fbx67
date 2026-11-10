import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initialState } from './state.ts'
import { LUCY_LET_GO, lucyLetGo, recordsOpen } from './logic.ts'
import { canonical } from './liveness.ts'
import { menu, pov, send } from './story.ts'
import type { State } from './types.ts'

// #211: at high Lucy heat she is let go from the land office before Act 3 (design: Systems > Heat).
const at = (scene: State['scene'], patch: Partial<State> = {}): State => ({ ...initialState, scene, ...patch })

test('Lucy is let go at her let-go heat or above, and the records thread is open exactly when she is not', () => {
  assert.equal(LUCY_LET_GO, 2)
  assert.deepEqual([0, 1, 2, 3, 4].map((h) => lucyLetGo(at('a2_minto', { lucyHeat: h }))), [false, false, true, true, true])
  for (const h of [0, 1, 2, 3, 4]) assert.equal(recordsOpen(at('a2_minto', { lucyHeat: h })), !lucyLetGo(at('a2_minto', { lucyHeat: h })))
})

test('at high Lucy heat, Minto leads to the day she is let go, played as Lucy, and then to Jake', () => {
  for (const h of [2, 3, 4]) {
    const letGo = send(at('a2_minto', { lucyHeat: h }), 'leave')
    assert.equal(letGo.scene, 'a2_let_go')
    assert.equal(pov(letGo), 'lucy')
    const out = send(letGo, 'carryHome')
    assert.deepEqual([out.scene, out.recordsLog], ['a2_jake', 0])
  }
  for (const h of [0, 1]) assert.equal(send(at('a2_minto', { lucyHeat: h }), 'leave').scene, 'a2_records')
})

test('the let-go scene shows the desk emptied and the key handed back, and moves nothing but the scene', () => {
  const s = at('a2_let_go', { lucyHeat: 2, heat: 3, eliTrust: 1, evidence: ['coFiles'] })
  const text = menu(s).text
  assert.match(text, /You are Lucy/)
  assert.match(text, /empty your desk/)
  assert.match(text, /back-door key[\s\S]*lay it on the blotter/)
  assert.doesNotMatch(text, /Ashby|\boil\b|Wade|fired|let go/i)
  assert.deepEqual({ ...send(s, 'carryHome'), scene: s.scene }, s)
})

test('at the Trade, Barnette has no job left to suspend once she has been let go', () => {
  const kept = menu(at('a3_turn', { coJob: 'lucy', lucyHeat: 0 })).text
  const gone = menu(at('a3_turn', { coJob: 'lucy', lucyHeat: 2 })).text
  assert.match(kept, /Lucy is suspended from the land office and her files are in an evidence locker/)
  assert.match(gone, /doesn't work there anymore[\s\S]*By noon her files are in an evidence locker/)
  assert.doesNotMatch(gone, /suspended/)
})

test('after the Trade, the news and the bad ending remember whether she was let go', () => {
  const turned = (lucyHeat: number): State => canonical(at('a4_news', { afterConfession: 'turn', lucyHeat }))
  assert.match(menu(turned(0)).text, /Lucy is suspended and won't speak to you/)
  assert.match(menu(turned(2)).text, /Lucy won't speak to you/)
  assert.doesNotMatch(menu(turned(2)).text, /suspended/)
  const bad = (lucyHeat: number): string => menu(at('end', { afterConfession: 'turn', lucyHeat })).text
  assert.match(bad(0), /LUCY: Loses her job at the land office\./)
  assert.match(bad(2), /LUCY: Never works at the land office again\./)
})

test('once she is let go, nobody calls her the land office girl', () => {
  const heatStop = (lucyHeat: number): string => menu(at('a2_heat', { heat: 3, lucyHeat })).text
  assert.match(heatStop(0), /You and Boone and that land office girl/)
  assert.match(heatStop(2), /You and Boone and Eli's sister/)
  const walk = (lucyHeat: number): string => menu(at('a3_walk', { lucyHeat })).text
  assert.match(walk(0), /stay away from the land office\./)
  assert.match(walk(2), /stay away from Lucy's street\./)
  const dottie = (lucyHeat: number): string => menu(at('a2_heat_gossip', { lucyHeat })).text
  assert.match(dottie(1), /"And that land office girl\./)
  assert.match(dottie(2), /"And that girl the land office let go\./)
  for (const text of [heatStop(2), walk(2), dottie(2)]) assert.doesNotMatch(text, /land office girl/)
})
