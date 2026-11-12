import type { Act, Choice, Scene, SceneId, State } from '../types.ts'
import { N } from '../names.ts'
import { HEAT_LIMIT, lucyLetGo } from '../logic.ts'

const visits = ['a2_co_gossip', 'a2_heat_gossip', 'a3_rash_gossip'] as const satisfies readonly SceneId[]

export type GossipId = (typeof visits)[number]

// The café visits, in story order: the engine plays these, and only these, in the café (game/src/dottiesCafe.ts).
export const GOSSIP_VISITS: readonly GossipId[] = visits

const tiers: readonly (readonly string[])[] = [
  [
    `"You're not on anybody's list, hon. Not the Troopers, not the city boys. Just another airman who tips bad."`,
    `"Barnette's got bigger fish this month. You're not on anybody's list that I've heard."`,
    `"Funny thing. With everything going on, the law isn't looking at you. Keep it that way."`,
  ],
  [
    `"${N.barnette} was in Tuesday. Asked if I knew a Texas boy who runs with the river Indians. I said I know a lot of Texas boys." She refills your cup. "He's curious. He's not mad yet."`,
    `"Barnette asked about you again. Just asking. He's the type who files things away."`,
    `"Barnette's still curious about you. Curious isn't trouble. Not yet."`,
  ],
  [
    `"${N.barnetteFull}'s got your name written down, hon. I saw it on his napkin. He's the kind who believes a man right up until the day he doesn't. You're close to that day."`,
    `"Barnette's got a little notebook now, and your name's in it. One more thing and he's done believing you."`,
    `"You're right at the edge with Barnette, hon. One more reason and he'll never take your word on anything."`,
  ],
  [
    `"${N.barnetteFull} sat right where you're sitting and said your name three times in one cup of coffee. If he hauled you in tomorrow, he wouldn't believe a word you said, not even the true ones. Lay low, or don't count on him for anything."`,
    `"Barnette's past curious. He thinks you're dirty. Whatever you tell him now, he'll assume it's a lie."`,
    `"I'll be honest, hon. Barnette wouldn't believe you if you told him it was snowing. You've used up his patience."`,
  ],
]

const tierOf = (heat: number): number => (heat === 0 ? 0 : heat < HEAT_LIMIT ? 1 : heat === HEAT_LIMIT ? 2 : 3)

const lawTalk = (s: State, id: GossipId): string => tiers[tierOf(s.heat)][visits.indexOf(id)]

const lucyTalk = (s: State): string =>
  s.lucyHeat > 0
    ? `\n\n"And ${lucyLetGo(s) ? 'that girl the land office let go' : 'that land office girl'}. Barnette's been asking about a Native woman seen on the base at night. He doesn't have her name. Yet."`
    : ''

const intros: Readonly<Record<GossipId, string>> = {
  a2_co_gossip: `${N.gossip} works the counter at the Northern Lights Café on Second Avenue. She ran the telephone switchboard for eleven years and her cousin is married to a city cop. Everything said in this town gets said over her coffee eventually.`,
  a2_heat_gossip: `The Northern Lights Café is warm and smells like burnt coffee. ${N.gossip}, the counter waitress who used to run the switchboard, slides a cup in front of you before you ask.`,
  a3_rash_gossip: `You go to the Northern Lights Café with your arm in a sling. ${N.gossipShort}, the old switchboard operator behind the counter, clucks at the cast and pours you coffee you didn't order.`,
}

const outros: Readonly<Record<GossipId, string>> = {
  a2_co_gossip: `She won't tell you whether what you're doing is worth it. "I just hear things, hon. I don't judge them."`,
  a2_heat_gossip: `"Whatever you're up to, I don't want to know it. I'd just have to tell somebody."`,
  a3_rash_gossip: `She looks at your cast. "You've got a face on you like a man about to do something. Think about who'd be glad you did it."`,
}

export const gossip = (id: GossipId, act: Act, choicesFrom: (s: State) => readonly Choice[]): Scene => ({
  id,
  act,
  title: 'The Northern Lights Café',
  text: (s) => `
${intros[id]}

${lawTalk(s, id)}${lucyTalk(s)}

${outros[id]}`,
  choices: choicesFrom,
})

export const askGossip = (id: GossipId): Choice => ({
  label: `Stop by the café first and hear what ${N.gossipShort} has heard.`,
  note: 'gossip',
  next: id,
})
