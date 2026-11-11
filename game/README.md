# Second Rush: engine build

The playable 3D build, on [PlayCanvas](https://playcanvas.com/). It plays the story in `../text-game` and never
copies its text or re-implements its gates: each mission ends by sending the story one note from the menu the scene
offers (see [`docs/story-api.md`](../docs/story-api.md)).

Today it plays the prologue as Owen: the Silver Pan, the walk home, the boarding house (the landlady in her parlor,
then the letter to Lucy typed out at the desk upstairs), the float dock and the flight north, hiding the notes at the
survey camp while Curly works (he looks over the camp after he lights a cigarette, and turns to a run on the gravel; the
eye at the top of the screen says when he is looking), and the skiff in the flood. "Continue as Wade" on the end card
puts the player on the sandbag line on Cushman as Wade, where Act 1 opens. Act 1 has a space for the line (the flooded
street), the help tent, the flooded cabin (the boat ride and the knot), the land office and the jail; the barfight plays in
the Silver Pan, and the scenes between spaces play as menus. Act 2 plays as menus over the `story` backdrop (`eielson`, the base
blockout, is built and sampled but no scene routes to it yet), and so does Act 3, whose five missions are each one menu
of notes: Lucy's dig (`lucysDig`), the long night (`theLongNight`), the ski search (`theSkiSearch`), the wreck (`theWreck`)
and the rash plans (`theRashPlan`). The text build is where the rest of each act is read in full.

The player is whoever the story's `pov(state)` says, never a scene id: `bodies` in `src/cast.ts` gives each point of
view its model and clip set, the camera's eye height (Wade's is 1.8 m, Owen's 1.7 m) and its footstep voice. Owen's
figure leaves the world with the prologue.

`src/router.ts` decides where each scene plays from the story's `place(state)` and the act it belongs to: a place with
a space puts the player in it. A scene with no space in the act the player is in (the float dock) shows its menu as a
panel over the current space, each option a note button. A scene with no space in another act (Act 2's first scene,
reached from an Act 1 space) hands off to the text build at the path, so a later act never plays as panels over an
earlier act's space. A new space
declares its `act` and `place` in `src/levels.ts` and takes over its scenes.

### Start at any scene

Open the engine at a text-build path to start where it leads: `/play/#path=1,1,1,1,1,1,2,2,1,1,1,1,1,2,2,1,1` (the
format the end card and the text build write) or `/play/?from=1,1,…`. `src/start.ts` replays the path through the
story's menus, one note per step, and starts there through the router: a scene whose place has a space puts the player
in it; one with no space shows its menu over `story`, a blank backdrop that belongs to no act, and the notes go on as
panels there until a scene's place has a space. A path the story refuses (a step that is not a number, a choice the menu
does not have, a step past an ending) shows an error panel naming the step, with a button to start from the beginning.

Live at <https://brandonapol.github.io/fbx67/play/>.

## Run it

```bash
make setup/game
```

```bash
make serve/game
```

## Controls

