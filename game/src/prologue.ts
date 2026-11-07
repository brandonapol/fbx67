import type { State } from '../../text-game/src/types.ts'
import { initialState } from '../../text-game/src/state.ts'
import { menu, send } from '../../text-game/src/story.ts'
import type { Interactable, Vec } from './world.ts'
import { move, nearest } from './world.ts'
import type { SpaceId } from './levels.ts'
import { solids, spaces } from './levels.ts'

export const SPEED = 3.2

export type Button = Readonly<{ id: string; label: string }>

export type Panel = Readonly<{ kind: 'story'; title: string; text: string; buttons: readonly Button[] }>

export type Game = Readonly<{
  story: State
  path: readonly number[]
  space: SpaceId
  pos: Vec
  facing: number
  t: number
  panel?: Panel
}>

export type Input = Readonly<{ dir: Vec; hold: boolean; limit?: number }>

export const still: Input = { dir: { x: 0, z: 0 }, hold: false }

const noteButton = (note: string, label: string): Button => ({ id: `note:${note}`, label })

const storyPanel = (story: State, notes: readonly string[], extra: readonly Button[] = []): Panel => {
  const m = menu(story)
  return {
    kind: 'story',
    title: m.title,
    text: m.text,
    buttons: [...m.options.filter((o) => notes.includes(o.note)).map((o) => noteButton(o.note, o.label)), ...extra],
  }
}

const close = (label: string): Button => ({ id: 'close', label })

export const sendNote = (g: Game, note: string): Game => {
  const option = menu(g.story).options.find((o) => o.note === note)
  if (!option) throw new Error(`${g.story.scene} does not accept ${note}`)
  return { ...g, story: send(g.story, note), path: [...g.path, option.n] }
}

const enter = (g: Game, space: SpaceId): Game => ({
  ...g,
  space,
  pos: spaces[space].spawn,
  facing: Math.PI,
  t: 0,
  panel: undefined,
})

export const start = (): Game => ({
  story: initialState,
  path: [],
  space: 'bar',
  pos: spaces.bar.spawn,
  facing: Math.PI,
  t: 0,
  panel: storyPanel(initialState, [], [close('Walk over to the table.')]),
})

const talked = (g: Game): boolean => g.story.scene.startsWith('p_talk_')

export const available = (g: Game): readonly Interactable[] =>
  spaces[g.space].spots.filter((i) => {
    if (g.space === 'bar') return i.id === 'door' ? talked(g) : i.id === 'hank' ? g.story.scene === 'p_bar' : true
    return true
  })

export const focus = (g: Game): Interactable | undefined => (g.panel ? undefined : nearest(g.pos, available(g)))

export const interact = (g: Game): Game => {
  const target = focus(g)
  if (!target) return g
  const id = target.id
  if (g.space === 'bar') {
    if (id === 'wade') return { ...g, panel: g.story.scene === 'p_bar' ? storyPanel(g.story, ['texas', 'munitions'], [close('Not yet.')]) : storyPanel(g.story, [], [close('Back to the table.')]) }
    if (id === 'hank') return { ...g, panel: storyPanel(g.story, ['round'], [close('Not yet.')]) }
    if (id === 'curly') return { ...g, panel: storyPanel(g.story, [], [close('Back to the table.')]) }
    if (id === 'door') return { ...enter(sendNote(g, 'goodnight'), 'room') }
  }
  if (g.space === 'room' && id === 'desk') return { ...g, panel: storyPanel(g.story, [], [close('Put the notes away.')]) }
  return g
}

export const press = (g: Game, button: string): Game => {
  if (button === 'close') return { ...g, panel: undefined }
  if (button.startsWith('note:')) {
    const note = button.slice(5)
    const next = sendNote(g, note)
    return { ...next, panel: storyPanel(next.story, [], [close('Back to the table.')]) }
  }
  return g
}

export const tick = (g: Game, input: Input, dt: number): Game => {
  const t = g.t + dt
  if (g.panel) return { ...g, t }
  const moving = input.dir.x !== 0 || input.dir.z !== 0
  const pos = moving ? move(g.pos, input.dir, Math.min(SPEED * dt, input.limit ?? Infinity), solids(spaces[g.space])) : g.pos
  const facing = moving ? Math.atan2(input.dir.x, input.dir.z) : g.facing
  return { ...g, t, pos, facing }
}
