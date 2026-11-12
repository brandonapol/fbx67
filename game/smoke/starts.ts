import type { SceneId } from '../../text-game/src/types.ts'

// One engine start per act, and per Act 1 space past the line, from a text-build path. The smoke test opens each at /play/#path=…, records its perf
// samples and captures frame `<scene>.png` from the probe pose named `pose`. A later act ticket adds its scene here.
// A start whose scene has a space puts the player in it with no panel; one without shows its menu over `story`.
// `also` names more poses captured from the same start, each as frame `<pose>.png` (the knot close-up at the cabin, in
// each moral-weather band).
export type Start = Readonly<{ scene: SceneId; path: string; pose: string; also?: readonly string[] }>

export const starts: readonly Start[] = [
  { scene: 'a1_flood', path: '1,1,1,1,1,1', pose: 'line' },
  { scene: 'a1_body', path: '1,1,1,1,1,1,1,1,1,2,1,1,1', pose: 'cabin', also: ['knot', 'knot_dusk', 'knot_night'] },
  { scene: 'a1_ruling', path: '1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1', pose: 'tent' },
  { scene: 'a1_lucy', path: '1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1', pose: 'office' },
  { scene: 'a1_barfight', path: '1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1', pose: 'pan' },
  { scene: 'a1_tank', path: '1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1', pose: 'cell' },
  { scene: 'a2_major', path: '1,1,1,1,1,1,2,2,1,1,1,1,1,2,2,1,1', pose: 'story' },
  // The photo lab refused, straight on to Lucy's kitchen: the start the prologue run samples the kitchen from.
  { scene: 'a2_hotel', path: '1,1,1,1,1,1,2,2,1,1,1,1,1,2,2,1,1,1,3', pose: 'kitchen' },
  // Curly's November (bushStrip.ts), every choice the first: the starts the prologue run samples the bush strip, the
  // Pan's booth and the base hangar from.
  { scene: 'a2_curly', path: '1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1', pose: 'strip' },
  { scene: 'a2_steak', path: '1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1', pose: 'steak' },
  { scene: 'a2_jake', path: '1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1', pose: 'hangar' },
  { scene: 'a3_camp', path: '1,1,1,1,1,1,2,2,1,1,1,1,1,2,2,1,1,1,3,2,1,1,2,1,2,1,1,1,1,1,1,2,1', pose: 'story' },
  {
    scene: 'a4_news',
    path: '1,1,1,1,1,1,2,2,1,1,1,1,1,2,2,1,1,1,3,2,1,1,2,1,2,1,1,1,1,1,1,2,1,1,1,1,1,1,1,1,1,1,1,1,1,2,1,1,1',
    pose: 'story',
  },
]
