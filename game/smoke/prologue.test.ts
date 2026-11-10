import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import { appendFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spaces } from '../src/levels.ts'
import type { Sample } from '../src/probe.ts'
import { poses } from '../src/probe.ts'
import { MB, breaches, parseBudgets, perfMarkdown, summarize } from './budget.ts'
import type { FrameResult } from './frames.ts'
import { checkFrame, framesMarkdown } from './frames.ts'
import { starts } from './starts.ts'
import { legs } from '../src/downtown.ts'
import { FLOOD_WALK, HALL } from '../src/drive.ts'
import { faceSeen, manAt } from '../src/skiff.ts'

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
type Browser = import('playwright').Browser
type Request = import('playwright').Request

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const waitForServer = async (index: string, exited: () => boolean, tries = 120): Promise<void> => {
  await sleep(250)
  if (exited()) throw new Error(`vite preview exited; is port ${port} taken? Set SMOKE_PORT.`)
  const body = await fetch(url).then(
    (r) => (r.ok ? r.text() : undefined),
    () => undefined,
  )
  if (body === index && !exited()) return
  if (tries > 0) return waitForServer(index, exited, tries - 1)
  throw new Error(body === undefined ? `preview server never answered on ${url}` : `port ${port} serves another build; set SMOKE_PORT`)
}

const stop = (pid: number | undefined): void => {
  if (pid === undefined) return
  try {
    process.kill(-pid)
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ESRCH') throw e
  }
}

const isProbe = (u: string): boolean => /\/assets\/probe-[^/]*\.js$/.test(new URL(u).pathname)

const fetched = async (requests: readonly Request[]): Promise<number> =>
  (await Promise.all(requests.filter((r) => !isProbe(r.url())).map(async (r) => (await r.sizes()).responseBodySize))).reduce(
    (a, b) => a + b,
    0,
  )

const walk = async (p: Page, points: readonly Point[], run = false): Promise<void> => {
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

// A route downtown, cut into stretches of at most 20 m: software rendering can drop to a few frames a second, and each
// stretch has to finish inside walk's wait.
const STRETCH = 20

const walkRoute = async (p: Page, points: readonly Point[]): Promise<void> => {
  const at = (await game(p)).pos as { x: number; z: number }
  const cut = points.reduce<{ from: Point; out: Point[] }>(
    (acc, to) => {
      const n = Math.max(1, Math.ceil(Math.hypot(to[0] - acc.from[0], to[1] - acc.from[1]) / STRETCH))
      const parts = Array.from({ length: n }, (_, i): Point => [
        acc.from[0] + ((to[0] - acc.from[0]) * (i + 1)) / n,
        acc.from[1] + ((to[1] - acc.from[1]) * (i + 1)) / n,
      ])
      return { from: to, out: [...acc.out, ...parts] }
    },
    { from: [at.x, at.z], out: [] },
  ).out
  await walk(p, cut, true)
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

const game = (p: Page) => p.evaluate(() => (window as any).__prologue.game())

const camera = (p: Page) => p.evaluate(() => (window as any).__prologue.camera())

const aim = (p: Page, yaw: number, pitch: number) =>
  p.evaluate(([yaw, pitch]) => (window as any).__prologue.aim(yaw, pitch), [yaw, pitch] as const)

const frames = (p: Page, n: number) =>
  p.evaluate(
    (n) =>
      new Promise<void>((done) => {
        const go = (k: number) => (k <= 0 ? done() : requestAnimationFrame(() => go(k - 1)))
        go(n)
      }),
    n,
  )

// Polls the live camera and the man's place until stopped, and keeps every sample that could see his face.
const faceWatch = (p: Page) => {
  const out = { on: true, samples: 0, seen: [] as string[] }
  const poll = async (): Promise<void> => {
    if (!out.on) return
    const [eye, ride] = await p.evaluate(() => [(window as any).__prologue.eye(), (window as any).__prologue.game().ride])
    out.samples += 1
    if (faceSeen(eye, manAt(ride))) out.seen.push(`${eye.map((n: number) => n.toFixed(2))} at ride ${ride}`)
    await sleep(100)
    return poll()
  }
  const running = poll()
  return {
    stop: async () => {
      out.on = false
      await running
      return out
    },
  }
}

const snap = async (p: Page, name: string, settle = 0): Promise<void> => {
  if (!shots) return
  mkdirSync(shots, { recursive: true })
  await frames(p, settle)
  await p.screenshot({ path: `${shots}/${name}.png` })
}

const checked: FrameResult[] = []

const capture = async (p: Page, name: string, pose: string = name): Promise<void> => {
  await p.evaluate(([n, at]) => (window as any).__prologue.capture(n, at), [name, pose] as const)
  checked.push(checkFrame(dirs, name, await p.screenshot({ timeout: 120000 })))
  await p.evaluate(() => (window as any).__prologue.release())
}

type Run = { downloadBytes?: number; samples: Sample[] }

const run: Run = { samples: [] }

const collect = async (p: Page): Promise<void> => {
  const got = (await p.evaluate(() => (window as any).__prologue?.samples?.()).catch(() => undefined)) as Sample[] | undefined
  run.samples.push(...(got ?? []))
}

const publish = (): readonly string[] => {
  const perf = { downloadMB: (run.downloadBytes ?? 0) / MB, spaces: summarize(run.samples, Object.keys(spaces)) }
  const md = `${framesMarkdown(checked, artifact)}\n${perfMarkdown(perf, budgets)}`
  mkdirSync(report, { recursive: true })
  writeFileSync(join(report, 'perf.json'), `${JSON.stringify({ budgets, ...perf }, null, 2)}\n`)
  writeFileSync(join(report, 'summary.md'), md)
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md)
  console.log(md)
  return breaches(perf, budgets)
}

const state: { server?: ChildProcess; browser?: Browser; exited: boolean } = { exited: false }

before(async () => {
  rmSync(report, { recursive: true, force: true })
  const index = readFileSync(join(root, 'dist', 'index.html'), 'utf8')
  state.server = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], { stdio: 'ignore', detached: true })
  state.server.on('exit', () => {
    state.exited = true
  })
  state.browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  })
  await waitForServer(index, () => state.exited)
})

