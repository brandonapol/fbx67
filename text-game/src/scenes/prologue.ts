import type { Scene } from '../types.ts'
import { N } from '../names.ts'
import { set } from '../state.ts'

const act = 'Prologue' as const

const talkRest = `
When Wade asks what you do, you tell him the truth, or most of it: you map where a road could someday cross the rivers north of here, and where the gravel is to build it.

"Somebody's been quietly asking who owns that land," you say. "Nobody else seems to notice." "I'm trying to do right by the Lower Tanana families out there, the Minto people with fish camps down on the lower Chatanika. There's a lawyer in town helping me with that."

Curly checks his watch. "Plane's ready for the morning, ${N.owenShort}."`

const talkAt = { place: 'silverPan', clock: '1967-07-14T23:20', goal: 'Walk back to your room.' } as const

export const prologue: readonly Scene[] = [
  {
    id: 'p_bar',
    act,
    title: 'Owen: The Silver Pan, July 1967',
    place: 'silverPan',
    clock: '1967-07-14T23:00',
    goal: `Join ${N.curlyShort} and ${N.wade} at their table.`,
    text: () => `
You are ${N.owen}, a geologist, two summers into a contract surveying gravel and river crossings north of Fairbanks. The midnight sun is still up at eleven. The Silver Pan smells like beer and wet wool.

${N.curly}, the mechanic who keeps your charter plane flying, waves you over. Beside him is a skinny kid in an Air Force haircut with a guitar case at his feet.

"${N.owenShort}, this here's ${N.wade}. Texan, like me. Munitions out at Eielson. Never seen snow in his life."

The kid grins and shakes your hand like he means it.`,
    choices: () => [
      { label: 'Ask Wade about Texas.', note: 'texas', next: 'p_talk_texas' },
      { label: 'Ask Wade what a munitions man does all day.', note: 'munitions', next: 'p_talk_munitions' },
      { label: 'Buy the table a round.', note: 'round', next: 'p_talk_round' },
    ],
  },
  {
    id: 'p_talk_texas',
    act,
    title: 'Owen: Small Talk',
    ...talkAt,
    text: () => `
Wade lights up. He grew up on the plains outside Lubbock, water skiing behind his cousins' boat on the reservoir every summer. He misses the heat. Curly laughs at everything.
${talkRest}`,
    choices: () => [{ label: 'Say goodnight and walk back to your room.', note: 'goodnight', next: 'p_letter' }],
  },
  {
    id: 'p_talk_munitions',
    act,
    title: 'Owen: Small Talk',
    ...talkAt,
    text: () => `
"Mostly counting things," Wade says. "Bombs, flares, charges. Counting them out, counting them back, signing for them." He grins. "You'd be amazed how much paper one bomb makes." Curly laughs at everything.
${talkRest}`,
    choices: () => [{ label: 'Say goodnight and walk back to your room.', note: 'goodnight', next: 'p_letter' }],
  },
  {
    id: 'p_talk_round',
    act,
    title: 'Owen: Small Talk',
    ...talkAt,
    text: () => `
The round makes you friends with half the bar. Wade tunes his guitar and plays a slow Hank Williams song badly and happily, and Curly laughs at everything.
${talkRest}`,
    choices: () => [{ label: 'Say goodnight and walk back to your room.', note: 'goodnight', next: 'p_letter' }],
  },
  {
    id: 'p_letter',
    act,
    title: 'Owen: A Letter to Lucy',
    place: 'owensRoom',
    clock: '1967-07-15T00:30',
    goal: `Sleep. In the morning, mail the letter and meet ${N.curlyShort} at the float dock.`,
    text: () => `
In your rented room at the boarding house you sit with the survey notes and a reel-to-reel recorder. The numbers say what you were afraid they'd say: whoever is paying for this survey is buying land along the route before the Native claims are settled. One parcel, on the lower Chatanika where the Minto families fish, holds the best gravel on that river and the easiest place to put a pipeline or a haul road across it. A fish camp. The family's allotment application vanished years ago.

You write to ${N.lucy}, the clerk at the land office who has been asking the questions nobody else asks. Tomorrow ${N.curlyShort} flies you to the survey camp, and you will hide the real notes and tapes out there. If anything happens to you, she should know there is something to find.`,
    choices: () => [{ label: 'Seal the letter and go to sleep.', note: 'sleep', next: 'p_dock' }],
  },
  {
    id: 'p_dock',
    act,
    title: 'Owen: The Float Dock',
    place: 'floatDock',
    clock: '1967-07-15T07:30',
    goal: `Fly north with ${N.curlyShort} to the survey camp.`,
    text: () => `
It never got dark last night. You drop the letter in the slot at the post office on your way down to the river, and then it is out of your hands.

At the float dock on the Chena, ${N.curly} is down on one knee on a float with a hand pump, pumping the night's seep out of the float compartments. The floats are the amphibian kind, with wheels tucked up inside them for the gravel bar at camp. He squints at you over the strut.

"You look like you didn't sleep, ${N.owenShort}."

You hand him your duffel and keep the satchel with the notes and the tapes. It rides on your knees all the way north.`,
    choices: () => [{ label: `Climb in and fly north with ${N.curlyShort}.`, note: 'fly', next: 'p_camp' }],
  },
  {
    id: 'p_camp',
    act,
    title: 'Owen: The Survey Camp',
    place: 'surveyCamp',
    clock: '1967-07-15T10:00',
    goal: `Hide the notes while ${N.curlyShort} refuels.`,
    text: () => `
${N.curlyShort} puts the wheels down and lands on the gravel bar below the camp. The camp is the way you left it: the cook tent, the old meat cache up on its stilts, the survey marker on the rise.

While ${N.curlyShort} refuels from the jerry cans for the trip home, you have a few minutes alone with the real notes and tapes. He whistles down on the gravel bar.

Where do you hide them?`,
    choices: () => [
      { label: 'Hide the notes under the floorboards behind the cook-tent stove.', note: 'stove', apply: set({ owenCache: 'stove' }), next: 'p_end' },
      { label: 'Hide the notes in the old meat cache up on stilts.', note: 'cache', apply: set({ owenCache: 'cache' }), next: 'p_end' },
      { label: 'Hide the notes in an ammo can buried under the survey marker.', note: 'marker', apply: set({ owenCache: 'marker' }), next: 'p_end' },
    ],
  },
  {
    id: 'p_end',
    act,
    title: 'Owen: High Water',
    place: 'boardingHouse',
    clock: '1967-08-14T21:00',
    goal: `Get across town to ${N.lucy}.`,
    text: () => `
You fly home. ${N.curlyShort} never sees where you put them. Back in town you write ${N.lucy} a second, longer letter, and somewhere in it is where to look.

A month later the rain starts and does not stop. By the second week of August the Chena is over its banks. You need to get across town to ${N.lucy} with the copies you kept. Somebody you know is at your door with a skiff, a man in a rain slicker with the hood up, offering a ride.

You climb in.`,
    choices: () => [{ label: 'Continue.', note: 'continue', next: 'a1_flood' }],
  },
]
