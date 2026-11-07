import type { Scene } from '../types.ts'
import { N } from '../names.ts'
import { addEvidence, has, set } from '../state.ts'
import { councilmanFlips, curlyTalks, iceJam } from '../logic.ts'

const act = 'Act 4: Breakup' as const

export const act4: readonly Scene[] = [
  {
    id: 'a4_news',
    act,
    title: 'Prudhoe Bay',
    text: (s) => `
March 1968. The radio says it before anybody believes it: oil at Prudhoe Bay, on the Arctic coast, maybe the biggest field in North America.

Everybody in Fairbanks suddenly knows why a road north matters. And why a fish camp on the best river crossing matters.

${s.afterConfession === 'stay' ? 'You sit with Lucy at her kitchen table and listen to Owen\'s tapes.' : 'Lucy listens to Owen\'s tapes without you. Eli tells you about it later, flatly.'} On the last reel, recorded a week before he died, Owen sounds tired: "Ashby wants the data early. Before the claims settle. I don't understand why a man helping the families needs it early."

Then Lucy finds a page in the Major's files: a land-office memo she gave to exactly one person outside her office. ${N.ashby}.${s.leakedFlightDate ? ' And the Major had no reason to care when a land clerk flew anywhere, unless someone asked him to find out.' : ''}`,
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
You try to see Curly in jail. He won't come out of his cell. The guard says he told the Trooper he'd rather rot than talk to anybody.`,
    choices: (s) => [
      { label: 'Continue.', apply: curlyTalks(s) ? addEvidence('curlyNamesAshby') : undefined, next: 'a4_offer' },
    ],
  },
  {
    id: 'a4_offer',
    act,
    title: 'The Offer',
    text: () => `
${N.ashby} invites you to lunch at the hotel. He orders for both of you.

"Wade, I'm going to be honest, because I like you. There's going to be a lot of money in this country now. The Air Force is going to court-martial somebody for those missing charges, and every page has your name on it. I can make those pages go away.

"There's a parcel on the river with your name on it, too, if you want it. A future. A nice girl. All you have to do is nothing."

So that's who it was the whole time.`,
    choices: () => [
      { label: 'Take the money.', apply: set({ offer: 'take' }), next: 'a4_jake' },
      { label: 'Refuse. Walk out.', apply: set({ offer: 'refuse' }), next: 'a4_jake' },
      { label: 'Shake his hand. Let him think he bought you, and get him talking.', apply: set({ offer: 'fake' }), next: 'a4_jake' },
    ],
  },
  {
    id: 'a4_jake',
    act,
    title: 'Family',
    text: (s) =>
      councilmanFlips(s)
        ? `
Jake is up on crutches. He went to see his uncle.

"I told him somebody put water in my fuel, Wade. I told him I almost died. He didn't know. He knew about the land. He didn't know about the plane." Jake looks out the window. "He's going to talk to the Trooper."`
        : `
Jake is up on crutches. He still thinks the crash was his fault, that he missed a sump drain in the cold. He won't fly again this year. His uncle sends flowers.`,
    choices: (s) => [
      { label: 'Continue.', apply: councilmanFlips(s) ? addEvidence('councilmanFlips') : undefined, next: 'a4_icejam' },
    ],
  },
  {
    id: 'a4_icejam',
    act,
    title: 'Breakup',
    text: (s) =>
      iceJam(s) === 'stopped'
        ? `
May. The river ice is groaning. Eli hears from a freighter downriver that a man in an Air Force parka has been walking the jam above the fish camp.

Eli knows that stretch of river better than anyone alive. You get there in his boat at dawn, through the floes, and find ${N.co} on the ice with a satchel of charges signed out in your name.

He looks at you and sits down on the ice. He's tired. He wanted to retire to Florida with a boat.`
        : `
May. In the middle of the night the ice jam above the fish camp goes up with a sound like artillery. The water comes through and takes the smokehouse, the drying racks, the cabin, the graves. Every sign that the family ever lived there is under the river.

By morning, Barnette has the demolition sign-outs. Every page says Wade Pruett.`,
    choices: () => [{ label: 'Continue.', next: 'a4_testify' }],
  },
  {
    id: 'a4_testify',
    act,
    title: 'On the Record',
    text: (s) => `
There's an Air Force inquiry into the missing charges, and ${N.barnette} has taken a case to a state grand jury.${has(s, 'curlyNamesAshby') ? ' He has Curly\'s statement.' : ''}${has(s, 'councilmanFlips') ? ' He has Tolliver.' : ''}

They want you. Testifying against your commander, with your own name on every sign-out sheet, could get you court-martialed.${s.offer === 'take' ? '\n\nAshby\'s money is already in a bank in Seattle.' : ''}`,
    choices: (s) =>
      s.offer === 'take'
        ? [{ label: 'Say nothing. You\'ve been paid.', apply: set({ testified: false }), next: 'end' }]
        : [
            { label: 'Testify. All of it.', apply: set({ testified: true }), next: 'end' },
            { label: 'Keep your head down and let it play out.', apply: set({ testified: false }), next: 'end' },
          ],
  },
]
