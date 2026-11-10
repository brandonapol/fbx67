import type { Body } from './cast.ts'

// Lucy as the player, when the story's pov(state) says so: her eye height (the pivot the camera arm hangs from) and
// her footstep voice. She is shorter than Wade and moves lighter and quicker, the tread of someone who knows how to
// cross a room without being heard. Her model and clip set join the cast (castIds in cast.ts) once her concept sheet
// has passed the consultants' review (docs/art/README.md); until then she has no cast entry and no figure is drawn.
export const lucy: Body = { eye: 1.6, tread: { pitch: 1.3, weight: 0.7 } }
