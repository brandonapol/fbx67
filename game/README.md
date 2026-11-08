# Second Rush: engine build

The playable 3D build, on [PlayCanvas](https://playcanvas.com/). It plays the story in `../text-game` and never
copies its text or re-implements its gates: each mission ends by sending the story one note from the menu the scene
offers (see [`docs/story-api.md`](../docs/story-api.md)).

Today it plays the prologue as Owen: the Silver Pan, the letter to Lucy, hiding the notes at the survey camp while
Curly refuels, and the skiff in the flood. The end card continues into the text build at Act 1 with the same path.

Live at <https://brandonapol.github.io/fbx67/play/>.

## Run it

```bash
make setup/game
```

```bash
make serve/game
```

## Controls

- WASD or arrow keys to walk, or tap the ground.
- E or Space to interact; hold it to hide the notes. On a phone, press and hold the prompt.
- Number keys or Enter pick a panel option.

## Layout

```text
src/world.ts      vectors, collision, line of sight, the watcher cone; pure
src/levels.ts     the four spaces as data, and Curly's look schedule
src/prologue.ts   the mission layer: game state, interact, press, tick; pure
src/lighting.ts   season and moral-weather presets
src/render.ts     PlayCanvas: draws the game state, owns nothing
src/main.ts       input, HUD and the frame loop
src/drive.ts      a headless player for tests
src/probe.ts      test-only hooks: fixed capture poses and per-frame stats; loaded only with ?test=1
smoke/            the end-to-end browser test, frame comparison and budget checks
smoke/baselines/  the committed frame per capture pose
```

## Tests

- `make test/game/unit`: movement and sight, every mission rule, and parity: all nine prologue outcomes reach the
  same `State` as the matching text-build path. Also the frame diff and the budget rules in `smoke/`, without a
  browser.
- `make test/game/smoke`: builds, serves and plays the prologue in headless Chromium. `SMOKE_SHOTS=<dir>` saves a
  screenshot per beat. It also:
  - freezes the clock and every animation layer at each beat, puts Owen at a fixed spot and holds the camera on a
    fixed shot (`poses` in `src/probe.ts`, `View.pose` in `src/render.ts`), hides the HUD and compares the frame with
    `smoke/baselines/` (pixelmatch; a frame fails past 0.2% changed pixels);
  - walks back and forth in each space for 10 s, recording draw calls, triangles, texture memory and CPU frame time,
    and fails when a space goes over a budget in [`docs/perf.md`](../docs/perf.md).

  It refuses a port that serves another build, so parallel worktrees need their own `SMOKE_PORT`. Everything lands
  in `smoke-report/` (`SMOKE_REPORT=<dir>` moves it): `frames/`, `diff/` for changed frames,
  `perf.json` and `summary.md`. Set `CHROMIUM_PATH` to use a browser other than Playwright's.
- `make generate/baselines`: the same run, but it overwrites `smoke/baselines/` with the new frames. Run it when a
  change to the look is meant, read the new images, and commit them. Baselines are rendered by Playwright's
  headless Chromium in software (SwiftShader), the same as CI, so generate them without `CHROMIUM_PATH`. If a
  local run and CI ever disagree past the tolerance, take the frames from CI instead: download the
  `prologue-frames-<run>-<attempt>` artifact and copy its `frames/*.png` into `smoke/baselines/`.
