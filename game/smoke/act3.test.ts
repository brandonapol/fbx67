import { test } from 'node:test'
import assert from 'node:assert/strict'
import { replayPath } from '../src/start.ts'
import type { Step } from './act3Plan.ts'
import { ACT3_PATH, ACT4_FIRST, act3Beats, act3Spaces, bands, isBeat, label, nextStep, poseFor } from './act3Plan.ts'
import type { Page } from './browser.ts'
import { frames, game, smoke } from './browser.ts'
import { stallContext, stallMessage } from './stall.ts'

// Act 3's smoke run, its own job beside Act 2's (make test/game/smoke/act3): from where the Act 2 run reaches Act 3 to
// Act 4's first scene, in headless Chromium, every choice the first. At the start of each beat (each place the story
// moves to) it captures the frame of the space it plays in, in each moral-weather band, into
// game/smoke/baselines/act3. No Act 3 scene routes to a space yet and levels.ts has no Act 3 space; when one is built,
// the run visits it from the Act 3 start and samples it against docs/perf.md. act3Plan.test.ts proves the same steps
// headless.

const run = smoke({ baselines: 'act3', played: act3Spaces, port: 4323, report: 'smoke-report-act3' })

// Game ticks per drawn frame (main.ts, pace): software rendering draws a few frames a second.
const FAST = 4

// The longest any one step may take before the run names it as stuck.
const STEP_MS = 120000

// Frames sampled in a space the run visits rather than plays, as the prologue's run samples the blockout.
const VISIT_FRAMES = 40

// What a step is waiting to see change: the scene, the space, the panel or letter, what Wade holds, the path.
const where = (p: Page): Promise<string> =>
  p.evaluate(() => {
    const g = (window as any).__prologue.game()
    return JSON.stringify([g.story.scene, g.space, g.panel?.title, g.panel?.buttons.length, g.home?.writing !== undefined, g.home?.page?.length, g.holding?.id, g.look, g.path.length])
  })

const changed = async (p: Page, from: string, what: string): Promise<void> => {
  const end = Date.now() + STEP_MS
  while ((await where(p)) === from) {
    if (Date.now() > end) throw new Error(stallMessage({ what, seconds: STEP_MS / 1000, at: from, ...(await stallContext(p)) }))
    await frames(p, 2)
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

// Does a step with the player's input, as act1.test.ts does.
const take = async (p: Page, s: Step): Promise<void> => {
  const from = await where(p)
  if (s.kind === 'key') {
    await p.keyboard.press(s.key)
    return changed(p, from, label(s))
  }
  if (s.kind === 'interact') {
    if (!s.hold) {
      await p.keyboard.press('e')
      return changed(p, from, label(s))
    }
    await p.keyboard.down('e')
    await p.waitForFunction(() => (window as any).__prologue.game().holding === undefined, null, { timeout: STEP_MS })
    await p.keyboard.up('e')
    return
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

test('Act 3 plays from its start to Act 4’s first scene, a frame per beat in each band', { timeout: 1500000 }, async () => {
  const { page, errors, close } = await run.open(ACT3_PATH)
  const started = Date.now()
  try {
    await page.evaluate((n) => (window as any).__prologue.pace(n), FAST)
    await page.evaluate(() => (window as any).__prologue.record(true))
    const beats: string[] = []
    let before
    for (let n = 0; ; n++) {
      const g = await game(page)
      if (g.story.scene === ACT4_FIRST) break
      assert.ok(n < MAX_STEPS, `stuck at ${g.story.scene} in ${g.space}`)
      if (isBeat(before, g)) {
        beats.push(g.story.scene)
        console.log(`  beat ${g.story.scene} in ${g.space}: ${((Date.now() - started) / 1000).toFixed(0)} s in`)
        for (const b of bands) await run.capture(page, `${g.story.scene}${b.suffix}`, poseFor[g.space as keyof typeof poseFor]!, b.heat)
      }
      before = g
      await take(page, nextStep(g))
    }
    await page.evaluate(() => (window as any).__prologue.record(false))
    const end = await game(page)
    const text = replayPath(end.path.join(','))
    assert.ok(!('error' in text), 'the engine’s path replays in the text build')
    assert.deepEqual(end.story, text.story, 'the engine reaches the text build’s state on its path')
    assert.deepEqual(beats, act3Beats)
    assert.deepEqual(errors, [])
    console.log(`  Act 3 took ${((Date.now() - started) / 1000).toFixed(0)} s`)
  } finally {
    await run.collect(page)
    await close()
  }
})

// No Act 3 scene routes to a space yet: the probe puts Wade in each Act 3 space from the Act 3 start, in its season, to
// sample it and capture its frame in each band. levels.ts has none yet, so this waits for the first.
test('every Act 3 space renders from the Act 3 start, a frame in each band', { timeout: 600000, skip: act3Spaces.length === 0 && 'no Act 3 space in levels.ts yet' }, async () => {
  const { page, errors, close } = await run.open(ACT3_PATH)
  try {
    for (const space of act3Spaces) {
      const pose = poseFor[space]!
      await page.evaluate((at) => (window as any).__prologue.visit(at), pose)
      assert.equal((await game(page)).space, space)
      await page.evaluate(() => (window as any).__prologue.record(true))
      await frames(page, VISIT_FRAMES)
      await page.evaluate(() => (window as any).__prologue.record(false))
      for (const b of bands) await run.capture(page, `${space}${b.suffix}`, pose, b.heat)
    }
    assert.deepEqual(errors, [])
  } finally {
    await run.collect(page)
    await close()
  }
})

test('every Act 3 frame matches its baseline and every Act 3 space holds its budget in docs/perf.md', () => {
  const over = run.publish()
  assert.deepEqual(run.failedFrames(), [], `frames differ from game/smoke/baselines/act3; see ${run.reportDir}`)
  assert.deepEqual(over, [], 'over the budget in docs/perf.md')
})