after(async () => {
  await state.browser?.close()
  stop(state.server?.pid)
})

type Opened = Readonly<{ page: Page; errors: string[]; initial: Request[]; close: () => Promise<void> }>

const open = async (opts: Readonly<{ touch?: boolean; pad?: boolean; path?: string }> = {}): Promise<Opened> => {
  const browser = state.browser
  if (!browser) throw new Error('no browser')
  const context = await browser.newContext({ viewport: { width: 960, height: 600 }, hasTouch: !!opts.touch })
  const page = await context.newPage()
  const errors: string[] = []
  const initial: Request[] = []
  const loading = { on: true }
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('requestfinished', (r) => {
    if (loading.on) initial.push(r)
  })
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
  await page.goto(opts.path === undefined ? url : `${url}#path=${opts.path}`)
  await page.waitForFunction(() => (window as any).__prologue?.capture !== undefined)
  loading.on = false
  return { page, errors, initial, close: () => context.close() }
}

const play = async ({ page, errors, initial }: Opened): Promise<void> => {
  run.downloadBytes = await fetched(initial)
  await snap(page, '01-bar')
  await capture(page, 'bar')
  assert.equal(await page.evaluate(() => (window as any).__prologue.audio()), 'locked')

  await page.keyboard.press('1')
  await page.waitForFunction(() => (window as any).__prologue.audio() === 'running', null, { timeout: 30000 })
  await page.locator('#sound-toggle').click()
  await page.locator('#sound-music').fill('20')
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('second-rush.volumes') ?? '{}'))
  assert.equal(saved.music, 0.2)
  const before = (await game(page)).pos
  await page.keyboard.down('w')
  await page.waitForFunction((z) => (window as any).__prologue.game().pos.z < z - 0.2, before.z, { timeout: 90000 })
  await page.keyboard.up('w')
  await page.keyboard.press('Escape')
  assert.equal(await page.locator('#sound-panel').isHidden(), true)

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
  await walk(page, [[0, 3.9]], true)

  await tour(page, [0, 3.9], [-1.5, -2.2])
  assert.equal(await page.locator('#prompt').getAttribute('data-id'), 'hank')
  assert.equal(await page.locator('#prompt .label').textContent(), 'Hold: Buy the table a round.')
  await page.keyboard.press('e')
  await frames(page, 10)
  assert.equal((await game(page)).story.scene, 'p_bar')
  await page.keyboard.down('e')
  await frames(page, 3)
  await snap(page, '03-round-hold')
  await page.waitForFunction(() => (window as any).__prologue.game().story.scene === 'p_talk_round', null, { timeout: 60000 })
  await page.keyboard.up('e')
  await snap(page, '04-round')
  await capture(page, 'round')
  await page.keyboard.press('1')

  await walk(page, [[0, 4.2]], true)
  await page.keyboard.press('e')
  assert.equal((await game(page)).space, 'downtown')
  await capture(page, 'downtown')
  await capture(page, 'downtown_flood')
  await capture(page, 'downtown_freezeup')
  await tour(page, [33, 50.5], [40, 50.5])
  await walkRoute(page, legs[0]!.route)
  await aim(page, Math.PI, 0)
  await page.keyboard.press('e')
  assert.equal((await game(page)).space, 'boarding')
  await snap(page, '05-hall', 10)
  await capture(page, 'parlor')
  await tour(page, [0, 6.2], [0, 1.5])
  await walk(page, HALL)
  await aim(page, Math.PI, 0)
  await page.keyboard.press('e')
  assert.equal((await game(page)).space, 'room')
  await snap(page, '05-room', 10)
  await tour(page, [0, 1.2], [0.6, -1.0])
  await page.keyboard.press('e')
  assert.equal((await game(page)).panel?.kind, 'letter')
  await snap(page, '06-letter')
  await capture(page, 'letter')
  await page.keyboard.press('1')
  assert.deepEqual((await game(page)).panel?.buttons.map((b: { id: string }) => b.id), ['fold'])
  await page.keyboard.press('1')
  assert.equal((await game(page)).letter, 'folded')
  await walk(page, [[-0.6, 0.6]])
  await aim(page, -Math.PI / 2, 0)
  await page.keyboard.press('e')
  assert.equal((await game(page)).story.scene, 'p_dock')
  assert.equal((await game(page)).space, 'downtown')
  await walkRoute(page, legs[1]!.route)
  await aim(page, Math.PI, 0)
  await page.keyboard.press('e')
  assert.equal((await game(page)).panel?.title, 'Owen: The Float Dock')
  await snap(page, '07-dock')
  await page.keyboard.press('1')
  assert.equal((await game(page)).space, 'camp')
  await snap(page, '08-camp', 10)

  await tour(page, [-8.2, 3.6], [-6, 2])
  await walk(page, [[-2, -1.5], [0, -6], [1.8, -7.5]], true)
  await page.waitForFunction(
    () => {
      const g = (window as any).__prologue.game()
      return g.t % 9.2 < 0.1
    },
    null,
    { timeout: 90000 },
  )
  await page.keyboard.down('e')
  await page.waitForFunction(() => (window as any).__prologue.game().hidden === 'marker', null, { timeout: 90000 })
  await page.keyboard.up('e')
  await snap(page, '09-hidden')
  await capture(page, 'hidden')

  await walk(page, [[0, -6], [-2, -1.5], [-6, 2], [-7.4, 3.8]], true)
  await page.keyboard.press('e')
  // August: his room, then down the stair (the view follows the camera on the next frame, so each aim waits a few), the flooded hall and out of the front door.
  assert.equal((await game(page)).space, 'room')
  await walk(page, FLOOD_WALK.room)
  await aim(page, 0, 0)
  await frames(page, 3)
  await page.keyboard.press('e')
  assert.equal((await game(page)).space, 'boarding')
  await walk(page, FLOOD_WALK.hall)
  await aim(page, 0, 0)
  await frames(page, 3)
  await page.keyboard.press('e')
  assert.equal((await game(page)).space, 'flood')
  // The camera-volume check: on the porch and in the skiff the live camera never stands ahead of the hooded man's back.
  const watch = faceWatch(page)
  await tour(page, [135.4, 97.5], [140, 97.5])
  await walk(page, FLOOD_WALK.porch)
  await aim(page, 0, 0)
  await frames(page, 3)
  await page.keyboard.press('e')
  await snap(page, '10-skiff')
  await capture(page, 'skiff')
  await capture(page, 'skiff_dusk')
  await capture(page, 'skiff_night')
  await page.keyboard.press('1')
  const aboard = await game(page)
  assert.equal(aboard.panel, undefined, 'climbing in starts the ride, not the end card')
  assert.deepEqual(aboard.path, [3, 1, 1, 1, 3, 1], 'continue is sent as Owen climbs in')
  await aim(page, Math.PI, 0)
  await page.waitForFunction(() => (window as any).__prologue.game().panel?.kind === 'end', null, { timeout: 180000 })
  const looked = await watch.stop()
  assert.ok(looked.samples > 20, `${looked.samples} camera samples`)
  assert.deepEqual(looked.seen, [], 'the hooded man’s face was in view')
  const end = await game(page)
  assert.equal(end.panel?.kind, 'end')
  assert.deepEqual(end.path, [3, 1, 1, 1, 3, 1])
  assert.equal(end.story.owenCache, 'marker')
  await snap(page, '11-end')
  const href = await page.evaluate(() => (window as any).__prologue.textBuild())
  assert.match(href, /\/fbx67\/#path=3,1,1,1,3,1$/)
  assert.equal(await page.evaluate(() => (window as any).__prologue.audio()), 'running')
  assert.deepEqual(errors, [])
}

