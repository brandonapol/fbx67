import type { Scene } from '../types.ts'
import { N } from '../names.ts'
import { addEvidence, eliTrust, heat, joan, mom, pipe, set } from '../state.ts'

const act = 'Act 1: Flood' as const

export const act1: readonly Scene[] = [
  {
    id: 'a1_flood',
    act,
    title: 'Wade: Drowned Town',
    text: () => `
You are ${N.wade} Pruett: nineteen, Air Force munitions, a long way from Texas. August 1967. Most of Fairbanks is underwater, and the Air Force has trucked half of Eielson into town to help.

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
${s.eliTrust > 0 ? 'The boatman, Eli, owes you one, and he says so.' : 'That evening the boatman, Eli, needs a strong back, and your sergeant lends you out.'} Eli runs freight on the river between Fairbanks and the villages. His family is Lower Tanana, out of Minto, and he grew up on these rivers. Near a half-sunk cabin on the edge of town, his pole knocks something soft.

It's a man, held under by a yellow braided line tied to a drowned sawhorse. It's the geologist you met at the bar in July. Owen.

The line is tied off in a bowline, but backward, the tail sitting outside the loop. You learned your knots tying up your cousins' boat on the reservoir, and every bowline you ever saw there had the tail inside. Somebody tied this one, and tied it his own way.`,
    choices: () => [
      { label: 'Point out the knot to Eli. Nobody tangles into a bowline.', apply: pipe(addEvidence('knot'), eliTrust(1)), next: 'a1_knot' },
      { label: 'Say nothing. Cut the line on both sides of the knot, pocket it, and get him to the hospital.', apply: addEvidence('knot'), next: 'a1_ruling' },
    ],
  },
  {
    id: 'a1_knot',
    act,
    title: 'Eli Looks',
    text: () => `
Eli looks at the knot for a long time.

"Nobody ties himself to a sawhorse," he says quietly. "Don't untie that, Texas."

You cut the line a hand's width above the knot and a hand's width below, so it stays tied, and put it in your jacket pocket.`,
    choices: () => [{ label: 'Help Eli lift Owen\'s body into the boat.', next: 'a1_ruling' }],
  },
  {
    id: 'a1_ruling',
    act,
    title: 'An Accident',
    text: () => `
${N.barnette} of the State Troopers has six drownings and a town underwater. He's a Barnette, yes, those Barnettes: his grandfather founded this town, and when the old man's bank went under with everybody's money, a jury acquitted him and he left town in disgrace anyway. Vernon has spent his life being the opposite. He looks at Owen for about a minute.

"Tangled in a line in the current. Accident." He signs it and moves on. He never asks about the line. The piece with the knot in it stays in your pocket.

St. Joseph's took water on the first floor and moved most of its patients out. In what's left, a nurse named ${N.joan} is cleaning up in a hallway full of cots.`,
    choices: () => [
      { label: 'Ask Joan if anything about the body looked wrong.', apply: pipe(addEvidence('bruising'), joan(1)), next: 'a1_joan_ask' },
      { label: 'Make her laugh. She looks like she needs it.', apply: pipe(addEvidence('bruising'), joan(2)), next: 'a1_joan_laugh' },
    ],
  },
  {
    id: 'a1_joan_ask',
    act,
    title: 'Joan',
    text: () => `
Joan lowers her voice. Bruises on his left shoulder and the side of his neck, she says, like a hand held him down. A left hand, from behind. "Nobody asked me," she says. "So I didn't say."`,
    choices: () => [{ label: 'Continue.', next: 'a1_lucy' }],
  },
  {
    id: 'a1_joan_laugh',
    act,
    title: 'Joan',
    text: () => `
She laughs despite herself. As you're leaving she catches your sleeve.

"Your friend from the cabin. He had bruises on his left shoulder and neck, like somebody's left hand held him down. Nobody asked me. I thought somebody should know."`,
    choices: () => [{ label: 'Continue.', next: 'a1_lucy' }],
  },
  {
    id: 'a1_lucy',
    act,
    title: 'The Land Office',
    text: () => `
Eli takes you to the land office, where his sister ${N.lucy} is hauling wet ledgers up a staircase. You light a cigarette. She takes it out of your mouth and drops it in a puddle without a word.

She doesn't believe the accident ruling for a second. Owen was coming to see her the night he drowned. He'd written to her twice in July: he hid his real notes at his survey camp north of town, and he was bringing her copies. The copies are gone. Owen flew in and out on amphibian floats, landing on their wheels on a gravel bar the flood has scoured away, and the camp is forty miles from any river a boat can run. Until the creek freezes hard enough for a plane on skis, nobody is getting in.

"He was working with a lawyer, ${N.ashby}, on our family's claim," she says. "Mr. Ashby's taken it over. But I need to know which crossings Owen meant, and his survey used Air Force aerial photographs. The base photo lab kept the only full set of prints in Alaska. I can't get onto your base."

She looks at you a beat too long.`,
    choices: () => [
      { label: '"I can get you Owen\'s aerial photos."', apply: eliTrust(1), next: 'a1_barfight' },
      { label: '"I don\'t know. I could get in a lot of trouble."', next: 'a1_barfight' },
    ],
  },
  {
    id: 'a1_barfight',
    act,
    title: 'Saturday at the Silver Pan',
    text: () => `
The water goes down. The mud doesn't. Saturday night the Silver Pan is packed: Curly at the bar, ${N.jake} the bush pilot folded into a booth, Eli nursing a soda.

${N.bartender} has run the Pan since statehood. He slides you a beer and gives you the speech he gives every new airman, whether they want it or not.

"Three things about this town, son. One: the law keeps score. Every time a Trooper hears your name, he believes you a little less, and once he's done believing you, he's done. Two: people here remember who stood with them and who didn't. Three: nothing you say stays where you said it. Dottie down at the Northern Lights Café hears it all by morning. You ever want to know where you stand, buy a cup of her coffee and ask."

He wipes the bar. "That's the speech. Drink your beer."

A drunk calls Eli something ugly. Eli doesn't move. The drunk shoves him.

The floor is slick with mud. There's a hot stove, a moose rack on the wall, and a lot of bottles.`,
    choices: () => [
      { label: 'Shove the drunk into the stove.', next: 'a1_tank' },
      { label: 'Grab the moose rack off the wall.', next: 'a1_tank' },
      { label: 'Break a bottle and hope that ends it.', apply: heat(1), next: 'a1_tank' },
      { label: 'Stay in your seat. Not your fight.', apply: eliTrust(-1), next: 'a1_tank_sat' },
    ],
  },
  {
    id: 'a1_tank_sat',
    act,
    title: 'Not Your Fight',
    text: () => `
You stay in your seat. Eli takes the first punch alone. Then Curly Boone comes off his stool yelling "Texas!" and drags you in by the collar, and it's everybody's fight.`,
    choices: () => [{ label: 'Continue.', next: 'a1_tank' }],
  },
  {
    id: 'a1_tank',
    act,
    title: 'The Drunk Tank',
    text: () => `
The whole bar picks sides. Curly jumps in on yours, roaring about Texas. ${N.cop} of Fairbanks PD hauls you, Eli, and Curly out to the car. He knows Curly by name. On the way, Curly presses a folded twenty into the officer's hand, friendly as anything. The officer tucks it back into Curly's shirt pocket without looking at it and shuts the door.

In the morning ${N.barnette} comes to the cell. He wants to know who started it, and why a Texan airman is running around with Curly Boone and "the river Indian."

"Give me a name and you walk."`,
    choices: () => [
      { label: 'Cover for Eli. "I started it." Barnette won\'t forget your name.', apply: pipe(set({ barfight: 'coverEli' }), eliTrust(2), heat(1)), next: 'a1_ashby' },
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

A man in a good coat is at the desk, talking Barnette down in a calm voice until Barnette tears up the charge sheet. ${N.ashby}, attorney. He paid your fine, and there's no record.

"Owen spoke well of you," he says. You met Owen exactly once. "He spoke well of everybody. I'm finishing what he started for the Native families. With these claims, timing is everything." He gives you his card. "If you ever need anything, you come see me."`,
    choices: () => [{ label: 'Thank him.', next: 'a1_letter' }],
  },
  {
    id: 'a1_letter',
    act,
    title: 'Letter Home',
    text: () => `
You sit on your bunk with a pen. Mama will want to know about the flood. You are not sure how much to tell her about the dead man, the fight, or the night in jail.

You write: "Dear Mama,"`,
    choices: () => [
      { label: 'Tell her all of it. The body, the fight, the jail.', apply: mom('honest'), next: 'a2_major' },
      { label: 'Tell her about the flood and that you made some friends.', apply: mom('soft'), next: 'a2_major' },
      { label: 'Tell her it\'s boring up here and you\'re fine.', apply: mom('lie'), next: 'a2_major' },
    ],
  },
]