A third-person camera over the player's right shoulder, following the Camera rules in
[`docs/art/README.md`](../docs/art/README.md): eye height 1.7 m (1.8 m as Wade, within the rule's 0.2 m), 0.5 m to
the right, a 2.6 m boom outdoors and 1.8 m indoors, 36 degree vertical field of view. Against a wall, a prop or a person
the boom pulls in at once and lets out over 0.35 s. Pitch runs from 20 degrees down to 15 up and settles back to level
half a second after you let go; after 1.5 s without looking, the camera swings back behind the player. The player walks
(1.4 m/s); run makes him jog (3.5 m/s) outdoors and walk briskly indoors. People are solid.

- **Keyboard and mouse:** WASD or arrows to move, Shift to run, IJKL to look. Click the scene to look with the mouse;
  Esc lets go. E or Space to interact. Prompts that say "Hold" (buying the round, hiding the notes) fill a ring while
  you hold; walking out of reach cancels a hold.
- **Gamepad:** left stick to move (press it to run), right stick to look, A (or Cross) to interact and to pick a
  panel option, the d-pad to move between options. Prompts and help show the pad's own glyphs.
- **Touch:** a touch that starts on the left 40% of the screen becomes a stick centered where the finger landed
  (60 px to full tilt). A touch on the rest of the screen looks around when dragged, and walks to the ground point
  when tapped. Prompts are buttons: tap to talk, press and hold to hold.
- **Settings panel** (top right, and from the title and pause menus): text size, reduced motion (as the system
  says, on or off), then rebind every key above, invert the camera's up and down, camera sensitivity. Saved in
  `localStorage` and applied at once; the help line is written from the current bindings. Camera bob and the title's
  turning camera are off under reduced motion.
- **Title, pause and journal** (`src/frontEnd.ts`, drawn by `src/frontEndView.ts`): a plain visit opens on the title,
  Owen on Second Avenue with the camera turning slowly round him; Continue (when a save exists), New game, Settings. A
  `#path=` or `?from=` link, and the smoke test's `?test=1`, start in the game. Esc or P (when not bound), the Menu
  button, Start on a pad, or losing the mouse lock pauses: Resume, Journal, Map, Settings, Return to title; in the barfight, Restart from the shove too, which
  puts the fight back at the get-up or stay-seated prompt (`checkpoint` in `src/barfight.ts`). Nothing
  ticks while paused, so the story clock holds. The journal is Owen's notebook: the titles of the scenes played,
  the scene now and its `goal(state)`, `notebook(state)`, the people interacted with and the lines heard in talk
  panels. Nothing is in it the player did not do or hear.
- **Pocket map** (`src/frontEndMap.ts`, M or the pause menu's Map; pauses like the menu): Wade's folded street map of
  downtown from `src/downtown.ts` (`docs/town-map.md`). It names only the buildings whose story place the path has
  been through (`place(state)`), the places the current menu leads to (marked as where to go, under the objective
  line), and the buildings the player has walked within 14 m of; where the player stands is a pointer downtown, or
  the building of the space they are in. Places off the walkable map are listed in the margin.
- **Objective:** a line from `goal(state)` at the top, shown for six seconds when the goal changes, and again on O
  (or Back on a pad). No arrow, no minimap.
- **Saving:** the path played so far, in the text build's format, is saved per scene (`second-rush.path`), with the
  journal's people and lines; Continue replays it through `src/start.ts` like a link.
- The prompt targets what is in view: within 65 degrees of where the camera looks, nearest first.
- Number keys or Enter pick a panel option.
- Sound opens a volume slider per bus. Audio starts on the first key press or tap.

## Layout

```text
src/world.ts      vectors, collision, line of sight, the watcher cone, target picking; pure
src/camera.ts     the spring-arm camera: orbit, pitch clamp, wall pull-in, interior and exterior arms; pure
src/input.ts      bindings, sticks, deadzones, gamepad and touch mapping, glyphs; pure
src/levels.ts     the spaces as data: the `SpaceId` list, the prologue's (the boarding house's hall among them), the story backdrop
src/searchEli.ts  Act 1's line: the flooded street and the search for Eli
src/hospital.ts   Act 1's help tent (St. Joseph's patients and nurses on the high ground), dressed by season and clock
src/cabinRide.ts  Act 1's flooded cabin: the boat ride to the knot
src/landoffice.ts Act 1's land office: two floors, the river in the ground floor, wet ledgers and Lucy on the stair
src/jail.ts       Act 1's cell and front desk
src/eielson.ts    Eielson Air Force Base as a blockout (docs/base-map.md); no scene routes to it yet
src/downtown.ts   downtown Fairbanks as data (docs/town-map.md)
src/camp.ts       the survey camp as data: its props, the three hiding spots and how Owen looks hiding at each
src/campGround.ts the camp's heightmap, surfaces underfoot, splat weights and where every plant grows; pure
src/curly.ts      Curly at the camp: his routine, the look that is the danger, noise, the awareness meter; pure
src/campView.ts   PlayCanvas: the camp's terrain, instanced plants, mosquitoes, structures, and the optional sight cone
src/stealthView.ts the eye at the top of the screen that shows what Curly is doing and how much he has seen
src/router.ts     which space a scene plays in, from the story's place; pure
src/start.ts      reads a #path= or ?from= link and replays it through the story; pure
src/silverPan.ts  the Silver Pan's dressing and the look of the patrons the ambient schedule seats; pure data
src/ambient.ts    who is in town and the bar, and when; src/barTalk.ts is what Owen can do in the bar (order, jukebox, cards)
src/letters.ts    the letter view's sheet: every letter to Mama as one page, in Wade's or Joan's hand; pure
src/letterView.ts draws a letter's sheet in the DOM (a1_letter, a2_letter_work, a2_letter_friends, a3_curly, a3_joan)
src/survival.ts   Act 3's survival rules (light from the clock, warmth steps, fire, food, hands); pure, not wired in yet
src/oneHand.ts    what one hand rules out per engine interaction (climb, stick shift, rifle); pure, not wired in yet
src/prologue.ts   the mission layer: game state, interact, press, tick; pure
src/lighting.ts   sun, sky, fog and grade per space, season and moral-weather band; pure
src/render.ts     PlayCanvas: draws the game state, owns nothing
src/settings.ts   the settings panel: text size, reduced motion, the sight cone, controls
src/frontEnd.ts   the front end: screens, the objective line, the journal, the save, load progress; pure
src/frontEndView.ts  the title, pause menu, journal, loading bar and objective line in the DOM
src/frontEndMap.ts   the pocket map: which places are known, where the player is, where to go; pure
src/mixer.ts      buses, slider gain, ducking and saved volumes; pure
src/footsteps.ts  stride cadence from distance walked and surface lookup; pure
src/recordings.ts the recorded beds and takes (game/public/audio), with procedural fallbacks; src/takes.ts is generated
src/soundscape.ts ambience beds, spot effects and surfaces per space as data, and their conditions
src/synth.ts      procedural sounds on Web Audio: noise beds, walla, jukebox, footsteps, spot effects
src/audio.ts      the audio engine: unlock on gesture, buses, positional panners, the per-frame sync
src/sound-panel.ts the volume sliders
src/main.ts       devices, HUD and the frame loop
src/drive.ts      a headless player for tests
src/probe.ts      test-only hooks: fixed capture poses and per-frame stats; loaded only with ?test=1
src/props.ts      the glTF loader for every model (meshopt decoding), and prop placement
src/viewer.ts     viewer.html: the generated assets and one animated character, for make test/assets
src/combat.ts     the grounded combat core: shove, grab, use, get up, the clock to the law, the tally; pure
src/fightSpace.ts the fight's test space: one room, the player and one man against him
src/fightControls.ts the fight's keys and gamepad buttons; pure
src/fightView.ts  fight.html: the test space drawn in blocks, on keyboard or gamepad (make serve/game)
tools/            asset generators: characters.ts, assets.ts and procedural.ts (docs/art/pipeline.md); audio.ts builds public/audio
smoke/            the end-to-end browser test, frame comparison and budget checks
smoke/baselines/  the committed frame per capture pose
```

## Sound

Nine CC0 field recordings in `public/audio` (Opus in WebM, rebuilt by `make generate/audio`, which needs ffmpeg) layer
over the procedural sounds: the bar's walla, clink, wood steps and screen door, the camp's creek, spruce wind and gravel,
and the flood's rain and river. A space fetches only its own files, and the procedural version plays until they decode
(or for good if they never do). Every other sound is synthesized at run time. Sources, licenses and the size budget are in
[`docs/audio/sources.md`](../docs/audio/sources.md). Four buses (ambience, effects, voices, music) feed a limiter;
a story panel ducks voices and music. The hotel mission's eavesdrop drives the guitar cover with
`audio.setCover(0..1)`: as Wade plays harder the voices bus (the conversation) ducks toward `COVER_FLOOR`; at 0 it
is clear. The mission sets it back to 0 when the eavesdrop ends. Spot effects and some beds are positional through
Web Audio panners with the listener on Owen. Footsteps fall once per stride, which lengthens with speed (about 0.7 m
at a walk, 1.2 m at a jog), on the surface under Owen; snow goes from a soft crunch near freezing to a squeak in
deep cold, from the space's temperature; the hospital hallway and the cell are concrete. `soundscapes` has one entry
per space in `levels.ts`. The Act 1 line, help tent (`hospital`), land office and cell are in it; the barfight bed in
`act1Soundscapes`, the town, hotel and hall beds in `act2Soundscapes` and the four Act 3 beds in `act3Soundscapes` wait
until their spaces land. Escape closes the sound panel.

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
    and fails when a space goes over a budget in [`docs/perf.md`](../docs/perf.md);
  - opens one start from a path per act, and per Act 1 space past the line (`smoke/starts.ts`: `a1_flood`, `a1_body`,
    `a1_ruling`, `a1_lucy`, `a1_tank`, `a2_major`, `a3_camp`, `a4_news`), checks the scene and its menu panel, records
    its perf samples and captures frame `<scene>.png` from the start's pose. A later act ticket adds its start as one
    entry there, with a pose in `src/probe.ts` for the space it starts in.

  Acts 1, 2 and 3 each play through in their own run and CI job, with frames per beat in each moral-weather band:
  `make test/game/smoke/act1` (baselines in `smoke/baselines/act1/`) and `make test/game/smoke/act2` (`act2/`); see
  [`docs/perf.md`](../docs/perf.md). Act 3 has its own run too, `make test/game/smoke/act3` (`smoke/act3.test.ts`, baselines in `smoke/baselines/act3/`), in its own CI job.

  It refuses a port that serves another build, so parallel worktrees need their own `SMOKE_PORT`. Everything lands
  in `smoke-report/` (`SMOKE_REPORT=<dir>` moves it): `frames/`, `diff/` for changed frames,
  `perf.json` and `summary.md`. Set `CHROMIUM_PATH` to use a browser other than Playwright's.
- `make generate/baselines`: the prologue, Act 1, Act 2 and Act 3 runs, overwriting `smoke/baselines/` with the new frames
  (`make generate/baselines/act1`, `act2` and `act3` replay only that act). Run it when a
  change to the look is meant, read the new images, and commit them. Baselines are rendered by Playwright's
  headless Chromium in software (SwiftShader), the same as CI, so generate them without `CHROMIUM_PATH`. If a
  local run and CI ever disagree past the tolerance, take the frames from CI instead: download the
  `prologue-frames-<run>-<attempt>` artifact and copy its `frames/*.png` into `smoke/baselines/`.
