# The keyboard-play smoke flake

Findings for the `check-game` job failing on `the prologue plays end to end with the keyboard`
(`game/smoke/prologue.test.ts`) and passing on a rerun. Gathered 2026-11-12 from the failed `check.yml` runs and the
earlier attempts of rerun runs.

## Causal chain

1. **GitHub's hosted runners come in two speeds.** All of them report the same image (`ubuntu-24.04`,
   `20261101.360.1`), but the keyboard run takes about 520–540 s on a fast one and 990–1,030 s on a slow one,
   nearly twice as long. Every lap scales, so the difference is the machine, not one stretch of the run. Of 11
   passing `check-game` runs on 2026-11-12, 5 were slow (989–1,031 s), 2 in between (790 s, 860 s) and 4 fast
   (516–537 s).
2. **Slow runners make the camp the slowest place to draw.** The camp is the heaviest space in the run (265,594
   triangles, 134–140 draw calls, under SwiftShader). After the hide, `snap(page, '09-hidden')`
   (`prologue.test.ts:448`) takes a page screenshot at the camp.
3. **That screenshot has the shortest timeout in the run.** `snap` calls `p.screenshot({ path })`, which uses
   Playwright's default 30 s timeout. `capture`, the very next call on the same camp view, passes
   `{ timeout: 120000 }`. That 120 s timeout has been there since frame captures came in (#56), because a capture under
   software rendering can be slow; `snap` never got it.
4. **On a slow runner that screenshot sometimes takes more than 30 s**, and the keyboard case fails with
   `page.screenshot: Timeout 30000ms exceeded` at `snap` from `play` (`prologue.test.ts:448`). The flood house is
   never reached, so the perf test then also reports `flood: no frames recorded`. A rerun lands on another runner
   and passes.

## The failures, by signature

| Run (attempt)       | Runner | Reached                       | Failure                                          |
| ------------------- | ------ | ----------------------------- | ------------------------------------------------ |
| 43185888867 (1 of 2) | slow  | camp walk done, 809.8 s in    | `page.screenshot: Timeout 30000ms` at `09-hidden` |
| 43024309010         | slow   | camp walk done, 813.8 s in    | `page.screenshot: Timeout 30000ms` at `09-hidden` |
| 42899011248         | slow   | end (1,125 s)                 | `test timed out after 1080000ms`                 |

- 43185888867 is the flake that passed on a rerun. 43024309010 has the same stack, line and point in the run.
  Neither was slower than the passing slow runs: those reach the same point at 790–825 s.
- 42899011248 (2026-11-10, before #393) spent 259.5 s in `waiting on Curly and hiding`. That was the one-tick-a-frame
  wait for Curly, fixed by #393 (`pace.ts`): that lap now takes 40–79 s. It is not this flake.
- 42811454076 and 42825626111 (also 2026-11-10) failed on story assertions (`'downtown' !== 'camp'`,
  `'p_letter'` for `'p_dock'`) while the dock and letter work was landing. They are not timeouts.
- Most other failed `check-game` runs in the list fail only `every frame matches its baseline ...`, a baseline or
  budget change on their own branch. That is a separate matter.

## What is not the cause

- **`pace.ts`.** The wait for Curly holds its window at FAST (`pace.test.ts`), the hide completes in every failing
  attempt (the failure comes after `hidden === 'marker'`), and the lap is 40–79 s on every runner since #393.
- **The run's total length**, for this flake: both screenshot failures came about 810 s in, inside what passing slow
  runs take to reach the same point.

## A second risk: the budget's margin on slow runners

`KEYBOARD_BUDGET_S` is 1,080 s. Slow runners pass in 989–1,031 s, a margin of 49–91 s (5–8 %). The comment above the
budget says a runner is "about 1.6 times slower, so about 830 s"; slow runners are now nearly twice as slow as fast
ones and 20 % over that estimate. Every new lap (the letter, the flood captures, the camp's settings check) eats the
margin, and the next one on a slow runner times the case out the way 42899011248 did.

## The fix

Both are timeout changes in `game/smoke/prologue.test.ts`, which this task does not claim, so they are filed as an
issue (#459) instead of made here:

1. Give `snap`'s screenshot the same `{ timeout: 120000 }` as `capture`, so the debug shots are no more fragile than
   the checked frames.
2. Restate the keyboard budget from slow-runner timings and either raise `KEYBOARD_BUDGET_S` with real margin (the
   job's 40 minutes leave room) or split the run so each case has its own budget. Correct the "1.6 times slower"
   comment either way.

Not tried: reproducing it locally. A local machine is a fast runner, and CPU throttling over CDP would slow the
renderer's main thread, not SwiftShader's raster, so it would not reproduce a slow screenshot.
