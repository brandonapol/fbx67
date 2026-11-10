import { N } from '../names.ts'
import { type BarfightMemory, hankRemembers, keyMissed, recordsOpen } from '../logic.ts'
import { addEvidence, eliTrust, has, heat, lucyHeat, mom, pipe, recordsLog, set } from '../state.ts'
import type { Choice, Scene, SceneId, State } from '../types.ts'
import { askGossip, gossip } from './gossip.ts'

const act = 'Act 2: Freeze-up' as const

const hank = N.bartenderShort

// The bartender brings the steaks himself, and he remembers what Wade did in his bar in August.
const hankAtTable: Readonly<Record<BarfightMemory, string>> = {
  shove: `There's a new sheet of tin nailed up behind the stove. "Fella you put into that stove bought himself a new coat," he says, with his back to ${N.curlyShort}. "Said to tell you it was a good one."`,
  mooseRack: `The moose rack is back over the door, one tine wired on. "Took two of us to hang it again," he says. "You held three men off with it and never swung it once." He sets an extra beer by your plate and doesn't charge for it.`,
  bottle: `He sets yours down a little hard. "That was the good rye you broke," he says. "Officer asked me who broke the bottle. I told him." He goes back behind the bar.`,
  seat: `He sets ${N.curlyShort}'s down first, then yours, and stands there a second. "You're the airman who stayed on his stool," he says, and goes back behind the bar.`,
}

// Where, when and what next (docs/story-api.md). Goals shared by a scene and its café visit, or by a scene pair.
const coGoal = 'Decide whether to search the Major\'s cabinet.'
const heatGoal = `Get through the dark to ${N.lucy}'s flight.`
const lucyNext = `See what ${N.lucy} needs next.`
const letterGoal = 'Write home to Mama.'
const recordsGoal = `Find what happened to your grandfather's allotment application.`

// Lucy's after-hours search runs only while she still has the land-office job (design: Systems > Lucy).
const afterMinto = (s: State): SceneId => (recordsOpen(s) ? 'a2_records' : 'a2_jake')

const heardAt = { place: 'hotelBar', clock: '1967-10-07T22:30', goal: `Pack up and tell ${N.lucy} what you heard.` } as const

// Eli's trip to Minto (a2_minto). What he did is the same whoever tells it; only the teller and the frame differ.
const mintoTrip = `The Tanana froze while ${N.eli} was in Minto. He rode down the week after the Chiefs meeting on the last barge of the year, with slush ice already running, and came home ten days later on the mail plane, on wheels, off the village strip. Nobody told you he was going.

${N.lucy}'s kitchen table is covered in it: a school notebook gone soft at the corners, carbon paper, and a stack of statements she has typed out clean at night, one for each elder. Each has a signature at the bottom, or a mark with two witnesses' names beside it.`

const mintoSat = 'He sat with the old people one at a time, in their houses, and let each of them talk until they were done: who fished the camp, which summers, where the racks stood, his grandfather\'s smokehouse, his mother as a girl cutting fish on the bank. Then he read it all back to them and asked if he had it right.'

const mintoTeller: Readonly<Record<'eli' | 'lucy', Readonly<{ opening: string; who: string; whose: string; closing: string }>>> = {
  eli: {
    opening: `${N.eli} tells it himself, at more length than you have ever heard from him outside the Chiefs meeting.`,
    who: 'he',
    whose: 'my',
    closing: `He squares the stack against the table and slides it back inside the notebook. ${N.lucy} is already reading the next page.`,
  },
  lucy: {
    opening: `${N.eli} doesn't look up from the notebook. ${N.lucy} tells it, while he checks her typing line by line against his own handwriting.`,
    who: 'she',
    whose: 'our',
    closing: `${N.eli} finds a word she typed wrong and hands the page back to her. He hasn't said a word to you.`,
  },
}

