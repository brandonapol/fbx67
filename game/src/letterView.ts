import './letterView.css'
import type { Sheet } from './letters.ts'

// Draws a letter's sheet (letters.ts) into an element, under the panel's title: what is said before the pen moves, the
// page in the letter's hand, and every line on offer. No button takes focus, so Enter never writes a line the player
// did not pick.
export const renderLetter = (root: HTMLElement, s: Sheet, pick: (note: string) => void): void => {
  const said = s.said.split(/\n\s*\n/).map((para) => Object.assign(document.createElement('p'), { className: 'letter-said', textContent: para.trim() }))
  const page = Object.assign(document.createElement('div'), { className: `letter-page hand-${s.hand}` })
  page.replaceChildren(...s.lines.map((line) => Object.assign(document.createElement('p'), { textContent: line })))
  const lines = Object.assign(document.createElement('div'), { className: 'letter-lines' })
  lines.replaceChildren(
    ...s.buttons.map((b, i) => {
      const el = document.createElement('button')
      el.type = 'button'
      el.dataset.note = b.note
      el.innerHTML = `<span class="key">${i + 1}</span>`
      el.append(b.label)
      el.addEventListener('click', () => pick(b.note))
      return el
    }),
  )
  const letter = Object.assign(document.createElement('div'), { className: 'letter' })
  letter.replaceChildren(...said, page, lines)
  root.replaceChildren(letter)
}
