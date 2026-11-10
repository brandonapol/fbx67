import type { State } from '../../text-game/src/types.ts'
import { pov } from '../../text-game/src/story.ts'
import type { Body } from './cast.ts'
import { bodies } from './cast.ts'

// Who the player is, from the story's pov(state) and nothing else: Owen in the prologue, Wade from Act 1 on, Lucy
// in her scenes. The body brings the model and clips, the camera's eye height and the footsteps with it. The one
// exception is the skiff ride, where the story has already moved on to Wade but Owen is still in the stern.
export const bodyFor = (story: State, inSkiff: boolean): Body => (inSkiff ? bodies.owen : bodies[pov(story)])
