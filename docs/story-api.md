# How the game talks to the story

This is the agreement between the 3D game (PlayCanvas) and the story (the text build's core in `text-game/`). It keeps every version of the story testable no matter how much gameplay we add. Tracked in [issue #4](https://github.com/brandonapol/fbx67/issues/4).

## The idea in one paragraph

The story doesn't watch the gameplay. When a mission ends, the game sends the story one short note saying how it ended, picked from a menu the story wrote ahead of time. The story reads the note and updates what's true (who trusts Wade, how suspicious the cops are, what evidence exists). The text build sends the same notes from menu clicks, so the text game and the 3D game run the same story, and the robot tester can try every possible note.

## Rule 1: one note per mission

Each mission (a break-in, the ski search, the barfight, the ice jam) ends with one note with a few details.

Example, the Major's cabinet break-in:

> Got in by: cracking the code / forcing it
> Seen: yes / no
> Took: the photos of his files

The story doesn't care about every step inside the mission, only how it ended.

## Rule 2: the story writes the menu

Every mission comes with a short list of the endings it accepts. The game must report one of them and can't invent new ones.

| Mission | Allowed endings |
|---|---|
| Photo lab | way in: lunch / key; drawers: cross-checked / pulled all; or refused |
| Hotel bar | heard: most / pieces; or skipped |
| Major's cabinet | got in: code / forced; seen: yes / no; or refused (Lucy goes herself) |
| Lucy's dig (Act 3) | first dig: stove / cache / marker |
| The long night (Act 3) | order: fire first / Jake first; signal: smoke / X / saved the fire |
| Ski search (Act 3) | route: ridge / creek (always reaches the wreck) |
| The wreck (Act 3) | Jake: shown / not shown |
| Rash plan (Act 3) | plan: safe / burn / gunpoint; or stayed out (Lucy always intercepts) |
| Search for Eli (Act 1) | errand: ran it / skipped it |
| The body (Act 1) | knot: pointed it out / cut it silently |
| Barfight (Act 1) | opened (got up / stayed seated), move (shove / rack / bottle), stood with Eli (yes / no), caught (clean / red-handed) |
| The wire (Act 4) | got a full confession / got part of it / got caught wearing it |
| Ice jam (Act 4) | stopped it / caught the Major / it blew |

How Act 1's three missions play, and what each note applies, is in [`acts/act1-missions.md`](acts/act1-missions.md). Act 2's are in [`acts/act2-missions.md`](acts/act2-missions.md). Act 3's, with the survival rules the night and the search share, are proposed in [`acts/act3-missions.md`](acts/act3-missions.md).

A mission's menu is data in `text-game/src/missions.ts`: its start and end scene, the details its note carries and the labels each can take, and, for each ending, the choice notes it applies in order (single-option beats between them are followed on the way). A note with several details is one ending per combination, its notes joined by dots, `opened.move.stood.caught` for the barfight. The game reads it with `mission(state)`, which returns the mission starting at the current scene or `undefined`, and reports with `sendMission(state, note)`, which lands on the mission's end scene, or on the ending's own where the notes part ways (each rash plan lands on its own `a3_confession_*`). Today eleven missions have a menu in `missions.ts`: the search for Eli, the body, the barfight, the photo lab, the hotel bar, the Major's cabinet, Lucy's dig, the long night, the ski search, the wreck and the rash plan. The other rows in the table above (the wire, the ice jam) are specs, not data yet; they have no `mission(state)` and no `sendMission`. The text build plays the scenes one choice at a time. The engine build does the same: as the player plays a mission it sends the scenes' own notes through `sendNote` in `game/src/prologue.ts`, one per menu, and its tests (`knot.test.ts`, `trail.test.ts`, `cabinRide.test.ts`) check that the story lands where `sendMission` with the mission's note lands. `sendMission` itself is read by the parity ratchet (`game/src/notesRatchet.ts`), which walks every Act 1 to 3 menu, a mission's start as its mission notes. A note the engine can't send yet is a line in `game/notes-allowlist.txt`, `scene:note` or `missionId:note`, and the list may only shrink. A unit test (`text-game/src/missions.test.ts`) checks that every way through a mission's scenes lands where one of its notes does and every note lands where a way through does, so the sweep over the scenes covers the menu. Notes may share a state where a detail carries none on that path (the barfight's move when Wade stayed seated), or where the detail lives only inside the mission (Lucy's dig: a wrong first spot costs light and fingers, never story; the ski search: the route is color, and both reach the wreck on the same state).

Because the menus are written down, the robot tester reads them and tries every option. A new mission is tested the moment its menu exists.

## Rule 3: getting good at the game changes small things, choices change big things

- **How well you play shades the story.** Get spotted and the cops get more suspicious, you grab less evidence, and later scenes may happen at night in the fog instead of at sunset (see "Moral weather" in `design.md`).
- **The big moral moments are always deliberate choices.** Staying with Lucy, taking Ashby's money, testifying, keeping Eli's secret: the game stops and asks. Nobody gets the bad ending just for being clumsy at sneaking.

## Rule 4: getting busted means try again

Spy missions can fail hard: "You got busted. That was way too obvious." The player restarts the mission from its last checkpoint. That failure stays inside the mission and the story never hears about it. Only the finished mission sends a note.

A mission can still have a "messy" ending that the player chooses to accept instead of retrying (seen but got away). That one does reach the story, as more heat.

## Rule 5: the story tells the game how the world should look

The game asks the story a few read-only questions to set the scene:

- **Weather and light:** sunset alpenglow, blue hour, or night and ice fog, based on how much trouble Wade is in.
- **Who's around and how they feel:** Eli's and Lucy's trust, Barnette's suspicion.
- **What Wade knows:** `notebook(state)`, one short line per piece of evidence held, so the game can show them in his notebook (below).
- **Who the player is:** `pov(state)` and `oneHanded(state)` (below).
- **Where and when:** `place(state)`, `clock(state)`, `season(state)` and `goal(state)` in `text-game/src/story.ts` (below).
- **Where to go next:** the places the current menu leads to, which the pocket map, the street signs and a townsperson's directions read (see "Where to go next" below).

### Where, when and what next

Each scene can carry three fields, `place`, `clock` and `goal`, written in its scene file next to its text. The game reads them through queries in `text-game/src/story.ts`, so it can put the player in the right part of town at the right hour without the story caring how they walked there.

| Query | Returns | Example |
|---|---|---|
| `place(state)` | one of a fixed set of place ids (`Place` in `text-game/src/types.ts`): `silverPan`, `owensRoom`, `floatDock`, `surveyCamp`, `boardingHouse`, `floodedStreet`, `floodCabin`, `helpTent`, `landOffice`, `cityJail`, `eielsonBarracks`, `majorsOffice`, `squadronBuilding`, `photoLab`, `photoRecords`, `baseHangar`, `lucysKitchen`, `hotelBar`, `communityHall`, `nlCafe`, `bushStrip`, `richardsonHighway`, `crashSite`, `searchRidge`, `hospital`, `hospitalLot`, `tolliversHouse`, `tolliversOffice`, `tolliversCabin`, `troopersPost` | `floatDock` |
| `clock(state)` | local date and time, `YYYY-MM-DDTHH:MM` (`Clock` in `types.ts`), for sun angle and season; weather such as the flood comes from the date, not the place | `1967-07-15T07:30` |
| `season(state)` | `summer`, `flood`, `freezeup`, `winter` or `breakup`, from `clock(state)`; `undefined` when the scene has no clock | `flood` |
| `goal(state)` | a short objective line: where the story wants the player next | `Fly north with Curly to the survey camp.` |

Every scene from the prologue through Act 3 has all three, and a unit test (`text-game/src/story.test.ts`) enforces that; the sweep (`explore.ts`) checks that the clock never runs backward on any move. The fields are fixed per scene, not read from state. Where the hour differs by route, the route goes to its own scene: the records room is `a2_photos_files` at the clerk's lunch and `a2_photos_night` after the 1700 lockup, with the same text and choices. Otherwise the scene keeps one clock: `a2_hotel`'s clock is the date of Lucy's ask, not of the photographs she has spread out, and `a2_heat` is on the Richardson Highway whether or not Barnette stops Wade. In Act 3, Lucy's night at the wreck (`a3_survive_*`, 12 December at 17:00) comes before Wade's search sets out at first light the next morning (`a3_search`), so that POV switch runs forward without the pass `clock.ts` allows it. The clock stays fixed where the scene's text reads state: Lucy's signal (`nightSignal`) changes what Wade sees on the search (`a3_search`, `a3_ski_*`, smoke from the start, a spotter plane circling, or only a smell) and how long until the rest of the team reaches the wreck (`searchHours`, read at `a3_home`), but Wade reaches the wreck at `a3_arm`'s clock on every path, so the engine places the smoke and the plane from `nightSignal`, not from the clock. Lucy's confession is one scene per rash plan (`a3_confession_safe`, `_burn`, `_gun`, `_none`), so it is placed where she finds Wade: at Tolliver's office, cabin or house a few minutes after the plan sets out, or, on the quiet path, in her kitchen after she drives him in from the gate (she can't get onto the base). The four share their text after the opening and their menu. `a3_walk` puts Wade back in the barracks at 04:00, by cab from town or, from the cabin, a ride out on the highway. Lucy's let-go day (`a2_let_go`, `landOffice`, 14 November 17:00) is the same day as her after-hours search (`a2_records` at 21:30, `a2_records_log` at 22:30), so the two routes are a fork and not a sequence; both end at `a2_jake`. When she was let go, her confession (the four `a3_confession_*` scenes) opens on what she carried home: the Major's files come out of the trunk at the foot of her bed instead of her desk drawer, and she says once that the job went for the cabinet and she would go in again (`lucyLetGo` in `logic.ts`). The scene's place and clock do not change; only its text reads state. Scenes from Act 4 on do not have them yet, so the queries return `undefined` there; the game must handle that until each act is filled in. A new place id is added to `Place` when a scene needs it. `boardingHouse` is the outside of Owen's boarding house and its door; `owensRoom` is his room inside it. The prologue's last scene, `p_end` (14 August), is also at `boardingHouse`, and the engine plays it in the `flood` space, the same street under high water with the skiff at the steps; the ground floor, reached through the door, is the `boarding` space and has no place of its own. `floodedStreet` is Act 1's flooded town, the `line` space. `floatDock` is on the downtown map (`docs/town-map.md`, "Float dock"): Owen walks down from the boarding house past the post box, and the `p_dock` panel comes up at the dock's spot at the foot of the gangway, with Curly out on his plane's float (`game/src/floatDock.ts`). The walk down is one mission to the story (Rule 1): a hold at the post box mails the letter to Lucy and sends nothing, and the panel offers the one note that says how the walk ended, `fly` with the letter in the mail or `keep` with it still in Owen's jacket (`owenLetter`; a kept letter goes in the mail with his second at `p_end`). Either button sends the story to `p_camp` at once; the game then plays the flight north (`game/src/flight.ts`) over town and down on the camp's gravel bar, and interact skips it to the camp.

`season(state)` is a pure function of the date, not the place. Its ranges are constants in `text-game/src/queries.ts`
(`SEASON_STARTS`), after the band-by-season table in `docs/art/README.md`: **flood** from 12 August to 31 August (the
Chena tops its banks in the second week; the prologue's last scene, 14 August, is already flood), **freezeup** 1
September to 30 November, **winter** 1 December to the end of February, **breakup** 1 March to 31 May, **summer** 1
June to 11 August (the prologue's July). The engine lights each space from this query and `clock(state)`
(`timeOf` in `game/src/lighting.ts`): the sun from the date and hour, the season's light from the date. A scene with
no clock takes the season of the last dated scene before it. Freeze-up is lit; only breakup, which the engine has no
light for yet, falls back to winter. The story backdrop ignores the clock.

### Who the player is

| Query | Returns | Notes |
|---|---|---|
| `pov(state)` | `'owen'`, `'wade'` or `'lucy'` | Owen in the prologue; Wade from Act 1 on, except Lucy's scenes. Today those are her Act 2 land-office search (`a2_records`, `a2_records_log`, which runs only while `lucyHeat` < 2), the day she is let go instead (`a2_let_go`, at `lucyHeat` >= 2), and `a3_camp` through `a3_survive_jake`. It is a lookup by scene id (`lucyScenes` in `queries.ts`), not prose parsing. Eli's trip to Minto (`a2_minto`) stays Wade's: Wade isn't on the trip, and the scene is him hearing about it afterward. |
| `oneHanded(state)` | `true` from `a3_arm` onward, by scene order, else `false` | Wade's right arm breaks in `a3_arm`. Nothing yet says when it heals, so it stays true to the end. The broken-arm design decision (#88) may set a duration; this one query is where that changes. |

### What Wade knows

`notebook(state)` returns `{ id, line }[]`, one entry per piece of `Evidence` held, in the order the state keeps them.
Each line says what was seen, not what it means ("A backward bowline in yellow line, tail outside the loop, cut off
Owen's sawhorse," never "proof Curly did it"), in Wade's voice, or Lucy's where a line has one and the scene is hers.
The lines live in `text-game/src/queries.ts` as a `Record<Evidence, ...>`, so adding an `Evidence` value without a
line fails the typecheck. Unit tests in `text-game/src/queries.test.ts` run the story lint (`storyLint.ts`) over the
source with the oil rule on, since the notebook can open before Act 4, and the oil rule over every rendered line. The
in-game journal ([#51](https://github.com/brandonapol/fbx67/issues/51)) reads this query as its source.

### Ambient talk

The people Owen passes, and what they say, are story data in `text-game/src/ambient/`: `format.ts` is the shape,
`select.ts` the queries, `lint.ts` the rules. Each `Ambient` (a person or a thing, like the jukebox) has a name from
`names.ts` or a role name ("the airman at the jukebox"), the `Window`s of place and story clock it is around for, and
its lines keyed by trigger: `greet`, `talk`, `bark`, `use`, `askAbout:<topic>` (the survey, Curly, the weather, the land
office) and `react:<event>` (bump, run, stare). A `Bit` is one exchange of one to three lines, with an optional reply
the player can give, and may read story state through `when` (for example `boughtRound(state)`). A line's speaker is
`them`, `aside`, or the player character by `pov` (`owen`, `wade`, `lucy`); the lint fails a player line heard in a
scene played as someone else. A `Thread` is an overheard
exchange between ambient people, played in order.

| Query | Returns |
|---|---|
| `present(state, cast)` | who is at the story's place and hour |
| `pool(state, ambient, trigger)` | their lines for a trigger whose `when` holds |
| `topics(state, ambient)` | the topics they have an `askAbout` line for |
| `say(state, ambient, trigger, spent)` | the next line not yet said, and the new `spent`; a pool starts over once every line in it has been said |

Ambient talk never changes `State`: none of these returns one, and a unit test checks it. An interaction that must
matter is a menu note, with its field in `state.ts`. `lintAmbient(cast, threads, source)` fails on a placeholder name in
the source, a speaker name that is neither in `names.ts` nor a role name, the oil rule before Act 4, an unfilled token
(`undefined`, `${`, `TODO`), an empty line or one over 120 characters, and a line that is never heard at any place and
time the story reaches. It runs in `make check/text/lint`.

The casts are `prologueTown.ts` (Owen's July town, #45) and `floodTown.ts` (Wade's flooded town in Act 1, #107).

The things Owen can use in the prologue (the jukebox, the empty chair, the reel-to-reel) are `Ambient`s of kind
`thing` in `text-game/src/ambient/prologueThings.ts`, with only `use` lines. The engine build's verbs live in
`game/src/talk.ts`: Greet (tap), Talk (hold, with the reply on offer), Ask about (a radial of `topics`), Use on
things, and Buy, which is the bar's own hold spot and sends the story's `round` note. Every line comes from `say`,
and plays as a subtitle above its speaker for a reading time, then stays in a log; the person faces Owen while the
exchange lasts. `game/src/mission.test.ts` plays the prologue headless with every verb on the way and checks the
story ends on the same path as playing it without a word.

### Where to go next

Wade carries a folded street map, and the game reads three things off the same chart of the town (`game/src/pocketMapCharts.ts`, built from `docs/town-map.md` for downtown and `docs/base-map.md` for Eielson), so what the map shows, what a corner sign says and what a stranger tells him agree. None of them reads a gate or changes state; each asks the story where it points.

- **Where the story points:** `ahead(state)` in `game/src/frontEndMap.ts` is the places of the scenes the current menu leads to, other than the one the player is in, found by asking `menu(state)` and `place(...)` of each option's next state without keeping it. `goal(state)` is the line at the head of the map.
- **The pocket map** (`frontEndMap.ts`, drawn by `frontEndMapView.ts`) marks the places the player has been, been near, or been pointed to, and where they stand. A place with no spot on the sheet is listed in the margin by `placeNames`, with how to get there. Standing at Eielson it unfolds the base sheet.
- **Street signs** (`game/src/streetSigns.ts`): one post at every corner where an avenue crosses a street downtown, the two names on two blades, in capitals with the kind abbreviated (`SECOND AVE`, `CUSHMAN ST`), a step back from both curbs on the southeast corner. They are props in the `downtown` and `flood` spaces, placed by the chart, never by hand. A sign is readable within `READ_WITHIN` (18 m).
- **Asking the way** (`game/src/directions.ts`, `townsfolk.ts`): downtown, the schedule's street people (`ambient.ts`) stand on the street, and interact on one in front of the player, with nothing of the space's own nearer, asks them the way. The place asked about is the first of `ahead(state)`, or, on a walk, the place the story is at. The answer is built from the chart's way names and the speaker's own position (from a speaker on Second: "The land office? Right along Second, between Lacey and Noble. Head east."), or, for a place off the chart, the map's margin note said aloud ("The help tent? South on Cushman past Fifth."). It goes on the talk log like any line, as a subtitle over the speaker. It changes nothing in the story: no note is sent.

The game never changes story facts directly. It only sends notes (Rule 1) and asks questions (Rule 5).

## What this means for the text build

- Today each choice is a numbered button. Under this agreement each button is just a way of sending a note, so nothing about playing the text game changes.
- The robot tester (`explore`) switches from "try every button" to "try every note on every menu," which is the same thing for today's scenes.
- New missions get added as a menu plus what each ending does to the story, and the tester covers them automatically.

## First worked examples (Act 4)

**The wire.** Wade wears a recorder taped inside his cast to a second lunch with Ashby. In the 3D game it's a tense conversation where the player steers Ashby's bragging and keeps the recorder hidden. Allowed endings: full confession (only possible if Lucy and Eli are backing him), part of it, or caught (Ashby finds the recorder). Story effect: the tape's strength feeds the grand jury.

**The ice jam.** A breakup sequence on the river with Eli: reading the ice, reaching the jam, confronting the Major. Allowed endings: stopped it, caught the Major, or it blew. If Wade has burned his friends, Eli isn't there to get him across the ice in time, so only "it blew" is possible. That keeps the moral choice in charge, per Rule 3.

## Still to decide when we build it

- Exactly which details each mission's note carries (we'll write those as we build each mission).
- Where the retry checkpoints sit inside each spy mission.
