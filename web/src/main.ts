import './style.css'
import { choicesOf } from '../../text-game/src/engine.ts'
import { formatPath, hashFor, hashPath, loadSaved, replayValid, save, start, step, type Path, type Run } from './session.ts'
import { pageTitle, scene, type Handlers } from './view.ts'

const app = document.querySelector<HTMLElement>('#app')
const status = document.querySelector<HTMLElement>('#status')
const restartButton = document.querySelector<HTMLButtonElement>('#restart')
const copyButton = document.querySelector<HTMLButtonElement>('#copy')

if (!app || !status || !restartButton || !copyButton) throw new Error('Second Rush: page is missing its mount points')

const cell: { run: Run; timer: number } = { run: start, timer: 0 }

const announce = (message: string): void => {
  window.clearTimeout(cell.timer)
  status.textContent = ''
  window.setTimeout(() => (status.textContent = message), 30)
  cell.timer = window.setTimeout(() => (status.textContent = ''), 5000)
}

const publish = (run: Run): void => {
  save(run.path)
  const url = `${window.location.pathname}${window.location.search}${hashFor(run.path)}`
  window.history.replaceState(null, '', url)
}

const copyText = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

const handlers: Handlers = {
  choose: (n) => advance(n),
  restart: () => show(start, true),
  copy: () => {
    const text = formatPath(cell.run.path)
    if (!text) return announce('No choices yet. Make one first.')
    copyText(text).then((ok) => announce(ok ? `Copied path ${text}` : `Copy failed. Path: ${text}`))
  },
}

const show = (run: Run, focus: boolean): void => {
  cell.run = run
  app.replaceChildren(...scene(run, handlers))
  document.title = pageTitle(run)
  publish(run)
  if (!focus) return
  window.scrollTo({ top: 0 })
  document.querySelector<HTMLElement>('#scene-title')?.focus({ preventScroll: true })
}

const advance = (n: number): void => {
  if (n < 1 || n > choicesOf(cell.run.state).length) return
  show(step(cell.run, n), true)
}

const load = (path: Path, source: string): void => {
  const run = replayValid(path)
  show(run, false)
  if (run.path.length < path.length)
    announce(`The ${source} path stops working at step ${run.path.length + 1}. Picked up from step ${run.path.length}.`)
}

restartButton.addEventListener('click', handlers.restart)
copyButton.addEventListener('click', handlers.copy)

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return
  if (e.target instanceof HTMLElement && e.target.closest('input, textarea, select, [contenteditable]')) return
  if (!/^[1-9]$/.test(e.key)) return
  e.preventDefault()
  advance(Number(e.key))
})

window.addEventListener('hashchange', () => {
  const fromHash = hashPath(window.location.hash)
  if (fromHash && formatPath(fromHash) !== formatPath(cell.run.path)) load(fromHash, 'linked')
})

const fromHash = hashPath(window.location.hash)
if (fromHash) load(fromHash, 'linked')
else load(loadSaved() ?? [], 'saved')
