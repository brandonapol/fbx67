import type { Ambient, Bit } from './format.ts'

// The things Owen can use in the prologue (issue #42): the jukebox and the empty chair in the Silver Pan, and the
// reel-to-reel in his room. Same format as the town's people, with only `use` lines. Using a thing never changes
// State; it is texture, like the people's talk.

const aside = (id: string, text: string): Bit => ({ id, lines: [{ by: 'aside', text }] })

const thing = (t: Omit<Ambient, 'kind'>): Ambient => ({ kind: 'thing', ...t })

export const prologueThings: readonly Ambient[] = [
  thing({
    id: 'jukebox',
    name: 'the jukebox',
    at: [{ place: 'silverPan', from: '1967-07-14T22:30', to: '1967-07-15T01:00' }],
    lines: {
      use: [
        aside('dime', 'You feed it a dime and punch B7. Steel guitar, a little warped from the cold last winter.'),
        aside('polka', 'Your dime buys the polka somebody else picked. The airman at the jukebox groans.'),
        aside('coinReturn', 'It eats the dime. You thump the coin return. A nickel comes out that was never yours.'),
      ],
    },
  }),
  thing({
    id: 'chair',
    name: 'the empty chair',
    at: [{ place: 'silverPan', from: '1967-07-14T22:30', to: '1967-07-15T01:00' }],
    lines: {
      use: [
        aside('sit', 'You sit. The chair rocks on its short leg, and nobody looks over.'),
        aside('fold', 'You fold a matchbook under the short leg. It still rocks.'),
      ],
    },
  }),
  thing({
    id: 'reelToReel',
    name: 'the reel-to-reel',
    at: [{ place: 'owensRoom', from: '1967-07-15T00:00', to: '1967-07-15T01:30' }],
    lines: {
      use: [
        aside('play', 'You thread the tape. Your own voice reads stake numbers off a survey line, flat and tired.'),
        aside('rewind', 'The reels whine back to the start. You leave it there and listen to the street instead.'),
      ],
    },
  }),
]
