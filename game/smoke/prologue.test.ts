import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import { mkdirSync } from 'node:fs'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright') as typeof import('playwright')

const port = Number(process.env.SMOKE_PORT ?? 4319)
const url = `http://localhost:${port}/fbx67/play/`
const shots = process.env.SMOKE_SHOTS

type Page = import('playwright').Page
type Browser = import('playwright').Browser

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

const walk = async (p: Page, points: readonly (readonly [number, number])[], run = false): Promise<void> => {
  if (run) await p.keyboard.down('Shift')
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
  if (run) await p.keyboard.up('Shift')
}

const game = (p: Page) => p.evaluate(() => (window as any).__prologue.game())

const frames = (p: Page, n: number) =>
  p.evaluate(
    (n) =>
      new Promise<void>((done) => {
        const go = (k: number) => (k <= 0 ? done() : requestAnimationFrame(() => go(k - 1)))
        go(n)
      }),
    n,
  )

const snap = async (p: Page, name: string, settle = 20): Promise<void> => {
  if (!shots) return
  mkdirSync(shots, { recursive: true })
  await frames(p, settle)
  await p.screenshot({ path: `${shots}/${name}.png` })
}

const aim = (p: Page, yaw: number, pitch: number) =>
  p.evaluate(([yaw, pitch]) => (window as any).__prologue.aim(yaw, pitch), [yaw, pitch] as const)

const state: { server?: ChildProcess; browser?: Browser } = {}

before(async () => {
  state.server = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], { stdio: 'ignore' })
  await waitForServer()
  state.browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  })
})

after(async () => {
  await state.browser?.close()
  state.server?.kill()
})

const open = async (opts: Readonly<{ touch?: boolean; pad?: boolean }> = {}) => {
  const browser = state.browser
  if (!browser) throw new Error('no browser')
  const context = await browser.newContext({ viewport: { width: 960, height: 600 }, hasTouch: !!opts.touch })
  const page = await context.newPage()
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  if (opts.pad) {
    await page.addInitScript(() => {
      const pad = { id: 'Xbox Wireless Controller (STANDARD GAMEPAD)', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => false) }
      Object.assign(window, { __pad: pad })
      Object.defineProperty(navigator, 'getGamepads', {
        value: () => [
          {
            id: pad.id,
            index: 0,
            connected: true,
            mapping: 'standard',
            timestamp: performance.now(),
            axes: pad.axes,
            buttons: pad.buttons.map((pressed) => ({ pressed, touched: pressed, value: pressed ? 1 : 0 })),
          },
        ],
      })
    })
  }
  await page.goto(url)
  await page.waitForFunction(() => (window as any).__prologue !== undefined)
  return { page, errors, close: () => context.close() }
}

