import type { Scene } from '../types.ts'
import { N } from '../names.ts'
import { addEvidence, eliTrust, heat, joan, mom, pipe, set } from '../state.ts'

const act = 'Act 1: Flood' as const

const findEli = `Find ${N.eli}. Tell him about the woman's mother.`

const message = `"There's a woman from Minto on the sandbag line on Cushman," you say. "Her mother's stuck in a house out at the edge of town, past where the trucks can go. She says only your boat can get there."`

const delivered = `${N.eli} doesn't ask your name. He knows whose mother it is before you've finished, and he knows the house. He tips the last of the furniture onto a porch and is turning the bow back into the current while you're still talking.

"Tell her I'm going," he says. Then, over the motor: "Get back to your line before they shoot you for it, Texas. I'll come find you tonight. I could use a strong back."`

export const act1: readonly Scene[] = [
  {
    id: 'a1_flood',
    act,
    title: 'Wade: Drowned Town',
    place: 'floodedStreet',
    clock: '1967-08-15T09:00',
    goal: 'Hold the sandbag line.',
    text: () => `
You are ${N.wade} Pruett: nineteen, Air Force munitions, a long way from Texas. August 1967. Most of Fairbanks is underwater, and the Air Force has trucked half of Eielson into town to help.

Your sergeant puts you on a sandbag line across Cushman Street, thigh-deep, passing bags hand to hand. He counts heads every quarter hour.

A woman in a man's rain slicker comes down the line looking at faces until she stops at yours, maybe because you're the youngest. She's from Minto. Her mother is in a house out at the edge of town, past where the trucks can go, and the water is at her windows. "Eli has a boat that can get in there. Eli, he runs freight on the river. He's somewhere in town. I can't find him and I can't leave her."

The sergeant is looking the other way. For now.`,
    choices: () => [
      { label: 'Go find Eli. You can take a chewing-out.', note: 'findEli', next: 'a1_track' },
      { label: 'Stay on the line. Orders are orders. Send her to someone who can go.', note: 'stayOnLine', next: 'a1_body' },
    ],
  },
  {
    id: 'a1_track',
    act,
    title: 'Which Way He Went',
    place: 'floodedStreet',
    clock: '1967-08-15T09:20',
    goal: findEli,
    text: () => `
You slip off the end of the line and wade north. Nobody stops you.

A man in hip waders is carrying a mattress out of a rooming house over his head. You ask about a boat, a riverboat, a man named Eli.

"Went by twenty minutes ago with a load of kids," he says, without putting the mattress down. "Toward Lacey. Hold this end, would you?"

You hold the end until he gets it onto a porch roof.`,
    choices: () => [{ label: 'Head for Lacey Street.', note: 'lacey', next: 'a1_track_2' }],
  },
  {
    id: 'a1_track_2',
    act,
    title: 'Coffee on Second',
    place: 'floodedStreet',
    clock: '1967-08-15T09:45',
    goal: findEli,
    text: () => `
On Second Avenue a woman leans out of an upstairs window with a coffee pot and a stack of paper cups, lowering them on a string to anybody who looks cold.

"Eli, with the riverboat? He dropped the kids at the school and went back out. Up Cushman, toward Third." She lowers you a cup. "Drink it before it floats away."`,
    choices: () => [{ label: 'Drink it and keep going.', note: 'drink', next: 'a1_couple' }],
  },
  {
    id: 'a1_couple',
    act,
    title: 'The Porch on Third',
    place: 'floodedStreet',
    clock: '1967-08-15T10:05',
    goal: findEli,
    text: () => `
An old couple sits on the top step of a porch just short of Third, their feet an inch above the water. He has a cane across his knees. She has a paper slip in her hand and keeps folding and unfolding it.

"Eli? He was tied up right there on Third a few minutes ago," the man says. "Pulling the Sorensens out."

His wife holds out the slip. It's a prescription, his heart pills, the bottle went under with the kitchen. "They've got a help tent up on the high ground past Fifth. The nurses from St. Joseph's. We can't get there." She doesn't ask. She just keeps holding it out.`,
    choices: () => [
      { label: 'Take the slip to the help tent. Eli can wait an hour.', note: 'helpTent', next: 'a1_errand' },
      { label: '"I\'ll send somebody." Go to Third while Eli\'s still there.', note: 'sendSomebody', next: 'a1_eli' },
    ],
  },
  {
    id: 'a1_eli',
    act,
    title: 'The Riverboat',
    place: 'floodedStreet',
    clock: '1967-08-15T10:15',
    goal: findEli,
    text: () => `
The riverboat is idling at the corner of Third, a long flat-bottomed freighter with a kicker on the back, low in the water with somebody's furniture. The man at the tiller is about your age. He's shoving a dresser off the bow to make room.

You wade up and catch the gunwale.`,
    choices: () => [{ label: 'Tell him.', note: 'tellEli', apply: eliTrust(1), next: 'a1_delivered' }],
  },
  {
    id: 'a1_errand',
    act,
    title: 'The Help Tent',
    place: 'helpTent',
    clock: '1967-08-15T10:45',
    goal: 'Get the old man his heart pills.',
    text: () => `
The help tent is three army tents and a line of cots on the high ground south of town, where the water stops. Everybody St. Joseph's could carry out is here.

A nurse with her sleeves rolled to the elbow reads the slip, reads it again, and goes into a crate of bottles that came out of the hospital pharmacy in a rowboat. She's ${N.joan}. She counts out pills into an envelope and writes the dose on it in block letters an old man could read.

"You walked up here for somebody else's prescription," she says. "In that water." She looks you over, your soaked fatigues. "Tell him one in the morning, with food. And tell him the nurse said to stay off that porch."`,
    choices: () => [{ label: 'Take the envelope back down the hill.', note: 'envelope', apply: joan(1), next: 'a1_trail' }],
  },
  {
    id: 'a1_trail',
    act,
    title: 'A Block or Two South',
    place: 'floodedStreet',
    clock: '1967-08-15T11:40',
    goal: findEli,
    text: () => `
The old man takes the envelope in both hands. His wife reads Joan's block letters out loud to him twice.

On Third the riverboat is gone. A boy bailing a skiff with a coffee can points with it. "Eli? Went a block or two south. Somebody was waving a sheet off a roof."

You find the sheet on Fifth, and under it a family on a roof, and below them the riverboat, and the man at the tiller handing a baby down into it.`,
    choices: () => [{ label: 'Wait for the baby, then tell him.', note: 'waitBaby', apply: eliTrust(1), next: 'a1_delivered' }],
  },
  {
    id: 'a1_delivered',
    act,
    title: 'The Message',
    place: 'floodedStreet',
    clock: '1967-08-15T12:00',
    goal: 'Get back to the sandbag line.',
    text: () => `
${message}

${delivered}`,
    choices: () => [{ label: 'Wade back to Cushman Street.', note: 'wadeBack', next: 'a1_line' }],
  },
  {
    id: 'a1_line',
    act,
    title: 'The Sergeant',
    place: 'floodedStreet',
    clock: '1967-08-15T12:40',
    goal: 'Hold the sandbag line.',
    text: () => `
Your sergeant sees you coming a block off. By the time you reach the line he has his speech ready, and it's a long one: where you were, who you think you are, what the Air Force does to airmen who wander off, and what he'll do first.

The woman from Minto is gone from the line. Nobody else there knows where you went, and he doesn't write anything down. He just puts you on the heaviest end of the line for the rest of the afternoon.`,
    choices: () => [{ label: 'Pass the bags.', note: 'passBags', next: 'a1_body' }],
  },
  {
    id: 'a1_body',
    act,
    title: 'The Cabin',
    place: 'floodCabin',
    clock: '1967-08-15T18:00',
    goal: 'Find out what the pole hit.',
    text: (s) => `
${s.eliTrust > 0 ? `That evening ${N.eli} ties the riverboat up at the end of the sandbag line and asks your sergeant for you by name. The woman's mother is out and dry, he says. He owes you one, and he says so.` : `Someone else carries the woman's message. That evening the boatman she was looking for, ${N.eli}, needs a strong back, and your sergeant lends you out.`} Eli runs freight on the river between Fairbanks and the villages. His family is Lower Tanana, out of Minto, and he grew up on these rivers. Near a half-sunk cabin on the edge of town, his pole knocks something soft.

It's a man, held under by a yellow braided line tied to a drowned sawhorse. It's the geologist you met at the bar in July. Owen.

The line is tied off in a bowline, but backward, the tail sitting outside the loop. You learned your knots tying up your cousins' boat on the reservoir, and every bowline you ever saw there had the tail inside. Somebody tied this one, and tied it his own way.`,
    choices: () => [
      { label: 'Point out the knot to Eli. Nobody tangles into a bowline.', note: 'pointOutKnot', apply: pipe(addEvidence('knot'), eliTrust(1)), next: 'a1_knot' },
      { label: 'Say nothing. Cut the line on both sides of the knot, pocket it, and get him to the help tent.', note: 'cutKnot', apply: addEvidence('knot'), next: 'a1_ruling' },
    ],
  },
  {
    id: 'a1_knot',
    act,
    title: 'Eli Looks',
    place: 'floodCabin',
    clock: '1967-08-15T18:20',
    goal: 'Get Owen into the boat.',
    text: () => `
Eli looks at the knot for a long time.

"Nobody ties himself to a sawhorse," he says quietly. "Don't untie that, Texas."

You cut the line a hand's width above the knot and a hand's width below, so it stays tied, and put it in your jacket pocket.`,
    choices: () => [{ label: 'Help Eli lift Owen\'s body into the boat.', note: 'liftBody', next: 'a1_ruling' }],
  },
  {
    id: 'a1_ruling',
    act,
    title: 'An Accident',
    place: 'helpTent',
    clock: '1967-08-15T20:00',
    goal: 'Find out what the nurse saw.',
    text: (s) => `
St. Joseph's took water on the first floor and sent everyone it could carry up the hill, so that is where you and Eli bring Owen: the help tent on the high ground south of town. They put him on a cot at the back, under a tarp.

${N.barnette} of the State Troopers has six drownings and a town underwater. He's a Barnette, yes, those Barnettes: his grandfather founded this town, and when the old man's bank went under with everybody's money, a jury acquitted him and he left town in disgrace anyway. Vernon has spent his life being the opposite. He lifts the tarp and looks at Owen for about a minute.

"Tangled in a line in the current. Accident." He signs it and moves on. He never asks about the line. The piece with the knot in it stays in your pocket.

${s.joan > 0 ? `${N.joan}, the nurse who counted out the old man's pills this morning, is still at the tarp after he's gone. She looks up and knows you. "You again," she says, and doesn't sound sorry about it.` : `A nurse named ${N.joan} is still at the tarp after he's gone, sleeves rolled to the elbow, looking at the dead man's neck longer than she needs to.`}`,
    choices: () => [
      { label: 'Ask Joan if anything about the body looked wrong.', note: 'askJoan', apply: pipe(addEvidence('bruising'), joan(1)), next: 'a1_joan_ask' },
      { label: 'Make her laugh. She looks like she needs it.', note: 'makeLaugh', apply: pipe(addEvidence('bruising'), joan(2)), next: 'a1_joan_laugh' },
    ],
  },
  {
    id: 'a1_joan_ask',
    act,
    title: 'Joan',
    place: 'helpTent',
    clock: '1967-08-15T20:15',
    goal: 'Listen to Joan.',
    text: () => `
Joan lowers her voice. Bruises on his left shoulder and the side of his neck, she says, like a hand held him down. A left hand, from behind. "Nobody asked me," she says. "So I didn't say."`,
    choices: () => [{ label: 'Continue.', note: 'continue', next: 'a1_lucy' }],
  },
  {
    id: 'a1_joan_laugh',
    act,
    title: 'Joan',
    place: 'helpTent',
    clock: '1967-08-15T20:15',
    goal: 'Listen to Joan.',
    text: () => `
She laughs despite herself. As you're leaving she catches your sleeve.

"Your friend from the cabin. He had bruises on his left shoulder and neck, like somebody's left hand held him down. Nobody asked me. I thought somebody should know."`,
    choices: () => [{ label: 'Continue.', note: 'continue', next: 'a1_lucy' }],
  },
  {
    id: 'a1_lucy',
    act,
    title: 'The Land Office',
    place: 'landOffice',
    clock: '1967-08-16T10:00',
    goal: 'Decide what to tell Lucy.',
    text: () => `
Eli takes you to the land office, where his sister ${N.lucy} is hauling wet ledgers up a staircase. You light a cigarette. She takes it out of your mouth and drops it in a puddle without a word.

She doesn't believe the accident ruling for a second. ${N.owenShort} was coming to see her the night he drowned. He'd written to her twice in July: he hid his real notes at his survey camp north of town, and he was bringing her copies. The copies are gone. ${N.owenShort} flew in and out on amphibian floats, landing on their wheels on a gravel bar the flood has scoured away, and the camp is forty miles from any river a boat can run. Until the creek freezes hard enough for a plane on skis, nobody is getting in.

"He was working with a lawyer, ${N.ashby}, on our family's claim," she says. "Mr. Ashby's taken it over. But I need to know which crossings Owen meant, and his survey used Air Force aerial photographs. The base photo lab kept the only full set of prints in Alaska. I can't get onto your base."

She looks at you a beat too long.`,
    choices: () => [
      { label: '"I can get you Owen\'s aerial photos."', note: 'offerPhotos', apply: eliTrust(1), next: 'a1_barfight' },
      { label: '"I don\'t know. I could get in a lot of trouble."', note: 'noIdea', next: 'a1_barfight' },
    ],
  },
  {
    id: 'a1_barfight',
    act,
    title: 'Saturday at the Silver Pan',
    place: 'silverPan',
    clock: '1967-08-19T21:00',
    goal: 'Keep Eli out of trouble.',
    text: () => `
The water goes down. The mud doesn't. Saturday night the Silver Pan is packed: Curly at the bar, ${N.jake} the bush pilot folded into a booth, Eli nursing a soda.

${N.bartender} has run the Pan since statehood. He slides you a beer and gives you the speech he gives every new airman, whether they want it or not.

"Three things about this town, son. One: the law keeps score. Every time a Trooper hears your name, he believes you a little less, and once he's done believing you, he's done. Two: people here remember who stood with them and who didn't. Three: nothing you say stays where you said it. Dottie down at the Northern Lights Café hears it all by morning. You ever want to know where you stand, buy a cup of her coffee and ask."

He wipes the bar. "That's the speech. Drink your beer."

A drunk calls Eli something ugly. Eli doesn't move. The drunk shoves him.

The floor is slick with mud. There's a hot stove, a moose rack on the wall, and a lot of bottles.`,
    choices: () => [
      { label: 'Shove the drunk into the stove.', note: 'shove', next: 'a1_tank' },
      { label: 'Grab the moose rack off the wall.', note: 'mooseRack', next: 'a1_tank' },
      { label: 'Break a bottle and hope that ends it.', note: 'bottle', apply: heat(1), next: 'a1_tank' },
      { label: 'Stay in your seat. Not your fight.', note: 'stayInSeat', apply: eliTrust(-1), next: 'a1_tank_sat' },
    ],
  },
  {
    id: 'a1_tank_sat',
    act,
    title: 'Not Your Fight',
    place: 'silverPan',
    clock: '1967-08-19T21:30',
    goal: 'Get out of the fight in one piece.',
    text: () => `
You stay in your seat. Eli takes the first punch alone. Then Curly Boone comes off his stool yelling "Texas!" and drags you in by the collar, and it's everybody's fight.`,
    choices: () => [{ label: 'Continue.', note: 'continue', next: 'a1_tank' }],
  },
  {
    id: 'a1_tank',
    act,
    title: 'The Drunk Tank',
    place: 'cityJail',
    clock: '1967-08-20T08:00',
    goal: 'Get out of this cell.',
    text: () => `
The whole bar picks sides. Curly jumps in on yours, roaring about Texas. ${N.cop} of Fairbanks PD hauls you, Eli, and Curly out to the car. He knows Curly by name. On the way, Curly presses a folded twenty into the officer's hand, friendly as anything. The officer tucks it back into Curly's shirt pocket without looking at it and shuts the door.

In the morning ${N.barnette} comes to the cell. He wants to know who started it, and why a Texan airman is running around with Curly Boone and "the river Indian."

"Give me a name and you walk."`,
    choices: () => [
      { label: 'Cover for Eli. "I started it." Barnette won\'t forget your name.', note: 'coverEli', apply: pipe(set({ barfight: 'coverEli' }), eliTrust(2), heat(1)), next: 'a1_ashby' },
      { label: 'Blame Eli. "He threw the first punch."', note: 'blameEli', apply: pipe(set({ barfight: 'blameEli' }), eliTrust(-3)), next: 'a1_ashby' },
      { label: 'Side with Curly. "Ask Curly. He saw it."', note: 'sideCurly', apply: pipe(set({ barfight: 'sideCurly' }), heat(1)), next: 'a1_ashby' },
    ],
  },
  {
    id: 'a1_ashby',
    act,
    title: 'A Friend in Town',
    place: 'cityJail',
    clock: '1967-08-20T10:00',
    goal: 'Walk out of here.',
    text: (s) => `
${s.barfight === 'blameEli' ? 'Eli stays in the cell when they let you out. He does not look at you.' : s.barfight === 'sideCurly' ? 'Curly claps you on the back on the way out. Barnette writes your name next to his.' : 'Barnette lets you both go, but he writes your name down.'}

A man in a good coat is at the desk, talking Barnette down in a calm voice until Barnette tears up the charge sheet. ${N.ashby}, attorney. He paid your fine, and there's no record.

"Owen spoke well of you," he says. You met Owen exactly once. "He spoke well of everybody. I'm finishing what he started for the Native families. With these claims, timing is everything." He gives you his card. "If you ever need anything, you come see me."`,
    choices: () => [{ label: 'Thank him.', note: 'thankHim', next: 'a1_letter' }],
  },
  {
    id: 'a1_letter',
    act,
    title: 'Letter Home',
    place: 'eielsonBarracks',
    clock: '1967-08-20T20:30',
    goal: 'Write home to Mama.',
    text: () => `
You sit on your bunk with a pen. Mama will want to know about the flood. You are not sure how much to tell her about the dead man, the fight, or the night in jail.

You write: "Dear Mama,"`,
    choices: () => [
      { label: 'Tell her all of it. The body, the fight, the jail.', note: 'honest', apply: mom('honest'), next: 'a2_major' },
      { label: 'Tell her about the flood and that you made some friends.', note: 'soft', apply: mom('soft'), next: 'a2_major' },
      { label: 'Tell her it\'s boring up here and you\'re fine.', note: 'lie', apply: mom('lie'), next: 'a2_major' },
    ],
  },
]
