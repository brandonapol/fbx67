import { mamaReply } from './mama.ts'
import type { CacheSpot, Choice, Scene, SceneId, State } from '../types.ts'
import { askGossip, gossip } from './gossip.ts'
import { N } from '../names.ts'
import { addEvidence, eliTrust, has, heat, joan, lucyHeat, mom, pipe, set, texan } from '../state.ts'

const act = 'Act 3: Deep Winter' as const

const survivalChoices = (_: State): readonly Choice[] => [
  { label: 'Burn oil-soaked rags in a cowling panel for a smoke signal at first light.', next: 'a3_search' },
  { label: 'Stamp a big X in the snow on the open slope.', next: 'a3_search' },
  { label: 'Save everything for the fire and wait.', next: 'a3_search' },
]

const rashChoices = (_: State): readonly Choice[] => [
  { label: 'Blow the safe in Tolliver\'s office and take the stolen allotment file.', apply: set({ rashPlan: 'safe' }), next: 'a3_rash_safe' },
  { label: 'Burn down his hunting cabin.', apply: set({ rashPlan: 'burn' }), next: 'a3_rash_burn' },
  { label: 'Find him and put a gun in his face until he talks.', apply: set({ rashPlan: 'gunpoint' }), next: 'a3_rash_gun' },
  { label: 'Don\'t go after Tolliver. Not like this.', apply: set({ rashPlan: 'none' }), next: 'a3_rash_none' },
]

const dig = (spot: CacheSpot) => (s: State): SceneId => (s.owenCache === spot ? 'a3_found' : 'a3_wrong_spot')


