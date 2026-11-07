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
smoke/            the end-to-end browser test
```

## Tests

- `make test/game/unit`: movement and sight, every mission rule, and parity: all nine prologue outcomes reach the
  same `State` as the matching text-build path.
- `make test/game/smoke`: builds, serves and plays the prologue in headless Chromium. `SMOKE_SHOTS=<dir>` saves a
  screenshot per beat.
