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
| Photo lab | in quietly / in messily / refused |
| Hotel bar | listened / skipped |
| Major's cabinet | code or forced, seen or not; or refused (Lucy goes herself) |
| Ski search | reached the wreck (always), route taken |
| The wire (Act 4) | got a full confession / got part of it / got caught wearing it |
| Ice jam (Act 4) | stopped it / caught the Major / it blew |

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

### Where, when and what next

Each scene can carry three fields, `place`, `clock` and `goal`, written in its scene file next to its text. The game reads them through queries in `text-game/src/story.ts`, so it can put the player in the right part of town at the right hour without the story caring how they walked there.

| Query | Returns | Example |
|---|---|---|
| `place(state)` | one of a fixed set of place ids (`Place` in `text-game/src/types.ts`): `silverPan`, `owensRoom`, `floatDock`, `surveyCamp`, `boardingHouse` | `floatDock` |
| `clock(state)` | local date and time, `YYYY-MM-DDTHH:MM` (`Clock` in `types.ts`), for sun angle and season; weather such as the flood comes from the date, not the place | `1967-07-15T07:30` |
| `season(state)` | `summer`, `flood`, `freezeup`, `winter` or `breakup`, from `clock(state)`; `undefined` when the scene has no clock | `flood` |
| `goal(state)` | a short objective line: where the story wants the player next | `Fly north with Curly to the survey camp.` |

Every prologue scene has all three, and a unit test (`text-game/src/story.test.ts`) enforces that and checks that the prologue clock never runs backward. Scenes in later acts do not have them yet, so the queries return `undefined` there; the game must handle that until each act is filled in. A new place id is added to `Place` when a scene needs it. `boardingHouse` is the outside of Owen's boarding house and its door; `owensRoom` is his room inside it. Until the game has a dock space, it shows the `p_dock` panel over the room, and its `fly` button enters the camp.

`season(state)` is a pure function of the date, not the place. Its ranges are constants in `text-game/src/queries.ts`
(`SEASON_STARTS`), after the band-by-season table in `docs/art/README.md`: **flood** from 12 August to 31 August (the
Chena tops its banks in the second week; the prologue's last scene, 14 August, is already flood), **freezeup** 1
September to 30 November, **winter** 1 December to the end of February, **breakup** 1 March to 31 May, **summer** 1
June to 11 August (the prologue's July). The engine's per-space `Season` is migrated to this query in the season-layer
tickets, not here.

### Who the player is

| Query | Returns | Notes |
|---|---|---|
| `pov(state)` | `'owen'`, `'wade'` or `'lucy'` | Owen in the prologue; Wade from Act 1 on, except Lucy's scenes. Today those are `a3_camp` through `a3_survive_jake`. It is a lookup by scene id (`lucyScenes` in `queries.ts`), not prose parsing. The Act 2 land-office search (#84, written by #104) must add its scene ids to that set. |
| `oneHanded(state)` | `true` from `a3_arm` onward, by scene order, else `false` | Wade's right arm breaks in `a3_arm`. Nothing yet says when it heals, so it stays true to the end. The broken-arm design decision (#88) may set a duration; this one query is where that changes. |

### What Wade knows

`notebook(state)` returns `{ id, line }[]`, one entry per piece of `Evidence` held, in the order the state keeps them.
Each line says what was seen, not what it means ("A backward bowline in yellow line, tail outside the loop, cut off
Owen's sawhorse," never "proof Curly did it"), in Wade's voice, or Lucy's where a line has one and the scene is hers.
The lines live in `text-game/src/queries.ts` as a `Record<Evidence, ...>`, so adding an `Evidence` value without a
line fails the typecheck, and a unit test (`text-game/src/queries.test.ts`) checks the lines against the oil rule. The
in-game journal (#51) reads this query as its source.

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
