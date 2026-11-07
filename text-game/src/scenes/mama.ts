import type { State } from '../types.ts'

const opener = (s: State): string =>
  s.momHonesty >= 2
    ? 'Mama writes back fast, the way she does when something you told her scared her. She doesn\'t lecture. She just tells you the news from home.'
    : s.momHonesty <= -2
      ? 'Mama writes back about the church bake sale and the weather. Near the end, the way she always does, she drifts into news from home.'
      : 'Mama writes back. She can tell you\'re leaving things out. She doesn\'t push. She just tells you the news from home.'

const stories = [
  `"You remember Earl Dobbs from the feed store. Somebody said he'd been taking from the co-op till, and the county had him in front of a judge. Half the Baptist men's group drove to Lubbock to stand up for him. Turns out Earl had driven every one of them to the hospital some night or other, and never said a word about it. They let him go.

"The Tate boy got accused of near the same thing that spring. Kept to himself, that boy. Nobody went. He's in Huntsville now. I don't know which of them did it. I'm not sure the judge did either."`,
  `"Wanda Pruitt at the church office, no relation, found out the Hendersons were about to lose the farm. She told the pastor's wife so they could take up a collection. She meant well. Mostly.

"The Hendersons kept the farm. They haven't set foot in that church in six years, and Lila Henderson crosses the street when she sees Wanda coming. I think about that more than I ought to."`,
  `"I never told you this. In '49 a land man from Midland came out and offered your daddy a lease on the back pasture. Good money, a signing bonus, and all he had to do was sign and let them be. Your daddy signed.

"They drilled two dry holes and left. The windmill well has pumped salt ever since, and we haul water for the cattle to this day. Your daddy never talks about that money. I'm not sure we ever spent it. I think it's still in the coffee can."`,
] as const

export const mamaReply = (n: 0 | 1 | 2) => (s: State): string => `${opener(s)}\n\n${stories[n]}`