test('the prologue plays end to end with the keyboard', { timeout: 2700000 }, async () => {
  const opened = await open()
  try {
    await play(opened)
  } finally {
    await collect(opened.page)
    await opened.close()
  }
})

const START_FRAMES = 40

starts.forEach((s) =>
  test(`a link at ${s.scene} starts there, in its space or with its menu, and renders`, { timeout: 300000 }, async () => {
    const opened = await open({ path: s.path })
    const { page, errors } = opened
    try {
      const g = await game(page)
      assert.equal(g.story.scene, s.scene)
      assert.equal(g.space, poses[s.pose].space)
      if (g.space === 'story') {
        assert.equal(g.panel?.kind, 'story')
        assert.equal(await page.locator('#panel-title').textContent(), g.panel.title)
      } else assert.equal(g.panel, undefined)
      assert.match(await page.evaluate(() => (window as any).__prologue.textBuild()), new RegExp(`#path=${s.path}$`))
      await page.evaluate(() => (window as any).__prologue.record(true))
      await frames(page, START_FRAMES)
      await page.evaluate(() => (window as any).__prologue.record(false))
      await snap(page, `start-${s.scene}`)
      await capture(page, s.scene, s.pose)
      assert.deepEqual(errors, [])
    } finally {
      await collect(page)
      await opened.close()
    }
  }),
)

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
  const yaw = (await camera(page)).yaw
  await setPad(page, [0, 0, 1, 0], [])
  await frames(page, 20)
  await setPad(page, [0, 0, 0, 0], [])
  assert.ok((await camera(page)).yaw < yaw - 0.2)
  assert.equal(await page.evaluate(() => document.body.dataset.device), 'xbox')
  assert.match((await page.locator('#help').textContent()) ?? '', /\(LS\) to run/)
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
  const yaw = (await camera(page)).yaw
  await touch(page, 'pointerdown', 700, 300, 2)
  await touch(page, 'pointermove', 760, 300, 2)
  await touch(page, 'pointermove', 820, 300, 2)
  await frames(page, 3)
  await touch(page, 'pointerup', 820, 300, 2)
  assert.ok((await camera(page)).yaw < yaw - 0.2)
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

test('every frame matches its baseline and every space holds its budget in docs/perf.md', () => {
  const over = publish()
  assert.deepEqual(
    checked.filter((f) => f.verdict === 'changed' || f.verdict === 'missing').map((f) => f.name),
    [],
    `frames differ from game/smoke/baselines; see ${report}`,
  )
  assert.deepEqual(over, [], 'over the budget in docs/perf.md')
})