test('the prologue plays end to end with the keyboard', { timeout: 600000 }, async () => {
  const { page, errors, close } = await open()
  await snap(page, '01-bar')

  await page.keyboard.press('1')
  await aim(page, Math.PI / 2, 0)
  const from = (await game(page)).pos
  await page.keyboard.down('KeyW')
  await page.waitForFunction(
    ([x, z]) => {
      const g = (window as any).__prologue.game()
      return Math.hypot(g.pos.x - x, g.pos.z - z) > 0.6
    },
    [from.x, from.z] as const,
    { timeout: 60000 },
  )
  await page.keyboard.up('KeyW')
  const to = (await game(page)).pos
  const moved = Math.hypot(to.x - from.x, to.z - from.z)
  assert.ok((to.x - from.x) / moved > 0.95, `W with the camera looking east moved ${to.x - from.x},${to.z - from.z}`)

  await walk(page, [[5.2, 4.3]], true)
  await aim(page, (-3 * Math.PI) / 4, 0)
  await snap(page, '02-bar-corner', 3)

  await walk(page, [[-1.5, -2.2]], true)
  assert.equal(await page.locator('#prompt').getAttribute('data-id'), 'hank')
  assert.equal(await page.locator('#prompt .label').textContent(), 'Hold: Buy the table a round.')
  await page.keyboard.press('e')
  await frames(page, 10)
  assert.equal((await game(page)).story.scene, 'p_bar')
  await page.keyboard.down('e')
  await frames(page, 3)
  await snap(page, '03-round-hold', 0)
  await page.waitForFunction(() => (window as any).__prologue.game().story.scene === 'p_talk_round', null, { timeout: 60000 })
  await page.keyboard.up('e')
  await snap(page, '04-round')
  await page.keyboard.press('1')

  await walk(page, [[0, 4.2]], true)
  await page.keyboard.press('e')
  assert.equal((await game(page)).space, 'room')
  await snap(page, '05-room')
  await walk(page, [[1.6, -0.8]], true)
  await page.keyboard.press('e')
  await snap(page, '06-letter')
  await page.keyboard.press('1')
  assert.equal((await game(page)).story.scene, 'p_dock')
  await snap(page, '07-dock')
  await page.keyboard.press('1')
  assert.equal((await game(page)).space, 'camp')
  await snap(page, '08-camp')

  await walk(page, [[-6, 2], [-2, -1.5], [0, -6], [1.8, -7.5]], true)
  await page.waitForFunction(() => {
    const g = (window as any).__prologue.game()
    return g.t % 9.2 < 0.1
  })
  await page.keyboard.down('e')
  await page.waitForFunction(() => (window as any).__prologue.game().hidden === 'marker', null, { timeout: 60000 })
  await page.keyboard.up('e')
  await snap(page, '09-hidden')

  await walk(page, [[0, -6], [-2, -1.5], [-6, 2], [-7.4, 3.8]], true)
  await page.keyboard.press('e')
  assert.equal((await game(page)).space, 'flood')
  await walk(page, [[0.2, 5.4]], true)
  await page.keyboard.press('e')
  await snap(page, '10-skiff')
  await page.keyboard.press('1')
  const end = await game(page)
  assert.equal(end.panel?.kind, 'end')
  assert.deepEqual(end.path, [3, 1, 1, 1, 3, 1])
  assert.equal(end.story.owenCache, 'marker')
  await snap(page, '11-end')
  const href = await page.evaluate(() => (window as any).__prologue.textBuild())
  assert.match(href, /\/fbx67\/#path=3,1,1,1,3,1$/)
  assert.deepEqual(errors, [])
  await close()
})

const setPad = (p: Page, axes: readonly number[], buttons: readonly number[]) =>
  p.evaluate(
    ([axes, buttons]) => {
      const pad = (window as any).__pad
      pad.axes.splice(0, 4, ...axes)
      pad.buttons.fill(false)
      buttons.forEach((b: number) => {
        pad.buttons[b] = true
      })
    },
    [axes, buttons] as const,
  )

test('a gamepad closes the panel, walks, orbits and holds to buy the round', { timeout: 300000 }, async () => {
  const { page, errors, close } = await open({ pad: true })
  await frames(page, 5)
  await setPad(page, [0, 0, 0, 0], [0])
  await frames(page, 5)
  await setPad(page, [0, 0, 0, 0], [])
  assert.equal((await game(page)).panel, undefined)
  const from = (await game(page)).pos
  await setPad(page, [0, -1, 0, 0], [])
  await frames(page, 30)
  await setPad(page, [0, 0, 0, 0], [])
  assert.ok((await game(page)).pos.z < from.z - 0.2)
  const yaw = (await page.evaluate(() => (window as any).__prologue.camera())).yaw
  await setPad(page, [0, 0, 1, 0], [])
  await frames(page, 20)
  await setPad(page, [0, 0, 0, 0], [])
  assert.ok((await page.evaluate(() => (window as any).__prologue.camera())).yaw < yaw - 0.2)
  assert.equal(await page.evaluate(() => document.body.dataset.device), 'xbox')
  await walk(page, [[-1.5, -2.2]])
  assert.match((await page.locator('#prompt .key').textContent()) ?? '', /^A$/)
  await setPad(page, [0, 0, 0, 0], [0])
  await page.waitForFunction(() => (window as any).__prologue.game().story.scene === 'p_talk_round', null, { timeout: 60000 })
  await setPad(page, [0, 0, 0, 0], [])
  await frames(page, 3)
  await setPad(page, [0, 0, 0, 0], [0])
  await frames(page, 3)
  await setPad(page, [0, 0, 0, 0], [])
  assert.equal((await game(page)).panel, undefined)
  assert.deepEqual(errors, [])
  await close()
})

const touch = (p: Page, type: string, x: number, y: number, id: number) =>
  p.evaluate(
    ([type, x, y, id]) =>
      document
        .getElementById('scene')
        ?.dispatchEvent(new PointerEvent(type, { pointerType: 'touch', pointerId: id, clientX: x, clientY: y, bubbles: true, isPrimary: id === 1 })),
    [type, x, y, id] as const,
  )

test('touch walks with the stick, orbits with a drag and holds the prompt button', { timeout: 300000 }, async () => {
  const { page, errors, close } = await open({ touch: true })
  await page.locator('#panel-buttons button').first().tap()
  assert.equal((await game(page)).panel, undefined)
  const from = (await game(page)).pos
  await touch(page, 'pointerdown', 120, 450, 1)
  await touch(page, 'pointermove', 120, 380, 1)
  await frames(page, 30)
  await snap(page, '12-touch-stick')
  await touch(page, 'pointerup', 120, 380, 1)
  assert.ok((await game(page)).pos.z < from.z - 0.2)
  assert.equal(await page.evaluate(() => document.body.dataset.device), 'touch')
  const yaw = (await page.evaluate(() => (window as any).__prologue.camera())).yaw
  await touch(page, 'pointerdown', 700, 300, 2)
  await touch(page, 'pointermove', 760, 300, 2)
  await touch(page, 'pointermove', 820, 300, 2)
  await frames(page, 3)
  await touch(page, 'pointerup', 820, 300, 2)
  assert.ok((await page.evaluate(() => (window as any).__prologue.camera())).yaw < yaw - 0.2)
  await walk(page, [[-1.5, -2.2]])
  const prompt = page.locator('#prompt')
  assert.equal(await prompt.locator('.key').count(), 0)
  await prompt.dispatchEvent('pointerdown', { pointerType: 'touch', pointerId: 3 })
  await page.waitForFunction(() => (window as any).__prologue.game().story.scene === 'p_talk_round', null, { timeout: 60000 })
  await prompt.dispatchEvent('pointerup', { pointerType: 'touch', pointerId: 3 })
  await page.locator('#panel-buttons button').first().tap()
  assert.equal((await game(page)).panel, undefined)
  assert.deepEqual(errors, [])
  await close()
})
