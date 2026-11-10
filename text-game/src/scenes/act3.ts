import { mamaReply } from './mama.ts'
import type { CacheSpot, Choice, Clock, NightSignal, Place, Scene, SceneId, State } from '../types.ts'
import { askGossip, gossip } from './gossip.ts'
import { N } from '../names.ts'
import { jakeFrostbitten, nightSignal, searchHours } from '../logic.ts'
import { addEvidence, eliTrust, has, heat, joan, mom, pipe, set, texan } from '../state.ts'

const act = 'Act 3: Deep Winter' as const

const survivalChoices = (_: State): readonly Choice[] => [
  { label: 'Burn oil-soaked rags in a cowling panel for a smoke signal at first light.', note: 'smoke', apply: set({ nightSignal: 'smoke' }), next: 'a3_search' },
  { label: 'Stamp a big X in the snow on the open slope.', note: 'stampX', apply: set({ nightSignal: 'stampX' }), next: 'a3_search' },
  { label: 'Save everything for the fire and wait.', note: 'saveFire', apply: set({ nightSignal: 'saveFire' }), next: 'a3_search' },
]

const rashChoices = (_: State): readonly Choice[] => [
  { label: 'Blow the safe in Tolliver\'s office and take the stolen allotment file.', note: 'safe', apply: set({ rashPlan: 'safe' }), next: 'a3_rash_safe' },
  { label: 'Burn down his hunting cabin.', note: 'burn', apply: set({ rashPlan: 'burn' }), next: 'a3_rash_burn' },
  { label: 'Find him and put a gun in his face until he talks.', note: 'gunpoint', apply: set({ rashPlan: 'gunpoint' }), next: 'a3_rash_gun' },
  { label: 'Don\'t go after Tolliver. Not like this.', note: 'none', apply: set({ rashPlan: 'none' }), next: 'a3_rash_none' },
]

// Where, when and what next (docs/story-api.md). Goals shared by a scene pair, or by a scene and its café visit.
const jakeFirst = N.jake.split(' ')[0]
const cacheGoal = `Find what ${N.owenShort} hid.`
const nightGoal = 'Get through the night, and get seen.'
const smokeGoal = 'Follow the smoke.'
const rashGoal = `Decide what to do about ${N.tolliverLast}.`
const winterGoal = 'Get through the winter.'

// What Lucy's signal shows the search (design: survival-night signal): from the team splitting up, on the way in,
// and when the rest of the team reaches the wreck, searchHours after it set out.
const bySignal = (s: State, lines: Readonly<Record<NightSignal, string>>): string => lines[nightSignal(s)]
const hoursWord = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
const searchSign = (s: State): string =>
  bySignal(s, {
    smoke: 'Then a column of black smoke stands up over the spruce to the north, oily and straight, the kind nothing in the woods makes. Somebody is feeding it on purpose, and has been since first light. On the radio the team leader turns everyone toward it, each from wherever he is.',
    stampX: 'Overhead a spotter plane works the drainages, back and forth, and finds nothing yet.',
    saveFire: 'No smoke, no sign. Just spruce and grey light, and every creek bed looks like the last one.',
  })
const smokeAhead = (s: State): string =>
  bySignal(s, {
    smoke: 'The black column is close now, and somebody down there is still feeding it. Then you smell it.',
    stampX: 'Then the spotter plane banks, comes back, and circles one slope, around and around. Under it, you smell smoke.',
    saveFire: 'Then, when you have about given up, you smell smoke. Just a thread of it, close.',
  })
const teamArrives = (s: State): string =>
  `The rest of the team reaches the wreck ${hoursWord[searchHours(s)]} hours after it set out, ${bySignal(s, {
    smoke: 'straight up the slope under the last of Lucy\'s smoke',
    stampX: 'at dusk, on the bearing the spotter plane radioed off her X in the snow',
    saveFire: 'in the dark, toward the flares you fire one-handed off the hill',
  })}. A helicopter out of Fort Wainwright comes in after them, and by nine that night the three of you are in Fairbanks.`

