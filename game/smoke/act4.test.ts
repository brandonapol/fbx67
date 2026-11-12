import { test } from 'node:test'
import assert from 'node:assert/strict'
import { replayPath } from '../src/start.ts'
import { ACT4_LAST, ACT4_PATH, act4Beats, act4Spaces, bands, isBeat, label, nextStep, poseFor } from './act4Plan.ts'
import type { Page } from './browser.ts'
import { frames, game, smoke } from './browser.ts'
import { stallContext, stallMessage } from './stall.ts'

// Act 4's smoke run, its own job beside Act 3's (make test/game/smoke/act4): from where the Act 3 run reaches Act 4 to
// the end, in headless Chromium, every choice the first but the offer's, which fakes the deal. Act 4 has no space of its
// own: it plays as panels over the story backdrop, so each beat's frame is that backdrop, the same in every beat, and git
// stores one image. At the start of each beat (each scene act4Plan.ts lists) it captures the frame in each moral-weather
// band into game/smoke/baselines/act4. act4Plan.test.ts proves the same steps headless.

const run = smoke({ baselines: 'act4', played: act4Spaces, port: 4324, report: 'smoke-report-act4' })

// Game ticks per drawn frame (main.ts, pace): software rendering draws a few frames a second.
const FAST = 4

// The longest any one step may take before the run names it as stuck.
const STEP_MS = 120000

// What a step is waiting to see change: the scene, the panel, the path.
const where = (p: Page): Promise<string> =>
  p.evaluate(() => {
    const g = (window as any).__prologue.game()
    return JSON.stringify([g.story.scene, g.space, g.panel?.title, g.panel?.buttons.length, g.path.length])
  })

const changed = async (p: Page, from: string, what: string): Promise<void> => {
  const end = Date.now() + STEP_MS
  while ((await where(p)) === from) {
    if (Date.now() > end) throw new Error(stallMessage({ what, seconds: STEP_MS / 1000, at: from, ...(await stallContext(p)) }))
    await frames(p, 2)
  }
}

const MAX_STEPS = 200

test('Act 4 plays from its start to the end, a frame per beat in each band', { timeout: 900000 }, async () => {
  const { page, errors, close } = await run.open(ACT4_PATH)
  const started = Date.now()
  try {
    await page.evaluate((n) => (window as any).__prologue.pace(n), FAST)
    await page.evaluate(() => (window as any).__prologue.record(true))
    const beats: string[] = []
    let before
    for (let n = 0; ; n++) {
      const g = await game(page)
      if (g.story.scene === ACT4_LAST) break
      assert.ok(n < MAX_STEPS, `stuck at ${g.story.scene} in ${g.space}`)
      if (isBeat(before, g)) {
        beats.push(g.story.scene)
        console.log(`  beat ${g.story.scene} in ${g.space}: ${((Date.now() - started) / 1000).toFixed(0)} s in`)
        for (const b of bands) await run.capture(page, `${g.story.scene}${b.suffix}`, poseFor[g.space as keyof typeof poseFor]!, b.heat)
      }
      before = g
      const step = nextStep(g)
      assert.equal(step.kind, 'key', `${g.story.scene}: Act 4 plays as panels, a key press`)
      const from = await where(page)
      await page.keyboard.press((step as { key: string }).key)
      await changed(page, from, label(step))
    }
    await page.evaluate(() => (window as any).__prologue.record(false))
    const end = await game(page)
    const text = replayPath(end.path.join(','))
    assert.ok(!('error' in text), 'the engine’s path replays in the text build')
    assert.deepEqual(end.story, text.story, 'the engine reaches the text build’s state on its path')
    assert.deepEqual(beats, act4Beats)
    assert.deepEqual(errors, [])
    console.log(`  Act 4 took ${((Date.now() - started) / 1000).toFixed(0)} s`)
  } finally {
    await run.collect(page)
    await close()
  }
})

test('every Act 4 frame matches its baseline and every Act 4 space holds its budget in docs/perf.md', () => {
  const over = run.publish()
  assert.deepEqual(run.failedFrames(), [], `frames differ from game/smoke/baselines/act4; see ${run.reportDir}`)
  assert.deepEqual(over, [], 'over the budget in docs/perf.md')
})
