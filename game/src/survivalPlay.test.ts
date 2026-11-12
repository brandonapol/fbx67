import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { State } from '../../text-game/src/types.ts'
import { menu, send, sendMission } from '../../text-game/src/story.ts'
import { replayPath } from './start.ts'
import { ACT3_PATH } from '../smoke/act3Plan.ts'
import { BARE_LIMIT, FREEZE_LIMIT, FUMBLE, LIGHTING, NUMB_PACE, fresh } from './survival.ts'
import type { Night, Signal, Verb } from './survivalPlay.ts'
import { HANDS_AT_FIRE } from './lucyAid.ts'
import {
  NIGHT,
  ORDERS,
  SECONDS,
  SIGNALS,
  SWEAT_IN,
  WALK,
  WET,
  act,
  begins,
  dawned,
  exposureOf,
  nextPress,
  noteOf,
  panelOf,
  press,
  ready,
  sceneNotes,
  secondsFor,
  stageOf,
  starts,
  step,
  sweatAfter,
  tells,
  verbs,
} from './survivalPlay.ts'

// The long night played in the engine (docs/acts/act3-missions.md, section 2): the play over survival.ts's rules.

const DT = 0.1

// The story at a3_crash, reached as the text build plays it: Act 3's run, every choice the first.
const toCrash = (): State => {
  const r = replayPath(ACT3_PATH)
  assert.ok(!('error' in r))
  const go = (s: State, n: number): State => (s.scene === 'a3_crash' || n > 20 ? s : go(send(s, menu(s).options[0]!.note), n + 1))
  return go(r.story, 0)
}

const CRASH = toCrash()

const night = (order: 'fire' | 'jake'): Night => begins(CRASH, order)!

const run = (n: Night, seconds: number): Night =>
  Array.from({ length: Math.round(seconds / DT) }).reduce<Night>((acc) => step(acc, DT), n)

// Does a verb and waits it out.
const doing = (n: Night, v: Verb): Night => {
  let cur = act(n, v)
  assert.ok(cur.doing, `${v} starts at ${n.run.carried.at}`)
  for (let k = 0; cur.doing && !cur.out && k < 10000; k++) cur = step(cur, DT)
  return cur
}

const doAll = (n: Night, vs: readonly Verb[]): Night => vs.reduce(doing, n)

// A steady player to first light (survivalPlay.ts nextPress), taking the given signal.
const playOut = (n: Night, signal: Signal): Night => {
  let cur = n
  for (let k = 0; !dawned(cur) && k < 200000; k++) {
    const id = nextPress(cur, signal)
    cur = id ? press(cur, id)! : step(cur, DT)
  }
  return cur
}

test('the night begins only at the crash, with the story’s own order notes, and sends nothing yet', () => {
  assert.ok(starts(CRASH))
  assert.deepEqual(menu(CRASH).options.map((o) => o.note), [...ORDERS])
  assert.equal(begins(CRASH, 'smoke'), undefined)
  assert.equal(begins(send(CRASH, 'fire'), 'fire'), undefined, 'past the prompt the story has moved on')
  const n = night('jake')
  assert.equal(n.run.carried.order, 'jake')
  assert.equal(n.run.carried.at, 'cabin')
})

test('fire first: Jake waits until the fire is lit', () => {
  const n = night('fire')
  assert.ok(!ready(n, 'free'))
  const lit = doAll(n, ['go:trees', 'cut:deadfall', 'go:fire', 'light'])
  assert.ok(lit.run.carried.lit)
  assert.ok(ready(lit, 'free'))
})

test('Jake first: the axe and the matches wait until he is free and the bleeding tied off', () => {
  const n = night('jake')
  assert.ok(!ready(n, 'cut:deadfall') && !ready(n, 'light'))
  const tied = doAll(n, ['free', 'tie'])
  assert.ok(ready(tied, 'cut:deadfall'))
})

