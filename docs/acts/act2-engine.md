# Act 2 in the engine build: what exists today

What the engine build (`game/`) plays of Act 2 as of `main`, read from the code and its tests. The plan is in
[`act2-missions.md`](act2-missions.md) (Proposed); where the two differ, this file says what is built and that one says
what is intended. The engine never decides a story outcome: it sends the story's notes and the story answers
([`../story-api.md`](../story-api.md)).

## Where Act 2 plays

`src/router.ts` routes each scene by the story's `place(state)`. Act 2's spaces include these, declared in
`src/levels.ts`:

| Space     | File             | Places it takes over            | Missions that play in it                    |
| --------- | ---------------- | ------------------------------- | ------------------------------------------- |
| `eielson` | `src/eielson.ts` | `photoLab`, `photoRecords`      | the photo lab (`thePhotoLab`)               |
| `kitchen` | `src/kitchen.ts` | `lucysKitchen`                  | the hotel bar (`theHotelBar`), the Major's cabinet (`theMajorsCabinet`) |
| `street`  | `src/officerStop.ts` | `nlCafe` (outside the gossip visits) | the officer's stop (`a2_officer`)    |
| `hotelBar` | `src/hotelBar.ts` | `hotelBar`                    | the hotel bar (`theHotelBar`): the guitar as cover |
| `strip`   | `src/bushStrip.ts` | `bushStrip`                    | Curly at the bush strip (`a2_curly`)        |
| `steak`   | `src/bushStrip.ts` | `silverPan` (Act 2)            | the steak with Curly (`a2_steak`, `a2_confront`) |
| `hangar`  | `src/bushStrip.ts` | `baseHangar`                   | Jake at the hangar door (`a2_jake`)         |
| `cafe`    | `src/dottiesCafe.ts` | `nlCafe`, the gossip visits only | Dottie's counter (`a2_co_gossip`, `a2_heat_gossip`) |
| `highway` | `src/roadsideStop.ts` | `richardsonHighway`         | Barnette's roadside stop (`a2_heat`)        |

The Major's cabinet (`theMajorsCabinet`) plays on the base, in the squadron hall and the Major's office
(`src/majorsCabinet.ts`, `eielson.ts`). Every other Act 2 scene plays as a menu panel over the `story` backdrop, each
option a note button.

Each of these spaces opens the scene's own menu at a spot and sends the note the menu offers; none decides an outcome.
The hotel bar's set (`hotelBar.ts`), the bush strip, the steak and the hangar (`bushStrip.ts`), the café, the officer's
stop and the roadside stop are gray-box rooms and staged beats, each with its own `*.test.ts` that checks the story
lands where the text build's `--choices` path does.

## Lucy's kitchen (`kitchen.ts`)

One gray-box room (6 by 5 m): a door in the north wall, Lucy seated at her table, a stove, a counter and a window. Wade
comes in at the door.

- **The two missions that start here** (`a2_hotel`, `a2_co_ask`): no menu on arrival. A single spot, the table
  (`Sit down with Lucy`), is offered only while `mission(state)` is one of those two (`tableSpot`). Using it opens the
  scene's own menu, and opening sends nothing. Each button is a note; the mission plays on through its scenes' menus,
  one note per menu, until it lands where its mission note does, and Wade is back on the `story` backdrop.
- **Every other kitchen scene** (for instance `a2_minto`) opens its menu where Wade comes in, with no spot to use.
- Nothing in the room decides what a choice does. It is a place to stand and a table to walk to.

## The officer's stop on Second (`officerStop.ts`)

