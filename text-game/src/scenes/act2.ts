import { N } from '../names.ts'
import { addEvidence, eliTrust, has, heat, mom, pipe, set } from '../state.ts'
import type { Choice, Scene, State } from '../types.ts'
import { askGossip, gossip } from './gossip.ts'

const act = 'Act 2: Freeze-up' as const

const coChoices = (_: State): readonly Choice[] => [
  { label: 'Do it.', next: 'a2_co_heist' },
  { label: 'Refuse. That\'s your own CO. You\'d hang for it.', apply: set({ coJob: 'lucy' }), next: 'a2_co_lucy' },
]

const heatChoices = (_: State): readonly Choice[] => [
  { label: 'Lie low until Lucy\'s flight. Play some gigs, be seen being boring.', apply: heat(-2), next: 'a3_camp' },
  { label: 'Keep digging. There isn\'t time to be careful.', next: 'a3_camp' },
]

export const act2: readonly Scene[] = [
  {
    id: 'a2_major',
    act,
    title: 'The Major',
    text: (s) => `
September. Ice in the puddles by morning. ${N.co}, your squadron commander, calls you into his office. He's friendly. There's a photo of a boat on his desk and a Florida retirement brochure under his coffee cup.

${s.momHonesty > 0 ? '"Heard you spent a night in the Fairbanks drunk tank, Pruett." You freeze. Ashby made sure there was no record of that. The only place you ever wrote it down was a letter to your mother.' : '"Heard you\'ve made some friends in town, Pruett. Native kids. A land office girl." He smiles. "Good to get off base."'}

"Keep your nose clean," he says. "Two years and I'm fishing in the Keys."`,
    choices: () => [{ label: '"Yes, sir."', next: 'a2_photos' }],
  },
  {
    id: 'a2_photos',
    act,
    title: 'The Photo Lab',
    text: () => `
Lucy needs the aerial photographs Owen worked from, and they are in a records room behind the base photo lab.

You know the lab clerk takes a long lunch. You also know the duty sergeant locks up at 1700 sharp.`,
    choices: () => [
      { label: 'Go in during the clerk\'s lunch.', next: 'a2_photos_files' },
      { label: 'Go in after lockup with a borrowed key.', apply: heat(1), next: 'a2_photos_files' },
      { label: 'Refuse. It isn\'t worth a court-martial for some old pictures.', apply: eliTrust(-1), next: 'a2_hotel' },
    ],
  },
  {
    id: 'a2_photos_files',
    act,
    title: 'Flight Lines',
    text: () => `
The records room is floor-to-ceiling drawers. The photos are filed by flight line and frame number, and the index card for the river north of town lists three drawers.`,
    choices: () => [
      { label: 'Cross-check the frame numbers against the map grid first. You only pull what you need, but it takes most of his lunch.', apply: pipe(addEvidence('aerialPhotos'), heat(1)), next: 'a2_hotel' },
      { label: 'Pull all three drawers fast and sort it out later. It\'ll leave a mess somebody notices.', apply: pipe(addEvidence('aerialPhotos'), heat(2)), next: 'a2_hotel' },
    ],
  },
  {
    id: 'a2_hotel',
    act,
    title: 'The Hotel Bar',
    text: (s) => `
${has(s, 'aerialPhotos') ? 'Lucy spreads the photos across her kitchen table next to Owen\'s survey grid. The best crossing on the whole river runs straight through her family\'s fish camp. She goes quiet for a long time.' : 'Lucy doesn\'t say anything when you tell her no. She just nods, and finds another way to get a set of the photos. It takes her a month.'}

October. Lucy wants ears in the hotel bar downtown, where ${N.councilman} drinks with men from Outside. A uniform with a guitar can sit in the corner. A Native woman asking questions cannot.`,
    choices: () => [
      { label: 'Bring your guitar. Play in the corner and listen.', apply: addEvidence('hotelTalk'), next: 'a2_hotel_heard' },
      { label: 'Skip it. You\'ve been seen too much lately.', apply: heat(-1), next: 'a2_co_ask' },
    ],
  },
  {
    id: 'a2_hotel_heard',
    act,
    title: 'Half a Conversation',
    text: () => `
Under the music you catch half of it. Tolliver, the councilman, red in the face: "...my land, my title, been my land since '52..." The other man is quieter, with his back to you, and you never see his face. "...after the claims settle it won't matter whose title it is. Before is what counts."

Tolliver sounds like a man with a lot to lose. You can't tell if any of it means anything.`,
    choices: () => [{ label: 'Pack up and go tell Lucy.', next: 'a2_co_ask' }],
  },
  {
    id: 'a2_co_ask',
    act,
    title: 'The Major\'s Office',
    text: (s) => `
${has(s, 'hotelTalk') ? 'Lucy makes you repeat the quiet man\'s words twice. "Before is what counts. Somebody knows the timing of the claims better than Tolliver does."\n\n' : ''}Lucy has been reading Owen's flight logs. Every survey charter he flew had to be cleared through Eielson's airspace control. The base knew his schedule all summer. Somebody on the base knew where Owen would be.

She wants the files in your commander's office. ${N.co} keeps a locked cabinet he never lets the clerk touch.

"I'm not asking you to steal," she says. "I'm asking you to look."`,
    choices: (s) => [...coChoices(s), askGossip('a2_co_gossip')],
  },
  gossip('a2_co_gossip', act, (s) => coChoices(s)),
  {
    id: 'a2_co_heist',
    act,
    title: 'After Hours',
    text: () => `
The squadron building is dark except for the duty desk. The Major's cabinet has a combination lock. On his desk: the boat photo, the Florida brochure, and a desk calendar with a date two years out circled in red and marked RETIRE.`,
    choices: () => [
      { label: 'Try the circled retirement date as the combination.', apply: pipe(set({ coJob: 'wade' }), addEvidence('coFiles'), heat(1)), next: 'a2_co_found' },
      { label: 'Force the cabinet with a screwdriver. It\'ll leave marks.', apply: pipe(set({ coJob: 'wade' }), addEvidence('coFiles'), heat(2)), next: 'a2_co_found' },
    ],
  },
  {
    id: 'a2_co_found',
    act,
    title: 'What\'s in the Cabinet',
    text: () => `
The cabinet opens. Munitions sign-out sheets, flight schedules, typed pages that look like copies of letters, carbon copies of nothing in particular. There's too much to read by flashlight. You photograph all of it with Lucy's camera and put everything back.

You can't tell what any of it means. Lucy will have to read it.`,
    choices: () => [{ label: 'Get out.', next: 'a2_curly' }],
  },
  {
    id: 'a2_co_lucy',
    act,
    title: 'Lucy Goes Herself',
    text: () => `
Three nights later Lucy gets onto the base on her cousin's janitorial crew. She gets the files. She gets spotted on the way out.

By morning ${N.barnette} has a description: a Native woman seen leaving a squadron building on an Air Force base at night. He doesn't have a name yet. Lucy doesn't sleep at home for a week.`,
    choices: () => [
      { label: 'Continue.', apply: pipe(addEvidence('coFiles'), (s) => ({ ...s, lucyHeat: s.lucyHeat + 2 })), next: 'a2_curly' },
    ],
  },
  {
    id: 'a2_curly',
    act,
    title: 'The Airstrip',
    text: (s) => `
November. Planes are coming off floats and going onto skis, so nobody is flying anywhere for weeks. You find Curly at the bush strip lashing a tarp over a wing.

He ties it off without looking: a cowboy bowline, backward, the way the ranch hands did it.${has(s, 'knot') ? '\n\nYou have seen that knot before. Tied to a drowned sawhorse.' : ''}

"Wade! Come by Saturday, we'll get a steak. My treat. Money's good this year."`,
    choices: () => [
      { label: 'Take him up on it.', apply: addEvidence('curlyKnot'), next: 'a2_steak' },
      { label: 'Make an excuse.', apply: addEvidence('curlyKnot'), next: 'a2_jake' },
    ],
  },
  {
    id: 'a2_steak',
    act,
    title: 'Steak at the Pan',
    text: () => `
Saturday, Curly pays for two T-bones out of a roll of twenties thick enough to choke a dog. He talks about Texas, about a boat he's going to buy, about getting out before the next winter.

He only mentions Owen once. "Good man. Shame what the water did." He says it the way you'd say it about weather, and changes the subject.`,
    choices: () => [{ label: 'Continue.', next: 'a2_jake' }],
  },
  {
    id: 'a2_jake',
    act,
    title: 'Jake',
    text: () => `
${N.jake} catches you outside the hangar where he does contract maintenance for the base. He's six foot seven and has to duck under the door. Bush pilot, mechanic, straight arrow. His uncle is Ray Tolliver, the councilman, and he'll tell you himself that they don't talk.

"Curly got drunk with me Thursday," he says. "Said he's got money coming, enough to get out of Alaska for good. Said some people in this town are going to be real sorry they know his name. I don't like it."

He rubs the back of his neck. "A man in over his head like that, whoever's paying him won't want him around long. Somebody ought to tell somebody who can keep an eye on him. Not me. I fix airplanes."`,
    choices: () => [
      { label: 'Tell Lucy everything Jake said.', apply: set({ curlyPlan: 'warn' }), next: 'a2_flight' },
      { label: 'Go confront Curly yourself.', apply: set({ curlyPlan: 'confront' }), next: 'a2_confront' },
      { label: 'Let it go. Curly talks big when he drinks.', apply: set({ curlyPlan: 'ignore' }), next: 'a2_flight' },
    ],
  },
  {
    id: 'a2_confront',
    act,
    title: 'Steak Night',
    text: () => `
You ask Curly straight out where his money is coming from. The smile stays on his face but leaves his eyes.

"Texas boys stick together, Wade. Don't make me wonder about you."`,
    choices: (s) => [
      ...(has(s, 'knot') ? [{ label: 'Lean on him: "I saw how that line was tied on Owen, Curly."', next: 'a2_confront_knot' }] : []),
      { label: 'Let it drop. Eat your steak.', next: 'a2_flight' },
    ],
  },
  {
    id: 'a2_confront_knot',
    act,
    title: 'Steak Night',
    text: () => `
Curly sets his fork down very carefully.

"Lot of men tie a knot like that, Wade. Lot of Texans." He picks up the check and leaves before his steak comes. You have the feeling you just made a mistake.`,
    choices: () => [{ label: 'Continue.', next: 'a2_flight' }],
  },
  {
    id: 'a2_flight',
    act,
    title: 'The Flight',
    text: (s) => `
The skis are on. Jake will fly Lucy up to Owen's camp the first clear week: December 12th. She'll dig up what Owen hid and fly it home.

${s.eliTrust > 0 ? 'She tells three people: Eli, Jake, and you.' : 'She doesn\'t want to tell you. But Jake needs a hand loading the plane the night before, and Eli says you\'re the only one with a truck pass for the strip. So she tells three people: Eli, Jake, and you.'}

${s.coJob ? 'She hasn\'t finished reading the Major\'s files. There is a lot of it.' : ''}`,
    choices: () => [{ label: 'Go home and write to Mama.', next: 'a2_letter_work' }],
  },
  {
    id: 'a2_letter_work',
    act,
    title: 'Letter Home: Work',
    text: () => `
Dear Mama,

First, the base. You've had a strange fall.`,
    choices: () => [
      { label: 'Tell her you\'ve been doing things you shouldn\'t, for a good reason.', apply: mom('honest'), next: 'a2_letter_friends' },
      { label: 'Tell her the work is cold and dull.', apply: mom('soft'), next: 'a2_letter_friends' },
      { label: 'Tell her you might make Airman First Class early.', apply: mom('lie'), next: 'a2_letter_friends' },
    ],
  },
  {
    id: 'a2_letter_friends',
    act,
    title: 'Letter Home: Friends',
    text: () => `
Then your friends. Mama always asks if you're eating and who you eat with.`,
    choices: () => [
      { label: 'Tell her about Eli and Lucy, and that Lucy\'s flying north on the 12th to finish what Owen started.', apply: pipe(mom('honest'), set({ leakedFlightDate: true })), next: 'a2_heat' },
      { label: 'Tell her about Eli and Lucy, but nothing about the flight.', apply: mom('soft'), next: 'a2_heat' },
      { label: 'Tell her you mostly keep to yourself.', apply: mom('lie'), next: 'a2_heat' },
    ],
  },
  {
    id: 'a2_heat',
    act,
    title: 'Before the Dark',
    text: (s) => `
${s.heat >= 3 ? `${N.barnette} pulls you over on the Richardson Highway in a borrowed truck for no reason at all and searches it. He finds nothing. "You and Boone and that land office girl," he says. "I'm watching all three of you."${s.heat > 3 ? ' He leans in the window. "Next time you tell me something, Pruett, I won\'t believe a word of it."' : ''}\n\n` : ''}December is coming. The sun is barely up for four hours. You could keep your head down for a while.`,
    choices: (s) => [...heatChoices(s), askGossip('a2_heat_gossip')],
  },
  gossip('a2_heat_gossip', act, (s) => heatChoices(s)),
]
