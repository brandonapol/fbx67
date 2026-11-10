import type { Ambient, Bit, Said, Topic, Trigger } from '../../text-game/src/ambient/format.ts'
import type { Spent } from '../../text-game/src/ambient/select.ts'
import { present, pool, say, topics } from '../../text-game/src/ambient/select.ts'
import { prologueTown } from '../../text-game/src/ambient/prologueTown.ts'
import { prologueThings } from '../../text-game/src/ambient/prologueThings.ts'
import { menu } from '../../text-game/src/story.ts'
import { N } from '../../text-game/src/names.ts'
import type { Game, Input } from './prologue.ts'
import { available, press, tick } from './prologue.ts'
import type { SpaceId } from './levels.ts'
import { REEL_AT } from './levels.ts'
import { spaces } from './levels.ts'
import { poses } from './ambient.ts'
import type { Interactable } from './world.ts'
import { distance, pick } from './world.ts'

// Small interactions (issue #42), game side: the verbs Owen can use on the person or thing in front of him, and the
// subtitles they produce. Every line comes from the story layer (text-game/src/ambient/) through select.ts; nothing
// here changes the story's State except Buy, which sends the story's own menu note. Pure functions over a Visit: the
// Game, plus what has been said and a clock of its own that keeps running across spaces.

// Greet is a tap, Talk a hold, Ask a radial of topics; Buy is at the bar and Use is for things.
export type Verb = 'greet' | 'talk' | 'ask' | 'buy' | 'use'

export const verbInput: Readonly<Record<Verb, 'tap' | 'hold' | 'radial'>> = { greet: 'tap', talk: 'hold', ask: 'radial', buy: 'hold', use: 'tap' }

// One subtitle. `with` is the person or thing the exchange is with; `who` is who says it: 'owen', that id, or
// 'aside' for a narrated line. It shows above the speaker from `from` until `until`, then stays in the log.
export type Line = Readonly<{ with: string; who: string; name: string; text: string; from: number; until: number }>

export type Talk = Readonly<{ spent: Spent; log: readonly Line[]; offer?: Readonly<{ with: string; bit: Bit }> }>

export type Visit = Readonly<{ game: Game; talk: Talk; clock: number; seed: number }>

export type Target = Readonly<{ id: string; ambient: Ambient; x: number; z: number; r: number }>

export const LOG_SIZE = 40
// Reading time: a beat to find the line, then a pace a slow reader keeps.
export const READ_BASE = 1.2
export const READ_PER_CHAR = 0.055
// How long someone keeps facing Owen after their last line, before they go back to what they were doing.
export const LINGER = 1.5
// How close Owen must be to a person, and to a thing (a jukebox is bigger than a man).
const REACH = 1.3
const THING_REACH = 1.6

export const visit = (game: Game, seed = 1): Visit => ({ game, talk: { spent: {}, log: [] }, clock: 0, seed })

export const step = (v: Visit, input: Input, dt: number): Visit => ({ ...v, game: tick(v.game, input, dt), clock: v.clock + dt })

const everyone: readonly Ambient[] = [...prologueTown, ...prologueThings]

// Where each usable thing stands, per space, in that space's meters (levels.ts).
export const thingSpots: Readonly<Record<string, Readonly<{ space: SpaceId; x: number; z: number }>>> = {
  jukebox: { space: 'bar', x: 5.5, z: -0.5 },
  chair: { space: 'bar', x: 1.7, z: 0.9 },
  reelToReel: { space: 'room', x: REEL_AT.x, z: REEL_AT.z },
}

// Everyone Owen could address in the space now: a figure the space stands itself (Hank, at his spot), the town's
// people where the schedule placed them, and the things.
export const targets = (v: Visit): readonly Target[] => {
  const { game: g } = v
  const here = present(g.story, everyone)
  const byId = new Map(here.map((a) => [a.id, a]))
  const staged = spaces[g.space].spots.flatMap((s) => (byId.has(s.id) ? [{ id: s.id, ambient: byId.get(s.id)!, x: s.x, z: s.z, r: s.r }] : []))
  const placed = poses(g.story, v.seed, g.t)
    .filter((p) => p.space === g.space && byId.has(p.who))
    .map((p) => ({ id: p.who, ambient: byId.get(p.who)!, x: p.at.x, z: p.at.z, r: REACH }))
  const things = here.flatMap((a) => {
    const s = thingSpots[a.id]
    return s && s.space === g.space ? [{ id: a.id, ambient: a, x: s.x, z: s.z, r: THING_REACH }] : []
  })
  return [...staged, ...placed, ...things]
}

