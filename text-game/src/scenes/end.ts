import type { Scene, State } from '../types.ts'
import { N } from '../names.ts'
import { HEAT_LIMIT, curlyFate, curlyTalks, doubleAgentWorks, eliJailed, ending, iceJam, middleFlavor, momVerdict } from '../logic.ts'

const headline = (s: State): string => {
  const e = ending(s)
  if (e === 'best')
    return `${N.barnette} puts the cuffs on ${N.ashby} himself, on the courthouse steps, in front of the newspaper. He doesn't look at you. Then he does, and nods once.${doubleAgentWorks(s) ? ' The tape from your cast is what the grand jury keeps asking to hear again.' : ''} The family's allotment is restored. The fish camp is theirs again.`
  if (e === 'good')
    return `Your testimony and Lucy's paper trail make the front page.${doubleAgentWorks(s) ? ' The tape from your cast gets Ashby indicted, and his company\'s lawyers get it thrown out: a recording made by the man whose name is on every stolen charge. Without Curly or Tolliver on the stand to back it up, the judge won\'t let a jury hear it.' : ''} ${N.ashby} is never convicted, but the company calls him back Outside and he never comes north again. The family's allotment claim is reopened, and this time it holds. The fish camp is theirs again.${eliJailed(s) ? ' Eli watches it from a cell. You won, and you can\'t stand to look at what it cost.' : ''}`
  if (e === 'bad') {
    if (s.offer === 'fake')
      return `You tried to play Ashby, but you'd already burned the people who could have backed you up.${s.testified ? ' You testified anyway. Nobody believed which side you were on.' : ''} The grand jury never sees a case. Ashby wins.`
    if (s.offer === 'take' && s.testified)
      return `You testified anyway, with Ashby's money in a Seattle bank. His lawyers found the account in an afternoon, and after that nobody heard a word you said. Ashby wins.`
    if (s.offer === 'take')
      return `Ashby keeps his word. Within a week the sign-out sheets vanish from the evidence room, and the Air Force inquiry closes without a name. A parcel on the river is deeded to Wade Pruett. Ashby wins.`
    return `You sold Lucy to Barnette, and with her investigation in an evidence locker, Ashby never needed to buy you.${s.testified ? ' Your testimony goes nowhere. You\'re the airman who turned in his friends; nobody trusts a word.' : ''} Ashby wins.`
  }
  const lead = `Some of them go down. ${iceJam(s) === 'stopped' ? 'The Major is court-martialed' : 'The Major is quietly discharged'}${s.curlyPlan === 'ignore' ? '' : ', and Curly goes to prison'}. ${N.ashby} walks.`
  const f = middleFlavor(s)
  return f === 'burn'
    ? `${lead} One night that spring his office burns to the studs, and nobody can prove who did it. Barnette always said you were dangerous.`
    : f === 'walked'
      ? `${lead} You weren't there for the end of it. You'd already walked away.`
      : `${lead} Lucy is sure it was him. She can't prove it. The oil money arrives anyway.`
}

const eliLine = (s: State): string => {
  if (!eliJailed(s))
    return `${s.eliTrust >= 3 ? 'Back on the river by June. He names his new boat after Owen.' : 'Back on the river by June. He nods at you on the street, but he doesn\'t stop to talk.'}${s.leakedFlightDate ? ' He never mentions your letter to your mother again. He doesn\'t have to.' : ''}`
  if (s.eliTrespass === 'report') return 'Your report puts him on the banished land the night Owen died. He serves two years for something he only witnessed.'
  if (s.eliTrespass === 'leverage') return 'You held his secret like a card. When Barnette leaned on you, you played it. It puts him on the banished land the night Owen died, and he serves two years for something he only witnessed.'
  return 'Ashby\'s money finds a witness who puts Eli on the banished land the night Owen died. He serves two years for something he only witnessed.'
}

