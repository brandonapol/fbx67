import type { SceneId } from '../../text-game/src/types.ts'

// One engine start per act, and per Act 1 space past the line, from a text-build path. The smoke test opens each at /play/#path=…, records its perf
// samples and captures frame `<scene>.png` from the probe pose named `pose`. A later act ticket adds its scene here.
// A start whose scene has a space puts the player in it with no panel; one without shows its menu over `story`.
export type Start = Readonly<{ scene: SceneId; path: string; pose: string }>

export const starts: readonly Start[] = [
  { scene: 'a1_flood', path: '1,1,1,1,1,1', pose: 'line' },
  { scene: 'a1_tank', path: '1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1', pose: 'cell' },
  { scene: 'a2_major', path: '1,1,1,1,1,1,2,2,1,1,1,1,1,2,2,1,1', pose: 'story' },
  { scene: 'a3_camp', path: '1,1,1,1,1,1,2,2,1,1,1,1,1,2,2,1,1,1,3,2,1,1,2,1,2,1,1,1,2,1', pose: 'story' },
  {
    scene: 'a4_news',
    path: '1,1,1,1,1,1,2,2,1,1,1,1,1,2,2,1,1,1,3,2,1,1,2,1,2,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1',
    pose: 'story',
  },
]
