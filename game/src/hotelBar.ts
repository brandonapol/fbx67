import type { State } from '../../text-game/src/types.ts'
import { menu, offers, place, send } from '../../text-game/src/story.ts'
import { missions } from '../../text-game/src/missions.ts'
import type { Figure, Prop, Space } from './levels.ts'
import type { Interactable, Vec } from './world.ts'
import { distance, vec } from './world.ts'

// The hotel bar downtown in October (docs/acts/act2-missions.md, section 2; place `hotelBar`). Lucy asks at her table
// (kitchen.ts), where skipping it is a choice before Wade goes in. Bringing the guitar brings him here, to the corner he sets up in:
// he takes a stool, and each song is a short rhythm game. Playing is cover: while he keeps time nobody looks at him,
// and the closer he sits and the cleaner he plays, the more of Tolliver's back booth gets through, as fragments that
// fill in. A clam or a dead stop makes the booth go quiet a while; stopping dead next to it gets him stared at, and
// busted retries from the start of that song, which the story never hears of (Rule 4).
//
// Every word overheard is the story's: the quoted lines of the scene hearing most of it lands on,
// asked of the story without keeping the state. When the set is done the run sends the corner's note its hearing
// earned, read off the mission's endings: the sitClose of hearing most, or the sitFar of hearing pieces.
//
// Local x east, z south. The door is in the north wall; the bar runs down the west wall; Tolliver's back booth is an
// alcove in the southeast corner.

const W = 14
const D = 10
const DOOR = 1.2
const DOOR_X = -4

export const SPAWN = vec(DOOR_X, -D / 2 + 0.8)
export const SPAWN_FACING = 0

// --- The booth, and the staging rule for the quiet man ---

// The alcove: its north partition runs from ALCOVE_X to the east wall, floor to ceiling, and the booth fills it from
// the quiet man's knees to the east wall. Tolliver sits against the east wall facing the room; the quiet man sits across
// from him, his back to the room, facing east into the alcove.
export const ALCOVE_X = 4.3
export const ALCOVE_Z = 2.8
export const TOLLIVER_AT = vec(6.4, 3.9)
export const QUIET_AT = vec(4.6, 3.9)
// East: he faces Tolliver and the alcove's back wall.
export const QUIET_FACING = Math.PI / 2

// Where his face could be seen from: in front of the plane through his head, the way he faces. That half of the room is
// the booth itself, solid from his knees to the wall (BOOTH), behind the partition (PARTITION) that reaches the
// ceiling. hotelBar.test.ts samples every point of the room and holds it to that.
export const BOOTH = { x: (QUIET_AT.x + W / 2) / 2, z: (ALCOVE_Z + D / 2) / 2, w: W / 2 - QUIET_AT.x, d: D / 2 - ALCOVE_Z }
export const PARTITION = { x: (ALCOVE_X + W / 2) / 2, z: ALCOVE_Z, w: W / 2 - ALCOVE_X, d: 0.16 }
export const CEILING = 3.0

// --- The stools, as data ---

export type SeatId = 'boothStool' | 'barStool' | 'doorStool'

export type Seat = Readonly<{ id: SeatId; at: Vec; facing: number }>

export const seats: readonly Seat[] = [
  // The stool by their booth, the quiet ones within arm's reach of the quiet man's back.
  { id: 'boothStool', at: vec(3.3, 4.1), facing: Math.PI },
  // A stool at the end of the bar, halfway down the room.
  { id: 'barStool', at: vec(-1.0, 1.6), facing: Math.PI / 2 },
  // By the door, playing what the room wants.
  { id: 'doorStool', at: vec(-2.4, -2.6), facing: Math.PI / 2 },
]

export const seatOf = (id: SeatId): Seat => seats.find((s) => s.id === id)!

export const SEAT_REACH = 1.2

export const stoolSpots: readonly Interactable[] = seats.map((s) => ({ id: s.id, x: s.at.x, z: s.at.z, r: SEAT_REACH, prompt: 'Sit and play' }))

export const isSeat = (id: string): id is SeatId => seats.some((s) => s.id === id)

// --- How far each voice carries ---

