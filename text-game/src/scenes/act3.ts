import type { CacheSpot, Scene, State } from '../types.ts'
import { N } from '../names.ts'
import { addEvidence, eliTrust, has, heat, joan, lefty, mom, pipe, set, texan } from '../state.ts'

const act = 'Act 3: Deep Winter' as const

const dig = (spot: CacheSpot) => (s: State): string => (s.owenCache === spot ? 'a3_found' : 'a3_wrong_spot')


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
Forty minutes out, the engine coughs. Then again. Jake swears and works the primer. "Fuel's icing," he says. "I drained those sumps, Lucy, I swear to God I drained them."

The engine quits. He puts the plane into a stand of black spruce on a hillside, and the world turns over.

When you come to, Jake is pinned and bleeding, the cabin is on its side, and it's getting dark for the next eighteen hours.`,
    choices: () => [
      { label: 'Build a fire first.', next: 'a3_survive' },
      { label: 'Get Jake free and stop the bleeding first.', next: 'a3_survive' },
    ],
  },
  {
    id: 'a3_survive',
    act,
    title: 'Lucy: The Long Night',
    text: () => `
You get a fire going in the lee of the fuselage and pack spruce boughs under Jake. The cold doesn't care how smart you are. It only cares what you do next.`,
    choices: () => [
      { label: 'Burn oil-soaked rags in a hubcap for a smoke signal at first light.', next: 'a3_search' },
      { label: 'Stamp a big X in the snow on the open slope.', next: 'a3_search' },
      { label: 'Save everything for the fire and wait.', next: 'a3_search' },
    ],
  },
  {
    id: 'a3_search',
    act,
    title: 'The Search',
    text: () => `
You are Wade again. When Jake's plane doesn't come back, the rescue team out of Eielson needs a munitions man for flares and signal charges. You make sure it's you.

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

Later, by the fire, you light a cigarette and pass it to Jake. Lucy looks at you like you're something she stepped in.

Jake points the cigarette at the engine cowling. "Look at the sump drain." It's backed out a quarter turn and wired so it looks tight. Somebody put water in the fuel on purpose.`,
    choices: () => [
      { label: 'Tell Jake what it means: somebody wanted this plane down. He should know.', apply: pipe(addEvidence('wreckProof'), set({ sharedWreck: true })), next: 'a3_home' },
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
        label: s.leakedFlightDate ? 'Tell Eli the truth about the letter.' : 'Ask Eli what he wants to do.',
        apply: s.leakedFlightDate ? pipe(addEvidence('staffCar'), eliTrust(-1)) : eliTrust(1),
        next: 'a3_curly',
      },
    ],
  },
  {
    id: 'a3_curly',
    act,
    title: 'The Bow',
    text: (s) => `
${s.curlyPlan === 'warn' ? `Because Lucy passed on Jake's tip, ${N.cop} has been watching Curly for weeks. When Curly breaks into a hunting cabin up the Chena Hot Springs road, the officer is waiting for him. Nobody gets hurt. Curly is shaking.` : s.curlyPlan === 'confront' ? `Curly bolts the week after the crash. ${N.cop} runs him down at a hunting cabin he's broken into. Curly fights the whole way to the car and spits at your name.` : `Two weeks after the crash, ${N.cop} arrests Curly for breaking into a hunting cabin. By then he's half-starved and furious at everybody.`}

He'd stolen a brand-new hunting bow. A left-handed one.${lefty(s) || texan(s) ? '\n\n' : ''}${lefty(s) ? 'A left-handed man. Joan said the bruises were from a left hand. ' : ''}${texan(s) ? 'And Curly ties his bowlines backward, like a Texas ranch hand.' : ''}

Curly is safe in a cell, where nobody can arrange an accident for him. The officer can't be bought, and Curly knows it.`,
    choices: () => [{ label: 'Go find Eli.', apply: addEvidence('curlyLefty'), next: 'a3_eli' }],
  },
  {
    id: 'a3_eli',
    act,
    title: 'What Eli Saw',
    text: () => `
Eli finds you in the hospital parking lot, smoking one-handed in the cold. He's been carrying something since August.

"The night of the flood, I was out on the fish camp. Our fish camp. Tolliver's had me banned off it for two years, says he'll have me arrested if I set foot there. I went back for my father's things before the water took them.

"Coming back, I saw a skiff tied up at the cabin where we found Owen. I didn't say anything, because then I'd have to say what I was doing out there."

He's telling you something that could put him in jail.`,
    choices: () => [
      { label: 'Keep it between you. "Nobody hears this from me."', apply: pipe(set({ eliTrespass: 'quiet' }), eliTrust(2)), next: 'a3_rash' },
      { label: 'Tell Barnette. A witness is a witness.', apply: pipe(set({ eliTrespass: 'report' }), eliTrust(-3)), next: 'a3_rash' },
      { label: 'Hold onto it. It might be useful later.', apply: pipe(set({ eliTrespass: 'leverage' }), eliTrust(-1)), next: 'a3_rash' },
    ],
  },
  {
    id: 'a3_rash',
    act,
    title: 'Enough',
    text: (s) => `
Lucy nearly died. Jake can't walk. Your arm is in a cast.${has(s, 'hotelTalk') ? ' And you heard Tolliver yourself in that hotel bar: "my land, my title."' : ''}

Tolliver holds the fish camp. Tolliver wants it to stay his. As far as you can see, Tolliver did this.

You tell Lucy you're going to do something about it. She lets you talk.`,
    choices: () => [
      { label: 'Blow the safe in Tolliver\'s office and take the stolen allotment file.', apply: set({ rashPlan: 'safe' }), next: 'a3_rash_safe' },
      { label: 'Burn down his hunting cabin.', apply: set({ rashPlan: 'burn' }), next: 'a3_rash_burn' },
      { label: 'Find him and put a gun in his face until he talks.', apply: set({ rashPlan: 'gunpoint' }), next: 'a3_rash_gun' },
    ],
  },
  {
    id: 'a3_rash_safe',
    act,
    title: 'One-Handed',
    text: () => `
You sign out a demolition kit for "training," one-handed, and build a shaped charge on your bunk with your teeth and your good hand. You case Tolliver's office twice. Thursday night you walk down Cushman Street with it in a lunchbox.`,
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
    id: 'a3_confession',
    act,
    title: 'Lucy',
    text: () => `
Lucy steps out of the dark before you get there. She must have followed you.

"Stop. Wade, stop. If you do this, they win. Anything you do tonight is exactly what they need."

She has a folder. It's the Major's files, finally read through. Munitions sign-out sheets: demolition charges, dozens of them, going back to October. Every one is signed Wade Pruett. You didn't sign any of them.

"They've been building you for weeks. You're the fall guy." She takes a breath. "And you should know something else. I picked you in August because you had base access. That's why. I needed somebody inside, and you were easy. It's not why now. But it's why then."`,
    choices: () => [
      { label: 'Stay. "Then we finish this. Together."', apply: set({ afterConfession: 'stay' }), next: 'a3_joan' },
      { label: 'Walk away. You\'re done being anybody\'s tool.', apply: set({ afterConfession: 'walk' }), next: 'a3_joan' },
      { label: 'Turn on her. If she used you, you can use her.', apply: set({ afterConfession: 'turn' }), next: 'a3_joan' },
    ],
  },
  {
    id: 'a3_joan',
    act,
    title: 'Letter Home, Dictated',
    text: () => `
You can't write with your arm in a cast. ${N.joan} comes by on her break and offers to take down a letter for you. She has nice handwriting and she laughs at your spelling when you spell things out loud.

Dear Mama,`,
    choices: () => [
      { label: 'Tell Mama the truth: the crash, the arm, the danger.', apply: pipe(mom('honest'), joan(1)), next: 'a4_news' },
      { label: 'Tell her you slipped on the ice and broke your arm.', apply: pipe(mom('soft'), joan(1)), next: 'a4_news' },
      { label: 'Ask Joan to leave the arm out of it entirely.', apply: mom('lie'), next: 'a4_news' },
    ],
  },
]
