import type { Scene, State } from '../types.ts'
import { N } from '../names.ts'
import { curlyFate, doubleAgentWorks, eliJailed, ending, iceJam, middleFlavor, momVerdict } from '../logic.ts'

const headline = (s: State): string => {
  const e = ending(s)
  if (e === 'best')
    return `${N.barnette} puts the cuffs on ${N.ashby} himself, on the steps of the courthouse, in front of the newspaper. He doesn't look at you. Then he does, and nods once. ${doubleAgentWorks(s) ? 'Your recording of that lunch at the hotel is what the grand jury keeps asking to hear again.' : ''}`
  if (e === 'good')
    return `Your testimony and Lucy's paper trail make the front page. ${N.ashby} is never charged, but the company calls him back Outside and he never comes north again. The family's allotment claim is reopened, and this time it holds.`
  if (e === 'bad')
    return s.offer === 'fake'
      ? `You tried to play Ashby. But you'd already lied to the people who could have backed you up, and when it came apart, nobody believed which side you were on. Ashby did. He paid you anyway, to make sure.`
      : s.afterConfession === 'turn' && s.offer !== 'take'
        ? `You turned on Lucy, and Ashby knew it before she did. In the end, he didn't even have to pay you much. Ashby wins.`
        : `Ashby keeps his word. The Air Force pages disappear. A parcel on the river is deeded to Wade Pruett. Ashby wins.`
  const f = middleFlavor(s)
  return f === 'burn'
    ? `Some of them go down. The Major is quietly discharged, and Curly goes to prison for the burglary. ${N.ashby} walks. One night that spring his office burns to the studs, and nobody can prove who did it. Barnette always said you were dangerous.`
    : f === 'walked'
      ? `Some of them go down. The Major is quietly discharged, and Curly goes to prison for the burglary. ${N.ashby} walks. You weren't there for the end of it. You'd already walked away.`
      : `Some of them go down. The Major is quietly discharged, and Curly goes to prison for the burglary. ${N.ashby} walks. Lucy is sure it was him. She can't prove it. The oil money arrives anyway.`
}

const epilogues = (s: State): readonly string[] => {
  const e = ending(s)
  const fate = curlyFate(s)
  return [
    `ELI: ${eliJailed(s) ? 'Charged with trespass and put near the murder scene by his own admission. He serves two years for something he only witnessed.' : s.eliTrust >= 3 ? 'Back on the river by June. He names his new boat after Owen.' : 'Back on the river by June. He nods at you on the street, but he doesn\'t stop to talk.'}`,
    `LUCY: ${e === 'bad' ? 'Loses her job at the land office. Keeps the case files in a trunk for the rest of her life.' : e === 'middle' ? 'Keeps working the claim, one lost form at a time.' : 'Goes to work for the Alaska Federation of Natives on the claims settlement.'}${s.lucyHeat > 0 ? ' Barnette never does put a name to the woman seen on the base.' : ''}`,
    `CURLY: ${fate === 'testifies' ? 'Testifies against Ashby and gets life instead of the chair. Nobody arranges an accident.' : fate === 'buried' ? 'Convicted of burglary. The murder disappears. He dies in prison two years later of "pneumonia."' : 'Convicted of burglary only. The murder stays a secret that Wade, Lucy, and Eli carry.'}`,
    `JAKE: ${s.sharedWreck ? 'Flies again by fall, knowing it wasn\'t his fault.' : 'Spends a year thinking he killed himself and nearly killed Lucy. Flies again eventually.'}`,
    `${N.councilman.toUpperCase()}: ${s.sharedWreck && e !== 'bad' ? 'Testifies, loses his seat, and loses the parcel.' : 'Keeps his seat. Sells the fish camp to the road builders in 1970.'}`,
    `${N.co.toUpperCase()}: ${iceJam(s) === 'stopped' ? 'Caught on the ice. Court-martialed.' : e === 'bad' ? 'Retires to Florida with a boat.' : 'Quietly discharged. Never charged.'}`,
    `BARNETTE: ${e === 'best' ? 'Makes the biggest arrest of his career and never once thanks you.' : 'Still sure you did something. He\'s not wrong.'}`,
    `JOAN: ${e === 'bad' ? 'Marries you in the fall. You build a house on Ashby\'s parcel. She never asks where it came from.' : s.joan >= 3 ? 'Waits a while for you to stop choosing trouble. Then marries a dentist.' : 'Marries a dentist.'}`,
  ]
}

const momLetter = (s: State): string => {
  const v = momVerdict(s)
  return v === 'knows'
    ? 'Dear Wade, you always told me the truth, even when I didn\'t want it. I am proud of you. Come home when you can. Love, Mama'
    : v === 'believesALie'
      ? 'Dear Wade, so glad to hear Alaska has been quiet and easy for you. Nothing much happens to good boys. Love, Mama'
      : 'Dear Wade, I can tell there\'s more you aren\'t saying. I hope someday you will. Love, Mama'
}

export const end: readonly Scene[] = [
  {
    id: 'end',
    act: 'Epilogue',
    title: 'Second Rush',
    text: (s) =>
      [
        `ENDING: ${ending(s).toUpperCase()}`,
        '',
        headline(s),
        '',
        ...epilogues(s),
        '',
        `A letter from Texas: "${momLetter(s)}"`,
      ].join('\n'),
    choices: () => [],
  },
]
