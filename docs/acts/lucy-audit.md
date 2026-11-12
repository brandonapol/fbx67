# Playable Lucy: audit of #137 against `main`

Issue #137 and its two sub-issues, #217 (the switch, her body and her camera; closed) and #218 (her bush verbs; open).
Read-only: this file is the only change. Read at commit `31bd671d`. Terms: **met** = shown by code and a test;
**partly** = some of it, with the gap named; **not met** = absent.

## Verdict

The switch is solid and tested. Lucy's night is playable and its survival rules are shared with Wade's. Three things
are not done: her rig and animation set (she has no cast model), the smoke baseline of her *first* Lucy frame as #217
now defines it (the Act 2 land-office search), and most of the "bush verbs" in #218 beyond the fire and Jake's wound.
#137 stays open. This PR is `Part of #137`.

## #137 acceptance criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| The switch to Lucy and back to Wade at `a3_search` comes only from `pov(state)` | **Met** | `pov` in `text-game/src/queries.ts:52` is the one source: `lucyScenes` (`a2_records`, `a2_records_log`, `a2_let_go`, `a3_camp`, `a3_wrong_spot`, `a3_found`, `a3_crash`, `a3_survive_fire`, `a3_survive_jake`); `a3_search` is not in it, so Wade returns there. The engine reads it in `game/src/pov.ts` (`bodyFor`) and `prologue.ts:991` (`playerBody`). `game/src/lucy.test.ts` "driven by pov(state) alone" asserts Lucy through the night, Wade at `a3_search`, and the game's story equal to the `--choices` replay; "the switch reads pov(state), never a scene id" asserts `lucy.ts` and `pov.ts` name no scene id. |
| Lucy's actions are hers; no "Wade" prompt text in her scenes | **Met for the spaces that exist** | `lucy.test.ts` "no prompt the game shows in her scenes names Wade" checks every interactable and panel button in her play, and every spot in any space a `pov === 'lucy'` scene can reach. `grep -n Wade game/src/{owensCamp,engineOut,survivalPlay,pov,lucy}.ts` returns only comments (`engineOut.ts:219` about Wade's morning at the wreck). See gap 3: the check cannot cover a space that does not yet exist. |
| Smoke baseline of the first Lucy frame | **Partly** | `game/smoke/baselines/act3/a3_camp.png` (and `owensCamp.png`, `a3_crash.png`, `wreck.png`, with `_dusk` and `_night`) cover Lucy from `a3_camp`; starts at `game/smoke/starts.ts:32,35`. But #217 says her first frame is now the after-hours search of the land office in Act 2 (`a2_records`, per #84). There is no baseline or start for it. |

## #217: the switch, her body and her camera (closed)

| Criterion | Status | Evidence |
| --- | --- | --- |
| Switch only from `pov(state)`; no scene-id checks | **Met** | As above. The only `scene ===` checks in `game/src` are `floatDock.ts:28`, `frontEnd.ts:40`, `room.ts`, `trailDrive.ts:75`, `prologue.ts:250-252,708`: all Owen's and Wade's spaces, none about Lucy or `pov`. |
| No "Wade" prompt text in her scenes | **Met** | As above. |
| Smoke baseline of the first Lucy frame | **Partly** | As above. Closed on the `a3_camp` frame; the Act 2 start the issue text later added has none. |
| "Her rig and animation set from #40" (issue body) | **Not met** | `castIds` in `game/src/cast.ts:4` is `owen, curly, wade, hank`. `lucy.ts` says her model "joins the cast once her concept sheet has passed the consultants' review; until then no figure is drawn". #40 is closed, but it covered Owen, Wade, Curly and Hank. #232 (open) adds Lucy and the Act 1 cast. |
| Her camera height and footsteps | **Met** | `game/src/lucy.ts`: `eye: 1.6`, `tread: { pitch: 1.3, weight: 0.7 }`; `lucy.test.ts` "Lucy's body is her own" asserts lower eye and lighter, quicker step than Wade, and `playerBody` returns it in every Lucy scene. |

## #218: her bush verbs (open)

