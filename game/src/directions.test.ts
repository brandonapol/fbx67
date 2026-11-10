import { test } from 'node:test'
import assert from 'node:assert/strict'
import { place } from '../../text-game/src/story.ts'
import { MAX_LINE } from '../../text-game/src/ambient/format.ts'
import { NOWHERE, RIGHT_HERE, askWay, asked, between, directions, heading, wayAt, wayOffChart, wayTo, wayToSpot } from './directions.ts'
import { ahead } from './frontEndMap.ts'
import { baseChart, placeNames, spotOn, townChart } from './pocketMapCharts.ts'
import { press, start } from './prologue.ts'
import { startFrom } from './start.ts'
import { titleScene } from './frontEnd.ts'
import { walk } from './drive.ts'
import type { Visit } from './talk.ts'
import { targets, visit } from './talk.ts'
import { vec } from './world.ts'

const spot = (id: string) => townChart.spots.find((s) => s.id === id)!
const secondAve = vec(33, 50.5)

test('a door is on the way it opens onto, read off the chart', () => {
  assert.equal(wayAt(townChart, spot('nordale').door)?.name, 'Second Avenue')
  assert.equal(wayAt(townChart, spot('federal').door)?.name, 'Cushman Street')
  assert.equal(wayAt(townChart, spot('polaris').door)?.name, 'Lacey Street')
  assert.equal(wayAt(townChart, spot('boardingHouse').door)?.name, 'Third Avenue')
  assert.equal(wayAt(baseChart, baseChart.spots.find((s) => s.id === 'baseHangar')!.door)?.name, 'Flight Line Road')
})

test('where along its way a door is, by the cross ways either side', () => {
  const second = townChart.ways.find((w) => w.name === 'Second Avenue')!
  assert.equal(between(townChart, second, spot('nordale').door), 'between Cushman and Lacey')
  assert.equal(between(townChart, second, spot('landOffice').door), 'between Lacey and Noble')
  assert.equal(between(townChart, second, vec(180, 56)), 'east of Noble')
  const cushman = townChart.ways.find((w) => w.name === 'Cushman Street')!
  assert.equal(between(townChart, cushman, spot('federal').door), 'between Second and Third')
})

test('the compass point is the chart\'s: north is up the page, toward the river', () => {
  assert.equal(heading(vec(0, 0), vec(0, -10)), 'north')
  assert.equal(heading(vec(0, 0), vec(10, 0)), 'east')
  assert.equal(heading(vec(0, 0), vec(10, 10)), 'southeast')
  assert.equal(heading(vec(0, 0), vec(-10, 0)), 'west')
})

test('the Nordale is up on Second, from Third; along Second, from the Silver Pan', () => {
  assert.equal(wayToSpot(townChart, spot('nordale'), vec(81, 103)), 'Nordale Hotel? Down on Second, between Cushman and Lacey. Head northwest.')
  assert.equal(wayToSpot(townChart, spot('nordale'), vec(28, 14)), 'Nordale Hotel? Up on Second, between Cushman and Lacey. Head south.')
  assert.equal(wayToSpot(townChart, spot('nordale'), secondAve), 'Nordale Hotel? Right along Second, between Cushman and Lacey. Head south.')
  assert.equal(wayToSpot(townChart, spot('nordale'), spot('nordale').door), "Nordale Hotel? You're standing at it.")
  assert.ok(RIGHT_HERE > 0)
})

test('a place set back from its way is "off" it: the float dock down the bank from First', () => {
  assert.equal(wayTo('floatDock', { chart: townChart, from: secondAve }), "The float dock (Curly's plane)? Down off First, between Lacey and Noble. Head northeast.")
})

