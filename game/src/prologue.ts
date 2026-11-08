import type { CacheSpot, State } from '../../text-game/src/types.ts'
import { initialState } from '../../text-game/src/state.ts'
import { menu, send } from '../../text-game/src/story.ts'
import type { Interactable, Vec } from './world.ts'
import { angleTo, length, move, normalize, pick, scale, sees, vec } from './world.ts'
import type { SpaceId } from './levels.ts'
import { CURLY_AT, CURLY_HALF_ANGLE, CURLY_RANGE, curlyFacing, occluders, solids, spaces } from './levels.ts'

export { HIDE_TIME, ROUND_TIME } from './levels.ts'

export const WALK = 1.4
export const JOG = 3.5
export const ACCEL = 9
export const DECEL = 12
export const TURN_RATE = 10

export type Button = Readonly<{ id: string; label: string }>

export type Panel = Readonly<{ kind: 'story' | 'busted' | 'end'; title: string; text: string; buttons: readonly Button[] }>

export type Holding = Readonly<{ id: string; progress: number; time: number }>

export type Game = Readonly<{
  story: State
  path: readonly number[]
  space: SpaceId
  pos: Vec
  facing: number
  vel: Vec
  t: number
  panel?: Panel
  holding?: Holding
  hidden?: CacheSpot
  busts: number
}>

export type Input = Readonly<{ dir: Vec; hold: boolean; run?: boolean; limit?: number }>

const zero = vec(0, 0)

export const still: Input = { dir: zero, hold: false }

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
  vel: zero,
  t: 0,
  panel: undefined,
  holding: undefined,
})

export const start = (): Game => ({
  story: initialState,
  path: [],
  space: 'bar',
  pos: spaces.bar.spawn,
  facing: Math.PI,
  vel: zero,
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

export const focus = (g: Game): Interactable | undefined => (g.panel ? undefined : pick(g.pos, g.facing, available(g)))

export const watcher = (g: Game) => ({ at: CURLY_AT, facing: curlyFacing(g.t), range: CURLY_RANGE, halfAngle: CURLY_HALF_ANGLE })

export const seen = (g: Game): boolean => g.space === 'camp' && sees(watcher(g), g.pos, occluders(spaces.camp))

const busted = (g: Game): Game => ({
  ...g,
  holding: undefined,
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
  if (target.hold) return { ...g, vel: zero, holding: { id, progress: 0, time: target.hold } }
  if (g.space === 'bar') {
    if (id === 'wade') return { ...g, panel: g.story.scene === 'p_bar' ? storyPanel(g.story, ['texas', 'munitions'], [close('Not yet.')]) : storyPanel(g.story, [], [close('Back to the table.')]) }
    if (id === 'curly') return { ...g, panel: storyPanel(g.story, [], [close('Back to the table.')]) }
    if (id === 'door') return { ...enter(sendNote(g, 'goodnight'), 'room') }
  }
  if (g.space === 'room' && id === 'desk') return { ...g, panel: storyPanel(g.story, [], [{ id: 'fly', label: 'Sleep. Fly north with Curly in the morning.' }]) }
  if (g.space === 'camp') {
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

const holdNote: Readonly<Record<string, string>> = { hank: 'round', stove: 'stove', cache: 'cache', marker: 'marker' }

const finish = (g: Game, id: string): Game => {
  const done = { ...g, holding: undefined }
  if (isSpot(id)) return { ...sendNote(done, id), hidden: id }
  return press(done, `note:${holdNote[id]}`)
}

const hold = (g: Game, input: Input, moved: boolean, dt: number): Game => {
  const h = g.holding
  if (!h) return g
  if (!input.hold || moved) return { ...g, holding: undefined }
  if (seen(g)) return busted(g)
  const progress = h.progress + dt
  return progress < h.time ? { ...g, holding: { ...h, progress } } : finish(g, h.id)
}

const approach = (from: number, to: number, rate: number): number =>
  from < to ? Math.min(to, from + rate) : Math.max(to, from - rate)

const turn = (from: number, to: number, rate: number): number => {
  const d = Math.atan2(Math.sin(to - from), Math.cos(to - from))
  return from + Math.max(-rate, Math.min(rate, d))
}

export const topSpeed = (g: Game, input: Input): number => (input.run || !spaces[g.space].interior ? JOG : WALK)

const walk = (g: Game, input: Input, dt: number): Game => {
  const push = Math.min(1, length(input.dir))
  const heading = push > 0 ? angleTo(zero, input.dir) : g.facing
  const facing = push > 0 ? turn(g.facing, heading, TURN_RATE * dt) : g.facing
  const align = Math.max(0, Math.cos(heading - facing))
  const want = topSpeed(g, input) * push * align
  const now = length(g.vel)
  const speed = approach(now, want, (want > now ? ACCEL : DECEL) * dt)
  const way = push > 0 ? normalize(input.dir) : normalize(g.vel)
  const stride = Math.min(speed * dt, input.limit ?? Infinity)
  const arrived = input.limit !== undefined && speed * dt >= input.limit
  const pos = stride > 0 ? move(g.pos, way, stride, solids(spaces[g.space])) : g.pos
  return { ...g, pos, facing, vel: arrived ? zero : scale(way, speed) }
}

export const tick = (g: Game, input: Input, dt: number): Game => {
  const t = g.t + dt
  if (g.panel) return { ...g, vel: zero, t: g.space === 'camp' ? g.t : t }
  const moved = length(input.dir) > 0
  const held = hold({ ...g, t }, input, moved, dt)
  return held.panel || held.holding ? held : walk(held, input, dt)
}

export const ended = (g: Game): boolean => g.panel?.kind === 'end'

export const textBuildHash = (g: Game): string => `#path=${g.path.join(',')}`
