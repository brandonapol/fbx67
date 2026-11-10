import { after, before } from 'node:test'
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import { appendFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Sample } from '../src/probe.ts'
import { MB, breaches, parseBudgets, perfMarkdown, summarize } from './budget.ts'
import type { FrameDirs, FrameResult } from './frames.ts'
import { checkFrame, framesMarkdown } from './frames.ts'

// The smoke run's browser side, for a run beside the prologue's (act1.test.ts): the same preview server, headless
// Chromium under SwiftShader, test probe, frame check (frames.ts) and budgets (budget.ts) as prologue.test.ts, which
// can move onto it. SMOKE_PORT, SMOKE_REPORT, SMOKE_ARTIFACT and SMOKE_BASELINES mean what they mean there.

const require = createRequire(import.meta.url)
const { chromium } = require('playwright') as typeof import('playwright')

export type Page = import('playwright').Page
type Browser = import('playwright').Browser

export const root = fileURLToPath(new URL('..', import.meta.url))

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export type Run = Readonly<{
  // Where its frames' baselines live, under game/smoke/baselines.
  baselines: string
  // The spaces it must sample: a budgeted space it never plays is not its failure.
  played: readonly string[]
  // Its default port and report directory, so it can run beside another.
  port: number
  report: string
}>

export type Smoke = Readonly<{
  open: (path?: string) => Promise<Opened>
  capture: (p: Page, name: string, pose: string, heat?: number) => Promise<void>
  collect: (p: Page) => Promise<void>
  publish: () => readonly string[]
  failedFrames: () => readonly string[]
  reportDir: string
}>

export type Opened = Readonly<{ page: Page; errors: string[]; close: () => Promise<void> }>

export const smoke = (run: Run): Smoke => {
  const port = Number(process.env.SMOKE_PORT ?? run.port)
  const url = `http://localhost:${port}/fbx67/play/?test=1`
  const report = process.env.SMOKE_REPORT ?? join(root, run.report)
  const artifact = process.env.SMOKE_ARTIFACT ?? run.report
  const dirs: FrameDirs = { baselines: join(root, 'smoke', 'baselines', run.baselines), report, update: process.env.SMOKE_BASELINES === 'update' }
  const budgets = parseBudgets(readFileSync(join(root, '..', 'docs', 'perf.md'), 'utf8'))
  const checked: FrameResult[] = []
  const samples: Sample[] = []
  const state: { server?: ChildProcess; browser?: Browser; exited: boolean } = { exited: false }

  const waitForServer = async (index: string, tries = 120): Promise<void> => {
    await sleep(250)
    if (state.exited) throw new Error(`vite preview exited; is port ${port} taken? Set SMOKE_PORT.`)
    const body = await fetch(url).then(
      (r) => (r.ok ? r.text() : undefined),
      () => undefined,
    )
    if (body === index && !state.exited) return
    if (tries > 0) return waitForServer(index, tries - 1)
    throw new Error(body === undefined ? `preview server never answered on ${url}` : `port ${port} serves another build; set SMOKE_PORT`)
  }

  before(async () => {
    rmSync(report, { recursive: true, force: true })
    const index = readFileSync(join(root, 'dist', 'index.html'), 'utf8')
    state.server = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], { stdio: 'ignore', detached: true, cwd: root })
    state.server.on('exit', () => {
      state.exited = true
    })
    state.browser = await chromium.launch({
      executablePath: process.env.CHROMIUM_PATH,
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    })
    await waitForServer(index)
  })

  after(async () => {
    await state.browser?.close()
    const pid = state.server?.pid
    if (pid === undefined) return
    try {
      process.kill(-pid)
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ESRCH') throw e
    }
  })

  const open = async (path?: string): Promise<Opened> => {
    if (!state.browser) throw new Error('no browser')
    const context = await state.browser.newContext({ viewport: { width: 960, height: 600 } })
    const page = await context.newPage()
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(String(e)))
    await page.goto(path === undefined ? url : `${url}#path=${path}`)
    await page.waitForFunction(() => (window as any).__prologue?.capture !== undefined)
    return { page, errors, close: () => context.close() }
  }

  const capture = async (p: Page, name: string, pose: string, heat?: number): Promise<void> => {
    await p.evaluate(([n, at, h]) => (window as any).__prologue.capture(n, at, h ?? undefined), [name, pose, heat ?? null] as const)
    checked.push(checkFrame(dirs, name, await p.screenshot({ timeout: 120000 })))
    await p.evaluate(() => (window as any).__prologue.release())
  }

  const collect = async (p: Page): Promise<void> => {
    const got = (await p.evaluate(() => (window as any).__prologue?.samples?.()).catch(() => undefined)) as Sample[] | undefined
    samples.push(...(got ?? []))
  }

  // No initial download here: the prologue's run measures it from a cold page, and this run's pages open at a path.
  const publish = (): readonly string[] => {
    const perf = { downloadMB: 0, spaces: summarize(samples, run.played) }
    const md = `${framesMarkdown(checked, artifact)}\n${perfMarkdown(perf, budgets, run.played)}`
    mkdirSync(report, { recursive: true })
    writeFileSync(join(report, 'perf.json'), `${JSON.stringify({ budgets, ...perf }, null, 2)}\n`)
    writeFileSync(join(report, 'summary.md'), md)
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md)
    console.log(md)
    return breaches(perf, budgets, run.played)
  }

  const failedFrames = (): readonly string[] => checked.filter((f) => f.verdict === 'changed' || f.verdict === 'missing').map((f) => f.name)

  return { open, capture, collect, publish, failedFrames, reportDir: report }
}

export const game = (p: Page) => p.evaluate(() => (window as any).__prologue.game())

export const frames = (p: Page, n: number) =>
  p.evaluate(
    (n) =>
      new Promise<void>((done) => {
        const go = (k: number) => (k <= 0 ? done() : requestAnimationFrame(() => go(k - 1)))
        go(n)
      }),
    n,
  )
