import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright') as typeof import('playwright')

const port = Number(process.env.SMOKE_PORT ?? 4319)
const url = `http://localhost:${port}/fbx67/play/`
const shots = process.env.SMOKE_SHOTS

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
      { timeout: 20000 },
    )
  }
}

const game = (p: Page) => p.evaluate(() => (window as any).__prologue.game())

const snap = async (p: Page, name: string): Promise<void> => {
  if (!shots) return
  mkdirSync(shots, { recursive: true })
  await p.screenshot({ path: `${shots}/${name}.png` })
}

test('the prologue plays end to end in a browser', { timeout: 360000 }, async () => {
  const server = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], { stdio: 'ignore' })
  try {
    await waitForServer()
    const browser = await chromium.launch({
      executablePath: process.env.CHROMIUM_PATH,
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    })
    const page = await browser.newPage({ viewport: { width: 960, height: 600 } })
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto(url)
    await page.waitForFunction(() => (window as any).__prologue !== undefined)
    await snap(page, '01-bar')

    await page.keyboard.press('1')
    await walk(page, [[-1.5, -2.2]])
    await page.keyboard.press('e')
    await page.locator('#panel-buttons button[data-id="note:round"]').click()
    assert.equal((await game(page)).story.scene, 'p_talk_round')
    await snap(page, '02-round')
    await page.keyboard.press('1')

    await walk(page, [[0, 4.2]])
    await page.keyboard.press('e')
    assert.equal((await game(page)).space, 'room')
    await walk(page, [[1.6, -0.8]])
    await page.keyboard.press('e')
    await snap(page, '03-letter')
    await page.keyboard.press('1')
    assert.equal((await game(page)).space, 'camp')

    await walk(page, [[-6, 2], [-2, -1.5], [0, -6], [1.8, -7.5]])
    await page.waitForFunction(() => {
      const g = (window as any).__prologue.game()
      return g.t % 9.2 < 0.1
    })
    await page.keyboard.down('e')
    await page.waitForFunction(() => (window as any).__prologue.game().hidden === 'marker', null, { timeout: 10000 })
    await page.keyboard.up('e')
    await snap(page, '04-hidden')

    await walk(page, [[0, -6], [-2, -1.5], [-6, 2], [-7.4, 3.8]])
    await page.keyboard.press('e')
    assert.equal((await game(page)).space, 'flood')
    await walk(page, [[0.2, 5.4]])
    await page.keyboard.press('e')
    await snap(page, '05-skiff')
    await page.keyboard.press('1')
    const end = await game(page)
    assert.equal(end.panel?.kind, 'end')
    assert.deepEqual(end.path, [3, 1, 3, 1])
    assert.equal(end.story.owenCache, 'marker')
    await snap(page, '06-end')
    const href = await page.evaluate(() => (window as any).__prologue.textBuild())
    assert.match(href, /\/fbx67\/#path=3,1,3,1$/)
    assert.deepEqual(errors, [])
    await browser.close()
  } finally {
    server.kill()
  }
})
