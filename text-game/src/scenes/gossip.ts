import type { Act, Choice, Scene, State } from '../types.ts'
import { N } from '../names.ts'
import { HEAT_LIMIT } from '../logic.ts'

const lawTalk = (s: State): string =>
  s.heat === 0
    ? `"Nobody's said your name, hon. Not the Troopers, not the city boys. You're just another airman who tips bad."`
    : s.heat < HEAT_LIMIT
      ? `"${N.barnette} was in Tuesday. Asked if I knew a Texas boy who runs with the river Indians. I said I know a lot of Texas boys." She refills your cup. "He's curious. He's not mad yet."`
      : s.heat === HEAT_LIMIT
        ? `"Vernon Barnette's got your name written down, hon. I saw it on his napkin. He's the kind who believes a man right up until the day he doesn't. You're close to that day."`
        : `"Vernon Barnette sat right where you're sitting and said your name three times in one cup of coffee. If he hauled you in tomorrow, he wouldn't believe a word you said, not even the true ones. Lay low, or don't count on him for anything."`

const lucyTalk = (s: State): string =>
  s.lucyHeat > 0
    ? `\n\n"And that land office girl. Barnette's been asking about a Native woman seen on the base at night. He doesn't have her name. Yet."`
    : ''

const intros: Readonly<Record<string, string>> = {
  a2_co_gossip: `${N.gossip} works the counter at the Northern Lights Café on Second Avenue. She ran the telephone switchboard for eleven years and her cousin is married to a city cop. Everything said in this town gets said over her coffee eventually.`,
  a2_heat_gossip: `The Northern Lights Café is warm and smells like burnt coffee. ${N.gossip}, the counter waitress who used to run the switchboard, slides a cup in front of you before you ask.`,
  a3_rash_gossip: `You go to the Northern Lights Café with your arm in a sling. ${N.gossip.split(' ')[0]}, the old switchboard operator behind the counter, clucks at the cast and pours you coffee you didn't order.`,
}

const outros: Readonly<Record<string, string>> = {
  a2_co_gossip: `She won't tell you whether what you're doing is worth it. "I just hear things, hon. I don't judge them."`,
  a2_heat_gossip: `"Whatever you're up to, I don't want to know it. I'd just have to tell somebody."`,
  a3_rash_gossip: `She looks at your cast. "You've got a face on you like a man about to do something. Think about who'd be glad you did it."`,
}

export const gossip = (id: string, act: Act, choicesFrom: (s: State) => readonly Choice[]): Scene => ({
  id,
  act,
  title: 'The Northern Lights Café',
  text: (s) => `
${intros[id] ?? intros.a2_co_gossip}

${lawTalk(s)}${lucyTalk(s)}

${outros[id] ?? outros.a2_co_gossip}`,
  choices: choicesFrom,
})

export const askGossip = (id: string): Choice => ({
  label: `Stop by the café first and hear what ${N.gossip.split(' ')[0]} has heard.`,
  next: id,
})