export type Who = 'tolliver' | 'quiet'

// Tolliver is loud and angry and carries across the room; the quiet man never raises his voice: only the stool by the
// booth hears him. Full within `full` metres of the speaker, nothing past `none`.
export const VOICES: Readonly<Record<Who, Readonly<{ at: Vec; full: number; none: number }>>> = {
  tolliver: { at: TOLLIVER_AT, full: 2, none: 14 },
  quiet: { at: QUIET_AT, full: 1.8, none: 2.6 },
}

export const carries = (who: Who, from: Vec): number => {
  const v = VOICES[who]
  return Math.max(0, Math.min(1, (v.none - distance(from, v.at)) / (v.none - v.full)))
}

// --- The rhythm ---

// A song: a bar's lead-in, then BEATS chords on the beat. A strum within WINDOW of a beat is clean; a beat let go by,
// or a strum off it, is a clam. Each song is a checkpoint; SONGS make the set.
export const BEAT = 0.8
export const LEAD = 1.6
export const BEATS = 16
export const WINDOW = 0.18
export const SONGS = 3
export const SONG_TIME = LEAD + BEATS * BEAT

// How the playing sounds, 0 to 1: it starts each song at START, rises on each clean chord and drops on a clam.
export const START = 0.6
export const CLEAN = 0.1
export const CLAM = 0.25
// Below COVER the room hears a man fumbling, not music, and the booth hears nothing worth hiding.
export const COVER = 0.5
// After a clam the booth goes quiet this long.
export const HUSH = 3
// How fast the booth's talk comes through at full cover and full carry: a whole set at the booth stool, played clean,
// fills both lines with some to spare.
export const LISTEN = 1.25 / (SONGS * BEATS * BEAT)
// Stopping dead by the booth: after STOP without a strum the stare builds, and fills in STARE.
export const STOP = 2 * BEAT
export const STARE = 1.5
// The stare's beat: Tolliver's look holds this long before the retry comes up.
export const CAUGHT_TIME = 1.8

export type Heard = Readonly<Record<Who, number>>

export type Song = Readonly<{ t: number; judged: number; groove: number; last: number; hush: number; stare: number }>

export type Checkpoint = Readonly<{ songs: number; heard: Heard; seat?: SeatId }>

export type Bar = Readonly<{
  seat?: SeatId
  // Songs played to the end.
  songs: number
  song?: Song
  heard: Heard
  // Seconds into the stare, once someone at the booth has turned.
  caught?: number
  checkpoint: Checkpoint
}>

const none: Heard = { tolliver: 0, quiet: 0 }

export const begin = (): Bar => ({ songs: 0, heard: none, checkpoint: { songs: 0, heard: none } })

// Retry from the last song's start: what was heard by then, on the stool he played it on.
export const restart = (bar: Bar): Bar => ({ seat: bar.checkpoint.seat, songs: bar.checkpoint.songs, heard: bar.checkpoint.heard, checkpoint: bar.checkpoint })

export const finished = (bar: Bar): boolean => bar.songs >= SONGS && !bar.song

// A stool is there to take between songs, before the set is done.
export const canSit = (bar: Bar | undefined): boolean => bar !== undefined && !bar.song && bar.caught === undefined && !finished(bar)

// Sitting down on a stool starts the next song; the checkpoint is its start.
export const sit = (bar: Bar, seat: SeatId): Bar =>
  canSit(bar) ? { ...bar, seat, song: { t: 0, judged: 0, groove: START, last: 0, hush: 0, stare: 0 }, checkpoint: { songs: bar.songs, heard: bar.heard, seat } } : bar

export const beatAt = (k: number): number => LEAD + k * BEAT

const clamp = (v: number): number => Math.max(0, Math.min(1, v))

const clam = (s: Song): Song => ({ ...s, groove: clamp(s.groove - CLAM), hush: HUSH })

// A strum: clean on a beat not yet played, a clam anywhere else.
export const strum = (bar: Bar): Bar => {
  const s = bar.song
  if (!s || bar.caught !== undefined) return bar
  const k = Math.round((s.t - LEAD) / BEAT)
  const on = k >= s.judged && k < BEATS && Math.abs(s.t - beatAt(k)) <= WINDOW
  const played = on ? { ...s, judged: k + 1, groove: clamp(s.groove + CLEAN) } : clam(s)
  return { ...bar, song: { ...played, last: s.t } }
}

