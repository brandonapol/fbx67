import { test } from 'node:test'
import assert from 'node:assert/strict'
import { menu } from '../../text-game/src/story.ts'
import type { Game } from './prologue.ts'
import { available, handedOff, press } from './prologue.ts'
import { prologueSteps, routes } from './drive.ts'

const talks = ['texas', 'munitions', 'round'] as const

const where = (g: Game): string => `${g.story.scene} in ${g.space}`

// On the skiff ride nothing is offered: the ride itself moves on, to the end card.
const stuck = (g: Game): boolean =>
  !handedOff(g) && g.ride === undefined && (g.panel ? g.panel.buttons.length === 0 : available(g).length === 0)

talks.forEach((who) =>
  (Object.keys(routes) as (keyof typeof routes)[]).forEach((spot) =>
    test(`${who}, ${spot}: every step of the prologue moves on, and Continue as Wade puts him on the line`, () => {
      const steps = [...prologueSteps(who, spot), press(prologueSteps(who, spot).at(-1)!, 'continue')]
      steps.forEach((g, i) => {
        assert.ok(!stuck(g), `stuck at ${where(g)}`)
        const prev = steps[i - 1]
        if (!prev) return
        if (g.path.length > prev.path.length) assert.notEqual(g.story.scene, prev.story.scene, `a note left ${where(prev)} on its scene`)
        if (g.space !== prev.space) assert.equal(g.panel, undefined, `entering ${where(g)} kept a panel`)
        if (g.panel?.kind === 'story') assert.equal(g.panel.title, menu(g.story).title, `${where(g)} shows another scene's panel`)
      })
      const last = steps.at(-1)!
      assert.equal(last.story.scene, 'a1_flood')
      assert.equal(last.space, 'line', `in ${where(last)} after Continue as Wade`)
      assert.equal(handedOff(last), false)
      assert.equal(last.panel, undefined)
    }),
  ),
)
