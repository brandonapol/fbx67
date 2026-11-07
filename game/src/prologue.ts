import type { CacheSpot, State } from '../../text-game/src/types.ts'
import { initialState } from '../../text-game/src/state.ts'
import { menu, send } from '../../text-game/src/story.ts'
import type { Interactable, Vec } from './world.ts'
import { move, nearest, sees } from './world.ts'
import type { SpaceId } from './levels.ts'
import { CURLY_AT, CURLY_HALF_ANGLE, CURLY_RANGE, curlyFacing, occluders, solids, spaces } from './levels.ts'

export const SPEED = 3.2
export const HIDE_TIME = 2.4

export type Button = Readonly<{ id: string; label: string }>

export type Panel = Readonly<{ kind: 'story' | 'busted' | 'end'; title: string; text: string; buttons: readonly Button[] }>

export type Hiding = Readonly<{ spot: CacheSpot; progress: number }>

export type Game = Readonly<{
  story: State
  path: readonly number[]
  space: SpaceId
  pos: Vec
  facing: number
  t: number
  panel?: Panel
  hiding?: Hiding
  hidden?: CacheSpot
  busts: number
}>

export type Input = Readonly<{ dir: Vec; hold: boolean; limit?: number }>

export const still: Input = { dir: { x: 0, z: 0 }, hold: false }

const spotIds: readonly CacheSpot[] = ['stove', 'cache', 'marker']

const isSpot = (id: string): id is CacheSpot => (spotIds as readonly string[]).includes(id)

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
  hiding: undefined,
})

export const start = (): Game => ({
  story: initialState,
  path: [],
  space: 'bar',
  pos: spaces.bar.spawn,
  facing: Math.PI,
  t: 0,
  busts: 0,
  panel: storyPanel(initialState, [], [close('Walk over to the table.')]),
})

const talked = (g: Game): boolean => g.story.scene.startsWith('p_talk_')

export const available = (g: Game): readonly Interactable[] =>
  spaces[g.space].spots.filter((i) => {
    if (g.space === 'bar') return i.id === 'door' ? talked(g) : i.id === 'hank' ? g.story.scene === 'p_bar' : true
    if (g.space === 'camp') return i.id === 'plane' ? g.hidden !== undefined : g.hidden === undefined
    if (g.space === 'flood') return g.story.scene === 'p_end'
    return true
  })

export const focus = (g: Game): Interactable | undefined => (g.panel ? undefined : nearest(g.pos, available(g)))

export const watcher = (g: Game) => ({ at: CURLY_AT, facing: curlyFacing(g.t), range: CURLY_RANGE, halfAngle: CURLY_HALF_ANGLE })

export const seen = (g: Game): boolean => g.space === 'camp' && sees(watcher(g), g.pos, occluders(spaces.camp))

const busted = (g: Game): Game => ({
  ...g,
  hiding: undefined,
  busts: g.busts + 1,
  panel: { kind: 'busted', title: 'Busted', text: 'Curly turns around. That was way too obvious.', buttons: [{ id: 'retry', label: 'Try again' }] },
})

const endCard = (g: Game): Panel => ({
  kind: 'end',
  title: 'End of the prologue',
  text: 'Act 1 continues in the text build, where you play Wade.',
  buttons: [{ id: 'continue', label: 'Continue as Wade' }],
})

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
  if (g.space === 'room' && id === 'desk') return { ...g, panel: storyPanel(g.story, [], [{ id: 'fly', label: 'Sleep. Fly north with Curly in the morning.' }]) }
  if (g.space === 'camp') {
    if (isSpot(id)) return { ...g, hiding: { spot: id, progress: 0 } }
    if (id === 'plane') return enter(g, 'flood')
  }
  if (g.space === 'flood' && id === 'skiff') return { ...g, panel: storyPanel(g.story, ['continue']) }
  return g
}

export const press = (g: Game, button: string): Game => {
  if (button === 'close') return { ...g, panel: undefined }
  if (button === 'fly') return enter(g, 'camp')
  if (button === 'retry') return { ...enter(g, 'camp'), busts: g.busts }
  if (button === 'continue') return g
  if (button.startsWith('note:')) {
    const note = button.slice(5)
    const next = sendNote(g, note)
    if (note === 'continue') return { ...next, panel: endCard(next) }
    return { ...next, panel: storyPanel(next.story, [], [close('Back to the table.')]) }
  }
  return g
}

const hide = (g: Game, input: Input, dt: number): Game => {
  const h = g.hiding
  if (!h) return g
  const spot = spaces.camp.spots.find((s) => s.id === h.spot)
  const near = spot ? Math.hypot(g.pos.x - spot.x, g.pos.z - spot.z) <= spot.r : false
  if (!input.hold || !near) return { ...g, hiding: undefined }
  if (seen(g)) return busted(g)
  const progress = h.progress + dt
  if (progress < HIDE_TIME) return { ...g, hiding: { ...h, progress } }
  return { ...sendNote(g, h.spot), hiding: undefined, hidden: h.spot }
}

export const tick = (g: Game, input: Input, dt: number): Game => {
  const t = g.t + dt
  if (g.panel) return { ...g, t: g.space === 'camp' ? g.t : t }
  const moving = !g.hiding && (input.dir.x !== 0 || input.dir.z !== 0)
  const pos = moving ? move(g.pos, input.dir, Math.min(SPEED * dt, input.limit ?? Infinity), solids(spaces[g.space])) : g.pos
  const facing = moving ? Math.atan2(input.dir.x, input.dir.z) : g.facing
  return hide({ ...g, t, pos, facing }, input, dt)
}

export const ended = (g: Game): boolean => g.panel?.kind === 'end'

export const textBuildHash = (g: Game): string => `#path=${g.path.join(',')}`