// Who Owen is looking at, the way the game picks what to interact with.
export const near = (v: Visit): Target | undefined => {
  const all = targets(v)
  const spots: readonly Interactable[] = all
  const best = v.game.panel ? undefined : pick(v.game.pos, v.game.view, v.game.facing, spots)
  return all.find((t) => t.id === best?.id)
}

const inReach = (v: Visit, id: string): Target | undefined => targets(v).find((t) => t.id === id && distance(v.game.pos, t) <= t.r)

// The note Buy sends: the space's own hold spot on this person, when the story's menu takes it now.
const buyNote = (v: Visit, id: string): string | undefined => {
  const spot = available(v.game).find((s) => s.id === id && s.note)
  return spot?.note && menu(v.game.story).options.some((o) => o.note === spot.note) ? spot.note : undefined
}

export const verbs = (v: Visit, t: Target): readonly Verb[] => {
  const s = v.game.story
  const has = (trigger: Trigger) => pool(s, t.ambient, trigger).length > 0
  if (t.ambient.kind === 'thing') return has('use') ? ['use'] : []
  return [
    ...(has('greet') ? (['greet'] as const) : []),
    ...(has('talk') ? (['talk'] as const) : []),
    ...(topics(s, t.ambient).length ? (['ask'] as const) : []),
    ...(buyNote(v, t.id) ? (['buy'] as const) : []),
  ]
}

export const askable = (v: Visit, t: Target): readonly Topic[] => topics(v.game.story, t.ambient)

export const readTime = (text: string): number => READ_BASE + READ_PER_CHAR * text.length

const nameOf = (a: Ambient, by: Said['by']): string => (by === 'owen' ? N.owenShort : by === 'aside' ? '' : a.name)

// Lines play one after another, after anything still on screen. barTalk.ts queues the bar's own exchanges with it.
export const queue = (talk: Talk, a: Ambient, said: readonly Said[], now: number): Talk => {
  const start = Math.max(now, talk.log.at(-1)?.until ?? now)
  const lines = said.reduce<readonly Line[]>((acc, l) => {
    const from = acc.at(-1)?.until ?? start
    const who = l.by === 'them' ? a.id : l.by
    return [...acc, { with: a.id, who, name: nameOf(a, l.by), text: l.text, from, until: from + readTime(l.text) }]
  }, [])
  return { ...talk, log: [...talk.log, ...lines].slice(-LOG_SIZE) }
}

const speak = (v: Visit, a: Ambient, trigger: Trigger): Visit => {
  const said = say(v.game.story, a, trigger, v.talk.spent)
  if (!said) return v
  const talk = queue({ ...v.talk, spent: said.spent, offer: undefined }, a, said.bit.lines, v.clock)
  return { ...v, talk: said.bit.reply ? { ...talk, offer: { with: a.id, bit: said.bit } } : talk }
}

// Do something to the person or thing with this id. Out of reach, or a verb they don't take now: nothing happens.
export const perform = (v: Visit, id: string, verb: Verb, topic?: Topic): Visit => {
  const t = inReach(v, id)
  if (!t || !verbs(v, t).includes(verb)) return v
  if (verb === 'buy') {
    const note = buyNote(v, id)
    return note ? { ...v, game: press(v.game, `note:${note}`), talk: { ...v.talk, offer: undefined } } : v
  }
  if (verb === 'ask') return topic && askable(v, t).includes(topic) ? speak(v, t.ambient, `askAbout:${topic}`) : v
  return speak(v, t.ambient, verb)
}

// The reply on offer after a Talk, if Owen gives it.
export const reply = (v: Visit): Visit => {
  const o = v.talk.offer
  const a = everyone.find((x) => x.id === o?.with)
  if (!o?.bit.reply || !a) return v
  return { ...v, talk: { ...queue(v.talk, a, o.bit.reply.lines, v.clock), offer: undefined } }
}

// The subtitles on screen at a moment, each above its speaker.
export const showing = (talk: Talk, now: number): readonly Line[] => talk.log.filter((l) => l.from <= now && now < l.until)

// The log: every line already begun, oldest first.
export const said = (talk: Talk, now: number): readonly Line[] => talk.log.filter((l) => l.from <= now)

// Someone in an exchange turns to face Owen and gestures while they talk, then goes back to their activity.
export const attending = (talk: Talk, id: string, now: number): boolean =>
  talk.log.some((l) => l.with === id && l.from <= now && now < l.until + LINGER)

export const speaking = (talk: Talk, who: string, now: number): boolean => showing(talk, now).some((l) => l.who === who)