test('the night’s exposure: the slope is open and windy, idle is standing still, bare tasks are mitts off, the fire is near', () => {
  const n = night('jake')
  assert.deepEqual(
    { open: exposureOf(n).open, still: exposureOf(n).still, mittsOff: exposureOf(n).mittsOff, fire: exposureOf(n).fire },
    { open: false, still: true, mittsOff: false, fire: undefined },
  )
  const freeing = act(n, 'free')
  assert.equal(exposureOf(freeing).mittsOff, true)
  assert.equal(exposureOf(freeing).still, false)
  const slope = { ...n, run: { ...n.run, carried: { ...n.run.carried, at: 'slope' as const } } }
  assert.ok(exposureOf(slope).open && exposureOf(slope).wind)
  const fire = { ...n, run: { ...n.run, carried: { ...n.run.carried, at: 'fire' as const } } }
  assert.equal(exposureOf(fire).fire, 1)
})

test('hard work soaks her through and only a burning fire dries her; wet is survival.ts’s wet', () => {
  const c = night('jake').run.carried
  assert.equal(sweatAfter(c, undefined, 'cut:deadfall', SWEAT_IN * WET), WET)
  assert.equal(sweatAfter({ ...c, sweat: 1 }, undefined, undefined, 60), 1, 'away from a fire the sweat stays')
  assert.equal(sweatAfter({ ...c, sweat: 1, at: 'fire' }, { fuel: 100 }, undefined, 60), 0)
  assert.equal(sweatAfter({ ...c, sweat: 1, at: 'fire' }, { fuel: 0 }, undefined, 60), 1, 'a dead fire dries no one')
  const n = night('jake')
  const wet = { ...n, run: { ...n.run, carried: { ...c, sweat: WET } } }
  assert.equal(exposureOf(wet).wet, true)
})

test('frostbite slows the play: white hands fumble every hand task, numb feet drag every walk', () => {
  assert.equal(secondsFor({ ...fresh, hands: 'white' }, 'light'), LIGHTING * FUMBLE)
  assert.equal(secondsFor({ ...fresh, hands: 'white' }, 'free'), SECONDS.free * FUMBLE)
  assert.equal(secondsFor({ ...fresh, feet: 'numb' }, 'go:fire'), WALK / NUMB_PACE)
  assert.equal(secondsFor(fresh, 'go:fire'), WALK)
})

test('Jake first: her fingers are white by the time she lights the fire, so it is slow to start', () => {
  const tied = doAll(night('jake'), ['free', 'tie'])
  assert.ok(SECONDS.free + SECONDS.tie >= BARE_LIMIT)
  assert.equal(tied.run.body.hands, 'white')
  const ready = doAll(tied, ['go:trees', 'cut:deadfall', 'go:fire'])
  assert.equal(act(ready, 'light').doing?.total, LIGHTING * FUMBLE)
})

test('her first aid at the fire (lucyAid.ts): white fingers held to it come back, and the fire burns the while', () => {
  const tied = doAll(night('jake'), ['free', 'tie', 'go:trees', 'cut:deadfall', 'cut:deadfall', 'go:fire', 'light'])
  assert.equal(tied.run.body.hands, 'white')
  assert.ok(!verbs({ ...tied, run: { ...tied.run, carried: { ...tied.run.carried, at: 'cabin' } } }).includes('warm'), 'only at the fire')
  assert.ok(verbs(tied).includes('warm'))
  assert.ok(!verbs(tied).includes('wrap'), 'her feet are fine: nothing to wrap')
  const started = act(tied, 'warm')
  assert.equal(started.doing?.total, HANDS_AT_FIRE)
  const fuel = tied.run.fire!.fuel
  const warmed = doing(tied, 'warm')
  assert.equal(warmed.run.body.hands, 'fine')
  assert.ok(Math.abs(warmed.run.fire!.fuel - (fuel - HANDS_AT_FIRE)) < 1e-6, 'it spends the fire’s time')
  assert.ok(!verbs(warmed).includes('warm'), 'once warm, the verb is gone')
})

test('her numb feet, warmed at the fire and wrapped in her scarf, walk at her own pace again', () => {
  const lit = doAll(night('fire'), ['go:trees', 'cut:deadfall', 'cut:deadfall', 'go:fire', 'light'])
  const numb = { ...lit, run: { ...lit.run, body: { ...lit.run.body, feet: 'numb' as const } } }
  assert.equal(secondsFor(numb.run.body, 'go:cabin'), WALK / NUMB_PACE)
  assert.ok(verbs(numb).includes('wrap'))
  const wrapped = doing(numb, 'wrap')
  assert.equal(wrapped.run.body.feet, 'fine')
  assert.equal(secondsFor(wrapped.run.body, 'go:cabin'), WALK)
})

