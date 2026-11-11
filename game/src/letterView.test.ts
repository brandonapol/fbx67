import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import type { Sheet } from './letters.ts'

// letterView.ts imports its stylesheet, which node cannot load; an empty module stands in for it.
registerHooks({
  load: (url, ctx, next) => (url.endsWith('.css') ? { format: 'module', source: '', shortCircuit: true } : next(url, ctx)),
})

type Listener = () => void

class El {
  tag: string
  className = ''
  textContent = ''
  type = ''
  innerHTML = ''
  dataset: Record<string, string> = {}
  children: (El | string)[] = []
  listeners: Listener[] = []
  constructor(tag: string) {
    this.tag = tag
  }
  addEventListener(_kind: string, f: Listener): void {
    this.listeners.push(f)
  }
  append(...x: (El | string)[]): void {
    this.children.push(...x)
  }
  replaceChildren(...x: El[]): void {
    this.children = x
  }
}

;(globalThis as unknown as Record<string, unknown>).document = { createElement: (tag: string) => new El(tag) }

const { renderLetter } = await import('./letterView.ts')

const sheet: Sheet = {
  hand: 'joan',
  title: 'Mama',
  said: 'First paragraph.\n\n  Second paragraph.  \n   \nThird.',
  lines: ['Dear Mama,', 'It is cold.'],
  buttons: [
    { note: 'weather', label: 'Tell her the weather' },
    { note: 'work', label: 'Tell her about work' },
  ],
}

const draw = (s: Sheet, pick: (n: string) => void = () => {}) => {
  const root = new El('div')
  renderLetter(root as unknown as HTMLElement, s, pick)
  const letter = root.children[0] as El
  const [said, page, lines] = [letter.children.filter((c) => (c as El).className === 'letter-said') as El[], letter.children.find((c) => (c as El).className.startsWith('letter-page')) as El, letter.children.find((c) => (c as El).className === 'letter-lines') as El]
  return { root, letter, said, page, lines }
}

test('the letter replaces whatever the root held, and its parts come in order: said, page, lines', () => {
  const { root, letter } = draw(sheet)
  assert.equal(root.children.length, 1)
  assert.equal(letter.className, 'letter')
  assert.deepEqual(letter.children.map((c) => (c as El).className), ['letter-said', 'letter-said', 'letter-said', 'letter-page hand-joan', 'letter-lines'])
})

test('what is said splits on blank lines and trims each paragraph', () => {
  assert.deepEqual(draw(sheet).said.map((p) => p.textContent), ['First paragraph.', 'Second paragraph.', 'Third.'])
})

test('the page is in the letter\'s hand, one paragraph a line', () => {
  const { page } = draw(sheet)
  assert.equal(page.className, 'letter-page hand-joan')
  assert.deepEqual(page.children.map((p) => (p as El).textContent), sheet.lines)
  assert.equal(draw({ ...sheet, hand: 'wade' }).page.className, 'letter-page hand-wade')
})

test('every line on offer is a numbered button, and clicking it picks its note', () => {
  const picked: string[] = []
  const { lines } = draw(sheet, (n) => picked.push(n))
  const bs = lines.children as El[]
  assert.deepEqual(bs.map((b) => b.tag), ['button', 'button'])
  assert.deepEqual(bs.map((b) => b.type), ['button', 'button'], 'type=button so none submits')
  assert.deepEqual(bs.map((b) => b.dataset.note), ['weather', 'work'])
  assert.deepEqual(bs.map((b) => b.innerHTML), ['<span class="key">1</span>', '<span class="key">2</span>'])
  assert.deepEqual(bs.map((b) => b.children[0]), ['Tell her the weather', 'Tell her about work'])
  bs[1]!.listeners.forEach((f) => f())
  assert.deepEqual(picked, ['work'])
})

test('while a line is being written no button is offered', () => {
  assert.equal(draw({ ...sheet, buttons: [] }).lines.children.length, 0)
})
