import { mamaReply } from './mama.ts'
import type { Scene, State } from '../types.ts'
import { N } from '../names.ts'
import { addEvidence, has, set } from '../state.ts'
import { HEAT_LIMIT, councilmanFlips, lucyLetGo, curlyTalks, doubleAgentWorks, iceJam, jakeFrostbitten } from '../logic.ts'

const act = 'Act 4: Breakup' as const

// What the long night cost Jake (design: survival-night order), told where Act 4 first sees him, splicing the reel.
const jakeSplices = (s: State): string =>
  `The final reel cracked in the crash. ${
    jakeFrostbitten(s)
      ? 'The surgeon took three toes off Jake\'s left foot in February, once the line between dead and living showed, and Jake spliced the reel on crutches anyway.'
      : 'Jake spliced it over the winter on crutches, the leg in a cast, both feet whole.'
  }`

export const act4: readonly Scene[] = [
  {
    id: 'a4_news',
    act,
    title: 'Prudhoe Bay',
    text: (s) => `
March 1968. The radio says it before anybody believes it: oil at Prudhoe Bay, on the Arctic coast. Nobody knows how big yet.

Everybody in Fairbanks suddenly knows why a road north matters, and a pipeline after it, and why the gravel and the river crossings on the way matter. The best of both on the lower Chatanika are on Eli and Lucy's fish camp.

${s.afterConfession === 'stay' ? 'You sit with Lucy at her kitchen table and listen to the last of Owen\'s tapes.' : s.afterConfession === 'turn' ? `Lucy ${lucyLetGo(s) ? '' : 'is suspended and '}won't speak to you. You hear about Owen's tapes from ${N.gossipShort} at the café, secondhand.` : 'Lucy listens to the last of Owen\'s tapes without you. Eli tells you about it later, flatly.'} ${jakeSplices(s)} On the reel, recorded a week before he died, Owen sounds tired: "He wants the data early. Before the claims settle. I keep asking myself why a man helping the families needs it early. I'm starting to wonder who he's really working for."

Lucy plays it three times. She doesn't say who she thinks "he" is.

${mamaReply(2)(s)}`,
    choices: () => [{ label: 'Continue.', note: 'continue', next: 'a4_offer' }],
  },
  {
    id: 'a4_offer',
    act,
    title: 'The Offer',
    text: (s) => `
${N.ashby} invites you to lunch at the hotel. He orders for both of you.${has(s, 'hotelTalk') ? ' When he leans in and lowers his voice, you know it. The quiet man at the bar in October. "Before is what counts."' : ''}

"Wade, I'm going to be honest, because I like you. There's going to be a lot of money in this country now. The Air Force is going to court-martial somebody for those missing charges, and every page has your name on it. I can make those pages go away.

"There's a parcel on the river with your name on it, too, if you want it. A future. That nice nurse. All you have to do is nothing."

It was him. The lawyer helping the families. The man Owen trusted.`,
    choices: () => [
      { label: 'Take the money.', note: 'take', apply: set({ offer: 'take' }), next: 'a4_curly' },
      { label: 'Refuse. Walk out.', note: 'refuse', apply: set({ offer: 'refuse' }), next: 'a4_curly' },
      { label: 'Say you need a day to think. Then come back wired and get him talking. You\'ll need Lucy and Eli to back you.', note: 'fake', apply: set({ offer: 'fake' }), next: 'a4_wire' },
    ],
  },
  {
    id: 'a4_wire',
    act,
    title: 'The Wire',
    text: (s) =>
      doubleAgentWorks(s)
        ? `
Lucy tapes a pocket recorder inside your cast, with a microphone up your sleeve. Eli parks across from the hotel in case it goes bad.

At the second lunch you shake Ashby's hand and say yes. He relaxes the way men do when they think they've bought you, and brags more than he should: the survey money, the Major's pension, Curly, the plane. The tape runs out just as he picks up the check.`
        : `
You have nobody to wire you. ${s.afterConfession === 'stay' ? 'Eli won\'t look at you since what you did with his secret, and Lucy won\'t do it without him.' : 'Lucy won\'t answer her door.'} You buy a pocket recorder at the Army-Navy store and tape it in your cast yourself.

At the second lunch you shake Ashby's hand and say yes. He pats your cast, smiles, and talks about the weather for an hour. When you play the tape back, it's mostly silverware.`,
    choices: () => [{ label: 'Continue.', note: 'continue', next: 'a4_curly' }],
  },
  {
    id: 'a4_curly',
    act,
    title: 'Visiting Hours',
    text: (s) =>
      curlyTalks(s)
        ? `
Curly asks for you by name. In the visiting room he looks ten years older.

"You kept me alive, Wade. Your friend's tip did. So here it is. Ashby paid me. For Owen, and for the plane. I held Owen under myself. I'm going to hell for that and I know it. But I'm not going there alone."`
        : `
${s.curlyPlan === 'ignore' ? 'You go out to Birch Hill instead, where they buried Curly in a plot the county paid for. Nobody else came. Whatever he would have said about Owen, about the plane, about who paid him, is under the frozen ground with him.' : 'You try to see Curly in jail. He won\'t come out of his cell. The guard says he told the Trooper he\'d rather rot than talk to anybody.'}`,
    choices: (s) => [
      { label: 'Continue.', note: 'continue', apply: curlyTalks(s) ? addEvidence('curlyNamesAshby') : undefined, next: 'a4_jake' },
    ],
  },
  {
    id: 'a4_jake',
    act,
    title: 'Family',
    text: (s) =>
      councilmanFlips(s)
        ? `
Jake is up on crutches. Because you showed him the sump drain on that hillside, he knows the crash wasn't his fault. He went to see his uncle, ${N.tolliver}.

"I told him somebody put water in my fuel, Wade. I told him I almost died. He didn't know. He knew about the land. He didn't know about the plane." Jake looks out the window. "He's going to talk to the Trooper."`
        : `
Jake is up on crutches. Nobody ever told him about the sump drain, so he still thinks the crash was his fault, that he missed it in the cold. He won't fly again this year. His uncle, ${N.tolliver}, sends flowers.`,
    choices: (s) => [
      { label: 'Continue.', note: 'continue', apply: councilmanFlips(s) ? addEvidence('councilmanFlips') : undefined, next: 'a4_icejam' },
    ],
  },
  {
    id: 'a4_icejam',
    act,
    title: 'Breakup',
    text: (s) => `
May. The river ice is groaning. In July a land examiner from the BLM flies out to look at the fish camp for the family's claim. If the ice jam above the camp is blown, the water will take the smokehouse, the drying racks, the cabin, the graves: every sign of use the examiner would see from the air or on the ground. It wouldn't end the claim. The elders can still swear to fifty years of fishing that bend. But a claim with nothing left to look at can sit in a file for years, and years are all Ashby needs.

${
      iceJam(s) === 'stopped'
        ? `Eli hears from a freighter downriver that a man in an Air Force parka has been walking the jam. Eli knows that stretch of river better than anyone alive. You get there in his boat at dawn, through the floes, and find ${N.co} on the ice with a satchel of charges signed out in your name.

He sees you. For a second he just stands there with the satchel. Then he runs, out across the jam, toward the charges he's already set.`
        : `In the middle of the night the jam goes up with a sound like artillery. From the bluff, too late, you see a man in an Air Force parka running for a car with base plates. By morning the fish camp is under the river.

By noon, ${N.barnette} has the demolition sign-outs. Every page says Wade Pruett.`
    }`,
    choices: (s) =>
      iceJam(s) === 'stopped'
        ? [{ label: 'Go after him.', note: 'chase', next: 'a4_chase' }]
        : [{ label: 'Continue.', note: 'continue', next: 'a4_testify' }],
  },
  {
    id: 'a4_chase',
    act,
    title: 'Rotten Ice',
    text: () => `
The jam is a mile of broken slabs heaved up on edge, grinding against each other, groaning like a building coming down. The Major is fifty yards ahead, slipping, scrambling, the satchel banging on his hip. Between you is a lead of open black water, six feet across and widening.

Eli is shouting from the boat. You can't hear what.`,
    choices: () => [
      { label: 'Jump the open water after him.', note: 'jump', next: 'a4_chase_jump' },
      { label: 'Go around by the drift logs, the long way.', note: 'logs', next: 'a4_chase_logs' },
    ],
  },
  {
    id: 'a4_chase_jump',
    act,
    title: 'Rotten Ice',
    text: () => `
You jump. You make it with one boot. The other goes into the river to the knee, and the cold is like being hit with a hammer. Something grabs your collar and hauls you up onto the slab: Eli, who followed you across without a word and is looking at you like you're the dumbest man in Alaska.

But you're close now. Twenty yards. Ten.`,
    choices: () => [{ label: 'Run him down.', note: 'continue', next: 'a4_struggle' }],
  },
  {
    id: 'a4_chase_logs',
    act,
    title: 'Rotten Ice',
    text: () => `
You pick your way along a line of drift logs frozen into the jam, the way Eli taught you to read the river: stay on what's anchored, never on what's floating. It's slow. By the time you reach the far edge of the jam, the Major has made the cutbank and is clawing at the frozen mud to get up it.

He can't. The bank is too steep and too slick. He turns around with his back to it.`,
    choices: () => [{ label: 'Close in.', note: 'continue', next: 'a4_struggle' }],
  },
  {
    id: 'a4_struggle',
    act,
    title: 'One Arm',
    text: () => `
He swings the satchel at you, a full arc, and it catches your cast and sends a white bolt of pain up into your shoulder. He's twenty years older than you, and twenty pounds heavier, and you only have one working arm.

"Go home, Pruett," he says, breathing hard. "Go home to Texas. None of this was ever going to be yours."`,
    choices: () => [
      { label: 'Drop your good shoulder and drive him into the cutbank.', note: 'shoulder', next: 'a4_struggle_shoulder' },
      { label: 'Talk to him. He doesn\'t want this either.', note: 'talk', next: 'a4_struggle_talk' },
    ],
  },
  {
    id: 'a4_struggle_shoulder',
    act,
    title: 'One Arm',
    text: () => `
You pin the bad arm against your ribs and come in low under the satchel. Your good shoulder takes him square in the chest and drives him back into the cutbank, and the frozen mud knocks the wind out of him. The jolt goes through your broken arm anyway and you nearly black out. He slides down the bank onto the ice with you on top of him. You get your knee on the satchel strap. He stops fighting all at once, like somebody turned him off.`,
    choices: () => [{ label: 'Get the satchel off him.', note: 'continue', next: 'a4_defuse' }],
  },
  {
    id: 'a4_struggle_talk',
    act,
    title: 'One Arm',
    text: () => `
"You've got a boat picked out," you say. "In Florida. I saw the picture on your desk. You think Ashby's going to let you go fishing after this? You're the next Curly, sir."

He stares at you. The satchel slides off his shoulder onto the ice. He sits down next to it, all at once, an old man in a parka.`,
    choices: () => [{ label: 'Get the satchel.', note: 'continue', next: 'a4_defuse' }],
  },
  {
    id: 'a4_defuse',
    act,
    title: 'Fuse',
    text: () => `
"It's lit," he says. "I lit it before you got here."

He's not lying. Out on the jam, a thin grey thread of smoke crawls along a length of safety fuse toward a stack of charges wedged under the biggest slab. You know this fuse. You've counted it out on a supply shelf a hundred times. Forty seconds a foot, give or take, and there's maybe two feet left.

You have one good hand.`,
    choices: () => [
      { label: 'Run to the charges and pull the blasting cap out.', note: 'cap', next: 'a4_defuse_cap' },
      { label: 'Cut the fuse ahead of the burn with your pocketknife.', note: 'cut', next: 'a4_defuse_cut' },
      { label: 'Freeze.', note: 'freeze', next: 'a4_defuse_freeze' },
    ],
  },
  {
    id: 'a4_defuse_cap',
    act,
    title: 'Fuse',
    text: () => `
You get there with a foot of fuse left. The cap is crimped into the end of the fuse and pushed deep into the charge. You can't hold the charge and pull at the same time with one hand, so you pin it with your knee, get the cap between two fingers, and draw it out slow and steady, the way the manual says, the way you never thought you'd actually have to.

You throw the cap out over the open water. It pops like a firecracker. That's all.`,
    choices: () => [{ label: 'Breathe.', note: 'continue', next: 'a4_aftermath' }],
  },
  {
    id: 'a4_defuse_cut',
    act,
    title: 'Fuse',
    text: () => `
You get the pocketknife open with your teeth. The burn is crawling toward you, faster than it looks. You cut the fuse a hand's width ahead of it, a clean cut, and the burning end keeps going for a heartbeat and dies in the snow six inches short of the cut.

The rest of the fuse, and the charges, and the river, all just sit there.`,
    choices: () => [{ label: 'Breathe.', note: 'continue', next: 'a4_aftermath' }],
  },
  {
    id: 'a4_defuse_freeze',
    act,
    title: 'Fuse',
    text: () => `
You can't move. The smoke crawls along the fuse and you watch it like it's happening to somebody else.

"WADE." Eli, behind you, louder than you've ever heard him. "You count these things for a living. COUNT."

Forty seconds a foot. A foot left. Your hand remembers before you do. You're on your knees at the charges, and your one good hand pulls the cap out of the fuse end, and you're holding it up like a fool when it pops between your fingers and stings like a hornet.

Everything else stays quiet.`,
    choices: () => [{ label: 'Breathe.', note: 'continue', next: 'a4_aftermath' }],
  },
  {
    id: 'a4_aftermath',
    act,
    title: 'Breakup',
    text: (s) => `
Eli sits the Major down on a slab of ice and stands over him. Nobody says anything for a while. The river groans under all three of you.

Then the Major talks, to nobody in particular.

"Somebody got into my cabinet in October," he says. "My files. My handwriting on every one of those sheets.${s.leakedFlightDate ? ' And somebody saw my car at that strip the night before the flight.' : ''} Ashby knew all of it. He said the camp had to be gone before that examiner flies out in July, and breakup was the only time to do it. Finish this, or he gives Barnette a crooked officer instead of a Texas airman." He laughs, once. "I just wanted to retire to Florida with a boat."`,
    choices: () => [{ label: 'Take him in.', note: 'continue', next: 'a4_testify' }],
  },
  {
    id: 'a4_testify',
    act,
    title: 'On the Record',
    text: (s) => `
${N.barnette} comes to see you himself. He hates this, and he says so. The Air Force's investigators are running their own inquiry into the missing charges, and he's taken a case to a state grand jury. He has the piece of line you cut off Owen's sawhorse and the coil it matches from Curly's hangar. He has the Major's files, and in them a land-office memo Lucy gave to exactly one person outside her office: ${N.ashby}.${has(s, 'curlyNamesAshby') ? ' He has Curly\'s statement.' : ''}${has(s, 'councilmanFlips') ? ' He has Tolliver.' : ''}

${s.heat > HEAT_LIMIT ? 'He doesn\'t believe half of what you say, and he tells you so. You gave him too many reasons this winter.' : 'For the first time since August, he seems to believe you.'}${doubleAgentWorks(s) ? ' He has the tape from your cast.' : ''}

He wants you. Testifying against your commander, with your own name on every sign-out sheet, could get you court-martialed.${s.offer === 'take' ? '\n\nAshby\'s money is already in a bank in Seattle.' : ''}`,
    choices: (s) =>
      s.offer === 'take'
        ? [
            { label: 'Say nothing. You\'ve been paid.', note: 'silent', apply: set({ testified: false }), next: 'end' },
            { label: 'Testify anyway, with his money in your account.', note: 'testify', apply: set({ testified: true }), next: 'end' },
          ]
        : [
            { label: 'Testify. All of it.', note: 'testify', apply: set({ testified: true }), next: 'end' },
            { label: 'Keep your head down and let it play out.', note: 'silent', apply: set({ testified: false }), next: 'end' },
          ],
  },
]