// Jake's frostbite (design: survival-night order), first seen at the wreck and carried into Act 4 by jakeFrostbitten.
const jakeAtFire = (s: State): string =>
  jakeFrostbitten(s)
    ? 'Jake lies by the fire with his left foot wrapped in a wool shirt, and Lucy keeps that foot back from the heat on purpose: thawed out here, it would only freeze again before a hospital. The toes are white and hard as candle wax. They froze while he lay pinned and she got the fire going.'
    : 'Jake lies by the fire under the sleeping bag, his leg splinted, both boots on. Lucy\'s fingertips are swollen and blistered from working the seat frame off his leg bare-handed before she ever struck a match. She splinted your arm with them anyway.'

// What Wade gives Barnette at the Trade: the woman seen on the base if Lucy went in herself, or, if Wade searched the
// Major's cabinet, his own photographs of it and who sent him (coJob, set at a2_co_ask).
const turnedIn = (s: State): string =>
  s.coJob === 'lucy'
    ? 'You tell him who the Native woman on the base was.'
    : `You tell him ${N.lucy} sent you into the Major's cabinet in October, and that the photographs you took that night are in her folder.`

// Lucy's confession (design: Lucy's Confession). She stops each rash plan where it is headed, a few minutes in; on the
// quiet path she calls from outside the gate and drives Wade to her kitchen. The talk itself is the same everywhere.
const stop = '"Stop. Wade, stop. If you do this, they win. Anything you do tonight is exactly what they need."'
const stopped = `Lucy steps out of the dark before you get there. She must have followed you.\n\n${stop}`
// How Wade gets back to base after walking out on her: he can't drive the borrowed truck one-handed (rashPlan, which
// liveness keeps only as burn or not by now).
const walkBack = (s: State): string =>
  s.rashPlan === 'burn'
    ? 'You leave the borrowed truck on the cabin road, its gears too much for one hand, walk out to the highway, and ride back to base in the cab of a fuel truck whose driver doesn\'t ask about the cast.'
    : 'A cab off Second Avenue takes the last of your pay to drop you at the main gate.'
const confessionBody = (s: State): string => `She has a folder. It's the Major's files, finally read through. Munitions sign-out sheets: demolition charges, dozens of them, going back to October. Every one is signed Wade Pruett. You didn't sign any of them. Under those, the igloo count sheets from the summer, before the first sheet with your name forged on it: the demolition count short week after week, and every short sheet initialed up the line as if it added up. Behind them, typed copies of your letters to your mother. The Major has been reading your mail since August.${s.leakedFlightDate ? ' Your letter with the date of Lucy\'s flight went out in November, right across his desk.' : ''}

"They've been building you for weeks. You're the fall guy."

She doesn't look at you for a long moment. When she does, her voice is flat, the way people talk when they've rehearsed something and it still won't come out right.

"Why you, Wade? Out of every airman on that base. I've been asking myself since I opened this folder, and I know why." She holds up her hand before you can speak. "In August I told everybody about you. The girls at the office. Mr. Ashby, every time he came by about the claim. People at the Chiefs' meeting. A good-hearted Texas boy from munitions who'd do anything I asked. I was proud of myself. I thought I'd finally found a way in."

Her voice breaks on the next part, and she makes it keep going.

"Somebody I talked to passed your name along. Your name was in their hands because I put it there. I picked you because you were useful, and that's how they picked you too."`
const confessionChoices: readonly Choice[] = [
  { label: 'Stay. "Then we finish this. Together."', note: 'stay', apply: set({ afterConfession: 'stay' }), next: 'a3_joan' },
  { label: 'Walk away. You\'re done being anybody\'s tool.', note: 'walk', apply: set({ afterConfession: 'walk' }), next: 'a3_walk' },
  { label: 'Turn on her. If she used you, you can use her.', note: 'turn', apply: set({ afterConfession: 'turn' }), next: 'a3_turn' },
]
const confession = (id: SceneId, place: Place, clock: Clock, opening: string): Scene => ({
  id,
  act,
  title: 'Lucy',
  place,
  clock,
  goal: `Decide where you stand with ${N.lucy}.`,
  text: (s) => `
${opening}

${confessionBody(s)}`,
  choices: () => confessionChoices,
})