`a2_officer` is at `nlCafe` in Act 2, and the café's own space plays only the gossip visits (`dottiesCafe.ts`), so the
scene routes to `street`: downtown's own data with the freeze-up layer, Wade out of the café's door onto Second's south
walk, a Fairbanks PD cruiser idling at the curb and the officer (`N.cop`, the barfight's look) leaning on its fender
under a streetlight. Nothing comes up until Wade walks to him. His spot opens the scene's own text, whose read of the
heat is tiered by the story (`officerTier` in `text-game/src/scenes/act2.ts`), and its one note, `walkOn`, with no
button to step back. The engine reads no heat and offers no deal. `src/officerStop.test.ts` plays each tier's
`--choices` path headless and checks the state and the path against the text build's, and that the ratchet counts the
officer as the sender of `a2_officer:walkOn`.

## The photo lab (`photoLab.ts`, `photoLabBot.ts`, `eielson.ts`)

The way in is picked at the counter, in the base's front hall. Walking to the open east end of the counter offers
`recordsWay` (`Look past the counter to the records room`), only at `thePhotoLab` and only before a run is on. It opens
the scene's own menu: the clerk's lunch (`lunch`), after lockup with a borrowed key (`afterLockup`), or refuse. Picking
a way in sends nothing; it starts a run, held as `Lab` on the game state.

**The run.** Wade slips past the counter, down the lab hall and into the records room, opens the drawers the index card
names (`drawers`), searches them by one of two methods, and walks out with the prints.

- `phase`: `in` (getting in) then `drawers` (in the records room). `clock` counts seconds into the run and stops while a
  menu is open.
- **Methods.** `crossCheck` takes 12 s of holding the drawers; `pullAll` takes 4 s but leaves a mess: the three drawers
  hang open and prints are on the floor from the first pull (`messy`). Letting go keeps the time searched.
- **Notes go at two moments only.** The way in goes when Wade steps into the records room (`step`, from `WAY_NOTE`:
  `lunch` or `afterLockup`). The drawers' method goes when he walks out of it with the prints in hand. Everything between
  is the game's own `Lab` state; the story hears nothing of it (Rule 4).
- **A link straight into the records room** (`a2_photos_files`) starts a run at its door with the drawers to search
  (`arrival`).

**The lab's people** walk their rounds as data (`WATCH`, `Walker`, `Beat`), so a pose is a pure function of the clock
(`poseAt`). Each has a range and a half-angle of view, and a look is blocked by the lab's walls and the drawer rows
(`looks`, `lineOfSight`).

| Way     | Who                                | What they do                                                                                                   |
| ------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| lunch   | the clerk                          | out the front door at noon, back `CLERK_BACK` (95 s) in, down the hall to look into the records room, then behind his counter |
| lunch   | a lab airman                       | loops: stands in the darkrooms, then walks the hall to the records room door and back                          |
| key     | the duty sergeant (lockup round)   | out on the service lane, in at the records room's back door, a flashlight along the room (range 26, narrow), and on |

**Where Wade is seen** (`offLimits`): at lunch, anywhere past the counter line; after lockup, anywhere in the building.
The aisle behind the first row of drawers is out of sight of both doors (a test checks it; the bot hides there).

**Busted and retry.** Seen where he has no business, `aware` fills in `FILL` (0.5 s) and drains in `DRAIN` (1.2 s). At 1,
the busted beat runs for `CAUGHT_TIME` (1.8 s) showing the watcher's line, then a retry panel (`Try again`) comes up and
`restart` returns to the last `Checkpoint`, the lab's people where they were then. Checkpoints are the counter, the
records room door (set as the way in goes), and the moment a method is picked with the drawers open. `busts` counts
retries on the game, not the story. The stealth eye (`stealthView.ts`) reads `watching`: shut where Wade may stand,
half open when someone is about to see him, filling once seen.

**The player bot** (`photoLabBot.ts`) plans walks and waits from the same round data (`clear`, `labNext`) and plays the
run headless (`playLab`). The notes ratchet, the mission tests and the Act 2 smoke run all use it.

## How notes are sent and tested

- **The ratchet** (`src/notesRatchet.ts`, `notesRatchet.test.ts`). It walks every reachable Act 1 to 3 menu from the
  story, then drives the engine to find which note each space can send. A note neither sent nor on
  `game/notes-allowlist.txt` fails, a listed note the engine now sends fails, and a pull request may only shrink the
  list. A mission's start is keyed `missionId:note`. The ratchet reaches the kitchen's notes by playing menus at the
  table (`depthAt`) and the photo lab's with `playLab` for every way in and method (`labSenders`).
- **`kitchen.test.ts`**: each of `a2_hotel` and `a2_co_ask` routes to the kitchen with the table to walk to and no
  menu; the table opens the scene's own menu and sends nothing; every ending of each mission, played by its
  `applies` notes, lands where `sendMission` does and equals the text build's replay at each step; other kitchen
  scenes open their menu at the door; the ratchet names the table as the only sender of those notes.
- **`photoLab.test.ts`**: routing to the base; the counter menu sends nothing; the clerk's and airman's rounds; the
  hiding aisle; lunch is free on the customer side; slipping past a clerk still behind his counter is busted with the
  story untouched; the stealth eye; the way in going at the records room door; the sergeant catching Wade in the
  drawers with a retry that keeps them open and nothing pulled; letting go keeps the search; the mess of `pullAll`;
  the drawers' note going only on the walk out; all five endings (four way and method pairs, plus refused) reaching
  `a2_hotel` on the text build's path; the straight-in link; figures drawn only while a run is on; the ratchet naming
  the counter as the only sender.
- **Smoke.** `make test/game/smoke/act2` plays the act from its start in headless Chromium and compares frames
  (`smoke/baselines/act2/`); `smoke/act2Plan.ts` samples `eielson` and `kitchen` and uses the lab bot.

Run `make test/game/unit` for all of the above.

## What is not built

- **Refusing is still a button at the counter.** The photo lab's `refuse` is the third button on the counter menu, and
  the hotel bar's `refuse` is a button on the table's menu. The spec's deliberate prompt is a conversation with Lucy; no
  such scene exists in the engine. Refusing sends its note and the story moves on.
- **The rest of the base.** The Eielson blockout is a gray box with roofless one-storey buildings; the barracks and
  most of the rest are walkable but no scene routes to them.
- **Everything else in Act 2** (the chiefs, Minto, the land office search, the flight, the letters) plays as menus; the
  unbuilt notes are the `a2_*` lines of `game/notes-allowlist.txt`.
