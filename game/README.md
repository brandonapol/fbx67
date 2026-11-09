# Second Rush: engine build

The playable 3D build, on [PlayCanvas](https://playcanvas.com/). It plays the story in `../text-game` and never
copies its text or re-implements its gates: each mission ends by sending the story one note from the menu the scene
offers (see [`docs/story-api.md`](../docs/story-api.md)).

Today it plays the prologue as Owen: the Silver Pan, the letter to Lucy, hiding the notes at the survey camp while
Curly refuels, and the skiff in the flood. "Continue as Wade" on the end card goes on into Act 1 in the
text build, at the path played so far.

`src/router.ts` decides where each scene plays from the story's `place(state)` and the act it belongs to: a place with
a space puts the player in it. A scene with no space in the act the player is in (the float dock) shows its menu as a
panel over the current space, each option a note button. A scene with no space in another act (every scene after the
prologue today) hands off to the text build at the path, so Act 1 never plays as panels over Owen's flood. A new space
declares its `act` and `place` in `src/levels.ts` and takes over its scenes.

Live at <https://brandonapol.github.io/fbx67/play/>.

## Run it

```bash
make setup/game
```

```bash
make serve/game
```

## Controls

A third-person camera over Owen's right shoulder, following the Camera rules in
[`docs/art/README.md`](../docs/art/README.md): eye height 1.7 m, 0.5 m to the right, a 2.6 m boom outdoors and 1.8 m
indoors, 36 degree vertical field of view. Against a wall, a prop or a person the boom pulls in at once and lets out
over 0.35 s. Pitch runs from 20 degrees down to 15 up and settles back to level half a second after you let go; after
1.5 s without looking, the camera swings back behind Owen. Owen walks (1.4 m/s); run makes him jog (3.5 m/s). People
are solid.

- **Keyboard and mouse:** WASD or arrows to move, Shift to run, IJKL to look. Click the scene to look with the mouse;
  Esc lets go. E or Space to interact. Prompts that say "Hold" (buying the round, hiding the notes) fill a ring while
  you hold; walking out of reach cancels a hold.
- **Gamepad:** left stick to move (press it to run), right stick to look, A (or Cross) to interact and to pick a
  panel option, the d-pad to move between options. Prompts and help show the pad's own glyphs.
- **Touch:** a touch that starts on the left 40% of the screen becomes a stick centered where the finger landed
  (60 px to full tilt). A touch on the rest of the screen looks around when dragged, and walks to the ground point
  when tapped. Prompts are buttons: tap to talk, press and hold to hold.
- **Controls panel** (top right): rebind every key above, invert the camera's up and down, camera sensitivity.
  Saved in `localStorage`; the help line is written from the current bindings. Camera bob is off under
  `prefers-reduced-motion`.
- The prompt targets what is in view: within 65 degrees of where the camera looks, nearest first.
- Number keys or Enter pick a panel option.
- Sound opens a volume slider per bus. Audio starts on the first key press or tap.

## Layout

```text
src/world.ts      vectors, collision, line of sight, the watcher cone, target picking; pure
src/camera.ts     the spring-arm camera: orbit, pitch clamp, wall pull-in, interior and exterior arms; pure
src/input.ts      bindings, sticks, deadzones, gamepad and touch mapping, glyphs; pure
src/levels.ts     the four spaces as data, and Curly's look schedule
src/router.ts     which space a scene plays in, from the story's place; pure
src/prologue.ts   the mission layer: game state, interact, press, tick; pure
src/lighting.ts   season and moral-weather presets
src/render.ts     PlayCanvas: draws the game state, owns nothing
src/settings.ts   the controls panel
src/mixer.ts      buses, slider gain, ducking and saved volumes; pure
src/footsteps.ts  stride cadence from distance walked and surface lookup; pure
src/soundscape.ts ambience beds, spot effects and surfaces per space as data, and their conditions
src/synth.ts      procedural sounds on Web Audio: noise beds, walla, jukebox, footsteps, spot effects
src/audio.ts      the audio engine: unlock on gesture, buses, positional panners, the per-frame sync
src/sound-panel.ts the volume sliders
src/main.ts       devices, HUD and the frame loop
src/drive.ts      a headless player for tests
src/probe.ts      test-only hooks: fixed capture poses and per-frame stats; loaded only with ?test=1
src/props.ts      the glTF loader for every model (meshopt decoding), and prop placement
src/viewer.ts     viewer.html: the generated assets and one animated character, for make test/assets
tools/            asset generators: characters.ts, assets.ts and procedural.ts (docs/art/pipeline.md)
smoke/            the end-to-end browser test, frame comparison and budget checks
smoke/baselines/  the committed frame per capture pose
```

## Sound

Every sound is synthesized at run time; sources and the size budget are in
[`docs/audio/sources.md`](../docs/audio/sources.md). Four buses (ambience, effects, voices, music) feed a limiter;
a story panel ducks voices and music. Spot effects and some beds are positional through Web Audio panners with the
listener on Owen. Footsteps fall once per stride, which lengthens with speed (about 0.7 m at a walk, 1.2 m at
a jog), on the surface under Owen. Escape closes the sound panel.

## Tests

- `make test/game/unit`: movement and sight, every mission rule, camera collision in every space, input mapping,
  the mixer and footstep rules, and parity: all nine prologue outcomes reach the same `State` as the matching
  text-build path. Also the frame diff and the budget rules in `smoke/`, without a browser.
- `make test/game/smoke`: builds, serves and plays the prologue in headless Chromium with the keyboard (including a
  real WASD leg checked against the camera), then a scripted gamepad and a touch session. `SMOKE_SHOTS=<dir>` saves
  a screenshot per beat. It also:
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