// The records room, by the clerk's lunch (a2_photos_files) or after the 1700 lockup (a2_photos_night). Same room,
// same drawers; only the clock differs, because each scene's clock is fixed (docs/story-api.md).
const photoFiles = {
  act,
  title: 'Flight Lines',
  place: 'photoRecords',
  goal: 'Find the frames of the river north of town.',
  text: () => `
The records room is floor-to-ceiling drawers. The photos are filed by flight line and frame number, and the index card for the river north of town lists three drawers.`,
  choices: () => [
    { label: 'Cross-check the frame numbers against the map grid first. You only pull what you need, but it takes time you might not have.', note: 'crossCheck', apply: pipe(addEvidence('aerialPhotos'), heat(1)), next: 'a2_hotel' },
    { label: 'Pull all three drawers fast and sort it out later. It\'ll leave a mess somebody notices.', note: 'pullAll', apply: pipe(addEvidence('aerialPhotos'), heat(2)), next: 'a2_hotel' },
  ],
} as const satisfies Omit<Scene, 'id' | 'clock'>

const coChoices = (_: State): readonly Choice[] => [
  { label: 'Search the Major\'s cabinet tonight.', note: 'search', next: 'a2_co_heist' },
  { label: 'Refuse. That\'s your own CO. You\'d hang for it.', note: 'refuse', apply: set({ coJob: 'lucy' }), next: 'a2_co_lucy' },
]

const heatChoices = (_: State): readonly Choice[] => [
  { label: 'Lie low until Lucy\'s flight. Play some gigs, be seen being boring.', note: 'lieLow', apply: heat(-2), next: 'a3_camp' },
  { label: 'Keep digging. There isn\'t time to be careful.', note: 'keepDigging', next: 'a3_camp' },
]