// How much the guitar covers the room's voices, for the mixer (mixer.ts, coverGain): the playing, while a song is on.
export const cover = (bar: Bar | undefined): number => bar?.song?.groove ?? 0

// Whether stopping dead here gets Wade stared at: only within earshot of the quiet man.
const watched = (seat: SeatId | undefined): boolean => seat !== undefined && carries('quiet', seatOf(seat).at) > 0

// One frame of the song: beats let go by are clams, the booth's talk comes through under good cover, a dead stop by
// the booth builds the stare, and at the end of the song Wade sits with his guitar between songs.
export const step = (bar: Bar, dt: number): Bar => {
  const s0 = bar.song
  if (!s0 || bar.caught !== undefined || !bar.seat) return bar
  let s: Song = { ...s0, t: s0.t + dt, hush: Math.max(0, s0.hush - dt) }
  while (s.judged < BEATS && s.t > beatAt(s.judged) + WINDOW) s = { ...clam(s), judged: s.judged + 1 }
  const at = seatOf(bar.seat).at
  // He has to be playing: a chord within the last STOP, under good cover, with the booth not gone quiet.
  const listening = s.last > 0 && s.t - s.last <= STOP && s.groove >= COVER && s.hush <= 0
  const heard: Heard = listening
    ? { tolliver: clamp(bar.heard.tolliver + carries('tolliver', at) * s.groove * LISTEN * dt), quiet: clamp(bar.heard.quiet + carries('quiet', at) * s.groove * LISTEN * dt) }
    : bar.heard
  const stopped = s.t - s.last > STOP && s.t > LEAD
  const stare = watched(bar.seat) && stopped ? s.stare + dt / STARE : Math.max(0, s.stare - dt / STARE)
  if (stare >= 1) return { ...bar, heard, song: { ...s, stare: 1 }, caught: 0 }
  if (s.t >= SONG_TIME) return { ...bar, heard, songs: bar.songs + 1, song: undefined }
  return { ...bar, heard, song: { ...s, stare } }
}

// The stare runs; at its end the retry comes up.
export const stared = (bar: Bar, dt: number): Bar | 'busted' => {
  const at = (bar.caught ?? 0) + dt
  return at >= CAUGHT_TIME ? 'busted' : { ...bar, caught: at }
}

// Seconds until the next beat not yet played, for a player who keeps time (hotelBarBot.ts).
export const toNextBeat = (bar: Bar): number | undefined => {
  const s = bar.song
  return s && s.judged < BEATS ? beatAt(s.judged) - s.t : undefined
}

// --- What the story says, and what Wade hears of it ---

const ending = (label: 'most' | 'pieces') => missions.find((m) => m.id === 'theHotelBar')!.endings.find((e) => e.label === label)!

// The note only one ending applies, where the story offers it: at the corner, where Wade sits decides what he hears.
const own = (s: State, label: 'most' | 'pieces'): string | undefined => {
  const other = ending(label === 'most' ? 'pieces' : 'most').applies
  return ending(label).applies.find((n) => !other.includes(n) && offers(s, n))
}

// Setting up in the corner: the hotel bar, where the story asks the note that splits hearing most from pieces.
export const atSet = (s: State): boolean => place(s) === 'hotelBar' && own(s, 'most') !== undefined && own(s, 'pieces') !== undefined

// Heard most: every word of the quiet man's line. Anything less is pieces.
export const heardMost = (bar: Bar): boolean => bar.heard.quiet >= 1

// The note the set earned: the one its mission ending applies at the corner.
export const setNote = (s: State, bar: Bar): string => {
  const note = own(s, heardMost(bar) ? 'most' : 'pieces')
  if (!note) throw new Error(`${s.scene} offers none of the hotel bar's notes`)
  return note
}

