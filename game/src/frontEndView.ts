import './frontEnd.css'
import type { Journal, Screen } from './frontEnd.ts'
import type { PocketMap } from './frontEndMap.ts'
import { drawMap } from './frontEndMapView.ts'

// The front end's DOM (issue #51): the loading bar, the title, the pause menu, the journal and the objective line.
// It owns no state: main.ts says which screen is up and passes what to show; the buttons call back by id.

export type FrontEndAction = 'continue' | 'new' | 'settings' | 'resume' | 'journal' | 'map' | 'title' | 'back' | 'pause'

export type FrontEndView = Readonly<{
  loading: (share: number | undefined) => void
  show: (screen: Screen, data: Readonly<{ canContinue: boolean; goal?: string; journal?: Journal; map?: PocketMap }>) => void
  objective: (text: string | undefined) => void
  buttons: () => readonly HTMLButtonElement[]
}>

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> = {}, ...kids: (Node | string)[]): HTMLElementTagNameMap[K] => {
  const e = Object.assign(document.createElement(tag), props)
  e.append(...kids)
  return e
}

const section = (heading: string, items: readonly (Node | string)[], empty: string): HTMLElement =>
  el('section', {}, el('h3', { textContent: heading }), items.length ? el('ul', {}, ...items.map((i) => el('li', {}, i))) : el('p', { className: 'empty', textContent: empty }))

const journalBody = (j: Journal): readonly HTMLElement[] => [
  section('Where things stand', [j.now, ...(j.goal ? [el('em', { textContent: j.goal })] : [])], ''),
  section('The story so far', j.sofar, 'Nothing yet. The night is young.'),
  section('What I know', j.known, 'Nothing I could show anyone.'),
  section('People', j.met, 'I have not spoken to anyone yet.'),
  section(
    'Overheard',
    j.heard.map((h) => el('span', {}, el('b', { textContent: `${h.who}: ` }), h.text)),
    'Nothing worth writing down.',
  ),
]

export const mountFrontEnd = (on: (a: FrontEndAction) => void, parent: HTMLElement = document.body): FrontEndView => {
  const button = (id: FrontEndAction, label: string): HTMLButtonElement => {
    const b = el('button', { type: 'button', textContent: label })
    b.dataset.action = id
    b.addEventListener('click', () => on(id))
    return b
  }

  const bar = el('div', { id: 'loading-fill' })
  const loading = el('div', { id: 'loading' }, el('p', { textContent: 'Loading' }), el('div', { id: 'loading-bar' }, bar))

  const cont = button('continue', 'Continue')
  const title = el(
    'section',
    { id: 'title', hidden: true },
    el('h1', { textContent: 'Second Rush' }),
    el('p', { className: 'sub', textContent: 'Fairbanks, Alaska. Summer, 1967.' }),
    el('nav', {}, cont, button('new', 'New game'), button('settings', 'Settings')),
  )

  const goal = el('p', { className: 'goal' })
  const pause = el(
    'section',
    { id: 'pause', hidden: true },
    el('h2', { textContent: 'Paused' }),
    goal,
    el('nav', {}, button('resume', 'Resume'), button('journal', 'Journal'), button('map', 'Map'), button('settings', 'Settings'), button('title', 'Return to title')),
  )

  const pages = el('div', { className: 'pages' })
  const journal = el('section', { id: 'journal', hidden: true }, el('h2', { textContent: 'Notebook' }), pages, el('nav', {}, button('back', 'Close')))

  const sheet = el('div', { className: 'sheet' })
  const map = el('section', { id: 'map', hidden: true }, el('h2', { textContent: 'Street map' }), sheet, el('nav', {}, button('back', 'Close')))

  const objective = el('div', { id: 'objective', hidden: true })
  objective.setAttribute('aria-live', 'polite')
  const menuButton = el('button', { id: 'pause-open', type: 'button', textContent: 'Menu' })
  menuButton.addEventListener('click', () => on('pause'))
  parent.append(objective, menuButton, title, pause, journal, map, loading)

  const screens: Readonly<Record<string, HTMLElement>> = { title, pause, journal, map }
  const shown = { screen: '' as string, objective: '' as string | undefined }

  return {
    loading: (share) => {
      loading.hidden = share === undefined
      bar.style.width = `${Math.round((share ?? 1) * 100)}%`
    },
    show: (screen, data) => {
      cont.hidden = !data.canContinue
      goal.textContent = data.goal ?? ''
      if (screen === 'journal' && data.journal) pages.replaceChildren(...journalBody(data.journal))
      if (screen === 'map' && data.map) drawMap(sheet, data.map)
      document.body.dataset.screen = screen
      if (shown.screen === screen) return
      shown.screen = screen
      Object.entries(screens).forEach(([id, e]) => {
        e.hidden = id !== screen
      })
      screens[screen]?.querySelector<HTMLButtonElement>('button:not([hidden])')?.focus({ preventScroll: true })
    },
    objective: (text) => {
      if (shown.objective === text) return
      shown.objective = text
      objective.hidden = text === undefined
      objective.textContent = text ?? ''
    },
    buttons: () => Array.from(screens[shown.screen]?.querySelectorAll<HTMLButtonElement>('button:not([hidden])') ?? []),
  }
}