test('a place off the speaker\'s chart is given as the map\'s margin gives it', () => {
  assert.equal(wayTo('helpTent', { chart: townChart, from: secondAve }), 'The help tent? South on Cushman past Fifth.')
  assert.equal(wayTo('photoLab', { chart: townChart, from: secondAve }), 'The photo lab? Eielson.')
  assert.equal(wayOffChart('crashSite'), "The wreck? Can't say I know the way.")
  assert.equal(wayTo('photoLab', { chart: baseChart, from: vec(8, 3) }), 'Photo lab? Just off the gate road, between Dorm Street and Flight Line Road. Head east.')
})

test('every place the story has gets a line short enough for a subtitle, with nothing undefined in it', () => {
  ;(Object.keys(placeNames) as (keyof typeof placeNames)[]).forEach((p) =>
    [undefined, { chart: townChart, from: secondAve }, { chart: baseChart, from: vec(8, 3) }].forEach((here) => {
      const line = wayTo(p, here)
      assert.ok(line.length <= MAX_LINE, `${p}: ${line}`)
      assert.ok(!/undefined|NaN/.test(line), `${p}: ${line}`)
    }),
  )
})

test('the place asked about is where the story points next, from the story API', () => {
  const g = startFrom('#path=1,1', '')
  assert.equal(asked(g.story), ahead(g.story)[0])
})

test('on a walk downtown the way asked is to the place the walk leads to', () => {
  const v = visit(titleScene())
  assert.equal(v.game.space, 'downtown')
  const p = asked(v.game.story, true)
  assert.ok(p, 'a walk always leads somewhere')
  assert.equal(p, ahead(v.game.story)[0] ?? place(v.game.story))
  const third = vec(160, 103)
  const said = directions(v, third)
  assert.equal(said, wayTo(p, { chart: townChart, from: third }))
  assert.match(said, new RegExp(`^${spotOn(townChart, p)!.name}\\? \\w+ (on|off) `))
})

test('at the Major\'s office the way to the photo lab is given on the base chart, from the squadron building', () => {
  const v = visit(startFrom('#path=1,1,1,1,1,1,2,2,1,1,1,1,1,2,2,1,1', ''))
  assert.equal(place(v.game.story), 'majorsOffice')
  assert.equal(asked(v.game.story), 'photoLab')
  assert.equal(directions(v, vec(0, 0)), 'Photo lab? Off the gate road, between Dorm Street and Flight Line Road. Head south.')
})

test('indoors the speaker gives the way from the door of the building they are in', () => {
  const v = visit(press(start(), 'close'))
  const p = asked(v.game.story)
  const door = spotOn(townChart, place(v.game.story)!)?.door
  assert.ok(door, 'the bar is on the town chart')
  assert.equal(directions(v, vec(0, 0)), p ? wayTo(p, { chart: townChart, from: door }) : NOWHERE)
})

test('any townsperson in reach, asked the way, says it on the talk log; a thing, or someone out of reach, says nothing', () => {
  const atBar = visit(press(start(), 'close'))
  const atJukebox: Visit = { ...atBar, game: walk(atBar.game, [[-1.5, -2.2], [4.6, -2.2], [4.6, -1.4]]) }
  const airman = targets(atJukebox).find((t) => t.id === 'airmanJukebox')!
  const told = askWay(atJukebox, 'airmanJukebox')
  assert.equal(told.talk.log.length, 1)
  const line = told.talk.log[0]!
  assert.equal(line.who, 'airmanJukebox')
  assert.equal(line.name, airman.ambient.name)
  assert.equal(line.text, directions(atJukebox, vec(airman.x, airman.z)))
  assert.ok(line.until > line.from)
  assert.deepEqual(told.game, atJukebox.game, 'asking the way never moves the story')
  assert.equal(askWay(atJukebox, 'jukebox'), atJukebox, 'a jukebox gives no directions')
  assert.equal(askWay(atBar, 'airmanJukebox'), atBar, 'across the room')
  const again = askWay(told, 'airmanJukebox')
  assert.equal(again.talk.log[1]!.from, line.until, 'a second answer waits for the first')
})
