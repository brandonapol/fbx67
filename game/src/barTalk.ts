import type { State } from '../../text-game/src/types.ts'
import type { Ambient, Trigger } from '../../text-game/src/ambient/format.ts'
import { say, within } from '../../text-game/src/ambient/select.ts'
import { prologueThreads, prologueTown } from '../../text-game/src/ambient/prologueTown.ts'
import { prologueThings } from '../../text-game/src/ambient/prologueThings.ts'
import type { Visit } from './talk.ts'
import { perform, queue, readTime, thingSpots } from './talk.ts'
import { poses } from './ambient.ts'
import type { Vec } from './world.ts'
import { distance } from './world.ts'
import { BOOTH, CARD_TABLE, ORDER_STOOL, POOL_TABLE, doingAt } from './silverPan.ts'

// Things to do in the Silver Pan (issue #46), on top of the small interactions in talk.ts: sit at the bar and order,
// pick a song on the jukebox, watch the card game, overhear a table, and Wade's guitar after the talk. Every line is
// the story layer's (text-game/src/ambient/); none of these changes the story's State. Buying the round is talk.ts's
// Buy on Hank, and saying goodnight is the door in prologue.ts, which walks out onto Second Avenue.

// The bar's own state beside the Visit: whether Owen is on a stool, and the record playing since when (visit clock).
export type Pan = Readonly<{ visit: Visit; seated?: true; song?: SongKey; songFrom?: number }>

export const pan = (visit: Visit): Pan => ({ visit })

const person = (id: string): Ambient => {
  const a = [...prologueTown, ...prologueThings].find((x) => x.id === id)
  if (!a) throw new Error(`no ambient ${id}`)
  return a
}

// Sit at the bar and order: Owen takes the free stool by Hank's taps, Hank says his greeting and then a few words.
// The exchange is talk.ts's greet and talk on Hank, so its reply is on offer after. No note is sent.
export const STOOL_REACH = 1.0

export const sitAndOrder = (p: Pan): Pan => {
  const g = p.visit.game
  if (g.panel || g.space !== 'bar' || distance(g.pos, ORDER_STOOL) > STOOL_REACH) return p
  const sat = { ...p.visit, game: { ...g, pos: ORDER_STOOL, facing: Math.PI, view: Math.PI, vel: { x: 0, z: 0 } } }
  const ordered = perform(perform(sat, 'hank', 'greet'), 'hank', 'talk')
  return ordered === sat ? p : { ...p, visit: ordered, seated: true }
}

export const standUp = (p: Pan): Pan => ({ ...p, seated: undefined })

// The jukebox: five records, picked by their button. Each says the story's aside for it (the steel guitar on
// B7, the polka, the fiddle, the ballad, the rockabilly). The music the audio layer plays is the style.
export type SongKey = 'A1' | 'B7' | 'C3' | 'D5' | 'E2'

export type Song = Readonly<{ key: SongKey; style: 'fiddle' | 'steel' | 'polka' | 'ballad' | 'rockabilly'; bit?: string }>

export const songs: readonly Song[] = [
  { key: 'A1', style: 'fiddle', bit: 'fiddle' },
  { key: 'B7', style: 'steel', bit: 'dime' },
  { key: 'C3', style: 'polka', bit: 'polka' },
  { key: 'D5', style: 'ballad', bit: 'ballad' },
  { key: 'E2', style: 'rockabilly', bit: 'rockabilly' },
]

const JUKE_REACH = 1.6

export const atJukebox = (p: Pan): boolean => {
  const g = p.visit.game
  const j = thingSpots.jukebox
  return !g.panel && g.space === j.space && distance(g.pos, { x: j.x, z: j.z }) <= JUKE_REACH && within(g.story)(person('jukebox').at[0])
}

export const pickSong = (p: Pan, key: SongKey): Pan => {
  const song = songs.find((s) => s.key === key)
  if (!song || !atJukebox(p)) return p
  const v = p.visit
  const juke = person('jukebox')
  const bit = song.bit ? juke.lines.use?.find((b) => b.id === song.bit) : undefined
  const talk = bit ? queue(v.talk, juke, bit.lines, v.clock) : v.talk
  return { ...p, visit: { ...v, talk }, song: key, songFrom: v.clock }
}

