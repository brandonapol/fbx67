import type { Scene } from '../types.ts'
import { N } from '../names.ts'
import { addEvidence, eliTrust, heat, joan, mom, pipe, set } from '../state.ts'

const act = 'Act 1: Flood' as const

export const act1: readonly Scene[] = [
  {
    id: 'a1_flood',
    act,
    title: 'Drowned Town',
    text: () => `
You are ${N.wade} Pruett. August 1967. Most of Fairbanks is underwater, and the Air Force has trucked half of Eielson into town to help.

Your sergeant puts you on a sandbag line. Across the street, a riverboat is pulling elders off a porch. The man at the tiller is about your age, and he's shorthanded.`,
    choices: () => [
      { label: 'Stay on the sandbag line. Orders are orders.', next: 'a1_body' },
      { label: 'Wade over and help the riverboat.', apply: eliTrust(1), next: 'a1_body' },
    ],
  },
  {
    id: 'a1_body',
    act,
    title: 'The Cabin',
    text: (s) => `
${s.eliTrust > 0 ? 'The boatman, Eli, owes you one.' : 'That evening the boatman, Eli, needs a strong back and your sergeant lends you out.'} He knows every slough in the flood. Near a half-sunk cabin on the edge of town, his pole knocks something soft.

It's a man, held under by a line tied to a drowned sawhorse. It's the geologist you met at the bar in July. Owen.

The line is tied off in a cowboy bowline, the backward way your uncle's ranch hands tied them back home.`,
    choices: () => [
      { label: 'Point out the knot to Eli. Nobody tangles into a bowline.', apply: pipe(addEvidence('knot'), eliTrust(1)), next: 'a1_ruling' },
      { label: 'Say nothing. Cut him loose and get him to the hospital.', apply: addEvidence('knot'), next: 'a1_ruling' },
    ],
  },
  {
    id: 'a1_ruling',
    act,
    title: 'An Accident',
    text: () => `
${N.barnette} of the State Troopers has six drownings and a town underwater. He looks at Owen for about a minute.

"Tangled in a line in the current. Accident." He signs it and moves on.

At the hospital, a nurse named ${N.joan} is cleaning up in a hallway full of cots.`,
    choices: () => [
      { label: 'Ask Joan if anything about the body looked wrong.', apply: pipe(addEvidence('bruising'), joan(1)), next: 'a1_lucy' },
      { label: 'Make her laugh. She looks like she needs it.', apply: joan(2), next: 'a1_lucy' },
    ],
  },
  {
    id: 'a1_lucy',
    act,
    title: 'The Land Office',
    text: (s) => `
${s.evidence.includes('bruising') ? 'Joan lowers her voice: bruises on his left shoulder and neck, like a hand held him down. A left hand. ' : ''}Eli takes you to the land office, where his sister ${N.lucy} is hauling wet ledgers up a staircase.

She doesn't believe the accident ruling for a second. Owen was coming to see her the night he drowned.

"The survey he was doing relied on Air Force aerial photographs," she says. "The originals are on your base. I can't get onto your base."

She looks at you a beat too long.`,
    choices: () => [
      { label: '"I can get you the photos."', apply: eliTrust(1), next: 'a1_barfight' },
      { label: '"I don\'t know. I could get in a lot of trouble."', next: 'a1_barfight' },
    ],
  },
  {
    id: 'a1_barfight',
    act,
    title: 'Saturday at the Silver Pan',
    text: () => `
The water goes down. The mud doesn't. Saturday night ${N.bar} is packed: Curly at the bar, ${N.jake} the bush pilot folded into a booth, Eli nursing a soda.

A drunk calls Eli something ugly. Eli doesn't move. You do.

The floor is slick with mud. There's a hot stove, a moose rack on the wall, and a lot of bottles.`,
    choices: () => [
      { label: 'Shove him into the stove.', next: 'a1_tank' },
      { label: 'Grab the moose rack off the wall.', next: 'a1_tank' },
      { label: 'Break a bottle and hope that ends it.', apply: heat(1), next: 'a1_tank' },
    ],
  },
  {
    id: 'a1_tank',
    act,
    title: 'The Drunk Tank',
    text: () => `
It does not end it. The whole bar picks sides. Eli pulls you out from under three men, and ${N.cop} of Fairbanks PD hauls you, Eli, and Curly Boone in together. The officer knows Curly by name.

In the morning ${N.barnette} comes to the cell. He wants to know who started it, and why a Texan airman is running around with Curly Boone and "the river Indian."

"Give me a name and you walk."`,
    choices: () => [
      { label: 'Cover for Eli. "I started it."', apply: pipe(set({ barfight: 'coverEli' }), eliTrust(2), heat(1)), next: 'a1_ashby' },
      { label: 'Blame Eli. "He threw the first punch."', apply: pipe(set({ barfight: 'blameEli' }), eliTrust(-3)), next: 'a1_ashby' },
      { label: 'Side with Curly. "Ask Curly. He saw it."', apply: pipe(set({ barfight: 'sideCurly' }), heat(1)), next: 'a1_ashby' },
    ],
  },
  {
    id: 'a1_ashby',
    act,
    title: 'A Friend in Town',
    text: (s) => `
${s.barfight === 'blameEli' ? 'Eli stays in the cell when they let you out. He does not look at you.' : s.barfight === 'sideCurly' ? 'Curly claps you on the back on the way out. Barnette writes your name next to his.' : 'Barnette lets you both go, but he writes your name down.'}

A man in a good coat is waiting at the desk. ${N.ashby}, attorney. He paid your fine.

"Owen spoke well of you," he says. "He spoke well of everybody. I'm trying to finish what he started for the Native families. If you ever need anything, you come see me."`,
    choices: () => [{ label: 'Thank him.', next: 'a1_letter' }],
  },
  {
    id: 'a1_letter',
    act,
    title: 'Letter Home',
    text: () => `
Dear Mama,

You sit on your bunk with a pen. Mama will want to know about the flood. You are not sure how much to tell her about the dead man, the fight, or the night in jail.`,
    choices: () => [
      { label: 'Tell her all of it. The body, the fight, the jail.', apply: mom('honest'), next: 'a2_photos' },
      { label: 'Tell her about the flood and that you made some friends.', apply: mom('soft'), next: 'a2_photos' },
      { label: 'Tell her it\'s boring up here and you\'re fine.', apply: mom('lie'), next: 'a2_photos' },
    ],
  },
]
