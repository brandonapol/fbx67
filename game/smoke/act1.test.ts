import { test } from 'node:test'
import assert from 'node:assert/strict'
import { replayPath } from '../src/start.ts'
import type { Step } from './act1Plan.ts'
import { ACT1_PATH, ACT2_FIRST, act1Spaces, bands, isBeat, label, nextStep, offers, poseFor } from './act1Plan.ts'
import type { Page } from './browser.ts'
import { frames, game, smoke } from './browser.ts'

// Act 1's smoke run, its own job beside the prologue's (make test/game/smoke/act1): from the text build's Act 1 path
// to Act 2's first scene, in headless Chromium, every choice the first. At the start of each beat (each space Wade
// comes into) it captures that space's frame in each moral-weather band, into game/smoke/baselines/act1, and it
// samples every Act 1 space against docs/perf.md. act1Plan.test.ts proves the same steps headless.

const run = smoke({ baselines: 'act1', played: act1Spaces, port: 4320, report: 'smoke-report-act1' })

// Game ticks per drawn frame (main.ts, pace): software rendering draws a few frames a second.
const FAST = 4

// The longest any one step may take before the run names it as stuck.
const STEP_MS = 120000

// What a step is waiting to see change: the scene, the space, the panel or letter, what Wade holds, the path.
const where = (p: Page): Promise<string> =>
  p.evaluate(() => {
    const g = (window as any).__prologue.game()
    return JSON.stringify([g.story.scene, g.space, g.panel?.title, g.panel?.buttons.length, g.home?.writing !== undefined, g.home?.page?.length, g.holding?.id, g.look, g.path.length])
  })

const changed = async (p: Page, from: string, what: string): Promise<void> => {
  const end = Date.now() + STEP_MS
  while ((await where(p)) === from) {
    if (Date.now() > end) throw new Error(`${what}: nothing changed in ${STEP_MS / 1000} s at ${from}`)
    await frames(p, 2)
  }
}

// A press acts on its keydown (main.ts), so what it changes shows at once; a few frames cover the key's release.
const PRESS_FRAMES = 4

const changedWithin = async (p: Page, from: string, n: number): Promise<boolean> => {
  if ((await where(p)) !== from) return true
  if (n <= 0) return false
  await frames(p, 1)
  return changedWithin(p, from, n - 1)
}

// A tap of interact, made only while the live game still offers the step's spot, and made again only when it changed
// nothing and the spot is still offered (act1Plan.ts, offers). When it is not, the plan reads the game afresh.
const use = async (p: Page, s: Step): Promise<void> => {
  const end = Date.now() + STEP_MS
  for (;;) {
    const from = await where(p)
    if (!offers(s, await game(p))) return
    await p.keyboard.press('e')
    if (await changedWithin(p, from, PRESS_FRAMES)) return
    if (Date.now() > end) throw new Error(`${label(s)}: nothing changed in ${STEP_MS / 1000} s at ${from}`)
  }
}

const walkTo = async (p: Page, x: number, z: number): Promise<void> => {
  await p.evaluate(([x, z]) => (window as any).__prologue.walkTo(x, z), [x, z] as const)
  await p.waitForFunction(
    ([x, z]) => {
      const g = (window as any).__prologue.game()
      return Math.hypot(g.pos.x - x, g.pos.z - z) < 0.2
    },
    [x, z] as const,
    { timeout: STEP_MS },
  )
}

const take = async (p: Page, s: Step): Promise<void> => {
  const from = await where(p)
  if (s.kind === 'key') {
    await p.keyboard.press(s.key)
    return changed(p, from, label(s))
  }
  if (s.kind === 'interact') {
    if (!s.hold) return use(p, s)
    await p.keyboard.down('e')
    await p.waitForFunction(() => (window as any).__prologue.game().holding === undefined, null, { timeout: STEP_MS })
    await p.keyboard.up('e')
    return
  }
  if (s.kind === 'steer') {
    await p.evaluate(([x, z]) => (window as any).__prologue.walkTo(x, z), [s.x, s.z] as const)
    if (s.getUp) await p.keyboard.press('f')
    return frames(p, 2)
  }
  if (s.kind === 'walk') {
    for (const [x, z] of s.points) await walkTo(p, x, z)
    await p.evaluate((yaw) => (window as any).__prologue.aim(yaw, 0), s.yaw)
    await frames(p, 3)
    return
  }
  await frames(p, 10)
}

const MAX_STEPS = 1500

test('Act 1 plays from its path to Act 2’s first scene, a frame per beat in each band', { timeout: 1500000 }, async () => {
  const { page, errors, close } = await run.open(ACT1_PATH)
  const started = Date.now()
  try {
    await page.evaluate((n) => (window as any).__prologue.pace(n), FAST)
    await page.evaluate(() => (window as any).__prologue.record(true))
    const beats: string[] = []
    let before
    for (let n = 0; ; n++) {
      const g = await game(page)
      if (g.story.scene === ACT2_FIRST) break
      assert.ok(n < MAX_STEPS, `stuck at ${g.story.scene} in ${g.space}`)
      const beat = isBeat(before, g)
      if (beat) {
        beats.push(g.story.scene)
        console.log(`  beat ${g.story.scene} in ${g.space}: ${((Date.now() - started) / 1000).toFixed(0)} s in`)
        for (const b of bands) await run.capture(page, `${g.story.scene}${b.suffix}`, poseFor[g.space as keyof typeof poseFor]!, b.heat)
      }
      before = g
      // A capture poses the game and puts it back, and the camera with it may not be where it was: plan from the game
      // as it is now.
      await take(page, nextStep(beat ? await game(page) : g))
    }
    await page.evaluate(() => (window as any).__prologue.record(false))
    const end = await game(page)
    const text = replayPath(end.path.join(','))
    assert.ok(!('error' in text), 'the engine’s path replays in the text build')
    assert.deepEqual(end.story, text.story, 'the engine reaches the text build’s state on its path')
    assert.deepEqual(beats, ['a1_flood', 'a1_errand', 'a1_trail', 'a1_body', 'a1_ruling', 'a1_lucy', 'a1_barfight', 'a1_tank'])
    assert.deepEqual(errors, [])
    console.log(`  Act 1 took ${((Date.now() - started) / 1000).toFixed(0)} s`)
  } finally {
    await run.collect(page)
    await close()
  }
})

test('every Act 1 frame matches its baseline and every Act 1 space holds its budget in docs/perf.md', () => {
  const over = run.publish()
  assert.deepEqual(run.failedFrames(), [], `frames differ from game/smoke/baselines/act1; see ${run.reportDir}`)
  assert.deepEqual(over, [], 'over the budget in docs/perf.md')
})