const curlyLine = (s: State): string => {
  const fate = curlyFate(s)
  if (fate === 'killed') return 'Found dead in a hunting cabin before the police reached him. Ruled a hunting accident. Nobody ever asks Ashby about it.'
  if (fate === 'testifies') return 'Testifies against Ashby and gets life instead of the chair. Nobody arranges an accident.'
  if (fate === 'buried')
    return curlyTalks(s)
      ? 'His statement goes missing from the evidence room. Convicted of burglary only. He dies in prison two years later of "pneumonia."'
      : 'Convicted of burglary. The murder is never charged. He dies in prison two years later of "pneumonia."'
  return s.curlyPlan === 'warn'
    ? 'He named Ashby and was ready to say it in court. A confessed murderer with no corroboration doesn\'t get far against a lawyer like Ashby. He gets life, alone.'
    : s.curlyPlan === 'confront'
      ? 'Arrested after he bolted. After you came at him over that steak, he never trusted anyone again, and he never says a word. Convicted of burglary only.'
      : 'Arrested half-starved and furious. Nobody saw it coming in time, and he never says a word. Convicted of burglary only.'
}

const barnetteLine = (s: State): string =>
  ending(s) === 'best'
    ? 'Makes the biggest arrest of his career and never once thanks you.'
    : s.heat > HEAT_LIMIT
      ? 'Never believed a word you said, and told the grand jury so. He might have arrested Ashby if he had.'
      : !s.testified
        ? 'Asked you once to stand up in front of a grand jury. You didn\'t. Without you, he never got to arrest Ashby.'
        : s.leakedFlightDate
        ? 'Ashby\'s lawyers kept asking how the date of that flight got from an airman\'s letter home to a saboteur. Every time, the room looked at you. He never got to arrest Ashby.'
        : 'Liked you more than he let on. Without more of a case, he never got the arrest he wanted: Ashby.'

const tolliverLine = (s: State, won: boolean): string =>
  s.sharedWreck
    ? won
      ? 'Testifies against Ashby, loses his council seat, and loses the parcel when the claim holds.'
      : 'Tried to come clean after Jake told him about the plane. It wasn\'t enough. Keeps his seat.'
    : won
      ? 'Loses the parcel when the claim holds. Nobody ever told Jake about the sump drain, so nobody ever told Ray. Keeps his seat.'
      : 'Nobody ever told Jake about the sump drain, so nobody ever told Ray. Keeps his seat and sells the fish camp to the road builders in 1970.'

const epilogues = (s: State): readonly string[] => {
  const e = ending(s)
  const won = e === 'best' || e === 'good'
  return [
    `ELI: ${eliLine(s)}`,
    `LUCY: ${e === 'bad' ? 'Loses her job at the land office. Keeps the case files in a trunk for the rest of her life.' : e === 'middle' ? 'Keeps working the claim, one lost form at a time.' : (eliJailed(s) ? 'Goes to work for the Tanana Chiefs on the claims settlement. Her brother is in jail because of you, and she never speaks to you again.' : 'Goes to work for the Tanana Chiefs on the claims settlement.')}${s.lucyHeat > 0 && e !== 'bad' ? ' Barnette never does put a name to the woman seen on the base.' : ''}`,
    `CURLY: ${curlyLine(s)}`,
    `JAKE: ${s.sharedWreck ? 'Flies again by fall, knowing it wasn\'t his fault.' : 'Spends a year thinking he nearly killed Lucy. Flies again eventually.'}`,
    `TOLLIVER: ${tolliverLine(s, won)}`,
    `${N.co.toUpperCase()}: ${iceJam(s) === 'stopped' ? 'Caught on the ice. Court-martialed.' : e === 'bad' ? 'Retires to Florida with a boat.' : 'Quietly discharged. Never charged.'}`,
    `BARNETTE: ${barnetteLine(s)}`,
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
  if (v === 'believesALie')
    return bad
      ? 'Dear Wade, so glad to hear Alaska has been quiet and easy for you. Nothing much happens to good boys. Love, Mama'
      : 'Dear Wade, so glad Alaska has been quiet for you. Your cousin swears she saw your name in a newspaper from up there. I told her it must be some other Pruett. Love, Mama'
  return bad
    ? 'Dear Wade, I can tell there\'s more you aren\'t saying. I hope someday it\'s something you can say. Love, Mama'
    : 'Dear Wade, I can tell there\'s more you aren\'t saying. Whatever it is, you sound like yourself again. Love, Mama'
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
