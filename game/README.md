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

A third-person camera over Owen's right shoulder. Owen walks indoors and jogs outdoors; run makes him jog anywhere.

- **Keyboard and mouse:** WASD or arrows to move, Shift to run. Click the scene to look with the mouse; Esc lets go.
  E or Space to interact. Prompts that say "Hold" (buying the round, hiding the notes) fill a ring while you hold.
- **Gamepad:** left stick to move (press it to run), right stick to look, A (or Cross) to interact and to pick a
  panel option, the d-pad to move between options. Prompts show the pad's own glyphs.
- **Touch:** drag on the left of the screen for a stick, drag on the right to look, tap the ground to walk there.
  Prompts are buttons: tap to talk, press and hold to hold.
- **Controls panel** (top right): rebind keys, invert the camera's up and down, camera sensitivity. Saved in
  `localStorage`. Camera bob is off under `prefers-reduced-motion`.
- Number keys or Enter pick a panel option.

## Layout

```text
src/world.ts      vectors, collision, line of sight, the watcher cone, target picking; pure
src/camera.ts     the spring-arm camera: orbit, pitch clamp, wall pull-in, interior and exterior arms; pure
src/input.ts      bindings, sticks, deadzones, gamepad and touch mapping, glyphs; pure
src/levels.ts     the four spaces as data, and Curly's look schedule
src/prologue.ts   the mission layer: game state, interact, press, tick; pure
src/lighting.ts   season and moral-weather presets
src/render.ts     PlayCanvas: draws the game state, owns nothing
src/settings.ts   the controls panel
src/main.ts       devices, HUD and the frame loop
src/drive.ts      a headless player for tests
smoke/            the end-to-end browser test
```

## Tests

- `make test/game/unit`: movement and sight, every mission rule, camera collision in every indoor spot, input
  mapping, and parity: all nine prologue outcomes reach the same `State` as the matching text-build path.
- `make test/game/smoke`: builds, serves and plays the prologue in headless Chromium with the keyboard, then checks a
  scripted gamepad and touch session. `SMOKE_SHOTS=<dir>` saves a screenshot per beat, `SMOKE_PORT` picks the port
  and `CHROMIUM_PATH` a browser.