export const act2: readonly Scene[] = [
  {
    id: 'a2_major',
    act,
    title: 'The Major',
    place: 'majorsOffice',
    clock: '1967-09-12T08:30',
    goal: 'See what the Major wants.',
    text: (s) => `
September. Ice in the puddles by morning. ${N.co}, your squadron commander, calls you into his office. He's friendly. There's a photo of a boat on his desk and a Florida retirement brochure under his coffee cup.

${s.momHonesty > 0 ? '"Heard you spent a night in the Fairbanks drunk tank, Pruett." You freeze. Ashby made sure there was no record of that. The only place you ever wrote it down was a letter to your mother.' : '"Heard you\'ve made some friends in town, Pruett. Native kids. A land office girl." He smiles. "Good to get off base."'}

"Keep your nose clean," he says. "Two years and I'm fishing in the Keys."`,
    choices: () => [{ label: '"Yes, sir."', note: 'yesSir', next: 'a2_photos' }],
  },
  {
    id: 'a2_photos',
    act,
    title: 'The Photo Lab',
    place: 'photoLab',
    clock: '1967-09-14T11:30',
    goal: `Get ${N.lucy} the aerial photographs in the records room.`,
    text: () => `
Lucy needs the aerial photographs Owen worked from, and they are in a records room behind the base photo lab.

You know the lab clerk takes a long lunch. You also know the duty sergeant locks up at 1700 sharp.`,
    choices: () => [
      { label: 'Go in during the clerk\'s lunch.', note: 'lunch', apply: set({ photoLab: 'lunch' }), next: 'a2_photos_files' },
      { label: 'Go in after lockup with a borrowed key.', note: 'afterLockup', apply: set({ photoLab: 'key' }), next: 'a2_photos_night' },
      { label: 'Refuse. It isn\'t worth a court-martial for some old pictures.', note: 'refuse', apply: eliTrust(-1), next: 'a2_hotel' },
    ],
  },
  { id: 'a2_photos_files', ...photoFiles, clock: '1967-09-14T12:10' },
  { id: 'a2_photos_night', ...photoFiles, clock: '1967-09-14T21:00' },
  {
    id: 'a2_hotel',
    act,
    title: 'The Hotel Bar',
    place: 'lucysKitchen',
    clock: '1967-10-05T18:30',
    goal: `Listen in on ${N.tolliverLast} at the hotel bar.`,
    text: (s) => `
${has(s, 'aerialPhotos') ? 'Lucy spreads the photos across her kitchen table next to Owen\'s survey grid. The best gravel on the lower Chatanika, and the easiest place to put a pipe or a haul road across it, are both on her family\'s fish camp. She goes quiet for a long time.' : 'Lucy doesn\'t say anything when you tell her no. She just nods, and finds another way to get a set of the photos. It takes her a month.'}

October. Lucy wants ears in the hotel bar downtown, where ${N.councilman} drinks with men from Outside. A uniform with a guitar can sit in the corner. A Native woman asking questions cannot.`,
    choices: () => [
      { label: 'Bring your guitar. Play in the corner and listen.', note: 'guitar', next: 'a2_hotel_set' },
      { label: 'Skip it. You\'ve been seen too much lately.', note: 'skip', apply: heat(-1), next: 'a2_chiefs' },
    ],
  },
  {
    id: 'a2_hotel_set',
    act,
    title: 'The Corner',
    place: 'hotelBar',
    clock: '1967-10-07T20:30',
    goal: 'Play the corner and listen to the back booth.',
    text: () => `
The hotel bar is warm and half full: contractors from Outside waiting out freeze-up, two professors from the university over a chessboard, a waitress who calls everybody "dear." ${N.tolliver} has the back booth with a man in a gray suit who sits with his back to the room. He pays for each round out of a fold of new bills, in order, like he got them from the bank that morning. A gray-haired bush pilot at the bar watches him count them out and says to his glass, "Seen that kind of money before."

The bartender doesn't care where you play, as long as you play.`,
    choices: () => [
      { label: 'Take the stool by their booth and play the quiet ones.', note: 'sitClose', apply: addEvidence('hotelTalk'), next: 'a2_hotel_heard' },
      { label: 'Set up by the door and play what the room wants.', note: 'sitFar', next: 'a2_hotel_pieces' },
    ],
  },
  {
    id: 'a2_hotel_heard',
    act,
    title: 'Half a Conversation',
    ...heardAt,
    text: () => `
Under the music you catch half of it. Tolliver, the councilman, red in the face: "...my land, my title, been my land since '52..." The other man is quieter, with his back to you, and you never see his face. "...after the claims settle it won't matter whose title it is. Before is what counts."

Tolliver sounds like a man with a lot to lose. You can't tell if any of it means anything.`,
    choices: () => [{ label: 'Pack up and go tell Lucy.', note: 'tellLucy', next: 'a2_chiefs' }],
  },
  {
    id: 'a2_hotel_pieces',
    act,
    title: 'Half a Conversation',
    ...heardAt,
    text: () => `
From the door you catch pieces over your own playing. ${N.tolliverLast}'s voice carries when he's angry: "...my land..." and something about '52. The other man never raises his. Whatever he says, he says to ${N.tolliverLast} and nobody else.

Two hours and a sore hand, for a councilman complaining about his land.`,
    choices: () => [{ label: 'Pack up and go tell Lucy.', note: 'tellLucy', next: 'a2_chiefs' }],
  },
  {
    id: 'a2_chiefs',
    act,
    title: 'The Chiefs',
    place: 'communityHall',
    clock: '1967-10-21T14:00',
    goal: 'Hear what the Chiefs have to say.',
    text: (s) => `
${s.eliTrust <= -2 ? 'Lucy almost doesn\'t bring you. "Stand in the back," she says, "and don\'t talk."' : 'Lucy brings you to a meeting in a community hall on the edge of town. "Stand in the back," she says. "Listen."'}

It's the Tanana Chiefs: village chiefs and delegates from up and down the Tanana and the Yukon, folding chairs, a coffee urn, a map of the Interior taped to the wall with colored pins in it. The talk is about the land freeze, the claims, and how many families have fish camps and trapline cabins on land some white man in town holds the title to. You are the only uniform in the room.

An old man from Nenana reminds everyone that the Tanana chiefs sat down with Judge Wickersham in this same town in 1915, about this same land. "He told us to take allotments and become citizens," he says. "We have been filling out his papers for fifty years."

Then Eli stands up. In town, you've never heard him say more than ten words in a row. Here he speaks for his family: the fish camp, the application that vanished, the councilman's title, the ban that keeps him off his grandfather's ground. People nod. A woman writes it all down.

${N.ashby} is in the back row too, in his good coat, handing out cards. He catches your eye and nods, one friend of the families to another.`,
    choices: () => [
      { label: 'Stay in the back and listen.', note: 'listen', apply: eliTrust(1), next: 'a2_chiefs_after' },
      { label: 'Stand up and offer to help. You\'re the one with base access.', note: 'offerHelp', next: 'a2_chiefs_spoke' },
      { label: 'Slip out early. This isn\'t your room.', note: 'slipOut', apply: eliTrust(-1), next: 'a2_chiefs_after' },
    ],
  },
  {
    id: 'a2_chiefs_spoke',
    act,
    title: 'The Chiefs',
    place: 'communityHall',
    clock: '1967-10-21T16:30',
    goal: lucyNext,
    text: () => `
The room goes quiet while you talk. Somebody thanks you politely. The meeting moves on.

Outside, Lucy lights into you. "That wasn't your turn. Eli has waited years to say that in that room, and you made it about the airman." Eli doesn't say anything at all.`,
    choices: () => [{ label: 'Continue.', note: 'continue', apply: eliTrust(-1), next: 'a2_co_ask' }],
  },
  {
    id: 'a2_chiefs_after',
    act,
    title: 'The Chiefs',
    place: 'communityHall',
    clock: '1967-10-21T16:30',
    goal: lucyNext,
    text: (s) => `
${s.eliTrust > 0 ? 'Afterward, Eli finds you by the coffee urn. He doesn\'t say anything about the meeting. He just hands you a cup.' : 'Afterward, Eli is surrounded by people from the villages. He doesn\'t look your way.'}

Lucy watches the door Ashby went out. "He's been good to us," she says, to nobody in particular.`,
    choices: () => [{ label: 'Continue.', note: 'continue', next: 'a2_co_ask' }],
  },
  {
    id: 'a2_co_ask',
    act,
    title: 'The Major\'s Office',
    place: 'lucysKitchen',
    clock: '1967-10-24T17:30',
    goal: coGoal,
    text: (s) => `
${has(s, 'hotelTalk') ? 'Lucy makes you repeat the quiet man\'s words twice. "Before is what counts. Somebody knows the timing of the claims better than Tolliver does."\n\n' : ''}${s.eliTrust <= -2 ? 'Lucy doesn\'t like you, and she doesn\'t pretend to. But you\'re the only one she knows with a base pass.\n\n' : ''}Lucy has been going through Owen's paperwork. His access to the Air Force photographs was signed off by your squadron commander, and every survey report Owen filed went across that same desk. Somebody on the base knew exactly what Owen had found.

She wants the files in your commander's office. ${N.co} keeps a locked cabinet he never lets the clerk touch.

"I'm not asking you to steal," she says. "I'm asking you to look."`,
    choices: (s) => [...coChoices(s), askGossip('a2_co_gossip')],
  },
  { ...gossip('a2_co_gossip', act, (s) => coChoices(s)), place: 'nlCafe', clock: '1967-10-24T18:30', goal: coGoal },
  {
    id: 'a2_co_heist',
    act,
    title: 'After Hours',
    place: 'majorsOffice',
    clock: '1967-10-24T23:30',
    goal: 'Open the Major\'s cabinet.',
    text: () => `
The squadron building is dark except for the duty desk. The Major's cabinet has a combination lock. On his desk: the boat photo, the Florida brochure, and a desk calendar with a date two years out circled in red and marked RETIRE.`,
    choices: () => [
      { label: 'Try the circled retirement date as the combination.', note: 'combo', apply: pipe(set({ coJob: 'wade' }), addEvidence('coFiles'), heat(1)), next: 'a2_co_found' },
      { label: 'Force the cabinet with a screwdriver. It\'ll leave marks.', note: 'forced', apply: pipe(set({ coJob: 'wade' }), addEvidence('coFiles'), heat(2)), next: 'a2_co_found' },
    ],
  },
  {
    id: 'a2_co_found',
    act,
    title: 'What\'s in the Cabinet',
    place: 'majorsOffice',
    clock: '1967-10-24T23:50',
    goal: 'Put it all back and get out unseen.',
    text: () => `
The cabinet opens. Munitions sign-out sheets, flight schedules, typed pages that look like copies of letters, carbon copies of nothing in particular. There's too much to read by flashlight. You photograph all of it with Lucy's camera and put everything back.

You can't tell what any of it means. Lucy will have to read it.`,
    choices: () => [
      { label: 'Wait in the dark for the duty airman to finish his rounds, then get out.', note: 'getOut', next: 'a2_curly' },
      { label: 'Don\'t wait. Go now, while he\'s still on his rounds.', note: 'goNow', apply: heat(1), next: 'a2_co_seen' },
    ],
  },
  {
    id: 'a2_co_seen',
    act,
    title: 'The Duty Desk',
    place: 'squadronBuilding',
    clock: '1967-10-25T00:05',
    goal: 'Get back to your bunk.',
    text: () => `
The duty airman looks up from his comic book as a shape crosses the end of the hall. "Hey!" By the time he's around the desk you're out the side door and into the dark between the buildings.

He never saw your face. He'll write it in the duty log all the same: somebody in the squadron building after hours, headed for the side door.`,
    choices: () => [{ label: 'Continue.', note: 'continue', next: 'a2_curly' }],
  },
  {
    id: 'a2_co_lucy',
    act,
    title: 'Lucy Goes Herself',
    place: 'eielsonBarracks',
    clock: '1967-10-28T07:00',
    goal: `Keep your head down until ${N.lucy} can go home.`,
    text: () => `
Three nights later Lucy gets onto the base on her cousin's janitorial crew. She gets the files. She gets spotted on the way out.

By morning ${N.barnette} has a description: a Native woman seen leaving a squadron building on an Air Force base at night. He doesn't have a name yet. Lucy doesn't sleep at home for a week.`,
    choices: () => [
      { label: 'Continue.', note: 'continue', apply: pipe(addEvidence('coFiles'), lucyHeat(2)), next: 'a2_curly' },
    ],
  },
  {
    id: 'a2_curly',
    act,
    title: 'The Airstrip',
    place: 'bushStrip',
    clock: '1967-11-08T13:00',
    goal: `See how ${N.curlyShort} is doing.`,
    text: (s) => `
November. Planes are coming off floats and going onto skis, so nothing will fly out of the bush strip for weeks. You find Curly there lashing a tarp over a wing.

He ties it off without looking, with yellow braided line off a coil on his workbench: a bowline, backward, the tail outside the loop.${has(s, 'knot') ? '\n\nYou have seen that knot before. There\'s a piece of it in your footlocker, cut off a drowned sawhorse, in the same yellow line.' : ''}

"Wade! Come by Saturday, we'll get a steak. My treat. Money's good this year."`,
    choices: () => [
      { label: 'Take Curly up on the steak.', note: 'steak', apply: addEvidence('curlyKnot'), next: 'a2_steak' },
      { label: 'Make an excuse.', note: 'excuse', apply: addEvidence('curlyKnot'), next: 'a2_minto' },
    ],
  },
  {
    id: 'a2_steak',
    act,
    title: 'Steak at the Pan',
    place: 'silverPan',
    clock: '1967-11-11T19:00',
    goal: `Let ${N.curlyShort} do the talking.`,
    text: (s) => `
Saturday, Curly pays for two T-bones out of a roll of twenties thick enough to choke a dog. He talks about Texas, about a boat he's going to buy, about getting out before the next winter.

${hank} brings the plates himself. ${hankAtTable[hankRemembers(s)]}

${N.curlyShort} only mentions Owen once. "Good man. Shame what the water did." He says it the way you'd say it about weather, and changes the subject.`,
    choices: () => [{ label: 'Continue.', note: 'continue', next: 'a2_minto' }],
  },
  {
    // Eli's own trip (design: Eli's cast entry, Act 2). Wade isn't there; he hears it afterward, from Eli if Eli
    // trusts him, else from Lucy. It moves no gate, so it carries no state of its own.
    id: 'a2_minto',
    act,
    title: 'Minto',
    place: 'lucysKitchen',
    clock: '1967-11-13T19:00',
    goal: `Hear where ${N.eli} has been.`,
    text: (s) => {
      const teller = mintoTeller[s.eliTrust > 0 ? 'eli' : 'lucy']
      return `
${mintoTrip}

${teller.opening} ${mintoSat}

"Eleven," ${teller.who} says. "The oldest one remembers ${teller.whose} grandfather's father. The land office says the first application got lost. So we file a new one, with eleven names on it this time."

${teller.closing}`
    },
    choices: () => [{ label: 'Leave them to their work.', note: 'leave', next: afterMinto }],
  },
  {
    id: 'a2_records',
    act,
    title: 'Lucy: After Hours',
    place: 'landOffice',
    clock: '1967-11-14T21:30',
    goal: recordsGoal,
    text: () => `
You are ${N.lucy}. The land office closed at five. You stayed at your desk typing an abstract nobody needed until the supervisor put on his coat, lit the last cigarette of his day, and told you to lock up behind yourself. You turned the lights off when he left, and you haven't turned them back on. You have sat there while the Second Avenue foot traffic thinned out and the city patrol car made its pass along the front window.

The allotment files are in green steel drawers in the back, by serial number. You pull them all day for whoever asks. The folder with your grandfather's number on the tab has been empty since before you were hired, and the office's answer is the one families up and down the river have had for twenty years: lost.

Every file that leaves those drawers goes into the sign-out book at the counter first: who took it, the day, the day it came back. The old books are on the bottom shelf, swollen and wavy from August. Nobody reads that column but the clerk who writes in it.`,
    choices: () => [
      { label: 'Read at the counter by the streetlight through the front window.', note: 'streetlight', next: 'a2_records_log' },
      { label: 'Carry the old books into the map room, shut the door, and read by flashlight.', note: 'mapRoom', next: 'a2_records_log' },
    ],
  },
  {
    id: 'a2_records_log',
    act,
    title: 'Lucy: The Sign-Out Column',
    place: 'landOffice',
    clock: '1967-11-14T22:30',
    goal: 'Put it all back the way it was and lock up.',
    text: () => `
You know the year your grandfather filed. You turn to it and run your finger down the serial column until it stops on his number.

RECEIVED, and the office stamp beside it: June 3, 1948. Logged in by a clerk whose initials you know from a hundred other lines.

Three years on, the file goes out. March 1951. Where the name belongs there is a scrawl, two loops and a stroke, that could be anybody's. In the address column, Box 212, and no town. Fairbanks had a Box 212, and so did Anchorage and Juneau. The return column is empty. You turn forty more pages. It never comes back.

Nothing on the page says who wanted the file, or why. It says the office had it, and that somebody walked out the door with it.`,
    choices: () => [
      { label: 'Read the line once more. Put the book back on the bottom shelf, spine out the way it was, and lock up.', note: 'putBack', apply: recordsLog(1), next: 'a2_jake' },
    ],
  },
  {
    id: 'a2_jake',
    act,
    title: 'Jake',
    place: 'baseHangar',
    clock: '1967-11-17T11:00',
    goal: `Hear ${N.jake.split(' ')[0]} out.`,
    text: () => `
${N.jake} catches you outside the hangar where he does contract maintenance for the base. He's six foot seven and has to duck under the door. Bush pilot, mechanic, straight arrow. His uncle is ${N.tolliver}, the councilman, and he'll tell you himself that they don't talk.

"Curly got drunk with me Thursday," he says. "Said he's got money coming, enough to get out of Alaska for good. Said some people in this town are going to be real sorry they know his name. I don't like it."

He rubs the back of his neck. "A man in over his head like that, whoever's paying him won't want him around long. Somebody ought to tell somebody who can keep an eye on him. Not me. I fix airplanes."`,
    choices: () => [
      { label: 'Tell Lucy everything Jake said.', note: 'warn', apply: set({ curlyPlan: 'warn' }), next: 'a2_flight' },
      { label: 'Go confront Curly yourself.', note: 'confront', apply: set({ curlyPlan: 'confront' }), next: 'a2_confront' },
      { label: 'Let it go. Curly talks big when he drinks.', note: 'ignore', apply: set({ curlyPlan: 'ignore' }), next: 'a2_flight' },
    ],
  },
  {
    id: 'a2_confront',
    act,
    title: 'Steak Night',
    place: 'silverPan',
    clock: '1967-11-18T19:00',
    goal: `Get a straight answer out of ${N.curlyShort}.`,
    text: () => `
You ask Curly straight out where his money is coming from. The smile stays on his face but leaves his eyes.

"Texas boys stick together, Wade. Don't make me wonder about you."`,
    choices: (s) => [
      ...(has(s, 'knot') ? [{ label: 'Lean on him: "I saw how that line was tied on Owen, Curly."', note: 'leanOnHim', next: 'a2_confront_knot' } satisfies Choice] : []),
      { label: 'Let it drop. Eat your steak.', note: 'letDrop', next: 'a2_flight' },
    ],
  },
  {
    id: 'a2_confront_knot',
    act,
    title: 'Steak Night',
    place: 'silverPan',
    clock: '1967-11-18T19:15',
    goal: `Go see ${N.lucy}.`,
    text: () => `
Curly sets his fork down very carefully.

"Lot of men tie a knot like that, Wade." He picks up the check and leaves before his steak comes. You have the feeling you just made a mistake.`,
    choices: () => [{ label: 'Continue.', note: 'continue', next: 'a2_flight' }],
  },
  {
    id: 'a2_flight',
    act,
    title: 'The Flight',
    place: 'lucysKitchen',
    clock: '1967-11-25T16:00',
    goal: 'Go home and write to Mama.',
    text: (s) => `
The skis are on. Jake will fly Lucy up to Owen's camp the first clear week: December 12th. She'll dig up what Owen hid and fly it home.

${s.eliTrust > 0 ? 'She tells three people: Eli, Jake, and you.' : 'She doesn\'t want to tell you. But Jake needs a hand loading the plane the night before, and Eli says you\'re the only one with a truck pass for the strip. So she tells three people: Eli, Jake, and you.'}

${[
  'She hasn\'t finished reading the Major\'s files. There is a lot of it.',
  keyMissed(s) ? 'On base, the photo lab\'s duty sergeant has finally gone back through the key sign-out sheet and found a night in September nobody signed for. He\'s asking around the barracks who borrowed it, and somebody gave him your name.' : '',
].filter(Boolean).join('\n\n')}`,
    choices: () => [{ label: 'Go home and write to Mama.', note: 'writeMama', apply: (s) => (keyMissed(s) ? heat(1)(s) : s), next: 'a2_letter_work' }],
  },
  {
    id: 'a2_letter_work',
    act,
    title: 'Letter Home: Work',
    place: 'eielsonBarracks',
    clock: '1967-11-25T21:00',
    goal: letterGoal,
    text: () => `
You start another letter: "Dear Mama,"

First, the base. You've had a strange fall.`,
    choices: () => [
      { label: 'Tell her you\'ve been doing things you shouldn\'t, for a good reason.', note: 'honest', apply: mom('honest'), next: 'a2_letter_friends' },
      { label: 'Tell her the work is cold and dull.', note: 'soft', apply: mom('soft'), next: 'a2_letter_friends' },
      { label: 'Tell her you might make Airman First Class early.', note: 'lie', apply: mom('lie'), next: 'a2_letter_friends' },
    ],
  },
  {
    id: 'a2_letter_friends',
    act,
    title: 'Letter Home: Friends',
    place: 'eielsonBarracks',
    clock: '1967-11-25T21:20',
    goal: letterGoal,
    text: () => `
Then your friends. Mama always asks if you're eating and who you eat with.`,
    choices: () => [
      { label: 'Tell her about Eli and Lucy, and that Lucy\'s flying north on the 12th to finish what Owen started.', note: 'honest', apply: pipe(mom('honest'), set({ leakedFlightDate: true })), next: 'a2_heat' },
      { label: 'Tell her about Eli and Lucy, but nothing about the flight.', note: 'soft', apply: mom('soft'), next: 'a2_heat' },
      { label: 'Tell her you mostly keep to yourself.', note: 'lie', apply: mom('lie'), next: 'a2_heat' },
    ],
  },
  {
    id: 'a2_heat',
    act,
    title: 'Before the Dark',
    place: 'richardsonHighway',
    clock: '1967-11-30T13:00',
    goal: heatGoal,
    text: (s) => `
${s.heat >= 3 ? `${N.barnette} pulls you over on the Richardson Highway in a borrowed truck for no reason at all and searches it. He finds nothing. "You and Boone and that land office girl," he says. "I'm watching all three of you."${s.heat > 3 ? ' He leans in the window. "Next time you tell me something, Pruett, I won\'t believe a word of it."' : ''}\n\n` : ''}December is coming. The sun is barely up for four hours. You could keep your head down for a while.`,
    choices: (s) => [...heatChoices(s), askGossip('a2_heat_gossip')],
  },
  { ...gossip('a2_heat_gossip', act, (s) => heatChoices(s)), place: 'nlCafe', clock: '1967-11-30T14:00', goal: heatGoal },
]
