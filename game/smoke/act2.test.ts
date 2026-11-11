import { test } from 'node:test'
import assert from 'node:assert/strict'
import { replayPath } from '../src/start.ts'
import type { Step } from './act2Plan.ts'
import { ACT2_PATH, ACT3_FIRST, act2Beats, act2Spaces, bands, beatName, isBeat, label, nextStep, poseFor } from './act2Plan.ts'
import type { Page } from './browser.ts'
import { frames, game, smoke } from './browser.ts'
import { stallContext, stallMessage } from './stall.ts'

// Act 2's smoke run, its own job beside Act 1's (make test/game/smoke/act2): from where the Act 1 run reaches Act 2 to
// Act 3's first scene, in headless Chromium, every choice the first. At the start of each beat (each place the
// story moves to) it captures the frame of the space it plays in, in each moral-weather band, into
// game/smoke/baselines/act2. Only the photo lab and Lucy's kitchen route to spaces yet, so it also visits each Act 2
// space from the Act 2 start, and samples every Act 2 space against docs/perf.md. act2Plan.test.ts proves the same steps headless.

const run = smoke({ baselines: 'act2', played: act2Spaces, port: 4322, report: 'smoke-report-act2' })

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

// A walk ends where it is going, or where the story takes Wade on the way (out of the photo lab's records room).
const walkTo = async (p: Page, x: number, z: number): Promise<void> => {
  const space = await p.evaluate(() => (window as any).__prologue.game().space as string)
  await p.evaluate(([x, z]) => (window as any).__prologue.walkTo(x, z), [x, z] as const)
  await p.waitForFunction(
    ([x, z, space]) => {
      const g = (window as any).__prologue.game()
      return Math.hypot(g.pos.x - x, g.pos.z - z) < 0.2 || g.space !== space
    },
    [x, z, space] as const,
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
    const space = await p.evaluate(() => (window as any).__prologue.game().space as string)
    for (const [x, z] of s.points) {
      if ((await p.evaluate(() => (window as any).__prologue.game().space as string)) !== space) break
      await walkTo(p, x, z)
    }
    await p.evaluate((yaw) => (window as any).__prologue.aim(yaw, 0), s.yaw)
    await frames(p, 3)
    return
  }
  await frames(p, 10)
}

const MAX_STEPS = 1500

test('Act 2 plays from its start to Act 3’s first scene, a frame per beat in each band', { timeout: 1500000 }, async () => {
  const { page, errors, close } = await run.open(ACT2_PATH)
  const started = Date.now()
  try {
    await page.evaluate((n) => (window as any).__prologue.pace(n), FAST)
    await page.evaluate(() => (window as any).__prologue.record(true))
    const beats: string[] = []
    let before
    for (let n = 0; ; n++) {
      const g = await game(page)
      if (g.story.scene === ACT3_FIRST) break
      assert.ok(n < MAX_STEPS, `stuck at ${g.story.scene} in ${g.space}`)
      if (isBeat(before, g)) {
        const name = beatName(before, g)
        beats.push(name)
        console.log(`  beat ${name} in ${g.space}: ${((Date.now() - started) / 1000).toFixed(0)} s in`)
        for (const b of bands) await run.capture(page, `${name}${b.suffix}`, poseFor[g.space as keyof typeof poseFor]!, b.heat)
      }
      before = g
      await take(page, nextStep(g))
    }
    await page.evaluate(() => (window as any).__prologue.record(false))
    const end = await game(page)
    const text = replayPath(end.path.join(','))
    assert.ok(!('error' in text), 'the engine’s path replays in the text build')
    assert.deepEqual(end.story, text.story, 'the engine reaches the text build’s state on its path')
    assert.deepEqual(beats, act2Beats)
    assert.deepEqual(errors, [])
    console.log(`  Act 2 took ${((Date.now() - started) / 1000).toFixed(0)} s`)
  } finally {
    await run.collect(page)
    await close()
  }
})

// Only the photo lab and Lucy's kitchen route to spaces yet: the probe puts Wade in each Act 2 space from the Act 2 start, in its season, to
// sample it and capture its frame in each band.
test('every Act 2 space renders from the Act 2 start, a frame in each band', { timeout: 600000 }, async () => {
  const { page, errors, close } = await run.open(ACT2_PATH)
  try {
    for (const space of act2Spaces) {
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

test('every Act 2 frame matches its baseline and every Act 2 space holds its budget in docs/perf.md', () => {
  const over = run.publish()
  assert.deepEqual(run.failedFrames(), [], `frames differ from game/smoke/baselines/act2; see ${run.reportDir}`)
  assert.deepEqual(over, [], 'over the budget in docs/perf.md')
})