// The booth's two lines, as the scene that hears most of it writes them: its quoted speech, Tolliver's first and the
// quiet man's after, asked of the story without keeping the state.
export const lines = (s: State): Readonly<Record<Who, string>> => {
  const most = own(s, 'most')
  if (!most) throw new Error(`${s.scene} is not where the hotel bar is heard`)
  const quoted = [...menu(send(s, most)).text.matchAll(/"([^"]+)"/g)].map((m) => m[1]!)
  if (quoted.length !== 2) throw new Error(`the hotel bar's heard scene quotes ${quoted.length} lines, not 2`)
  return { tolliver: quoted[0]!, quiet: quoted[1]! }
}

// A line as far as it has come through: its words in order up to the share heard, and an ellipsis for the rest.
export const fragment = (line: string, heard: number): string => {
  const words = line.split(/\s+/).filter(Boolean)
  const k = Math.floor(clamp(heard) * words.length + 1e-9)
  if (k === 0) return ''
  return k < words.length ? `${words.slice(0, k).join(' ')}...` : line
}

export type Overheard = Readonly<{ who: Who; at: Vec; text: string }>

// The subtitles over the booth: each voice's line as far as Wade has heard it, while there is any.
export const overheard = (s: State, bar: Bar | undefined): readonly Overheard[] => {
  if (!bar) return []
  const l = lines(s)
  return (['tolliver', 'quiet'] as const).flatMap((who) => {
    const text = fragment(l[who], bar.heard[who])
    return text ? [{ who, at: VOICES[who].at, text }] : []
  })
}

// --- The room ---

const wall = (x: number, z: number, w: number, d: number, color: string): Prop => ({ box: { x, z, w, d }, h: CEILING, color, solid: true, occludes: true })

const panel = '#6b4a32'
const plaster = '#a89a80'
const oak = '#5a4630'
const brass = '#9a8040'

const on = (x: number, z: number, w: number, d: number, y: number, h: number, color: string, solid = false): Prop => ({ box: { x, z, w, d }, h, y, color, ...(solid ? { solid } : {}) })

const stool = (s: Seat): readonly Prop[] => [on(s.at.x, s.at.z, 0.36, 0.36, 0, 0.62, '#3e2f20')]

const props: readonly Prop[] = [
  // The walls, the door in the north one.
  wall((-W / 2 + DOOR_X - DOOR / 2) / 2, -D / 2, DOOR_X - DOOR / 2 + W / 2, 0.2, panel),
  wall((W / 2 + DOOR_X + DOOR / 2) / 2, -D / 2, W / 2 - DOOR_X - DOOR / 2, 0.2, panel),
  wall(0, D / 2, W, 0.2, panel),
  wall(-W / 2, 0, 0.2, D, panel),
  wall(W / 2, 0, 0.2, D, panel),
  // Second Avenue through the door.
  { box: { x: DOOR_X, z: -D / 2 - 0.6, w: DOOR + 0.6, d: 0.6 }, h: 0.02, color: '#5c5c58', flat: true },
  // The bar down the west wall, the back bar's bottles and mirror behind it, the brass rail.
  on(-5.2, 0.5, 0.8, 6.5, 0, 1.08, oak, true),
  on(-6.6, 0.5, 0.5, 6.5, 0, 0.95, '#4e3826', true),
  on(-6.82, 0.5, 0.05, 4.0, 1.3, 1.0, '#9aa4a8'),
  on(-4.7, 0.5, 0.04, 6.5, 0.2, 0.04, brass),
  ...[-2.0, -1.2, -0.4, 0.4, 1.2, 2.0, 2.8].map((z, i) => ({ ...on(-6.6, z, 0.12, 0.12, 0.95, 0.3, i % 2 ? '#4a6a3a' : '#7a4a2a'), shape: 'cylinder' as const })),
  // Tables in the room: the contractors' by the window, the professors' chessboard.
  on(1.2, -2.6, 1.0, 1.0, 0, 0.75, oak, true),
  on(-0.6, 3.6, 0.9, 0.9, 0, 0.75, oak, true),
  on(-0.6, 3.6, 0.4, 0.4, 0.75, 0.02, '#d8d2c0'),
  // The window on Second, the light off it.
  { box: { x: 2.5, z: -D / 2 + 0.12, w: 2.4, d: 0.06 }, h: 1.3, y: 0.9, color: '#c9d2da', glow: true },
  // Tolliver's back booth: the partition to the ceiling, and the booth filling the alcove, its table between the two men.
  { box: PARTITION, h: CEILING, color: panel, solid: true, occludes: true },
  { box: BOOTH, h: 0.75, color: '#4e3826', solid: true },
  on(5.5, 3.9, 0.9, 1.2, 0.75, 0.02, '#3e2f20'),
  ...[5.3, 5.7].map((z) => ({ ...on(5.5, z - 0.15, 0.1, 0.1, 0.77, 0.14, '#c8b88a'), shape: 'cylinder' as const })),
  // The lamps over the booth and the bar.
  ...[vec(5.5, 3.9), vec(-5.2, -1.5), vec(-5.2, 2.5)].map((p) => ({ ...on(p.x, p.z, 0.3, 0.3, 2.4, 0.2, '#ffc27a'), glow: true, shape: 'cylinder' as const })),
  ...seats.flatMap(stool),
]

