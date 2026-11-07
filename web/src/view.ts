import { choicesOf, sceneOf } from '../../text-game/src/engine.ts'
import { ending } from '../../text-game/src/logic.ts'
import type { Scene, State } from '../../text-game/src/types.ts'
import { formatPath, type Run } from './session.ts'
import { seasonOf, stillUrl, weatherOf } from './stills.ts'

export type Handlers = Readonly<{
  choose: (n: number) => void
  restart: () => void
  copy: () => void
}>

type Attrs = Readonly<Record<string, string>>

type Child = Node | string

export const el = (tag: string, attrs: Attrs = {}, ...children: readonly Child[]): HTMLElement => {
  const node = document.createElement(tag)
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v))
  node.append(...children)
  return node
}

const button = (label: Child | readonly Child[], onClick: () => void, attrs: Attrs = {}): HTMLButtonElement => {
  const b = el('button', { type: 'button', ...attrs }, ...(Array.isArray(label) ? label : [label])) as HTMLButtonElement
  b.addEventListener('click', onClick)
  return b
}

const placeholder = (sc: Scene, s: State): HTMLElement =>
  el(
    'div',
    {
      class: 'placeholder',
      'data-season': seasonOf(sc.act),
      'data-weather': weatherOf(s),
      role: 'img',
      'aria-label': `Placeholder still for ${sc.title}`,
    },
    el('span', { class: 'placeholder-sky', 'aria-hidden': 'true' }),
    el('span', { class: 'placeholder-ground', 'aria-hidden': 'true' }),
    el('span', { class: 'placeholder-light', 'aria-hidden': 'true' }),
    el('span', { class: 'placeholder-title', 'aria-hidden': 'true' }, sc.title),
  )

const still = (sc: Scene, s: State): HTMLElement => {
  const frame = el('figure', { class: 'still' })
  const url = stillUrl(sc.id)
  if (!url) {
    frame.append(placeholder(sc, s))
    return frame
  }
  const img = el('img', { src: url, alt: sc.title, decoding: 'async' }) as HTMLImageElement
  img.addEventListener('error', () => img.replaceWith(placeholder(sc, s)), { once: true })
  frame.append(img)
  return frame
}

const paragraphs = (text: string): readonly HTMLElement[] =>
  text
    .trim()
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => el('p', {}, p))

const choiceList = (s: State, h: Handlers): HTMLElement =>
  el(
    'ol',
    { class: 'choices' },
    ...choicesOf(s).map((c, i) =>
      el(
        'li',
        {},
        button([el('span', { class: 'choice-key', 'aria-hidden': 'true' }, String(i + 1)), el('span', { class: 'choice-label' }, c.label)], () => h.choose(i + 1), {
          class: 'choice',
          'aria-keyshortcuts': String(i + 1),
        }),
      ),
    ),
  )

const endingPanel = (run: Run, h: Handlers): HTMLElement =>
  el(
    'section',
    { class: 'ending', 'aria-label': 'The end' },
    el('p', { class: 'ending-label' }, `The end: ${ending(run.state)} ending`),
    el('p', { class: 'ending-path-label' }, 'Your path'),
    el('code', { class: 'ending-path' }, formatPath(run.path)),
    el(
      'p',
      { class: 'ending-hint' },
      'Replay it in the CLI with ',
      el('code', {}, `node src/cli.ts --choices ${formatPath(run.path)}`),
    ),
    el('div', { class: 'ending-actions' }, button('Play again', h.restart, { class: 'primary' }), button('Copy path', h.copy, { class: 'secondary' })),
  )

export const scene = (run: Run, h: Handlers): readonly HTMLElement[] => {
  const sc = sceneOf(run.state)
  const done = choicesOf(run.state).length === 0
  return [
    still(sc, run.state),
    el(
      'div',
      { class: 'scene' },
      el('p', { class: 'act' }, sc.act),
      el('h2', { class: 'title', id: 'scene-title', tabindex: '-1' }, sc.title),
      el('div', { class: 'text' }, ...paragraphs(sc.text(run.state))),
      done ? endingPanel(run, h) : choiceList(run.state, h),
    ),
  ]
}

export const pageTitle = (run: Run): string => `${sceneOf(run.state).title} | Second Rush`
