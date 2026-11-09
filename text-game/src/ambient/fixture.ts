// A small cast for the ambient format's own tests. The prologue's real town is prologueTown.ts.
import type { Ambient, Thread, Window } from './format.ts'
import { N } from '../names.ts'
import { boughtRound } from '../queries.ts'

export const barNight: Window = { place: 'silverPan', from: '1967-07-14T22:00', to: '1967-07-15T02:00' }

export const bartender: Ambient = {
  id: 'bartender',
  kind: 'person',
  name: N.bartender,
  at: [barNight],
  lines: {
    greet: [
      { id: 'nod', lines: [{ by: 'them', text: 'Evening.' }] },
      { id: 'towel', lines: [{ by: 'them', text: 'You want something, come up and say so.' }] },
      { id: 'round', lines: [{ by: 'them', text: 'That round cleaned me out of Olympia.' }], when: boughtRound },
    ],
    talk: [
      {
        id: 'sun',
        lines: [
          { by: 'owen', text: 'Slow night?' },
          { by: 'them', text: 'Sun never goes down, so nobody goes home.' },
        ],
        reply: { label: 'Tell him to get some sleep.', lines: [{ by: 'owen', text: 'Get some sleep.' }, { by: 'them', text: 'In September.' }] },
      },
    ],
    'askAbout:weather': [{ id: 'dry', lines: [{ by: 'them', text: 'Dry for now.' }] }],
  },
}

export const jukebox: Ambient = {
  id: 'jukebox',
  kind: 'thing',
  name: 'the jukebox',
  at: [barNight],
  lines: { use: [{ id: 'dime', lines: [{ by: 'aside', text: 'You feed it a dime. Same steel guitar.' }] }] },
}

export const airman: Ambient = {
  id: 'airman',
  kind: 'person',
  name: 'the airman at the jukebox',
  at: [barNight],
  lines: { bark: [{ id: 'again', lines: [{ by: 'them', text: 'Who keeps playing this one?' }] }] },
}

export const fixture: readonly Ambient[] = [bartender, jukebox, airman]

export const threads: readonly Thread[] = [
  {
    id: 'shift',
    at: barNight,
    plants: 'airmen drink here',
    paysOff: 'Act 1: Flood',
    lines: [
      { who: 'airman', text: 'Shift change at six.' },
      { who: 'bartender', text: 'Then you have time for one more.' },
    ],
  },
]