// The two at the booth, and the room around them: the bartender, the waitress, the gray-haired bush pilot at the bar,
// the contractors waiting out freeze-up and the two professors over their chessboard. Gray boxes.
const figures: readonly Figure[] = [
  { id: 'tolliver', at: TOLLIVER_AT, facing: -Math.PI / 2, coat: '#3a3a40', skin: '#c49a7a', hair: '#8a8a86', height: 1.78, activity: 'sit' },
  { id: 'quietMan', at: QUIET_AT, facing: QUIET_FACING, coat: '#5a5a5e', skin: '#c49a7a', hair: '#2a2620', height: 1.76, activity: 'sit' },
  { id: 'bartender', at: vec(-6.0, -1.0), facing: Math.PI / 2, coat: '#d8d4c8', skin: '#c49a7a', hair: '#3a2e24', height: 1.74 },
  { id: 'waitress', at: vec(2.2, 0.4), facing: Math.PI, coat: '#6a3b33', skin: '#c49a7a', hair: '#7a5a3a', height: 1.62 },
  { id: 'bushPilot', at: vec(-4.4, -0.4), facing: -Math.PI / 2, coat: '#5a4a32', skin: '#c49a7a', hair: '#b0aca4', height: 1.75, activity: 'sitDrink' },
  { id: 'contractorA', at: vec(1.2, -3.5), facing: 0, coat: '#4a5a6a', skin: '#c49a7a', hair: '#3a2e24', height: 1.8, activity: 'sitDrink' },
  { id: 'contractorB', at: vec(2.1, -2.6), facing: -Math.PI / 2, coat: '#6a5a3a', skin: '#c49a7a', hair: '#1e1a17', height: 1.78, activity: 'sitDrink' },
  { id: 'professorA', at: vec(-1.45, 3.6), facing: Math.PI / 2, coat: '#5a4a4a', skin: '#c49a7a', hair: '#9a9690', height: 1.72, activity: 'sit' },
  { id: 'professorB', at: vec(0.25, 3.6), facing: -Math.PI / 2, coat: '#3e4a3a', skin: '#c49a7a', hair: '#5a4a3a', height: 1.7, activity: 'sit' },
]

export type HotelSpace = Omit<Space, 'id'> & Readonly<{ id: 'hotelBar' }>

export const hotelBar: HotelSpace = {
  id: 'hotelBar',
  act: 'Act 2: Freeze-up',
  place: 'hotelBar',
  name: 'The hotel bar',
  interior: true,
  size: { w: W, d: D },
  ground: '#4a3a2c',
  spawn: SPAWN,
  props,
  figures,
  spots: stoolSpots,
}

// The run starts where the story is setting up in the corner; any later hotel bar scene (a link straight to what he
// heard) has no run and opens its menu.
export const arrival = (s: State): Bar | undefined => (atSet(s) ? begin() : undefined)

// A stool is there to use only while the set is on.
export const barSpot = (s: State, bar: Bar | undefined, id: string): boolean => isSeat(id) && atSet(s) && canSit(bar)