test('her first aid names no one but her', () => {
  const lit = doAll(night('fire'), ['go:trees', 'cut:deadfall', 'cut:deadfall', 'go:fire', 'light'])
  const hurt = { ...lit, run: { ...lit.run, body: { ...lit.run.body, hands: 'white' as const, feet: 'numb' as const } } }
  const labels = panelOf(CRASH, hurt).buttons.filter((b) => b.id === 'night:warm' || b.id === 'night:wrap')
  assert.equal(labels.length, 2)
  assert.ok(labels.every((b) => !/Wade/.test(b.label)))
  assert.doesNotMatch(panelOf(CRASH, act(hurt, 'wrap')).text, /Wade/)
})

test('fire first: she warms her hands at the fire between the frame and the knot, and keeps them', () => {
  const lit = doAll(night('fire'), ['go:trees', 'cut:deadfall', 'cut:boughs', 'go:fire', 'light'])
  const tied = doAll(lit, ['go:cabin', 'free', 'go:fire', 'go:cabin', 'tie'])
  assert.equal(tied.run.body.hands, 'fine')
})

test('finishing the order’s work is a checkpoint: frostbite clears there and the signal prompt opens', () => {
  const done = doAll(night('jake'), ['free', 'tie', 'go:trees', 'cut:deadfall', 'cut:deadfall', 'cut:boughs', 'go:fire', 'light', 'go:cabin', 'bed'])
  assert.equal(stageOf(done.run.carried), 'signal')
  assert.equal(done.run.body.hands, 'fine')
  assert.ok(done.run.checkpoint.played > 0)
  assert.equal(done.run.carried.at, 'fire', 'she ends by the fire with Jake')
})

test('the signal prompt’s labels are the story’s own; saving the fire has no task, the others do', () => {
  const done = doAll(night('fire'), ['go:trees', 'cut:deadfall', 'cut:deadfall', 'cut:boughs', 'go:fire', 'light', 'go:cabin', 'free', 'tie', 'bed'])
  const p = panelOf(CRASH, done)
  const story = menu(send(CRASH, 'fire')).options
  assert.deepEqual(p.buttons.slice(0, SIGNALS.length).map((b) => b.label), SIGNALS.map((s) => story.find((o) => o.note === s)!.label))
  assert.ok(p.buttons.slice(SIGNALS.length).every((b) => !b.id.startsWith('night:signal:')), 'the tasks follow the signals')
  assert.equal(stageOf(press(done, 'night:signal:saveFire')!.run.carried), 'night')
  const smoke = press(done, 'night:signal:smoke')!
  assert.equal(stageOf(smoke.run.carried), 'signalling')
  assert.ok(ready({ ...smoke, run: { ...smoke.run, carried: { ...smoke.run.carried, at: 'cabin' } } }, 'rags'))
})

test('the fire going out with Lucy away from it fades back to the last checkpoint', () => {
  const lit = doAll(night('fire'), ['go:trees', 'cut:boughs', 'go:fire', 'light', 'go:cabin'])
  const out = run(lit, 120)
  assert.equal(out.out, 'fireOut')
  assert.equal(out.run.played, 0)
  assert.equal(press(out, 'night:retry'), undefined, 'the first checkpoint is before the prompt: the story asks again')
})

test('freezing too long fades back; from the second checkpoint the retry plays on from there', () => {
  const done = doAll(night('jake'), ['free', 'tie', 'go:trees', 'cut:deadfall', 'cut:deadfall', 'cut:boughs', 'go:fire', 'light', 'go:cabin', 'bed'])
  const signalling = press(done, 'night:signal:stampX')!
  const cold = { ...signalling, run: { ...signalling.run, fire: { fuel: 10000 }, body: { ...signalling.run.body, warmth: 1, freezing: FREEZE_LIMIT - 1 } } }
  const onSlope = { ...cold, run: { ...cold.run, carried: { ...cold.run.carried, at: 'slope' as const } } }
  const out = run(onSlope, 2)
  assert.equal(out.out, 'froze')
  assert.equal(panelOf(CRASH, out).buttons[0]!.id, 'night:retry')
  const back = press(out, 'night:retry')!
  assert.equal(back.out, undefined)
  assert.equal(stageOf(back.run.carried), 'signal', 'back at the signal prompt')
  assert.equal(back.run.body.freezing, 0)
})

