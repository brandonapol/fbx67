import type { Bus } from './mixer.ts'
import type { Spot } from './soundscape.ts'
import type { Lab, Walker } from './photoLab.ts'
import { WATCH, poseAt, spotter } from './photoLab.ts'
import { LAB } from './eielson.ts'
import { strideFor } from './footsteps.ts'
import type { Vec } from './world.ts'

// The photo lab's stealth by ear (photoLab.ts): the lab's people walk their rounds out of sight as often as in it, so
// Wade hears them coming. Each frame of the run, what each watcher does maps to a sound:
//   walking   his step, each stride, at his feet (the floor under him picks the step)
//   back      out of the building and back in the world: the clerk lights up on the step, home from lunch
//   entering  through a door into the lab: the front door, or the sergeant's at the records room's back
//   seeing    he starts to see Wade where Wade has no business: the sting, on Wade
export type Watch = 'walking' | 'back' | 'entering' | 'seeing'

// A step is the footstep synth on the floor where he stands; everything else is a spot.
export type Sound = Spot | 'step'

export type Cue = Readonly<{ sound: Sound; bus: Bus; at: Vec }>

const SHARED: Readonly<Partial<Record<Watch, Sound>>> = { walking: 'step', entering: 'door', seeing: 'sting' }

export const CUE: Readonly<Record<Walker['id'], Readonly<Partial<Record<Watch, Sound>>>>> = {
  clerk: { ...SHARED, back: 'snap' },
  airman: SHARED,
  sergeant: SHARED,
}

const inLab = (p: Vec): boolean => p.x > LAB[0] && p.x < LAB[1] && p.z > LAB[2] && p.z < LAB[3]

// What a watcher does between two clocks of the run: every state he passes into, but the sting (that is Wade's).
const watches = (w: Walker, from: number, to: number): readonly Watch[] => {
  const a = poseAt(w, from)
  const b = poseAt(w, to)
  const strides = (t: number) => Math.floor((t * w.speed) / strideFor(w.speed))
  const walking = b.speed > 0 && !b.away && strides(to) > strides(from)
  const back = a.away && !b.away
  const entering = !a.away && !b.away && !inLab(a.at) && inLab(b.at)
  return [walking && 'walking', back && 'back', entering && 'entering'].filter((s): s is Watch => s !== false)
}

// The cues for one frame of the run, from the lab as it was to the lab as it is, Wade standing at `wade`. Nothing
// sounds across a restart (the clock goes back to the checkpoint) or the busted beat.
export const labCues = (prev: Lab | undefined, next: Lab | undefined, wade: Vec): readonly Cue[] => {
  if (!prev || !next || prev.way !== next.way || next.clock <= prev.clock || next.caught !== undefined) return []
  const theirs = WATCH[next.way].flatMap((w) => {
    const at = poseAt(w, next.clock).at
    return watches(w, prev.clock, next.clock).flatMap((s): Cue[] => {
      const sound = CUE[w.id][s]
      return sound ? [{ sound, bus: 'sfx', at }] : []
    })
  })
  const by = prev.aware === 0 && next.aware > 0 ? spotter(next.way, next.clock, wade) : undefined
  const sting = by && CUE[by.id].seeing
  return sting ? [...theirs, { sound: sting, bus: 'music', at: wade }] : theirs
}