const dig = (spot: CacheSpot) => (s: State): SceneId => (s.owenCache === spot ? 'a3_found' : 'a3_wrong_spot')

export const act3: readonly Scene[] = [
  {
    id: 'a3_camp',
    act,
    title: 'Lucy: The Survey Camp',
    place: 'surveyCamp',
    clock: '1967-12-12T11:00',
    goal: cacheGoal,
    text: () => `
You are ${N.lucy}. December 12th, thirty-eight below. Jake sets the plane down on the frozen creek below Owen's camp, and you have three hours of grey light.

The camp has been torn apart: tent slashed, crates emptied, stove kicked over. Whoever did this was looking for something. ${N.owenShort}'s second letter told you where to look.`,
    choices: () => [
      { label: 'Under the floorboards behind the cook-tent stove.', note: 'stove', next: dig('stove') },
      { label: 'The old meat cache up on stilts.', note: 'cache', next: dig('cache') },
      { label: 'Under the survey marker.', note: 'marker', next: dig('marker') },
    ],
  },
  {
    id: 'a3_wrong_spot',
    act,
    title: 'Lucy: Not Here',
    place: 'surveyCamp',
    clock: '1967-12-12T11:20',
    goal: cacheGoal,
    text: () => `
Nothing. Your fingers are going white. You reread the second letter with your mitts off and find the line, buried halfway down a page about the weather, and it costs you twenty minutes you didn't have.`,
    choices: () => [{ label: 'Dig in the right place.', note: 'dig', next: 'a3_found' }],
  },
  {
    id: 'a3_found',
    act,
    title: 'Lucy: The Cache',
    place: 'surveyCamp',
    clock: '1967-12-12T13:30',
    goal: 'Fly home with the cache.',
    text: () => `
An oilcloth bundle: field notebooks, a folder of claim maps, and four reels of tape labeled in Owen's tidy hand. You stuff them inside your parka.

Jake has the engine warm. You take off into the last of the light.`,
    choices: () => [{ label: 'Head home.', note: 'home', apply: pipe(addEvidence('tapes'), set({ owenCache: undefined })), next: 'a3_crash' }],
  },
  {
    id: 'a3_crash',
    act,
    title: 'Lucy: Engine Out',
    place: 'crashSite',
    clock: '1967-12-12T14:15',
    goal: `Keep ${jakeFirst} and yourself alive.`,
    text: () => `
Forty minutes out, the engine coughs. Then again. Jake swears and works the primer. "Fuel's icing," he says. "I drained the sumps, Lucy, I swear to God. Nothing came out but a little gas."

The engine quits. He puts the plane into a stand of black spruce on a hillside, and the world turns over.

When you come to, Jake is pinned and bleeding, the cabin is on its side, and it's getting dark for the next eighteen hours.`,
    choices: () => [
      { label: 'Build a fire first.', note: 'fire', apply: set({ nightOrder: 'fire' }), next: 'a3_survive_fire' },
      { label: 'Get Jake free and stop the bleeding first.', note: 'jake', apply: set({ nightOrder: 'jake' }), next: 'a3_survive_jake' },
    ],
  },
  {
    id: 'a3_survive_fire',
    act,
    title: 'Lucy: The Long Night',
    place: 'crashSite',
    clock: '1967-12-12T17:00',
    goal: nightGoal,
    text: () => `
You get a fire going in the lee of the fuselage first. By the time you get back to Jake, his lips are blue, but the fire is what saves him: you warm your hands and work the seat frame off his leg, and pack spruce boughs under him. The cold doesn't care how smart you are. It only cares what you do next.`,
    choices: (s) => survivalChoices(s),
  },
  {
    id: 'a3_survive_jake',
    act,
    title: 'Lucy: The Long Night',
    place: 'crashSite',
    clock: '1967-12-12T17:00',
    goal: nightGoal,
    text: () => `
You work the bent seat frame off Jake's leg with your bare hands and tie off the bleeding with your scarf. By the time you get a fire going in the lee of the fuselage, you can't feel your fingers. The cold doesn't care how smart you are. It only cares what you do next.`,
    choices: (s) => survivalChoices(s),
  },
  {
    id: 'a3_search',
    act,
    title: 'Wade: The Search',
    place: 'searchRidge',
    clock: '1967-12-13T10:00',
    goal: `Find ${N.lucy}'s plane.`,
    text: (s) => `
You are Wade again. When Jake's plane doesn't come back, the Rescue Coordination Center at Elmendorf calls Eielson for people to put on a ground team, and the team needs a munitions man for flares and signal charges. Your sergeant sends you.

They hand you cross-country skis. You grew up water skiing. How hard can it be?

Near the last known heading, the team splits up to cover more ground. You're on your own.

${searchSign(s)}`,
    choices: () => [
      { label: 'Take the long downhill run along the ridge. Balance is balance.', note: 'downhill', next: 'a3_ski_down' },
      { label: 'Climb straight up the creek drainage.', note: 'climb', next: 'a3_ski_up' },
    ],
  },
  {
    id: 'a3_ski_down',
    act,
    title: 'Kick and Glide',
    place: 'searchRidge',
    clock: '1967-12-13T11:00',
    goal: smokeGoal,
    text: (s) => `
The downhill is the easy part. Then the flats, where you can't figure out the kick and glide and fall on your face every ten yards.

${smokeAhead(s)}`,
    choices: () => [{ label: 'Follow it.', note: 'follow', next: 'a3_arm' }],
  },
  {
    id: 'a3_ski_up',
    act,
    title: 'Kick and Glide',
    place: 'searchRidge',
    clock: '1967-12-13T11:00',
    goal: smokeGoal,
    text: (s) => `
Climbing on skis is nothing like water skiing. You sweat through your layers, and then the sweat starts to freeze. Your toes go numb and stay that way.

${smokeAhead(s)}`,
    choices: () => [{ label: 'Follow it.', note: 'follow', next: 'a3_arm' }],
  },
  {
    id: 'a3_arm',
    act,
    title: 'The Wreck',
    place: 'crashSite',
    clock: '1967-12-13T11:30',
    goal: `Let ${N.lucy} deal with it.`,
    text: () => `
The plane is on its side in a stand of black spruce, one wing folded under it. A thread of smoke from a fire in the lee of the fuselage. Lucy is alive, waving you off the slope.

You don't listen. You plant your skis and reach down into the cabin to haul her up by the arm, and the snow under your skis gives way. You go down hard against the fuselage with your right arm under you.

You hear it before you feel it: a crack like green wood. Then you feel it.`,
    choices: () => [{ label: 'Yell. Then let Lucy deal with it.', note: 'yell', next: 'a3_wreck' }],
  },
  {
    id: 'a3_wreck',
    act,
    title: 'The Wreck',
    place: 'crashSite',
    clock: '1967-12-13T12:30',
    goal: `Decide whether to show ${jakeFirst} the sump.`,
    text: (s) => `
Lucy climbs out on her own, which is what she was trying to tell you. She splints your arm with a strip of aluminum off the wing strut, pulls off your boots and works the feeling back into your frozen toes until you swear at her, makes you eat, and tells you exactly what to do to stay alive until the rest of the team gets here. Your radio cracked under you in the fall, along with the arm. You still have the flares, but a flare in daylight over the spruce is gone before anybody turns his head; she tells you to save them for dark. She was doing fine before you got here.

${jakeAtFire(s)} He drifts in and out, muttering that he drained those sumps, he swears he did. "Uncle ${N.tolliverFirst}'ll never let me forget it," he says to nobody. "Always said I'd kill myself in one of these." You light a cigarette one-handed. Lucy, who hates the things, looks at you like you're something she stepped in.

You wander over to the engine to get away from her look. You know hardware. The fuel cap gasket has been cut, and the sump bowl is solid ice. And the sump drain is jammed with a sliver of wood, wired so it looks clean: when Jake drained it on preflight, nothing could come out but the little gas above the plug. Somebody poured water in this tank and made sure Jake couldn't find it.`,
    choices: () => [
      { label: `Wake Jake and show him. It wasn't his fault. And if Jake knew, he might make his uncle ${N.tolliverFirst} listen.`, note: 'wakeJake', apply: pipe(addEvidence('wreckProof'), set({ sharedWreck: true })), next: 'a3_home' },
      { label: 'Keep it to yourself until you know who.', note: 'keepIt', apply: addEvidence('wreckProof'), next: 'a3_home' },
    ],
  },
  {
    id: 'a3_home',
    act,
    title: 'Back in Town',
    place: 'hospital',
    clock: '1967-12-13T21:00',
    goal: 'Tell Eli where you stand.',
    text: (s) => `
${teamArrives(s)}

Eli meets you at the hospital. ${
      s.leakedFlightDate
        ? `He doesn't sit down.

"I was running fuel out to the bush strip the night before they flew. There was an Air Force staff car parked by Jake's plane. Your Major's car." He watches your face. "Four people knew that date, Wade. Me, Lucy, Jake, and you."

You feel sick. The only other place that date exists is the letter you wrote to your mother.`
        : `He's been asking around the strip.

"Curly was hanging around Jake's plane the whole week before they flew, watching him fuel up and load it. He knew when it was going. Nobody had to tell him."`
    }`,
    choices: (s) => [
      {
        label: s.leakedFlightDate ? 'Tell Eli the truth: you put the date in a letter to your mother.' : 'Tell Eli you\'ll back whatever he wants to do.',
        note: 'tellEli',
        apply: s.leakedFlightDate ? pipe(addEvidence('staffCar'), eliTrust(-1)) : eliTrust(1),
        next: 'a3_curly',
      },
      ...(s.leakedFlightDate
        ? [{ label: 'Lie. "I never told a soul."', note: 'lie', apply: pipe(addEvidence('staffCar'), eliTrust(-2)), next: 'a3_curly' } satisfies Choice]
        : [{ label: 'Tell Eli to leave it to the police.', note: 'police', next: 'a3_curly' } satisfies Choice]),
    ],
  },
  {
    id: 'a3_curly',
    act,
    title: 'The Bow',
    place: 'hospital',
    clock: '1967-12-26T11:00',
    goal: 'Get some air.',
    text: (s) => `
${s.curlyPlan === 'warn' ? `Lucy took Jake's tip straight to ${N.cop}, the officer who handed Curly back his twenty the night of the barfight. He's been watching Curly for weeks. When Curly breaks into a hunting cabin up the Chena Hot Springs road, the officer is waiting for him. Nobody gets hurt. Curly is shaking.` : s.curlyPlan === 'confront' ? `Curly bolts the week after the crash. ${N.cop} runs him down at a hunting cabin he's broken into. Curly fights the whole way to the car and spits at your name.` : `Nobody was watching Curly. Two weeks after the crash, ${N.cop} finds him in a hunting cabin up the Chena Hot Springs road that he'd broken into. He's been dead for days, shot through the chest with his own rifle. ${N.barnette} calls it a hunting accident inside of an hour. It's the second accident this year.`}

${s.curlyPlan === 'ignore' ? 'Beside him is a brand-new hunting bow, stolen, still strung. A left-handed one. He was waiting for somebody, and somebody came first.' : 'He\'d stolen a brand-new hunting bow. A left-handed one. He tells the officer it was for protection. From who, he won\'t say.'}${has(s, 'bruising') || texan(s) ? '\n\n' : ''}${has(s, 'bruising') ? 'A left-handed man. Joan said the bruises were from a left hand. ' : ''}${texan(s) ? `And Curly ties his bowlines backward, tail outside, like the one on Owen's sawhorse.\n\nYou give ${N.cop} the piece of line you cut off Owen's sawhorse. He takes it out to Curly's hangar and comes back with a coil of yellow tie-down line off Curly's workbench: the same braid, the same blue tracer thread running through it.` : ''}

${s.curlyPlan === 'ignore' ? 'Whatever Curly knew, he took it into the ground at Birch Hill.' : 'Curly is in a cell now, behind a door only the officer has the key to. Curly knows exactly what that means, and for the first time since August he sleeps.'}

A letter from Mama is waiting at the hospital desk. ${mamaReply(1)(s)}`,
    choices: () => [{ label: 'Continue.', note: 'continue', apply: addEvidence('curlyLefty'), next: 'a3_eli' }],
  },
  {
    id: 'a3_eli',
    act,
    title: 'What Eli Saw',
    place: 'hospitalLot',
    clock: '1967-12-26T15:30',
    goal: 'Decide what to do with what Eli told you.',
    text: (s) => `
Eli finds you in the hospital parking lot, smoking one-handed in the cold. ${s.eliTrust > 0 ? 'He\'s been carrying something since August.' : 'You are the last person he wants to tell. But Lucy nearly died, and you were on that hill, and there is nobody else.'}

"The night of the flood, I was out on the fish camp. Our fish camp. My grandfather's, and his mother's before him. Tolliver's had me banned off it for two years, says he'll have me arrested if I set foot there. I went back for my father's things before the water took them.

"Coming back, I saw a skiff tied up at the cabin where we found Owen. I didn't say anything, because then I'd have to say what I was doing out there."

He's telling you something that could put him in jail.`,
    choices: () => [
      { label: 'Keep it between you. "Nobody hears this from me."', note: 'quiet', apply: pipe(set({ eliTrespass: 'quiet' }), eliTrust(2)), next: 'a3_rash' },
      { label: 'Tell Barnette. A witness is a witness.', note: 'report', apply: pipe(set({ eliTrespass: 'report' }), eliTrust(-3)), next: 'a3_rash' },
      { label: 'Hold onto it. If it comes to it, it\'s a card you can play.', note: 'leverage', apply: pipe(set({ eliTrespass: 'leverage' }), eliTrust(-1)), next: 'a3_rash' },
    ],
  },
  {
    id: 'a3_rash',
    act,
    title: 'Enough',
    place: 'lucysKitchen',
    clock: '1967-12-27T19:00',
    goal: rashGoal,
    text: (s) => `
${s.eliTrespass === 'leverage' ? 'Eli reads your face before you say a word, and goes cold. He knows exactly what you just decided.\n\n' : s.eliTrespass === 'report' ? 'Eli finds out by evening that you went to Barnette. He doesn\'t come looking for you. That\'s worse.\n\n' : ''}Lucy nearly died. Jake can't walk. Your arm is in a cast.${has(s, 'hotelTalk') ? ' And you heard Tolliver yourself in that hotel bar: "my land, my title."' : ''}

Tolliver holds the fish camp. Lucy has always said the family's original application was never lost, just pulled from the files, and Tolliver is the one who'd want it kept. As far as you can see, Tolliver did this.

You tell Lucy you're going to do something about it. She lets you talk.`,
    choices: (s) => [...rashChoices(s), askGossip('a3_rash_gossip')],
  },
  { ...gossip('a3_rash_gossip', act, (s) => rashChoices(s)), place: 'nlCafe', clock: '1967-12-28T08:00', goal: rashGoal },
  {
    id: 'a3_rash_safe',
    act,
    title: 'One-Handed',
    place: 'tolliversOffice',
    clock: '1967-12-28T23:00',
    goal: `Blow ${N.tolliverLast}'s safe.`,
    text: () => `
You lift a demolition kit from the munitions bunker on a night shift, one-handed, and build a shaped charge on your bunk with your teeth and your good hand. You case Tolliver's office twice. Thursday night you walk down Cushman Street with it in a lunchbox.`,
    choices: () => [{ label: 'Go.', note: 'go', apply: heat(1), next: 'a3_confession_safe' }],
  },
  {
    id: 'a3_rash_burn',
    act,
    title: 'Kerosene',
    place: 'tolliversCabin',
    clock: '1967-12-29T01:50',
    goal: `Burn ${N.tolliverLast}'s cabin.`,
    text: () => `
You borrow a truck, buy two cans of kerosene at a gas station where nobody knows you, and drive out the road to Tolliver's hunting cabin at two in the morning.`,
    choices: () => [{ label: 'Go.', note: 'go', apply: heat(1), next: 'a3_confession_burn' }],
  },
  {
    id: 'a3_rash_gun',
    act,
    title: 'Borrowed Rifle',
    place: 'tolliversHouse',
    clock: '1967-12-28T21:30',
    goal: `Make ${N.tolliverLast} talk.`,
    text: () => `
You borrow a rifle from a guy in the barracks who doesn't ask questions, and you wait in the dark outside Tolliver's house for him to come home from the council meeting.`,
    choices: () => [{ label: 'Go.', note: 'go', apply: heat(1), next: 'a3_confession_gun' }],
  },
  {
    id: 'a3_rash_none',
    act,
    title: 'Barracks',
    place: 'eielsonBarracks',
    clock: '1967-12-29T00:00',
    goal: `Go out to ${N.lucy}.`,
    text: () => `
You go back to the barracks and lie on your bunk and tell yourself it isn't your business. At midnight the runner from the CQ desk bangs on your door: a phone call, a woman, and she says it can't wait.

It's Lucy, on the pay phone outside the main gate. "I can't get onto your base, Wade. Come out. I'm in my cousin's car, and I'm not saying the rest of it on a telephone."`,
    // The note keeps its old name (Lucy at the window): game/notes-allowlist.txt and the engine's menus key on it.
    choices: () => [{ label: 'Walk out past the gate and get in the car.', note: 'letHerIn', next: 'a3_confession_none' }],
  },
  confession('a3_confession_safe', 'tolliversOffice', '1967-12-28T23:15', stopped),
  confession('a3_confession_burn', 'tolliversCabin', '1967-12-29T02:00', stopped),
  confession('a3_confession_gun', 'tolliversHouse', '1967-12-28T21:45', `Lucy is beside you in the dark before the headlights ever turn in. She must have followed you.\n\n${stop}`),
  confession(
    'a3_confession_none',
    'lucysKitchen',
    '1967-12-29T01:00',
    'She drives the forty minutes into town without a word and doesn\'t turn on the kitchen light until the curtains are shut.\n\n"Barnette is building a case on you," she says. "Not tomorrow. But he\'s building it."',
  ),
  {
    id: 'a3_walk',
    act,
    title: 'Done',
    place: 'eielsonBarracks',
    clock: '1967-12-29T04:00',
    goal: winterGoal,
    text: (s) => `
You hand her the folder back and walk out into the dark. She doesn't call after you. ${walkBack(s)}

For the rest of the winter you work your shifts, keep your head down, and stay away from the land office.`,
    choices: () => [{ label: 'Continue.', note: 'continue', next: 'a3_joan' }],
  },
  {
    id: 'a3_turn',
    act,
    title: 'Trade',
    place: 'troopersPost',
    clock: '1967-12-29T10:00',
    goal: winterGoal,
    text: (s) => `
The next morning you go to ${N.barnette}. ${turnedIn(s)} You tell him she's been running a private investigation with stolen Air Force files, and that the forged sign-outs were her idea of a frame.

Barnette writes it all down. He doesn't thank you. By noon Lucy is suspended from the land office and her files are in an evidence locker.`,
    choices: () => [{ label: 'Continue.', note: 'continue', next: 'a3_joan' }],
  },
  {
    id: 'a3_joan',
    act,
    title: 'Letter Home, Dictated',
    place: 'hospital',
    clock: '1968-01-03T12:30',
    goal: 'Dictate your letter to Mama.',
    text: (s) => `
You can't write with your arm in a cast. ${N.joan} comes by on her break and offers to take down a letter for you. She has nice handwriting and she laughs at your spelling when you spell things out loud.

Before you start, Joan reads you the letter from Mama that came Tuesday.

${mamaReply(0)(s)}

Joan uncaps her pen. "Dear Mama," she says. "Go on."`,
    choices: () => [
      { label: 'Tell Mama the truth: the crash, the arm, the danger.', note: 'honest', apply: pipe(mom('honest'), joan(1)), next: 'a4_news' },
      { label: 'Tell her you slipped on the ice and broke your arm.', note: 'soft', apply: pipe(mom('soft'), joan(1)), next: 'a4_news' },
      { label: 'Ask Joan to leave the arm out of it entirely.', note: 'lie', apply: mom('lie'), next: 'a4_news' },
    ],
  },
]
