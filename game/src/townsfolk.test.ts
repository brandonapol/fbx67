import { test } from 'node:test'
import assert from 'node:assert/strict'
import { focus, start } from './prologue.ts'
import { leaveBar, talk, toBed, upstairs, walk, walkLeg, writeLetter } from './drive.ts'
import { directions } from './directions.ts'
import { lookOf } from './ambient.ts'
import { showing, visit } from './talk.ts'
import type { Visit } from './talk.ts'
import { ASK_PROMPT, ask, asker, townsfolk } from './townsfolk.ts'
import { vec } from './world.ts'

const night = () => leaveBar(talk(start(), 'texas'))
// Up Second Avenue from the Silver Pan's door to the preacher on his corner, facing him.
const toPreacher = (v: Visit): Visit => ({ ...v, game: walk(v.game, [[42.9, 49.6]]) })

test('the night walk has the town on Second Avenue: the preacher, the cabbie and the strolling couple, each in their own look', () => {
  const folk = townsfolk(night())
  assert.deepEqual(folk.map((f) => f.id).sort(), ['cabbie', 'preacher', 'touristHusband', 'touristWife'])
  assert.equal(new Set(folk.map((f) => f.coat + f.hair)).size, folk.length, 'no two dressed alike')
  folk.forEach((f) => assert.deepEqual({ coat: f.coat, height: f.height }, { coat: lookOf(f.id).coat, height: lookOf(f.id).height }))
})

test('the morning walk has the town down Cushman, at the café, along First and on the float', () => {
  const morning = toBed(writeLetter(upstairs(walkLeg(night()))))
  const ids = townsfolk(morning).map((f) => f.id)
  ;['paperKid', 'waitress', 'mother', 'dockHand', 'fisherman'].forEach((id) => assert.ok(ids.includes(id), id))
})

test('nobody stands in the street indoors: the bar seats its own patrons', () => {
  assert.deepEqual(townsfolk(start()), [])
})

test('walking up to the preacher and asking plays his line from the chart, on the talk log and on screen', () => {
  const v = toPreacher(visit(night()))
  assert.equal(focus(v.game), undefined, 'nothing of the street\'s own is in front of Owen')
  const t = asker(v)
  assert.equal(t?.id, 'preacher')
  assert.ok(ASK_PROMPT)
  const told = ask(v)
  const line = told.talk.log.at(-1)
  assert.equal(line?.who, 'preacher')
  assert.equal(line?.text, directions(v, vec(t!.x, t!.z)))
  assert.match(line!.text, /^The float dock \(Curly's plane\)\? Down off First/)
  assert.deepEqual(showing(told.talk, told.clock).map((l) => l.who), ['preacher'])
  assert.deepEqual(told.game, v.game, 'asking the way never moves the story')
})

test('with nobody in front of Owen, asking does nothing', () => {
  const v = visit(night())
  assert.equal(asker(v), undefined)
  assert.equal(ask(v), v)
})

test('a door in front of Owen wins over a passer-by: interact opens it', () => {
  const g = night()
  const door = walk(g, [[81, 50.5], [81, 98], [134, 98], [134, 96.6]])
  assert.ok(focus(door))
  assert.equal(asker(visit(door)), undefined)
})