export const act3: readonly Scene[] = [
  {
    id: 'a3_camp',
    act,
    title: 'Lucy: The Survey Camp',
    text: () => `
You are ${N.lucy}. December 12th, thirty-eight below. Jake sets the plane down on the frozen creek below Owen's camp, and you have three hours of grey light.

The camp has been torn apart: tent slashed, crates emptied, stove kicked over. Whoever did this was looking for something. Owen's letter told you where to look.`,
    choices: () => [
      { label: 'Under the floorboards behind the cook-tent stove.', next: dig('stove') },
      { label: 'The old meat cache up on stilts.', next: dig('cache') },
      { label: 'Under the survey marker.', next: dig('marker') },
    ],
  },
  {
    id: 'a3_wrong_spot',
    act,
    title: 'Lucy: Not Here',
    text: () => `
Nothing. Your fingers are going white. You reread the letter with your mitts off and find the right line, and it costs you twenty minutes you didn't have.`,
    choices: () => [{ label: 'Dig in the right place.', next: 'a3_found' }],
  },
  {
    id: 'a3_found',
    act,
    title: 'Lucy: The Cache',
    text: () => `
An oilcloth bundle: field notebooks, a folder of claim maps, and four reels of tape labeled in Owen's tidy hand. You stuff them inside your parka.

Jake has the engine warm. You take off into the last of the light.`,
    choices: () => [{ label: 'Head home.', apply: pipe(addEvidence('tapes'), set({ owenCache: undefined })), next: 'a3_crash' }],
  },
  {
    id: 'a3_crash',
    act,
    title: 'Lucy: Engine Out',
    text: () => `
Forty minutes out, the engine coughs. Then again. Jake swears and works the primer. "Fuel's icing," he says. "I drained the sumps, Lucy, I swear to God. Nothing came out but a little gas."

The engine quits. He puts the plane into a stand of black spruce on a hillside, and the world turns over.

When you come to, Jake is pinned and bleeding, the cabin is on its side, and it's getting dark for the next eighteen hours.`,
    choices: () => [
      { label: 'Build a fire first.', next: 'a3_survive_fire' },
      { label: 'Get Jake free and stop the bleeding first.', next: 'a3_survive_jake' },
    ],
  },
  {
    id: 'a3_survive_fire',
    act,
    title: 'Lucy: The Long Night',
    text: () => `
You get a fire going in the lee of the fuselage first. By the time you get back to Jake, his lips are blue, but the fire is what saves him: you warm your hands and work the seat frame off his leg, and pack spruce boughs under him. The cold doesn't care how smart you are. It only cares what you do next.`,
    choices: (s) => survivalChoices(s),
  },
  {
    id: 'a3_survive_jake',
    act,
    title: 'Lucy: The Long Night',
    text: () => `
You work the bent seat frame off Jake's leg with your bare hands and tie off the bleeding with your scarf. By the time you get a fire going in the lee of the fuselage, you can't feel your fingers. The cold doesn't care how smart you are. It only cares what you do next.`,
    choices: (s) => survivalChoices(s),
  },
  {
    id: 'a3_search',
    act,
    title: 'Wade: The Search',
    text: () => `
You are Wade again. When Jake's plane doesn't come back, the Rescue Coordination Center at Elmendorf calls Eielson for people to put on a ground team, and the team needs a munitions man for flares and signal charges. Your sergeant sends you.

They hand you cross-country skis. You grew up water skiing. How hard can it be?

Near the last known heading, the team splits up to cover more ground. You're on your own.`,
    choices: () => [
      { label: 'Take the long downhill run along the ridge. Balance is balance.', next: 'a3_ski_down' },
      { label: 'Climb straight up the creek drainage.', next: 'a3_ski_up' },
    ],
  },
  {
    id: 'a3_ski_down',
    act,
    title: 'Kick and Glide',
    text: () => `
The downhill is the easy part. Then the flats, where you can't figure out the kick and glide and fall on your face every ten yards.

Then you smell smoke.`,
    choices: () => [{ label: 'Follow it.', next: 'a3_wreck' }],
  },
  {
    id: 'a3_ski_up',
    act,
    title: 'Kick and Glide',
    text: () => `
Climbing on skis is nothing like water skiing. You sweat through your layers, and then the sweat starts to freeze. Your toes go numb and stay that way.

Then you smell smoke.`,
    choices: () => [{ label: 'Follow it.', next: 'a3_wreck' }],
  },
  {
    id: 'a3_wreck',
    act,
    title: 'The Wreck',
    text: () => `
You find them on the hillside. You try to haul Lucy up out of the fuselage, the snow gives, and you hear your own forearm snap.

Lucy splints your arm, makes you eat, and tells you exactly what to do to stay alive until the team finds the smoke. She was doing fine before you got here.

Jake drifts in and out by the fire, muttering that he drained those sumps, he swears he did. "Uncle Ray'll never let me forget it," he says to nobody. "Always said I'd kill myself in one of these." You light a cigarette one-handed. Lucy, who hates the things, looks at you like you're something she stepped in.

You wander over to the engine to get away from her look. You know hardware. The fuel cap gasket has been cut, and the sump bowl is solid ice. And the sump drain is jammed with a sliver of wood, wired so it looks clean: when Jake drained it on preflight, nothing could come out but the little gas above the plug. Somebody poured water in this tank and made sure Jake couldn't find it.`,
    choices: () => [
      { label: 'Wake Jake and show him. It wasn\'t his fault. And if Jake knew, he might make his uncle Ray listen.', apply: pipe(addEvidence('wreckProof'), set({ sharedWreck: true })), next: 'a3_home' },
      { label: 'Keep it to yourself until you know who.', apply: addEvidence('wreckProof'), next: 'a3_home' },
    ],
  },
  {
    id: 'a3_home',
    act,
    title: 'Back in Town',
    text: (s) =>
      s.leakedFlightDate
        ? `
Eli meets you at the hospital. He doesn't sit down.

"I was running fuel out to the bush strip the night before they flew. There was an Air Force staff car parked by Jake's plane. Your Major's car." He watches your face. "Four people knew that date, Wade. Me, Lucy, Jake, and you."

You feel sick. The only other place that date exists is the letter you wrote to your mother.`
        : `
Eli meets you at the hospital. He's been asking around the strip.

"Curly was hanging around Jake's plane the whole week before they flew, watching him fuel up and load it. He knew when it was going. Nobody had to tell him."`,
    choices: (s) => [
      {
        label: s.leakedFlightDate ? 'Tell Eli the truth: you put the date in a letter to your mother.' : 'Tell Eli you\'ll back whatever he wants to do.',
        apply: s.leakedFlightDate ? pipe(addEvidence('staffCar'), eliTrust(-1)) : eliTrust(1),
        next: 'a3_curly',
      },
      ...(s.leakedFlightDate
        ? [{ label: 'Lie. "I never told a soul."', apply: pipe(addEvidence('staffCar'), eliTrust(-2)), next: 'a3_curly' } satisfies Choice]
        : [{ label: 'Tell Eli to leave it to the police.', next: 'a3_curly' } satisfies Choice]),
    ],
  },
  {
    id: 'a3_curly',
    act,
    title: 'The Bow',
    text: (s) => `
${s.curlyPlan === 'warn' ? `Lucy took Jake's tip straight to ${N.cop}, the one man at Fairbanks PD nobody has ever bought. He's been watching Curly for weeks. When Curly breaks into a hunting cabin up the Chena Hot Springs road, the officer is waiting for him. Nobody gets hurt. Curly is shaking.` : s.curlyPlan === 'confront' ? `Curly bolts the week after the crash. ${N.cop} runs him down at a hunting cabin he's broken into. Curly fights the whole way to the car and spits at your name.` : `Nobody was watching Curly. Two weeks after the crash, ${N.cop} finds him in a hunting cabin up the Chena Hot Springs road that he'd broken into. He's been dead for days, shot through the chest with his own rifle. ${N.barnette} calls it a hunting accident inside of an hour. It's the second accident this year.`}

${s.curlyPlan === 'ignore' ? 'Beside him is a brand-new hunting bow, stolen, still strung. A left-handed one. He was waiting for somebody, and somebody came first.' : 'He\'d stolen a brand-new hunting bow. A left-handed one. He tells the officer it was for protection. From who, he won\'t say.'}${has(s, 'bruising') || texan(s) ? '\n\n' : ''}${has(s, 'bruising') ? 'A left-handed man. Joan said the bruises were from a left hand. ' : ''}${texan(s) ? `And Curly ties his bowlines backward, tail outside, like the one on Owen's sawhorse.\n\nYou give ${N.cop} the piece of line you cut off Owen's sawhorse. He takes it out to Curly's hangar and comes back with a coil of yellow tie-down line off Curly's workbench: the same braid, the same blue tracer thread running through it.` : ''}

${s.curlyPlan === 'ignore' ? 'Whatever Curly knew, he took it into the ground at Birch Hill.' : 'Curly is safe in a cell, where nobody can arrange an accident for him. The officer can\'t be bought, and Curly knows it.'}

A letter from Mama is waiting at the hospital desk. ${mamaReply(1)(s)}`,
    choices: () => [{ label: 'Continue.', apply: addEvidence('curlyLefty'), next: 'a3_eli' }],
  },
  {
    id: 'a3_eli',
    act,
    title: 'What Eli Saw',
    text: (s) => `
Eli finds you in the hospital parking lot, smoking one-handed in the cold. ${s.eliTrust > 0 ? 'He\'s been carrying something since August.' : 'You are the last person he wants to tell. But Lucy nearly died, and you were on that hill, and there is nobody else.'}

"The night of the flood, I was out on the fish camp. Our fish camp. My grandfather's, and his mother's before him. Tolliver's had me banned off it for two years, says he'll have me arrested if I set foot there. I went back for my father's things before the water took them.

"Coming back, I saw a skiff tied up at the cabin where we found Owen. I didn't say anything, because then I'd have to say what I was doing out there."

He's telling you something that could put him in jail.`,
    choices: () => [
      { label: 'Keep it between you. "Nobody hears this from me."', apply: pipe(set({ eliTrespass: 'quiet' }), eliTrust(2)), next: 'a3_rash' },
      { label: 'Tell Barnette. A witness is a witness.', apply: pipe(set({ eliTrespass: 'report' }), eliTrust(-3)), next: 'a3_rash' },
      { label: 'Hold onto it. If it comes to it, it\'s a card you can play.', apply: pipe(set({ eliTrespass: 'leverage' }), eliTrust(-1)), next: 'a3_rash' },
    ],
  },
  {
    id: 'a3_rash',
    act,
    title: 'Enough',
    text: (s) => `
${s.eliTrespass === 'leverage' ? 'Eli reads your face before you say a word, and goes cold. He knows exactly what you just decided.\n\n' : s.eliTrespass === 'report' ? 'Eli finds out by evening that you went to Barnette. He doesn\'t come looking for you. That\'s worse.\n\n' : ''}Lucy nearly died. Jake can't walk. Your arm is in a cast.${has(s, 'hotelTalk') ? ' And you heard Tolliver yourself in that hotel bar: "my land, my title."' : ''}

Tolliver holds the fish camp. Lucy has always said the family's original application was never lost, just pulled from the files, and Tolliver is the one who'd want it kept. As far as you can see, Tolliver did this.

You tell Lucy you're going to do something about it. She lets you talk.`,
    choices: (s) => [...rashChoices(s), askGossip('a3_rash_gossip')],
  },
  gossip('a3_rash_gossip', act, (s) => rashChoices(s)),
  {
    id: 'a3_rash_safe',
    act,
    title: 'One-Handed',
    text: () => `
You lift a demolition kit from the munitions bunker on a night shift, one-handed, and build a shaped charge on your bunk with your teeth and your good hand. You case Tolliver's office twice. Thursday night you walk down Cushman Street with it in a lunchbox.`,
    choices: () => [{ label: 'Go.', apply: heat(1), next: 'a3_confession' }],
  },
  {
    id: 'a3_rash_burn',
    act,
    title: 'Kerosene',
    text: () => `
You borrow a truck, buy two cans of kerosene at a gas station where nobody knows you, and drive out the road to Tolliver's hunting cabin at two in the morning.`,
    choices: () => [{ label: 'Go.', apply: heat(1), next: 'a3_confession' }],
  },
  {
    id: 'a3_rash_gun',
    act,
    title: 'Borrowed Rifle',
    text: () => `
You borrow a rifle from a guy in the barracks who doesn't ask questions, and you wait in the dark outside Tolliver's house for him to come home from the council meeting.`,
    choices: () => [{ label: 'Go.', apply: heat(1), next: 'a3_confession' }],
  },
  {
    id: 'a3_rash_none',
    act,
    title: 'Barracks',
    text: () => `
You go back to the barracks and lie on your bunk and tell yourself it isn't your business. At midnight somebody knocks on the window. It's Lucy, and she's been running.`,
    choices: () => [{ label: 'Let her in.', next: 'a3_confession' }],
  },
  {
    id: 'a3_confession',
    act,
    title: 'Lucy',
    text: (s) => `
${s.rashPlan === 'none' ? '"Barnette is building a case on you," she says. "Not tomorrow. But he\'s building it."' : 'Lucy steps out of the dark before you get there. She must have followed you.\n\n"Stop. Wade, stop. If you do this, they win. Anything you do tonight is exactly what they need."'}

She has a folder. It's the Major's files, finally read through. Munitions sign-out sheets: demolition charges, dozens of them, going back to October. Every one is signed Wade Pruett. You didn't sign any of them. Behind them, typed copies of your letters to your mother. The Major has been reading your mail since August.${s.leakedFlightDate ? ' Your letter with the date of Lucy\'s flight went out in November, right across his desk.' : ''}

"They've been building you for weeks. You're the fall guy." She takes a breath. "And you should know something else. I picked you in August because you had base access. That's why. I needed somebody inside, and you were easy. It's not why now. But it's why then."`,
    choices: () => [
      { label: 'Stay. "Then we finish this. Together."', apply: set({ afterConfession: 'stay' }), next: 'a3_joan' },
      { label: 'Walk away. You\'re done being anybody\'s tool.', apply: set({ afterConfession: 'walk' }), next: 'a3_walk' },
      { label: 'Turn on her. If she used you, you can use her.', apply: set({ afterConfession: 'turn' }), next: 'a3_turn' },
    ],
  },
  {
    id: 'a3_walk',
    act,
    title: 'Done',
    text: () => `
You hand her the folder back and walk out into the dark. She doesn't call after you. For the rest of the winter you work your shifts, keep your head down, and stay away from the land office.`,
    choices: () => [{ label: 'Continue.', next: 'a3_joan' }],
  },
  {
    id: 'a3_turn',
    act,
    title: 'Trade',
    text: () => `
The next morning you go to ${N.barnette}. You tell him who the Native woman on the base was, and that she's been running a private investigation with stolen Air Force files. You tell him the forged sign-outs were her idea of a frame.

Barnette writes it all down. He doesn't thank you. By noon Lucy is suspended from the land office and her files are in an evidence locker.`,
    choices: () => [{ label: 'Continue.', apply: lucyHeat(2), next: 'a3_joan' }],
  },
  {
    id: 'a3_joan',
    act,
    title: 'Letter Home, Dictated',
    text: (s) => `
You can't write with your arm in a cast. ${N.joan} comes by on her break and offers to take down a letter for you. She has nice handwriting and she laughs at your spelling when you spell things out loud.

Before you start, Joan reads you the letter from Mama that came Tuesday.

${mamaReply(0)(s)}

Joan uncaps her pen. "Dear Mama," she says. "Go on."`,
    choices: () => [
      { label: 'Tell Mama the truth: the crash, the arm, the danger.', apply: pipe(mom('honest'), joan(1)), next: 'a4_news' },
      { label: 'Tell her you slipped on the ice and broke your arm.', apply: pipe(mom('soft'), joan(1)), next: 'a4_news' },
      { label: 'Ask Joan to leave the arm out of it entirely.', apply: mom('lie'), next: 'a4_news' },
    ],
  },
]
