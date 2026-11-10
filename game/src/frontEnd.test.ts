import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initialState } from '../../text-game/src/state.ts'
import { goal, menu, notebook } from '../../text-game/src/story.ts'
import { N } from '../../text-game/src/names.ts'
import {
  OBJECTIVE_TIME,
  back,
  castFiles,
  defaultPrefs,
  emptyLog,
  firstScreen,
  isCastFile,
  parseLog,
  saveLog,
  titleScene,
  journal,
  loadShare,
  metAt,
  objectiveFor,
  objectiveShown,
  parsePrefs,
  recall,
  reduced,
  runs,
  savePath,
  savedPath,
  storySoFar,
  talkHeard,
} from './frontEnd.ts'
import { replayPath, startFrom } from './start.ts'
import { start } from './prologue.ts'

const flood = [1, 1, 1, 1, 1, 1]

test('a plain visit opens on the title; a path link or the test harness starts in the game', () => {
  assert.equal(firstScreen('', ''), 'title')
  assert.equal(firstScreen('#path=1,1', ''), 'play')
  assert.equal(firstScreen('', '?from=1,1'), 'play')
  assert.equal(firstScreen('', '?test=1'), 'play')
})

test('only play runs the story clock; Esc steps back to the pause menu, then the game, and never leaves the title', () => {
  assert.deepEqual(
    (['title', 'play', 'pause', 'journal', 'map'] as const).map((s) => [runs(s), back(s)]),
    [
      [false, 'title'],
      [true, 'play'],
      [false, 'play'],
      [false, 'pause'],
      [false, 'pause'],
    ],
  )
})

test('the objective is goal(state), shown when the goal changes, held for its time, and recalled on demand', () => {
  const o = objectiveFor(undefined, initialState, 10)
  assert.equal(objectiveShown(o, 10), goal(initialState))
  assert.equal(objectiveShown(o, 10 + OBJECTIVE_TIME - 0.1), goal(initialState))
  assert.equal(objectiveShown(o, 10 + OBJECTIVE_TIME), undefined)
  assert.equal(objectiveFor(o, initialState, 99), o, 'the same scene keeps its line')
  assert.equal(objectiveShown(recall(o, 50), 52), goal(initialState))
  const s = replayPath(flood.join(','))
  assert.ok('story' in s)
  const next = objectiveFor(o, s.story, 40)
  assert.equal(objectiveShown(next, 41), goal(s.story))
})

test('a scene change with the same goal does not flash the line again', () => {
  const o = objectiveFor(undefined, initialState, 0)
  const same = objectiveFor({ ...o, scene: 'elsewhere' as typeof o.scene }, initialState, 100)
  assert.equal(objectiveShown(same, 100), undefined)
})

test('the story so far is the title of every scene played, in order, without the current one', () => {
  assert.deepEqual(storySoFar([]), [])
  const path = flood
  const titles = path.map((_, i) => {
    const r = replayPath(path.slice(0, i).join(','))
    assert.ok('story' in r)
    return menu(r.story).title
  })
  assert.deepEqual(storySoFar(path), [...new Set(titles)])
  const r = replayPath(path.join(','))
  assert.ok('story' in r)
  assert.ok(!storySoFar(path).includes(menu(r.story).title))
})

test('a new game journal holds nothing the player has not done', () => {
  const j = journal(start(), emptyLog)
  assert.deepEqual(j.sofar, [])
  assert.deepEqual(j.met, [])
  assert.deepEqual(j.heard, [])
  assert.deepEqual(j.known, notebook(initialState).map((e) => e.line))
  assert.equal(j.now, menu(initialState).title)
  assert.equal(j.goal, goal(initialState))
})

test('the journal reads the notebook of the state the path reached', () => {
  const g = startFrom('#path=1,1,1,1,1,1,1,1,1,2,1,1,1', '')
  const j = journal(g, emptyLog)
  assert.deepEqual(j.known, notebook(g.story).map((e) => e.line))
  assert.equal(j.sofar.length > 5, true)
})

test('people met: the figure interacted with, by the story name; a door or a spot is no one', () => {
  const g = start()
  const met = metAt(metAt(metAt(emptyLog, g, 'curly'), g, 'door'), g, 'curly')
  assert.deepEqual(met.met, [N.curly])
  assert.deepEqual(metAt(emptyLog, g, 'hank').met, [N.bartender])
  assert.deepEqual(metAt(emptyLog, g, undefined).met, [])
})

test('a talk panel records the person and each line by its speaker, once', () => {
  const text = 'Evening, Mr. Marsh.\n\nThe boarder: Which room is his?'
  const log = talkHeard(talkHeard(emptyLog, 'the landlady', text), 'the landlady', text)
  assert.deepEqual(log.met, ['The landlady'])
  assert.deepEqual(log.heard, [
    { who: 'The landlady', text: 'Evening, Mr. Marsh.' },
    { who: 'The boarder', text: 'Which room is his?' },
  ])
})

test('a save is the path in the text build format; Continue takes only a path the story accepts', () => {
  assert.equal(savePath(flood), '1,1,1,1,1,1')
  assert.equal(savedPath('1,1,1,1,1,1'), '1,1,1,1,1,1')
  assert.equal(savedPath(null), undefined)
  assert.equal(savedPath(''), undefined)
  assert.equal(savedPath('1,x'), undefined)
  assert.equal(savedPath('9'), undefined)
})

test('prefs round-trip and fall back to the defaults on anything else', () => {
  assert.deepEqual(parsePrefs(null), defaultPrefs)
  assert.deepEqual(parsePrefs('not json'), defaultPrefs)
  assert.deepEqual(parsePrefs('{"text":"huge","motion":"sometimes"}'), defaultPrefs)
  const p = { text: 'large', motion: 'on', cone: true } as const
  assert.deepEqual(parsePrefs(JSON.stringify(p)), p)
  assert.equal(parsePrefs('{"cone":"yes"}').cone, false, 'the sight cone is off unless set')
  assert.equal(reduced(defaultPrefs, true), true)
  assert.equal(reduced(defaultPrefs, false), false)
  assert.equal(reduced({ ...defaultPrefs, motion: 'off' }, true), false)
  assert.equal(reduced({ ...defaultPrefs, motion: 'on' }, false), true)
})

test('loading fills by the cast files that have arrived', () => {
  assert.equal(loadShare(0), 0)
  assert.equal(loadShare(castFiles), 1)
  assert.equal(loadShare(castFiles * 2), 1)
  assert.ok(isCastFile('http://x/fbx67/play/characters/anims/owen/walk.glb'))
  assert.ok(isCastFile('http://x/fbx67/play/characters/owen.glb'))
  assert.ok(!isCastFile('http://x/fbx67/play/props/crate.glb'))
})

test('the journal log goes with the save and is dropped for any other path', () => {
  const log = talkHeard(emptyLog, 'the landlady', 'Evening.')
  const raw = saveLog(flood, log)
  assert.deepEqual(parseLog(raw, '1,1,1,1,1,1'), log)
  assert.deepEqual(parseLog(raw, '1,1'), emptyLog)
  assert.deepEqual(parseLog('{"path":"1","met":[3],"heard":[{"who":1}]}', '1'), emptyLog)
  assert.deepEqual(parseLog('nope', '1'), emptyLog)
})

test('the title stands Owen on Second Avenue at the story start, and plays nothing', () => {
  const g = titleScene()
  assert.equal(g.space, 'downtown')
  assert.equal(g.story, initialState)
  assert.deepEqual(g.path, [])
})
