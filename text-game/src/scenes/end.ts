import type { Scene, State } from '../types.ts'
import { N } from '../names.ts'
import { curlyFate, curlyTalks, doubleAgentWorks, eliJailed, ending, iceJam, middleFlavor, momVerdict } from '../logic.ts'

const headline = (s: State): string => {
  const e = ending(s)
  if (e === 'best')
    return `${N.barnette} puts the cuffs on ${N.ashby} himself, on the courthouse steps, in front of the newspaper. He doesn't look at you. Then he does, and nods once.${doubleAgentWorks(s) ? ' The tape from your cast is what the grand jury keeps asking to hear again.' : ''} The family's allotment is restored. The fish camp is theirs again.`
  if (e === 'good')
    return `Your testimony and Lucy's paper trail make the front page. ${N.ashby} is never charged, but the company calls him back Outside and he never comes north again. The family's allotment claim is reopened, and this time it holds. The fish camp is theirs again.`
  if (e === 'bad') {
    if (s.offer === 'fake')
      return `You tried to play Ashby, but you'd already burned the people who could have backed you up.${s.testified ? ' You testified anyway. Nobody believed which side you were on.' : ''} The grand jury never sees a case. Ashby wins.`
    if (s.offer === 'take')
      return `Ashby keeps his word. Within a week the sign-out sheets vanish from the evidence room, and the Air Force inquiry closes without a name. A parcel on the river is deeded to Wade Pruett. Ashby wins.`
    return `You sold Lucy to Barnette, and with her investigation in an evidence locker, Ashby never needed to buy you.${s.testified ? ' Your testimony goes nowhere. You\'re the airman who turned in his friends; nobody trusts a word.' : ''} Ashby wins.`
  }
  const lead = `Some of them go down. The Major is quietly discharged, and Curly goes to prison for the burglary. ${N.ashby} walks.`
  const f = middleFlavor(s)
  return f === 'burn'
    ? `${lead} One night that spring his office burns to the studs, and nobody can prove who did it. Barnette always said you were dangerous.`
    : f === 'walked'
      ? `${lead} You weren't there for the end of it. You'd already walked away.`
      : `${lead} Lucy is sure it was him. She can't prove it. The oil money arrives anyway.`
}

const eliLine = (s: State): string => {
  if (!eliJailed(s))
    return s.eliTrust >= 3 ? 'Back on the river by June. He names his new boat after Owen.' : 'Back on the river by June. He nods at you on the street, but he doesn\'t stop to talk.'
  if (s.eliTrespass === 'report') return 'Your report puts him on the banished land the night Owen died. He serves two years for something he only witnessed.'
  if (s.eliTrespass === 'leverage') return 'You traded his secret when you needed something. It puts him on the banished land the night Owen died, and he serves two years for something he only witnessed.'
  return 'Ashby\'s money finds a witness who puts Eli on the banished land the night Owen died. He serves two years for something he only witnessed.'
}

const curlyLine = (s: State): string => {
  const fate = curlyFate(s)
  if (fate === 'testifies') return 'Testifies against Ashby and gets life instead of the chair. Nobody arranges an accident.'
  if (fate === 'buried')
    return curlyTalks(s)
      ? 'His statement goes missing from the evidence room. Convicted of burglary only. He dies in prison two years later of "pneumonia."'
      : 'Convicted of burglary. The murder is never charged. He dies in prison two years later of "pneumonia."'
  return 'Convicted of burglary only. The murder is never charged.'
}

const epilogues = (s: State): readonly string[] => {
  const e = ending(s)
  const won = e === 'best' || e === 'good'
  return [
    `ELI: ${eliLine(s)}`,
    `LUCY: ${e === 'bad' ? 'Loses her job at the land office. Keeps the case files in a trunk for the rest of her life.' : e === 'middle' ? 'Keeps working the claim, one lost form at a time.' : 'Goes to work for the Alaska Federation of Natives on the claims settlement.'}${s.lucyHeat > 0 && e !== 'bad' ? ' Barnette never does put a name to the woman seen on the base.' : ''}`,
    `CURLY: ${curlyLine(s)}`,
    `JAKE: ${s.sharedWreck ? 'Flies again by fall, knowing it wasn\'t his fault.' : 'Spends a year thinking he nearly killed Lucy. Flies again eventually.'}`,
    `TOLLIVER: ${won ? (s.sharedWreck ? 'Testifies, loses his council seat, and loses the parcel when the claim holds.' : 'Loses the parcel when the claim holds. Keeps his seat.') : 'Keeps his seat. Sells the fish camp to the road builders in 1970.'}`,
    `${N.co.toUpperCase()}: ${iceJam(s) === 'stopped' ? 'Caught on the ice. Court-martialed.' : e === 'bad' ? 'Retires to Florida with a boat.' : 'Quietly discharged. Never charged.'}`,
    `BARNETTE: ${e === 'best' ? 'Makes the biggest arrest of his career and never once thanks you.' : 'Still sure you did something. He\'s not wrong.'}`,
    `JOAN: ${s.offer === 'take' ? 'Marries you in the fall. You build a house on Ashby\'s parcel. She never asks where it came from.' : s.joan >= 3 ? 'Waits a while for you to stop choosing trouble. Then marries a dentist.' : 'Marries a dentist.'}`,
  ]
}

const momLetter = (s: State): string => {
  const v = momVerdict(s)
  const bad = ending(s) === 'bad'
  if (v === 'knows')
    return bad
      ? 'Dear Wade, you always told me the truth, so I know what you\'ve done. I\'m praying for you. Come home when you can look at me. Love, Mama'
      : 'Dear Wade, you always told me the truth, even when I didn\'t want it. I am proud of you. Come home when you can. Love, Mama'
  if (v === 'believesALie') return 'Dear Wade, so glad to hear Alaska has been quiet and easy for you. Nothing much happens to good boys. Love, Mama'
  return 'Dear Wade, I can tell there\'s more you aren\'t saying. I hope someday you will. Love, Mama'
}

export const end: readonly Scene[] = [
  {
    id: 'end',
    act: 'Epilogue',
    title: 'Second Rush',
    text: (s) =>
      [`ENDING: ${ending(s).toUpperCase()}`, '', headline(s), '', ...epilogues(s), '', `A letter from Texas: "${momLetter(s)}"`].join('\n'),
    choices: () => [],
  },
]