| Criterion | Status | Evidence |
| --- | --- | --- |
| Each verb playable in a test space, with a unit test where it has rules | **Partly** | See the verb table. |
| Her fire uses the survival rules (#138), no copy | **Met** | `survivalPlay.ts:30` says nothing re-implements a rule; it calls `kindle`, `feed`, `burning` from `survival.ts` (`survivalPlay.ts:262-264`). `survivalPlay.test.ts` covers the order gate and the bare-hands limit. Note #138 itself is still open as the parent of the survival work. |

| Verb | Status | Where |
| --- | --- | --- |
| Fire built fast | **Met** | `light`, `feed` verbs; `survivalPlay.ts:336-337`, `SECONDS` table, `kindle` from `survival.ts`. Fire-first vs Jake-first changes her hands (`BARE`, `BARE_LIMIT`), tested in `survivalPlay.test.ts`. |
| First aid done right | **Partly** | `free` (the frame off Jake's leg) and `tie` (the bleeding) exist, are ordered against the fire, and have timings (`free: 30`, `tie: 20`) and tests. `bed` carries him to the fire on boughs. Missing: no first aid for Lucy herself (frostbite is a meter, not a verb), and the splint in the Wade scenes is a cutscene (`act3-missions.md` section 4, "Lucy's turn"), not her play. |
| Sure-footed in snow | **Not met** | The only snow-footing code is audio: `footsteps.ts` (`snowAt`, squeak by temperature) and her `tread`. Nothing in movement makes her steadier than Wade in snow or deep snow (`wade`ing speed in `trail.ts` is depth-based, for whoever walks). `owensCamp.ts` has no snow-surface or footing rule. There is no snow-footing verb, test, or comparison with Wade. |
| Cuts boughs, deadfall, tends the fire through the night | **Met** | `survivalPlay.ts` verbs and `go:` places (`fire`, `cabin`, `trees`, `slope`). |
| Digs (camp) | **Met** | `owensCamp.ts` interactables `stove`, `cache`, `marker` with `hold: DIG_TIME`; `owensCampPlay.test.ts`, `owensCamp.test.ts`; smoke walker `digBot.ts`. |
| "Never a passenger" | **Partly** | The night and the dig are played. Two stretches are not: the crash itself (`engineOut.ts`: from the first cough to black, "nothing in it is played"; a `Skip the crash` spot at `engineOut.ts:103`), and the whole Act 2 search (`a2_records`, `a2_records_log`, `a2_let_go`), which is Lucy's by `pov` but plays as a story panel with no Lucy space (`landoffice.ts` is Wade's front-door scene, with Lucy as an NPC). |

## Exact gaps

1. **No Lucy figure or rig.** `castIds` (`cast.ts:4`) has no `lucy`; `bodies.lucy` has no `cast`. First person hides this in the dig and the night, but the Act 2 stealth search, the wreck's cutscenes and any third-person or mirror frame need her. Open: #232.
2. **No first Lucy frame at the Act 2 search.** `a2_records` is Lucy by `pov`, but there is no engine space, start (`smoke/starts.ts`) or baseline for it. Open: #228 (blocked by #217, now closed, so it is unblocked).
3. **The "no Wade prompt" test only sees spaces that exist.** It filters `sceneIds` by `pov === 'lucy'` and maps them through `spaceFor(...)`. For `a2_records*` there is no space, so the check passes vacuously. When #228 lands, its space is picked up by the same filter, which is good, but nothing asserts that those scenes *have* a space.
4. **Sure-footed in snow has no verb.** Audio only (`footsteps.ts`), no movement or rule. The open question is what the verb *is* (see follow-up C); the issue says "not a stat screen", so it should be a sure step on a slope or crust, not a number.
5. **First aid is Jake-only.** No verb for treating her own frostbite or splinting. Her hands are a survival meter (`survival.ts` hands and feet), not an action.
6. **The crash is a cutscene.** Intentional per `act3-missions.md` section 2, with a skip; it does not conflict with a criterion but conflicts with "never a passenger" read strictly.
7. **#137's body still says "from `a3_camp`"; #217 says the Act 2 search starts it.** Out of step; fix the parent when #228 lands.

## Smallest follow-ups

Existing issues are named rather than duplicated.

- **A. Lucy's figure in the cast** (existing #232). *Difficulty: standard (a character through the art pipeline; needs the concept-sheet review first).* Adds `lucy` to `castIds`, her model and clips, and a test that `bodies.lucy.cast` is set.
- **B. The Act 2 search as Lucy's first frame** (existing #228). *Difficulty: standard (a stealth mission on an existing interior).* Adds the space, the start in `smoke/starts.ts`, its baseline, and a `lucy.test.ts` assertion that every `pov === 'lucy'` scene has a space.
- **C. Sure-footed in snow** (new, under #218). *Difficulty: standard (a verb with rules; design call on what it is).* Her slope and crust crossing, e.g. the climb to the cache and the trail to the trees: she keeps her footing where Wade's wading and slip rules cost him time. Rule lives in one pure function with a unit test, played in the owensCamp space; no meter on screen.
- **D. First aid on herself** (new, under #218). *Difficulty: standard (a verb over existing survival state).* A "warm your hands" or "wrap your feet" action that spends fire time against `survival.ts`'s hands and feet, with a unit test; no copied rule.
- **E. Close the parent** (mechanical). *Difficulty: mechanical.* When A to D land, check the three #137 boxes, update `act3-missions.md`'s status line, and close #137 and #218.

Not proposed: playing the crash itself. It is a deliberate set piece; revisit only if the owner wants it played.
