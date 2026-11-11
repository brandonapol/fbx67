# Engine roadmap: status and proposed order

**Status: Proposed.** Nothing here is decided. It is a snapshot of the engine build against the 15 areas of epic #6,
taken from `main` at `906d0ccc` and the issue tracker on 2026-11-10, with a proposed order for the next tickets. The
owner approves, edits or rejects it in review. Every recommendation below is Proposed.

Legend: **Built** = the area's scope is on `main`. **Partial** = some of it is on `main` and open tickets cover the
rest. **Not started** = no game code and no implementation ticket. A ticket marked ✓ is closed.

## 1. Status by area

| # | Area | Status | Evidence on `main` | Open tickets (blockers in brackets) |
| --- | --- | --- | --- | --- |
| 1 | Core logic port | Partial | Notes, menus and queries in `text-game/src/story.ts`, `queries.ts`, `missions.ts` (#8 ✓, #38 ✓, #78-#80 ✓); golden routes and matrix in `make check/routes`; parity ratchet `game/src/notesRatchet.ts` (#122 ✓). No shared core package: `game/src` imports `../../text-game/src/*.ts` directly (story.ts alone at 57 sites). | No ticket for the package split; #4 lists it under "Remaining to build". |
| 2 | Narrative runtime | Partial | Start at any scene from a path (#110 ✓, #163 ✓, #164 ✓, `game/src/start.ts`); menu for spaceless scenes (#162 ✓); routing by place in `game/src/router.ts`, `levels.ts`; Wade (#111 ✓) and the Lucy switch by `pov(state)` (#217 ✓, PR #316, `game/src/pov.ts`). | Letters as the save system: no code, no ticket (#31 put save slots out of scope). |
| 3 | Letters and Mama | Partial | One letter view for all acts: `game/src/letters.ts`, `letterView.ts` (PR #309, part of #119). Mama's replies are written in `text-game/src/scenes/mama.ts`. | #181 Mama's replies in the view [#180, #163 ✓]; #180 (see section 2). |
| 4 | Heat and the lawmen | Partial | Drunk tank and Ashby, `game/src/jail.ts` (#118 ✓, PR #310); Barnette's ruling at the help tent, `hospital.ts` (PR #312); getting caught is retry only (#86 ✓, PR #330); Lucy's heat gate in text (#211 ✓, PR #369); the officer's two scenes in text (#215 ✓, #216 ✓). | #132: #207 café [#125 ✓, #42 ✓], #209 Barnette's roadside stop [#125 ✓], #210 officer's street stop [#103, #125 ✓]; #225 officer at the hangar [#224, #103, #182]. |
| 5 | Stealth and heists | Partial | Prologue stealth at the camp, `campGround.ts`, `stealthView.ts` (#12 ✓, #49 ✓ PR #382); Lucy's records work in text (#104 ✓, PR #362). Specs: `docs/acts/act2-missions.md`, **Proposed**. No photo lab, cabinet or hotel-bar mission code. | #127: #190 → #192; #128: #195 → #196 [#101]; #129: #198 → #200; #228 Lucy's land-office search [#172 ✓, #217 ✓]. All [#99, whose subs are all ✓]. |
| 6 | Town hub | Partial | Walkable downtown `game/src/downtown.ts` (#41 ✓); seasons and flood (#43 ✓, #50 ✓); freeze-up and deep winter on the town, `freezeup.ts` (#125 ✓, #136 ✓); ambient life (#44 ✓); pocket map and directions (#303 ✓, #374 ✓). | Hank's in-world tutorial at the Silver Pan: named in `design.md` and `docs/acts/act1.md`, no code, no ticket. #48 (see section 2). |
| 7 | Barfight and combat | Partial | Combat core and test space: `combat.ts`, `fightSpace.ts`, `fightControls.ts`, `game/fight.html` (#175 ✓, PR #318). Menu and move state in text (#153 ✓, #205 ✓). The Silver Pan set piece: `barfight.ts`, the `pan` space, every `theBarfight` note sent by play (#176). | #117: #177 the whole bar picks sides [#176]. |
| 8 | Survival and skiing | Partial (text only) | Survival order and signal carry state (#208 ✓, PR #327); crash night, ski search and wreck as menus (#199 ✓, #201 ✓, PRs #397, #395); rules in `docs/acts/act3-missions.md`, **Proposed**. A grep of `game/src` finds no survival, skiing or one-handed code. | #138: #184 rules → #185 presentation; #141 skiing; #142: #188 → #189 [#138]; #140: #186 → #187 [#137, #138]; #139 the cache [#137, #138]; #143: #219 → #220 [#134] → #221 [#142]. |
| 9 | Eielson base level | Partial | Base map `docs/base-map.md` (#124 ✓); gray-box level `game/src/eielson.ts` (#126 ✓, PR #317); Act 2 audio (#135 ✓). | The missions on it: #190, #192, #195, #196 (area 5). |
| 10 | Act 4 set pieces | Not started | Text only, `text-game/src/scenes/act4.ts`. Spec `docs/acts/act4-missions.md`, **Proposed** (PR #398, part of #5), with five owner questions. | #5. Implementation tickets wait on the spec's approval. |
| 11 | Endings and epilogues | Not started | Text only, `text-game/src/scenes/end.ts`. No game code. | None filed. Waits on area 10. |
| 12 | Characters and relationships | Partial | Rigged core cast Owen, Curly, Wade, Hank (#40 ✓, PRs #60, #272); Lucy's body (#217 ✓); Wade's parka (PR #257); Eli's scene without Wade (#102 ✓); the officer's role (#103's subs ✓). | #232 Eli, Joan, Lucy, Barnette, Ashby rigs [#40 ✓]; #62 cast polish; #134: #212 → #214 winter wardrobe. |
| 13 | Culture and history | Partial | `docs/fact-checks.md` (#3 ✓, #156-#158 ✓); consultant packet `docs/consultant-review.md` (#77 ✓, PR #336); names (#81 ✓). The officer's real name waits on consultants (`design.md` Open Questions). | #130: #203 → #204 the Chiefs meeting, consultant review before merge (#69); #72 story review of Acts 1-3; #76 (subs ✓). |
| 14 | Content pipeline | Partial | `docs/art/pipeline.md` (#33 ✓, #242 ✓); `make generate/assets`, `make generate/characters`; audio foundation and Act 1-3 beds (#36 ✓, #121 ✓, #135 ✓, #150 ✓); Owen's tapes (#363 ✓). | #61 low audio tier: **blocked**, see below; #63 CC0 field recordings; #54 palettes [the owner's alpenglow photo]; #383, #120, #133, #149, #212, #214 [art pass, about 2026-12-08]. |
| 15 | QA and agent tooling | Partial | Text CLI `text-game/src/cli.ts`; sweep, verify, matrix; story lint (#73 ✓); clock and sweep budget (#74 ✓, #75 ✓); headless smoke, baselines and perf budgets for the prologue and Acts 1-3 (`game/smoke/`, #159-#161 ✓); parity ratchet with 117 notes left on the allowlist. A grep finds no telemetry and no agent-playtest harness. | #123 (subs ✓); #72; #361 (see section 2). Telemetry and agent playtests: none filed. |

### Blockers worth naming

| Ticket | Blocked by | Evidence |
| --- | --- | --- |
| #61 audio low tier | A quality-tier switch. #39 is closed, but a grep of `game/src` for a quality tier finds nothing. | #61 "Blocked by #39 (quality tiers)" |
| #383, #120, #133, #149, #212, #214 | The art pass: about 50 Higgsfield credits now, 250 more around 2026-12-08. | `docs/art/pipeline.md`; #383's difficulty line |
| #220 sling animations | #134 winter wardrobe, so the art pass too. | #220 "Blocked by #219, #134" |
| #54 palettes | The owner's alpenglow photo is not in the repo. | #54 body |
| Every Act 2 mission | Owner approval of `docs/acts/act2-missions.md` (Proposed). | spec status line |
| Every Act 3 engine ticket | Owner approval of `docs/acts/act3-missions.md` (Proposed), including the survival numbers #184 tunes to. | spec status line |
| Act 4 and endings | Owner answers to `docs/acts/act4-missions.md` "Open questions for the owner". | spec section |
| #203, #204 Chiefs meeting | Consultant review before merge. | #69 acceptance criteria |

## 2. Housekeeping: open tickets that look finished

Proposed: the owner checks each and closes it, or says what is left. No code needed.

| Ticket | Why it looks done | What may remain |
| --- | --- | --- |
| #99, #100, #101, #103, #76, #123 | Every sub-issue is closed. | Nothing listed. |
| #178, #179 | Parent #118 closed by PR #310; no `a1_tank` note is on the allowlist. | Check the criteria against `game/src/jail.ts`. |
| #170, #234 | PR #312 built the help tent, Joan, the ruling and the errand's tent. | A smoke frame for the tent (#234). |
| #173 | PR #311 built the ledgers, the cigarette and Lucy's ask, with parity tests. | Nothing listed in the PR. |
| #180 | PR #309 built one letter view for every act. | `a1_letter`'s 3 notes are still on `game/notes-allowlist.txt`. |
| #48 | PR #366 built the dock and flight; #365 (its follow-ups) ✓ by PR #375. | The story-reviewer pass on Curly's habits. |
| #167 | PR #326 built the boat ride and cabin. | Owner review of the body's staging screenshots. |
| #361 | Saddle blocker for the #346 rebase; #346 ✓ by PR #356. | Nothing. |

## 3. Proposed order: five waves

Each wave's lanes touch disjoint files, so lanes run in parallel. A lane is serial inside itself (arrows).

**Shared hotspots.** Every new space also edits `game/src/levels.ts`, `router.ts`, `prologue.ts`, `render.ts`,
`soundscape.ts`, `game/notes-allowlist.txt` and `docs/perf.md` (PR #311 warned of exactly this conflict). Proposed:
keep those hunks small and let the merge train land lanes one at a time; no new registry abstraction.

### Barrier B1 (Proposed): the core package split

Area 1's remaining item (#4) moves `text-game/src` into a shared core and rewrites every `../../text-game/src`
import in `game/` and `web/`. It touches nearly every engine file, so it **must land alone**, with no other lane
open. Proposed: if the owner wants it, run it between Waves 1 and 2, when the queue is empty. It blocks nothing
below; skipping it is a valid answer.

### Wave 1: finish Act 1, and the pure rules (no owner decision needed)

| Lane | Tickets | Files |
| --- | --- | --- |
| A cast | #232 → #62 | `game/assets/characters.json`, `game/tools/characters.ts`, `game/src/cast.ts`, `characters.ts` |
| B barfight | #176 → #177 | `combat.ts`, `fightSpace.ts`, `fightControls.ts`, `silverPan.ts`, `crowd.ts` |
| C search for Eli | #166 | `searchEli.ts`, `trail.ts`, `trailDrive.ts` |
| D land office | #174 | `landoffice.ts`, `game/assets/environment.json` |
| E letters | #181 | `letters.ts`, `letterView.ts` |
| F one hand | #219 (pure rules; the arm is decided, #88 ✓) | a new module in `game/src` |
| G audio | #63 | `synth.ts`, `docs/audio/sources.md`, new recordings under `game/public` |

Open PR #400 (#171, St. Joseph's hallway) should land before Wave 1 starts.

### Wave 2: Act 2 (needs `docs/acts/act2-missions.md` approved)

| Lane | Tickets | Files |
| --- | --- | --- |
| A Eielson | #190 → #192 → #195 → #196 | `eielson.ts` and new mission modules (one lane: all four share the base) |
| B hotel bar | #198 → #200 | a new hotel module, the door in `downtown.ts` |
| C bush strip | #182 → #183 | a new strip module |
| D the law | #207, #209, #210 | a new café module, `drive.ts` for the roadside stop |
| E Lucy | #228 (after Wave 1 lane D) | `landoffice.ts`, `lucy.ts` |
| F Chiefs | #203 → #204 (consultant review gates the merge) | a new hall module |

### Wave 3: Act 3 systems (needs `docs/acts/act3-missions.md` approved)

| Lane | Tickets | Files |
| --- | --- | --- |
| A survival | #184 → #185 → #218 (Lucy's verbs need #138) | a new survival module, `lucy.ts` |
| B skiing | #141 | a new ski module, `input.ts`, `camera.ts` |
| C hospital | #222 | `hospital.ts` |
| D winter terrain | #188 | a new terrain module |

### Wave 4: Act 3 missions

| Lane | Tickets | Files |
| --- | --- | --- |
| A crash night | #186 → #187, then #139 | `camp.ts`, `campGround.ts`, `flight.ts` |
| B search | #189 → #221 → #144 | the Wave 3 terrain module, a new wreck module |
| C town | #223, #224 → #225 | `hospital.ts`, a new hunting-cabin module, `eielson.ts` hangar |
| D the end of Act 3 | #226 → #227 → #148 | new rash-plan modules |

#220 (the sling) joins whichever lane is free once the art pass delivers #134.

### Wave 5: Act 4 and the endings (needs the Act 4 questions answered)

Not filed yet. Proposed: once `docs/acts/act4-missions.md` is approved, file one ticket each for the wire, the ice
jam, testimony, and the endings and epilogues assembly (area 11). The wire and the ice jam can run as parallel lanes;
the endings lane waits for both.

### Parallel track: the art pass (from about 2026-12-08)

#120, #133, #149, #212 → #214, #383, and #54 once the photo is in. These touch `docs/art/` and `game/assets/`, so
they can run beside any wave except Wave 1 lane A (characters).

## 4. Owner decisions, by wave

| Wave | Decision needed first |
| --- | --- |
| Before Wave 1 | Close or reopen the section 2 tickets. |
| Wave 1 | None. #167's screenshots need a look, but nothing waits on it. |
| B1 | Do the package split at all, and when. |
| Wave 2 | Approve `docs/acts/act2-missions.md`; arrange consultant review for the Chiefs meeting. |
| Wave 3, 4 | Approve `docs/acts/act3-missions.md`, including the survival numbers. |
| Wave 5 | Answer the five questions in `docs/acts/act4-missions.md`. |
| Art track | Plan the 2026-12-08 credit budget; supply the alpenglow photo for #54. |

## 5. Open questions for the owner

1. **#61:** file a ticket for a quality-tier switch in game code, or drop the low audio tier?
2. **Area 1:** is the core package split (#4, barrier B1) still wanted?
3. **Area 2:** are letters still meant to be the save system? Nothing is filed, and #31 ruled save slots out.
4. **Area 6:** should Hank's in-world tutorial at the Silver Pan get a ticket?
5. **Area 15:** are telemetry and agent playtests still wanted? Neither exists or is filed.
6. **Specs:** `docs/acts/act1-missions.md` and `docs/acts/act1.md` still say draft, though Act 1 is mostly built.
   Mark them approved?
7. **Consultants:** who reviews the Chiefs meeting, and when can the officer's real name be expected?
8. **Waves 1 to 4** start Act 2 before Act 1's art. Is building ahead of the art pass acceptable?
