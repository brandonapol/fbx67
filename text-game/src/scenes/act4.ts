import { mamaReply } from './mama.ts'
import type { Scene } from '../types.ts'
import { N } from '../names.ts'
import { addEvidence, has, set } from '../state.ts'
import { HEAT_LIMIT, councilmanFlips, curlyTalks, doubleAgentWorks, iceJam } from '../logic.ts'

const act = 'Act 4: Breakup' as const

export const act4: readonly Scene[] = [
  {
    id: 'a4_news',
    act,
    title: 'Prudhoe Bay',
    text: (s) => `
March 1968. The radio says it before anybody believes it: oil at Prudhoe Bay, on the Arctic coast. Nobody knows how big yet.

Everybody in Fairbanks suddenly knows why a road north matters, and a pipeline after it, and why the gravel and the river crossings on the way matter. The best of both on the lower Chatanika are on Eli and Lucy's fish camp.

${s.afterConfession === 'stay' ? 'You sit with Lucy at her kitchen table and listen to the last of Owen\'s tapes.' : s.afterConfession === 'turn' ? 'Lucy is suspended and won\'t speak to you. You hear about Owen\'s tapes from Dottie at the café, secondhand.' : 'Lucy listens to the last of Owen\'s tapes without you. Eli tells you about it later, flatly.'} The final reel cracked in the crash, and it took Jake all winter on crutches to splice it. On it, recorded a week before he died, Owen sounds tired: "He wants the data early. Before the claims settle. I keep asking myself why a man helping the families needs it early. I'm starting to wonder who he's really working for."

Lucy plays it three times. She doesn't say who she thinks "he" is.

${mamaReply(2)(s)}`,
    choices: () => [{ label: 'Continue.', next: 'a4_offer' }],
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
      { label: 'Take the money.', apply: set({ offer: 'take' }), next: 'a4_curly' },
      { label: 'Refuse. Walk out.', apply: set({ offer: 'refuse' }), next: 'a4_curly' },
      { label: 'Say you need a day to think. Then come back wired and get him talking. You\'ll need Lucy and Eli to back you.', apply: set({ offer: 'fake' }), next: 'a4_wire' },
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
    choices: () => [{ label: 'Continue.', next: 'a4_curly' }],
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
      { label: 'Continue.', apply: curlyTalks(s) ? addEvidence('curlyNamesAshby') : undefined, next: 'a4_jake' },
    ],
  },
  {
    id: 'a4_jake',
    act,
    title: 'Family',
    text: (s) =>
      councilmanFlips(s)
        ? `
Jake is up on crutches. Because you showed him the sump drain on that hillside, he knows the crash wasn't his fault. He went to see his uncle, Ray Tolliver.

"I told him somebody put water in my fuel, Wade. I told him I almost died. He didn't know. He knew about the land. He didn't know about the plane." Jake looks out the window. "He's going to talk to the Trooper."`
        : `
Jake is up on crutches. Nobody ever told him about the sump drain, so he still thinks the crash was his fault, that he missed it in the cold. He won't fly again this year. His uncle, Ray Tolliver, sends flowers.`,
    choices: (s) => [
      { label: 'Continue.', apply: councilmanFlips(s) ? addEvidence('councilmanFlips') : undefined, next: 'a4_icejam' },
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

He looks at you and sits down on the ice. He's tired.

"Somebody got into my cabinet in October," he says. "My files. My handwriting on every one of those sheets.${s.leakedFlightDate ? ' And somebody saw my car at that strip the night before the flight.' : ''} Ashby knew all of it. He said the camp had to be gone before that examiner flies out in July, and breakup was the only time to do it. Finish this, or he gives Barnette a crooked officer instead of a Texas airman." He laughs, once. "I just wanted to retire to Florida with a boat."`
        : `In the middle of the night the jam goes up with a sound like artillery. From the bluff, too late, you see a man in an Air Force parka running for a car with base plates. By morning the fish camp is under the river.

By noon, ${N.barnette} has the demolition sign-outs. Every page says Wade Pruett.`
    }`,
    choices: () => [{ label: 'Continue.', next: 'a4_testify' }],
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
            { label: 'Say nothing. You\'ve been paid.', apply: set({ testified: false }), next: 'end' },
            { label: 'Testify anyway, with his money in your account.', apply: set({ testified: true }), next: 'end' },
          ]
        : [
            { label: 'Testify. All of it.', apply: set({ testified: true }), next: 'end' },
            { label: 'Keep your head down and let it play out.', apply: set({ testified: false }), next: 'end' },
          ],
  },
]
