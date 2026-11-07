import type { Scene } from '../types.ts'
import { N } from '../names.ts'
import { addEvidence, eliTrust, has, heat, mom, pipe, set } from '../state.ts'

const act = 'Act 2: Freeze-up' as const

export const act2: readonly Scene[] = [
  {
    id: 'a2_photos',
    act,
    title: 'The Photo Lab',
    text: () => `
September. Ice in the puddles by morning. Lucy needs the aerial photographs Owen worked from, and they are in a records room behind the base photo lab.

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
      { label: 'Cross-check the frame numbers against the map grid first.', apply: pipe(addEvidence('aerialPhotos'), heat(1)), next: 'a2_hotel' },
      { label: 'Pull all three drawers fast and sort it out later.', apply: pipe(addEvidence('aerialPhotos'), heat(2)), next: 'a2_hotel' },
    ],
  },
  {
    id: 'a2_hotel',
    act,
    title: 'The Hotel Bar',
    text: (s) => `
${has(s, 'aerialPhotos') ? 'Lucy spreads the photos across her kitchen table and goes quiet for a long time. She says they will matter. She does not say how yet.' : 'Lucy does not say anything when you tell her no. She just nods.'}

October. Lucy wants ears in the hotel bar downtown, where ${N.councilman} drinks with men from Outside. A uniform can sit at the bar. A Native woman asking questions cannot.`,
    choices: () => [
      { label: 'Bring the guitar. Play in the corner and listen.', apply: addEvidence('hotelTalk'), next: 'a2_hotel_heard' },
      { label: 'Skip it. You\'ve been seen too much lately.', apply: heat(-1), next: 'a2_co_ask' },
    ],
  },
  {
    id: 'a2_hotel_heard',
    act,
    title: 'Half a Conversation',
    text: () => `
Under the music you catch half of it. Tolliver, the councilman, red in the face: "...my land, my title, been my land since '52..." The other man is quieter, and you never see his face. "...after the claims settle it won't matter whose title it is. Before is what counts."

It sounds like the councilman is the one behind this. You can't tell if any of it means anything.`,
    choices: () => [{ label: 'Pack up and go tell Lucy.', next: 'a2_co_ask' }],
  },
  {
    id: 'a2_co_ask',
    act,
    title: 'The Major\'s Office',
    text: () => `
Lucy has been asking the wrong question, she says. The question isn't who wants the land. It's who on the base is talking to whoever wants it. Somebody knew where Owen would be that night.

She wants the files in your commander's office. ${N.co} keeps a locked cabinet he never lets the clerk touch.

"I'm not asking you to steal," she says. "I'm asking you to look."`,
    choices: () => [
      { label: 'Do it.', next: 'a2_co_heist' },
      { label: 'Refuse. That\'s your own CO. You\'d hang for it.', apply: set({ coJob: 'lucy' }), next: 'a2_co_lucy' },
    ],
  },
  {
    id: 'a2_co_heist',
    act,
    title: 'After Hours',
    text: () => `
The squadron building is dark except for the duty desk. The Major's cabinet has a combination lock. On his desk there's a calendar, a framed photo of a boat, and a retirement brochure for Florida.`,
    choices: () => [
      { label: 'Try his retirement date from the calendar as the combination.', apply: pipe(set({ coJob: 'wade' }), addEvidence('coFiles'), heat(1)), next: 'a2_co_found' },
      { label: 'Force the cabinet with a screwdriver.', apply: pipe(set({ coJob: 'wade' }), addEvidence('coFiles'), heat(2)), next: 'a2_co_found' },
    ],
  },
  {
    id: 'a2_co_found',
    act,
    title: 'What\'s in the Cabinet',
    text: () => `
The cabinet opens. Munitions sign-out sheets, flight schedules, routine letters, carbon copies of nothing in particular. You photograph all of it with Lucy's camera and put everything back.

You can't tell what any of it means. Lucy will have to read it.`,
    choices: () => [{ label: 'Get out.', next: 'a2_curly' }],
  },
  {
    id: 'a2_co_lucy',
    act,
    title: 'Lucy Goes Herself',
    text: () => `
Three nights later Lucy gets onto the base with a cleaning crew. She gets the files. She gets spotted on the way out.

By morning ${N.barnette} has a description: a Native woman seen leaving a squadron building on an Air Force base at night. He doesn't have a name yet. Lucy doesn't sleep at home for a week.`,
    choices: () => [
      { label: 'Go find her.', apply: pipe(addEvidence('coFiles'), (s) => ({ ...s, lucyHeat: s.lucyHeat + 2 })), next: 'a2_curly' },
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
      { label: 'Take him up on it.', apply: addEvidence('curlyKnot'), next: 'a2_jake' },
      { label: 'Make an excuse.', apply: addEvidence('curlyKnot'), next: 'a2_jake' },
    ],
  },
  {
    id: 'a2_jake',
    act,
    title: 'Jake',
    text: () => `
${N.jake} catches you outside the hangar where he does contract work for the base. He's six foot seven and has to duck under the door.

"Curly got drunk with me Thursday," he says. "Said he's got money coming, enough to get out of Alaska for good. Said some people in this town are going to be real sorry they know his name. I don't like it."`,
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

"Texas boys stick together, Wade. Don't make me wonder about you."

He picks up the check and leaves early.`,
    choices: () => [{ label: 'Go see Lucy.', next: 'a2_flight' }],
  },
  {
    id: 'a2_flight',
    act,
    title: 'Owen\'s Letter',
    text: (s) => `
Lucy shows you a letter. It's from Owen, mailed the morning before the flood. He cached his real notes at the survey camp north of town${s.owenCache === 'stove' ? ', under the floor behind the cook-tent stove' : s.owenCache === 'cache' ? ', in the old meat cache on stilts' : ', in an ammo can under the survey marker'}.

"Whoever killed him took everything at his camp," she says. "But not that."

Jake will fly her up the first clear week after the skis go on. December 12th. She tells three people: Eli, Jake, and you.${s.coJob === 'wade' || s.coJob === 'lucy' ? '\n\nShe hasn\'t finished reading the Major\'s files. There is a lot of it.' : ''}`,
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
${s.heat >= 3 ? `${N.barnette} pulls you over on the Richardson Highway for no reason at all and searches your truck. He finds nothing. "You and Boone and that land office girl," he says. "I'm watching all three of you."\n\n` : ''}December is coming. The sun is barely up for four hours. You could keep your head down for a while.`,
    choices: () => [
      { label: 'Lie low until Lucy\'s flight. Play some gigs, be seen being boring.', apply: heat(-2), next: 'a3_camp' },
      { label: 'Keep digging. There isn\'t time to be careful.', next: 'a3_camp' },
    ],
  },
]
