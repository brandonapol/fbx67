import type { Scene } from '../types.ts'
import { N } from '../names.ts'
import { set } from '../state.ts'

const act = 'Prologue' as const

const talkRest = `
When Wade asks what you do, you tell him the truth, or most of it: you map where a road could someday cross the rivers north of here, and where the gravel is to build it.

"Somebody's been quietly asking who owns that land," you say. "Nobody else seems to notice." "I'm trying to do right by the Lower Tanana families out there, the Minto people with fish camps down on the lower Chatanika. There's a lawyer in town helping me with that."

Curly checks his watch. "Plane's ready for the morning, Owen."`

const talkAt = { place: 'silverPan', time: '1967-07-14T23:20', goal: 'Walk back to your room.' } as const

export const prologue: readonly Scene[] = [
  {
    id: 'p_bar',
    act,
    title: 'Owen: The Silver Pan, July 1967',
    place: 'silverPan',
    time: '1967-07-14T23:00',
    goal: 'Join Curly and Wade at their table.',
    text: () => `
You are ${N.owen}, a geologist, two summers into a contract surveying gravel and river crossings north of Fairbanks. The midnight sun is still up at eleven. The Silver Pan smells like beer and wet wool.

${N.curly}, the mechanic who keeps your charter plane flying, waves you over. Beside him is a skinny kid in an Air Force haircut with a guitar case at his feet.

"Owen, this here's ${N.wade}. Texan, like me. Munitions out at Eielson. Never seen snow in his life."

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
    time: '1967-07-15T00:30',
    goal: 'Sleep. Meet Curly at the float dock in the morning.',
    text: () => `
In your rented room you sit with the survey notes and a reel-to-reel recorder. The numbers say what you were afraid they'd say: whoever is paying for this survey is buying land along the route before the Native claims are settled. One parcel, on the lower Chatanika where the Minto families fish, holds the best gravel on that river and the easiest place to put a pipeline or a haul road across it. A fish camp. The family's allotment application vanished years ago.

You write to ${N.lucy}, the clerk at the land office who has been asking the questions nobody else asks. Tomorrow Curly flies you to the survey camp, and you will hide the real notes and tapes out there. If anything happens to you, she should know where.`,
    choices: () => [{ label: 'Seal the letter and go to sleep.', note: 'sleep', next: 'p_dock' }],
  },
  {
    id: 'p_dock',
    act,
    title: 'Owen: The Float Dock',
    place: 'floatDock',
    time: '1967-07-15T07:30',
    goal: 'Fly north with Curly to the survey camp.',
    text: () => `
It never got dark last night. You drop the letter in the slot at the post office on your way down to the river, and then it is out of your hands.

At the float dock on the Chena, ${N.curly} is standing on a float with a funnel in the wing tank, pouring gas from a jerry can through a chamois. He squints at you over the strut.

"You look like you didn't sleep, Owen."

You hand him your duffel and keep the satchel with the notes and the tapes on your knees.`,
    choices: () => [{ label: 'Climb in and fly north with Curly.', note: 'fly', next: 'p_camp' }],
  },
  {
    id: 'p_camp',
    act,
    title: 'Owen: The Survey Camp',
    place: 'surveyCamp',
    time: '1967-07-15T10:00',
    goal: 'Hide the notes while Curly refuels.',
    text: () => `
The camp is the way you left it: the cook tent, the old meat cache up on its stilts, the survey marker on the rise. Curly carries the jerry cans down to the plane to top off the tanks for the trip home. He whistles while he works.

While he refuels at the creek, you have a few minutes alone with the real notes and tapes.

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
    place: 'floodedStreet',
    time: '1967-08-14T21:00',
    goal: 'Get across town to Lucy.',
    text: () => `
You fly home, and you mail Lucy one more line: where to look. Curly never sees.

A month later the rain starts and does not stop. By the second week of August the Chena is over its banks. You need to get across town to Lucy with the copies you kept. Somebody you know is at your door with a skiff, a man in a rain slicker with the hood up, offering a ride.

You climb in.`,
    choices: () => [{ label: 'Continue.', note: 'continue', next: 'a1_flood' }],
  },
]
