import type { Scene } from '../types.ts'
import { N } from '../names.ts'
import { set } from '../state.ts'

const act = 'Prologue' as const

const talkRest = `
When Wade asks what you do, you tell him the truth, or most of it: you map where a road could someday cross the rivers north of here, and where the gravel is to build it.

"Lot of folks care about that land all of a sudden," you say. "I'm trying to do right by the Lower Tanana families out there, the Minto people with camps on the river. There's a lawyer in town helping me with that."

Curly checks his watch. "Plane's ready for the morning, Owen."`

export const prologue: readonly Scene[] = [
  {
    id: 'p_bar',
    act,
    title: 'Owen: The Silver Pan, July 1967',
    text: () => `
You are ${N.owen}, a geologist, two summers into a contract surveying gravel and river crossings north of Fairbanks. The midnight sun is still up at eleven. The Silver Pan smells like beer and wet wool.

${N.curly}, the mechanic who keeps your charter plane flying, waves you over. Beside him is a skinny kid in an Air Force haircut with a guitar case at his feet.

"Owen, this here's ${N.wade}. Texan, like me. Munitions out at Eielson. Never seen snow in his life."

The kid grins and shakes your hand like he means it.`,
    choices: () => [
      { label: 'Ask Wade about Texas.', next: 'p_talk_texas' },
      { label: 'Ask Wade what a munitions man does all day.', next: 'p_talk_munitions' },
      { label: 'Buy the table a round.', next: 'p_talk_round' },
    ],
  },
  {
    id: 'p_talk_texas',
    act,
    title: 'Owen: Small Talk',
    text: () => `
Wade lights up. He grew up on the plains outside Lubbock, water skiing behind his cousins' boat on the reservoir every summer. He misses the heat. Curly laughs at everything.
${talkRest}`,
    choices: () => [{ label: 'Say goodnight and walk back to your room.', next: 'p_letter' }],
  },
  {
    id: 'p_talk_munitions',
    act,
    title: 'Owen: Small Talk',
    text: () => `
"Mostly counting things," Wade says. "Bombs, flares, charges. Counting them out, counting them back, signing for them." He grins. "You'd be amazed how much paper one bomb makes." Curly laughs at everything.
${talkRest}`,
    choices: () => [{ label: 'Say goodnight and walk back to your room.', next: 'p_letter' }],
  },
  {
    id: 'p_talk_round',
    act,
    title: 'Owen: Small Talk',
    text: () => `
The round makes you friends with half the bar. Wade tunes his guitar and plays a slow Hank Williams song badly and happily, and Curly laughs at everything.
${talkRest}`,
    choices: () => [{ label: 'Say goodnight and walk back to your room.', next: 'p_letter' }],
  },
  {
    id: 'p_letter',
    act,
    title: 'Owen: A Letter to Lucy',
    text: () => `
In your rented room you sit with the survey notes and a reel-to-reel recorder. The numbers say what you were afraid they'd say: whoever is paying for this survey is buying land along the route before the Native claims are settled. One parcel sits right on the best crossing. A fish camp. The family's allotment application vanished years ago.

You write to ${N.lucy}, the clerk at the land office who has been asking the questions nobody else asks. Tomorrow Curly flies you to the survey camp. While he refuels at the creek, you will hide the real notes and tapes. If anything happens to you, she should know where.

Where do you hide them?`,
    choices: () => [
      { label: 'Hide the notes under the floorboards behind the cook-tent stove.', apply: set({ owenCache: 'stove' }), next: 'p_end' },
      { label: 'Hide the notes in the old meat cache up on stilts.', apply: set({ owenCache: 'cache' }), next: 'p_end' },
      { label: 'Hide the notes in an ammo can buried under the survey marker.', apply: set({ owenCache: 'marker' }), next: 'p_end' },
    ],
  },
  {
    id: 'p_end',
    act,
    title: 'Owen: High Water',
    text: () => `
You mail the letter, fly north, hide the notes, and fly home. Curly never sees.

A month later the rain starts and does not stop. By the second week of August the Chena is over its banks. You need to get across town to Lucy with the copies you kept. Somebody you know is at your door with a skiff, a man in a rain slicker with the hood up, offering a ride.

You climb in.`,
    choices: () => [{ label: 'Continue.', next: 'a1_flood' }],
  },
]
