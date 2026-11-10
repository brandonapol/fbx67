import { choicesOf, choose, isEnd, replay } from './engine.ts'
import { menu, send } from './story.ts'
import { initialState } from './state.ts'
import { missions } from './missions.ts'
import { sceneIndex } from './sceneIds.ts'
import type { MissionEnding } from './missions.ts'
import type { State } from './types.ts'

// Every mission note is named `mission/note`. A route reaches a note when the choices it makes from the mission's
// start scene to its end scene are exactly the ones the note applies, single-option beats between them included.
export const missionNotes: readonly string[] = missions.flatMap((m) => m.endings.map((e) => `${m.id}/${e.note}`))

// The scene notes a mission ending plays from s, in order, following single-option beats as sendMission does.
const playedNotes = (s: State, applies: readonly string[]): readonly string[] => {
  if (applies.length === 0) return []
  const { options } = menu(s)
  const next = options.find((o) => o.note === applies[0]) ?? (options.length === 1 ? options[0] : undefined)
  if (!next) throw new Error(`Scene ${s.scene} does not offer ${applies[0]}`)
  return [next.note, ...playedNotes(send(s, next.note), next.note === applies[0] ? applies.slice(1) : applies)]
}

const sameNotes = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((x, i) => x === b[i])

// The notes a route reaches, as `mission/note`.
export const reachedNotes = (path: string): ReadonlySet<string> => {
  const choices = path.split(',').map(Number)
  const states = replay(choices)
  const noted = choices.slice(0, states.length - 1).map((n, i) => menu(states[i]).options[n - 1].note)
  const reached = new Set<string>()
  missions.forEach((m) => {
    const from = states.findIndex((s) => s.scene === m.start)
    const to = states.findIndex((s) => s.scene === m.end)
    if (from < 0 || to < 0) return
    const taken = noted.slice(from, to)
    m.endings.forEach((e: MissionEnding) => {
      if (sameNotes(playedNotes(states[from], e.applies), taken)) reached.add(`${m.id}/${e.note}`)
    })
  })
  return reached
}

const noteAt = (s: State, n: number): string => menu(s).options[n - 1].note

// The shortest run of choices from s to a state at scene `to`, lowest choice first; undefined if none reaches it.
const shortestTo = (s: State, to: State['scene']): readonly number[] | undefined => {
  const seen = new Set<string>()
  const walk = (frontier: readonly Readonly<{ s: State; up: readonly number[] }>[]): readonly number[] | undefined => {
    if (frontier.length === 0) return undefined
    const hit = frontier.find((f) => f.s.scene === to)
    if (hit) return hit.up
    const next = frontier
      .filter((f) => sceneIndex(f.s.scene) < sceneIndex(to))
      .flatMap((f) => choicesOf(f.s).map((_, i) => ({ s: choose(f.s, i + 1), up: [...f.up, i + 1] })))
      .filter((f) => {
        const k = JSON.stringify(f.s)
        return seen.has(k) ? false : (seen.add(k), true)
      })
    return walk(next)
  }
  return walk([{ s, up: [] }])
}

// Choice 1 until the scene `to`, as finish() plays, so a route keeps the first-choice beats between missions (the
// steak at a2_curly) where a shorter way exists; undefined if choice 1 passes `to` by.
const firstTo = (s: State, to: State['scene'], up: readonly number[] = []): readonly number[] | undefined =>
  s.scene === to ? up : isEnd(s) || sceneIndex(s.scene) > sceneIndex(to) ? undefined : firstTo(choose(s, 1), to, [...up, 1])

// Choice 1 until the game ends.
const finish = (s: State, up: readonly number[]): readonly number[] => (isEnd(s) ? up : finish(choose(s, 1), [...up, 1]))

// One route that plays, at each mission it can still reach, the first note in `todo`, else the first the mission has.
const routeFor = (todo: ReadonlySet<string>): string => {
  const step = (s: State, up: readonly number[], rest: typeof missions): readonly number[] => {
    const [m, ...later] = rest
    if (!m) return finish(s, up)
    const lead = firstTo(s, m.start) ?? shortestTo(s, m.start)
    if (!lead) return step(s, up, later)
    const at = lead.reduce(choose, s)
    const ending = m.endings.find((e) => todo.has(`${m.id}/${e.note}`)) ?? m.endings[0]
    const played = ending.applies.reduce<readonly [State, readonly number[]]>(
      ([cur, ns], note) => {
        const go = (c: State, acc: readonly number[]): readonly [State, readonly number[]] => {
          const { options } = menu(c)
          const o = options.find((x) => x.note === note) ?? (options.length === 1 ? options[0] : undefined)
          if (!o) throw new Error(`Scene ${c.scene} does not offer ${note}`)
          const after = choose(c, o.n)
          return o.note === note ? [after, [...acc, o.n]] : go(after, [...acc, o.n])
        }
        return go(cur, ns)
      },
      [at, []],
    )
    // A mission's end scene is reached through single-option beats after its last choice.
    const settle = (c: State, acc: readonly number[]): readonly [State, readonly number[]] =>
      c.scene === m.end || choicesOf(c).length !== 1 ? [c, acc] : settle(choose(c, 1), [...acc, 1])
    const [out, ns] = settle(...played)
    return step(out, [...up, ...lead, ...ns], later)
  }
  return step(initialState, [], missions).join(',')
}

// Routes to add to `have` so every mission note is reached by one: each new route plays the first uncovered note of
// every mission it passes, so the set grows by the most notes any one mission has left, not one route per note.
export const coverRoutes = (have: readonly string[]): readonly string[] => {
  const grow = (routes: readonly string[], reached: ReadonlySet<string>): readonly string[] => {
    const todo = new Set(missionNotes.filter((n) => !reached.has(n)))
    if (todo.size === 0) return routes
    const path = routeFor(todo)
    const got = reachedNotes(path)
    if (![...got].some((n) => todo.has(n))) throw new Error(`No route reaches ${[...todo].join(', ')}`)
    return grow([...routes, path], new Set([...reached, ...got]))
  }
  return grow([], new Set(have.flatMap((p) => [...reachedNotes(p)]))).filter((p) => !have.includes(p))
}