// How the room takes the record: the airman at the jukebox groans at the polka and dances to anything else, for the
// first DANCE seconds of it.
export const DANCE = 12

export const reaction = (p: Pan): 'groan' | 'dance' | undefined => {
  const song = songs.find((s) => s.key === p.song)
  if (!song || p.songFrom === undefined || p.visit.clock - p.songFrom > DANCE) return undefined
  return song.style === 'polka' ? 'groan' : 'dance'
}

// The card game: the hands play out on a clock of their own, whether anyone watches or not.
export const HAND = 36
export type Phase = 'deal' | 'play' | 'show' | 'rake'

export type Hand = Readonly<{ n: number; phase: Phase; winner: number }>

export const hand = (seconds: number, seed: number): Hand => {
  const n = Math.floor(seconds / HAND)
  const at = seconds - n * HAND
  const phase: Phase = at < 5 ? 'deal' : at < 28 ? 'play' : at < 32 ? 'show' : 'rake'
  return { n, phase, winner: ((n * 7 + seed) >>> 0) % 2 }
}

// Who is at the card table now: the patrons the schedule seated there.
export const cardPlayers = (s: State, seed: number): readonly string[] =>
  poses(s, seed, 0)
    .filter((q) => q.space === 'bar' && doingAt(q.slot) === 'cards')
    .map((q) => q.who)

export const WATCH_REACH = 2.2

const cardTriggers: readonly Trigger[] = ['bark', 'talk', 'greet']

// Watch the card game: stand by the table and the next player in turn says something over their cards.
export const watchCards = (p: Pan): Pan => {
  const v = p.visit
  const g = v.game
  if (g.panel || g.space !== 'bar' || distance(g.pos, CARD_TABLE) > WATCH_REACH) return p
  const players = cardPlayers(g.story, v.seed)
  if (!players.length) return p
  const heard = v.talk.log.filter((l) => players.includes(l.with)).length
  const order = [...players.slice(heard % players.length), ...players.slice(0, heard % players.length)]
  for (const who of order) {
    const a = person(who)
    for (const trigger of cardTriggers) {
      const said = say(g.story, a, trigger, v.talk.spent)
      if (said) return { ...p, visit: { ...v, talk: queue({ ...v.talk, spent: said.spent, offer: undefined }, a, said.bit.lines, v.clock) } }
    }
  }
  return p
}

// Overheard threads: two people at a table go on talking, and their lines fade in as Owen comes close. Nobody
// stops for him; he only has to stand there. The pilots talk in the booth, the airmen over the pool table.
export const anchors: Readonly<Record<string, Vec>> = { gravelCash: BOOTH, shortCount: POOL_TABLE }

export const HEAR_FULL = 1.8
export const HEAR_NONE = 3.6

export type Overheard = Readonly<{ thread: string; who: string; name: string; text: string; alpha: number }>

const fade = (d: number): number => Math.max(0, Math.min(1, (HEAR_NONE - d) / (HEAR_NONE - HEAR_FULL)))

// The line each thread is on at `seconds` since the bar opened: one after another, each for its reading time, then
// from the top. Same seconds, same line.
const lineAt = (lines: readonly Readonly<{ who: string; text: string }>[], seconds: number) => {
  const total = lines.reduce((n, l) => n + readTime(l.text), 0)
  const at = seconds % total
  let t = 0
  for (const l of lines) {
    t += readTime(l.text)
    if (at < t) return l
  }
  return lines[lines.length - 1]
}

export const overheard = (s: State, pos: Vec, seconds: number): readonly Overheard[] =>
  prologueThreads
    .filter((t) => anchors[t.id] && within(s)(t.at))
    .flatMap((t) => {
      const alpha = fade(distance(pos, anchors[t.id]))
      if (alpha <= 0) return []
      const l = lineAt(t.lines, seconds)
      return [{ thread: t.id, who: l.who, name: person(l.who).name, text: l.text, alpha }]
    })

// Wade's guitar: once Owen has had his talk with Wade, Wade plays, and the room goes quieter for it.
export const guitar = (s: State): boolean => s.scene.startsWith('p_talk_')

export const HUSH = 0.35

export const roomLevel = (s: State): number => (guitar(s) ? HUSH : 1)
