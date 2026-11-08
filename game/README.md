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
