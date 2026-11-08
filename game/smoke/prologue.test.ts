import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import { appendFileSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Sample } from '../src/probe.ts'
import { breaches, parseBudgets, perfMarkdown, summarize } from './budget.ts'
import type { FrameResult } from './frames.ts'
import { checkFrame, framesMarkdown } from './frames.ts'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright') as typeof import('playwright')

const port = Number(process.env.SMOKE_PORT ?? 4319)
const url = `http://localhost:${port}/fbx67/play/?test=1`
const shots = process.env.SMOKE_SHOTS
const root = fileURLToPath(new URL('..', import.meta.url))
const report = process.env.SMOKE_REPORT ?? join(root, 'smoke-report')
const artifact = process.env.SMOKE_ARTIFACT ?? 'smoke-report'
const dirs = { baselines: join(root, 'smoke', 'baselines'), report, update: process.env.SMOKE_BASELINES === 'update' }
const budgets = parseBudgets(readFileSync(join(root, '..', 'docs', 'perf.md'), 'utf8'))
type Point = readonly [number, number]

type Page = import('playwright').Page

const waitForServer = async (tries = 60): Promise<void> => {
  try {
    const r = await fetch(url)
    if (r.ok) return
  } catch {
    if (tries <= 0) throw new Error(`preview server never answered on ${url}`)
  }
  await new Promise((r) => setTimeout(r, 250))
  return waitForServer(tries - 1)
}

const walk = async (p: Page, points: readonly (readonly [number, number])[]): Promise<void> => {
  for (const [x, z] of points) {
    await p.evaluate(([x, z]) => (window as any).__prologue.walkTo(x, z), [x, z] as const)
    await p.waitForFunction(
      ([x, z]) => {
        const g = (window as any).__prologue.game()
        return Math.hypot(g.pos.x - x, g.pos.z - z) < 0.2
      },
      [x, z] as const,
      { timeout: 90000 },
    )
  }
}

const tour = async (p: Page, home: Point, away: Point, ms = 10000): Promise<void> => {
  await p.evaluate(() => (window as any).__prologue.record(true))
  const end = Date.now() + ms
  const leg = async (): Promise<void> => {
    await walk(p, [away])
    if (Date.now() >= end) return
    await walk(p, [home])
    return leg()
  }
  await leg()
  await p.evaluate(() => (window as any).__prologue.record(false))
}

const bytes = (dir: string): number =>
  readdirSync(dir, { withFileTypes: true }).reduce(
    (n, e) => n + (e.isDirectory() ? bytes(join(dir, e.name)) : statSync(join(dir, e.name)).size),
    0,
  )

const game = (p: Page) => p.evaluate(() => (window as any).__prologue.game())

const snap = async (p: Page, name: string): Promise<void> => {
  if (!shots) return
  mkdirSync(shots, { recursive: true })
  await p.screenshot({ path: `${shots}/${name}.png` })
}

const frames: FrameResult[] = []

const capture = async (p: Page, name: string): Promise<void> => {
  await p.evaluate((n) => (window as any).__prologue.capture(n), name)
  frames.push(checkFrame(dirs, name, await p.screenshot({ timeout: 120000 })))
  await p.evaluate(() => (window as any).__prologue.release())
}

const publish = (samples: readonly Sample[]): readonly string[] => {
  const perf = { downloadMB: bytes(join(root, 'dist')) / (1024 * 1024), spaces: summarize(samples, ['bar', 'room', 'camp', 'flood']) }
  const md = `${framesMarkdown(frames, artifact)}\n${perfMarkdown(perf, budgets)}`
  mkdirSync(report, { recursive: true })
  writeFileSync(join(report, 'perf.json'), `${JSON.stringify({ budgets, ...perf }, null, 2)}\n`)
  writeFileSync(join(report, 'summary.md'), md)
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md)
  console.log(md)
  return breaches(perf, budgets)
}

test('the prologue plays end to end in a browser', { timeout: 900000 }, async () => {
  rmSync(report, { recursive: true, force: true })
  const server = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], { stdio: 'ignore', detached: true })
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  })
  try {
    await waitForServer()
    const page = await browser.newPage({ viewport: { width: 960, height: 600 } })
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto(url)
    await page.waitForFunction(() => (window as any).__prologue?.capture !== undefined)
    await snap(page, '01-bar')
    await capture(page, 'bar')

    await page.keyboard.press('1')
    await tour(page, [0, 3.9], [-1.5, -2.2])
    await page.keyboard.press('e')
    await page.locator('#panel-buttons button[data-id="note:round"]').click()
    assert.equal((await game(page)).story.scene, 'p_talk_round')
    await snap(page, '02-round')
    await capture(page, 'round')
    await page.keyboard.press('1')

    await walk(page, [[0, 4.2]])
    await page.keyboard.press('e')
    assert.equal((await game(page)).space, 'room')
    await tour(page, [0, 2], [1.6, -0.8])
    await page.keyboard.press('e')
    await snap(page, '03-letter')
    await capture(page, 'letter')
    await page.keyboard.press('1')
    assert.equal((await game(page)).space, 'camp')

    await tour(page, [-8.2, 3.6], [-6, 2])
    await walk(page, [[-2, -1.5], [0, -6], [1.8, -7.5]])
    await page.waitForFunction(() => {
      const g = (window as any).__prologue.game()
      return g.t % 9.2 < 0.1
    }, null, { timeout: 90000 })
    await page.keyboard.down('e')
    await page.waitForFunction(() => (window as any).__prologue.game().hidden === 'marker', null, { timeout: 90000 })
    await page.keyboard.up('e')
    await snap(page, '04-hidden')
    await capture(page, 'hidden')

    await walk(page, [[0, -6], [-2, -1.5], [-6, 2], [-7.4, 3.8]])
    await page.keyboard.press('e')
    assert.equal((await game(page)).space, 'flood')
    await tour(page, [0, 6.4], [0.2, 5.4])
    await page.keyboard.press('e')
    await snap(page, '05-skiff')
    await capture(page, 'skiff')
    await page.keyboard.press('1')
    const end = await game(page)
    assert.equal(end.panel?.kind, 'end')
    assert.deepEqual(end.path, [3, 1, 3, 1])
    assert.equal(end.story.owenCache, 'marker')
    await snap(page, '06-end')
    const href = await page.evaluate(() => (window as any).__prologue.textBuild())
    assert.match(href, /\/fbx67\/#path=3,1,3,1$/)
    assert.deepEqual(errors, [])
    const over = publish(await page.evaluate(() => (window as any).__prologue.samples()))
    assert.deepEqual(
      frames.filter((f) => f.verdict === 'changed' || f.verdict === 'missing').map((f) => f.name),
      [],
      `frames differ from game/smoke/baselines; see ${report}`,
    )
    assert.deepEqual(over, [], 'over the budget in docs/perf.md')
  } finally {
    await browser.close()
    if (server.pid) process.kill(-server.pid)
  }
})
