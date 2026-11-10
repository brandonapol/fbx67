// How fast the keyboard smoke run steps the game, and why that is safe at the survey camp.
//
// Software rendering draws a few frames a second, and main.ts caps each tick at TICK_CAP seconds, so at one tick a
// frame every second of game time costs ten or more drawn frames. The run sets the game to FAST ticks a frame (main.ts,
// `pace`) so its walks, the skiff ride and the wait for Curly take a fraction of their game time in frames.

// Game ticks per drawn frame in the smoke run.
export const FAST = 4

// The longest tick main.ts takes: `Math.min(dtRaw, 0.1)` in its update loop.
export const TICK_CAP = 0.1

// The most game time one drawn frame can advance at FAST.
export const FRAME_STEP = FAST * TICK_CAP

// Hiding at the camp waits until Curly's routine clock is less than CURLY_WINDOW seconds into its period, back at the
// cans with all of his work ahead (curly.ts). A frame steps at most FRAME_STEP, so the window has to be wider than that
// for the wait to see it.
export const CURLY_WINDOW = 1

// Frames between the wait seeing the window and the run's hold on interact starting: the wait's own poll, the key
// press's round trip to the page, and slack for a slow runner.
export const HOLD_LAG_FRAMES = 10

// The latest point in Curly's period at which the hide finishes, at FAST: the window, the lag, and the hold itself.
export const hiddenBy = (holdTime: number): number => CURLY_WINDOW + HOLD_LAG_FRAMES * FRAME_STEP + holdTime