test('a task under way takes no other and shows no buttons; the panel is the mission’s', () => {
  const n = act(night('jake'), 'free')
  assert.equal(act(n, 'go:fire'), n)
  const p = panelOf(CRASH, n)
  assert.equal(p.title, 'The long night')
  assert.deepEqual(p.buttons, [])
  assert.ok(verbs(night('jake')).every((v) => ready(night('jake'), v)))
})

// The headless mission test: a steady player through each order and signal reaches first light, and the night's one
// note lands on the same state as the text build's mission note (story.ts, sendMission).
test('each order and signal plays to first light and lands on the text build’s state', () => {
  ORDERS.forEach((order) =>
    SIGNALS.forEach((signal) => {
      const end = playOut(night(order), signal)
      assert.ok(dawned(end), `${order}.${signal} reaches first light`)
      assert.ok(end.run.carried.night >= NIGHT)
      assert.equal(noteOf(end), `${order}.${signal}`)
      const story = sceneNotes(CRASH, noteOf(end)).reduce(send, CRASH)
      assert.deepEqual(story, sendMission(CRASH, noteOf(end)))
      assert.equal(story.scene, 'a3_search')
    }),
  )
})

test('the cold you can see: breath, fingers, walk and frost follow the body', () => {
  assert.ok(tells({ ...fresh, warmth: 0.5 }, false).breath > tells(fresh, false).breath)
  assert.ok(tells({ ...fresh, warmth: 0.5 }, false).frost > tells(fresh, false).frost)
  assert.equal(tells(fresh, false).fingers, 'fine')
  assert.equal(tells({ ...fresh, bare: BARE_LIMIT / 2 }, false).fingers, 'pale')
  assert.equal(tells({ ...fresh, hands: 'white' }, false).fingers, 'white')
  assert.equal(tells({ ...fresh, feet: 'numb' }, false).walk, NUMB_PACE)
  assert.ok(tells({ ...fresh, warmth: 0.5 }, false).shiver > 0)
})

test('reduced motion stills the breath and the shiver; high contrast drops the frost haze for words', () => {
  const freezing = { ...fresh, warmth: 0.5, hands: 'white' as const }
  const calm = tells(freezing, true, { reduced: true, contrast: false })
  assert.equal(calm.puffs, false)
  assert.equal(calm.shiver, 0)
  assert.ok(calm.frost > 0)
  const sharp = tells(freezing, true, { reduced: false, contrast: true })
  assert.equal(sharp.frost, 0)
  assert.match(sharp.words ?? '', /white/)
  assert.match(sharp.words ?? '', /sweat/)
  assert.equal(tells(freezing, true).words, undefined)
})

// Regression (#138 wiring): at the signal prompt the panel showed only the three signals, while the steady player
// banks the fire and cuts wood first, so the wired game, which can only press what the panel shows, stalled there
// until Lucy froze. Every button the steady player presses must be on the panel when it presses it.
test('every button the steady player presses is on the night’s panel at that moment, for each order and signal', () => {
  ORDERS.forEach((order) =>
    SIGNALS.forEach((signal) => {
      let cur = night(order)
      for (let k = 0; !dawned(cur) && k < 200000; k++) {
        const id = nextPress(cur, signal)
        if (id) {
          const shown = panelOf(CRASH, cur).buttons.map((b) => b.id)
          assert.ok(shown.includes(id), `${order}.${signal}: ${id} not on the panel (${shown.join(', ')}) at ${stageOf(cur.run.carried)}`)
          cur = press(cur, id)!
        } else cur = step(cur, DT)
      }
      assert.ok(dawned(cur), `${order}.${signal} reaches first light`)
    }),
  )
})
