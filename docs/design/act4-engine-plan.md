# Act 4 in the engine build: build plan

**Status: Proposed.** Nothing here is decided. It turns the Act 4 mission specs
([`../acts/act4-missions.md`](../acts/act4-missions.md), also Proposed) into ordered tasks a swarm of workers could
take, each with its own file claims, and says which tasks wait on the owner. It is Wave 5 of the engine roadmap
([`../roadmap.md`](../roadmap.md), section 3). Part of epic #5. Where this file and [`../../design.md`](../../design.md)
disagree, the design wins; where it and the spec disagree, the spec wins and this file is stale.

The goal is the order the earlier acts used: first the whole act plays in the engine as rough menus over the `story`
backdrop, proven end to end by a smoke run; then the parity ratchet holds every Act 4 note; then spaces replace the
menus one mission at a time, each shrinking the allowlist; sound comes with the spaces.

## 1. What exists today

Read from `main` at `3ad0d17a`.

- **Story.** `text-game/src/scenes/act4.ts` has 18 scenes, `a4_news` to `a4_testify`, all in `sceneIds.ts`. None has a
  `note` id on its choices, so every Act 4 note is the fallback `option1`, `option2`… (`noteOf` in `story.ts`). None
  has a `place`, `clock` or `goal` (story-api, "Where, when and what next"). `a4_struggle` still offers "Hit him with
  the cast", which the design rules out (the arm is in a sling; the attack is a shoulder charge, design.md "Broken
  arm" and the Act 4 line). There is no `a4_wire_alone`, no `wireTape`, and `iceJam(s)` has two tiers.
- **Missions.** `text-game/src/missions.ts` has eleven missions, none in Act 4. `theWire` and `theIceJam` are specs only.
- **Engine.** No game module mentions an Act 4 scene. `levels.ts` has no Act 4 space; `spaceFor` matches a space by
  its single `act`, so the Act 2 `kitchen` (Lucy's kitchen) and the Act 1 `jail` do not serve Act 4 scenes at those
  places. Every Act 4 scene already plays as a menu panel over `story` (the router's fallback), and
  `game/smoke/starts.ts` samples `a4_news` over `story` in the prologue run. `lighting.ts` treats `breakup` as winter
  ("Act 4 breakup row comes with its season layer"); `footsteps.ts` has a breakup temperature. `oneHand.ts` exists.
- **Parity ratchet.** `game/src/notesRatchet.ts` walks Acts 1 to 3 only (`ACTS`); its test asserts no `a4_` key.
  `game/notes-allowlist.txt` has 65 lines, none Act 4. The shrink rule lets a line be added only when its scene or
  mission is new since `main` (`mainMenus` reads `sceneIds.ts` and `missions.ts` at the merge base). Every Act 4 scene
  is on `main`, so **adding Act 4 lines today fails the shrink rule**; task A2 below changes that rule.
- **Smoke.** One run and one CI job per act for the prologue and Acts 1 to 3 (`game/smoke/act3.test.ts` stops at
  `a4_news`). The Act 3 run's path ends on an honest route (Eli's secret kept, Wade stayed with Lucy): from its
  `a4_news`, picking the third option at `a4_offer` reaches the backed wire (`doubleAgentWorks` true) and the stopped
  ice jam. Picking the first, as every other act run does, takes the money and skips both set pieces.
- **Docs.** There is no `docs/acts/act3-engine.md`; `docs/acts/act2-engine.md` is the only "what is built" file per act.
  The spec lists six owner questions; the roadmap says five.

## 2. How earlier acts were built

The same four steps, in this order, are what Acts 2 and 3 did and what this plan repeats:

1. **Menus** (text-game): each mission becomes data in `missions.ts` with `missions.test.ts` (#387, #389, #395, #397).
2. **Places and clocks** on every scene of the act (#308 for Act 3).
3. **Smoke run** for the act over the `story` backdrop, its own CI job and baselines (#388).
4. **Spaces** that send the notes by play, each deleting its lines from the allowlist (#413 for the photo lab), and
   the act's sound beds (`act2Soundscapes`, `act3Soundscapes`).

## 3. Owner decisions

The spec's open questions and proposals, and which tasks each blocks. "Spec" means the section of
`act4-missions.md` must be approved before the task starts, even when no single question blocks it.

| Decision | Blocks | If the answer is no |
| --- | --- | --- |
| Approve spec section 1 (the wire) | B3, C2, C3 | No wire mission; the wire stays one `Continue` |
| Approve spec section 2 (the ice jam) | B1, C5 to C7 | No ice jam mission; the chase stays a chain of menus |
| Approve spec section 3 (testimony) | B4 | `a4_testify` keeps today's text |
| Q1 Who picks the ice jam's tier | B1, C7 | If play may pick it, `theIceJam`'s note gains a tier detail, so B1 waits |
| Q2, P3 The caught tier, and on which route | B2, C7 (where the second stack is placed) | Two tiers; C7 places one stack |
| Q3 Can the tape's strength move an ending | B3 | Proposed no; a yes moves gates and the matrix |
| P1 `wireTape` | B3, B4 | One backed outcome: "Tape: got it / caught" |
| P2 Two start scenes, the lunch as a chain | B3, C2, C3 | The wire's menu shape is unknown; B3 is rewritten |
| P4 `secured(s)` | B4 | Testimony keeps three inline checks |
| Q5 Cast or sling for the recorder | B3 (text), C3 (the Cover verb and the sign-the-cast beat) | The recorder rides in the sling |
| Q6, P5 Places and clocks, `hotelDining` or `hotelBar` | B5, every C task | No Act 4 space can be routed to |
| P6 Lucy's count | B2 (the stopped tier's reason) | The second stack has no setup line |
| Q4 Eli on the blew tier | C8 | The bluff plays as canon shows it, without Eli |
| Not in the spec: the Major's rig | C5 to C7 at full quality | Gray-box figure. #232 rigs Eli, Joan, Lucy, Barnette and Ashby, not the Major |
| Not in the spec: the Act 2 hotel module | C2 | C2 builds a dining room of its own (#198, #200 are in Wave 2) |

Every task in section 4 that is not in the first slice is blocked by the Proposed spec: nothing past the first slice
starts until the owner approves the section it builds.

## 4. The first slice: no owner decisions

These four tasks implement canon or extend existing tooling, and hold under every answer to section 3. Together they
make Act 4 playable end to end in the engine as rough menus, proven in Chromium, with every Act 4 note on the ratchet.

| # | Task | Claims | Depends on |
| --- | --- | --- | --- |
| A1 | Note ids for every Act 4 menu, and the shoulder charge | `text-game/src/scenes/act4.ts`, `text-game/src/sceneIds.ts`, `text-game/src/act4.test.ts` (new), `text-game/routes/` | none |
| A2 | The parity ratchet covers Act 4 | `game/src/notesRatchet.ts`, `game/src/notesRatchet.test.ts`, `game/notes-allowlist.txt` | A1 |
| A3 | The Act 4 smoke run over `story` | `game/smoke/act4.test.ts`, `act4Plan.ts`, `act4Plan.test.ts` (all new), `game/smoke/baselines/act4/`, `game/package.json` (one script), `Makefile` (two targets), `.github/workflows/check.yml` (one job), `docs/perf.md` (one paragraph) | none |
| A4 | The breakup lighting row | `game/src/lighting.ts`, `game/src/lighting.test.ts` | none |

A1, A3 and A4 run in parallel; A2 follows A1.

**A1. Note ids and the shoulder charge.** Difficulty: standard. Story engineer.

- Name every Act 4 choice's `note`: `a4_offer` `take` / `refuse` / `fake` (the spec's engine table); `a4_chase` `jump`
  / `logs`; `a4_struggle` `shoulder` / `talk`; `a4_defuse` `cap` / `cut` / `freeze`; `a4_testify` `testify` / `silent`
  on both routes; single `Continue`s `continue`. Give `a4_icejam`'s two routes distinct ids (`chase` on the earned
  route, `continue` on the blown one), so the ratchet has one key per sender and not one key with two landings.
- Rewrite `a4_struggle`'s first option and `a4_struggle_cast` as the design's shoulder charge into the Major against
  the cutbank. Rename the scene `a4_struggle_shoulder`. This is canon (design.md "Broken arm"), not the spec.
- Tests (in `act4.test.ts`): every Act 4 choice has a named note; the regression the spec names, no Act 4 text has
  Wade swing or hit with the cast, failing on `main` today; `a4_icejam`'s note differs by route. `make generate/routes`
  moves only the transcripts that pass the struggle (read the diff); `matrix-summary.json`'s ending counts do not move.
- Smoke: none (the backdrop does not show labels). Ratchet: none yet (Act 4 is outside it until A2).
- Why first: once A2 puts `a4_offer:option1` on the allowlist, renaming it to `a4_offer:take` adds a line for a scene
  that is on `main`, which the shrink rule rejects.

**A2. The ratchet covers Act 4.** Difficulty: hard (changes a gate every engine PR passes).

- Add `'Act 4: Breakup'` to `ACTS`. Change the shrink rule so a line may also be added when its scene's act was not in
  `main`'s `ACTS` (read from `main`'s `notesRatchet.ts` at the merge base, as `mainMenus` reads `sceneIds.ts`). Without
  this, no Act 4 line can ever be added. A mission new since `main` (`theWire`, `theIceJam`) is already allowed.
- The allowlist gains every Act 4 key: 27 lines (`a4_news` to `a4_testify` as A1 names them). None is sent: the
  fallback menu builds nothing.
- Tests: the existing "only Acts 1 to 3" assertion becomes "Acts 1 to 4, no prologue or epilogue key"; a unit test for
  the new rule (an Act 4 line may be added while Act 4 is new to `ACTS`, an Act 3 line still may not be re-added, and
  once `main`'s `ACTS` has Act 4 an Act 4 line may not be re-added either). Measure the walk: it goes on to `end`.
- Smoke: none. CI: the ratchet runs in `make test/game/unit`; record its time before and after in the PR.
- Alternative: keep Act 4 out of the ratchet until its first space lands. Cheaper now, but B1 and B3's mission keys
  would then join the ratchet in the same PR as their senders, and nothing would show the unbuilt notes in the
  meantime. Recommended: extend now.

**A3. The Act 4 smoke run.** Difficulty: standard. Game engineer.

- `act4Plan.ts` starts where the Act 3 run ends (`a4_news`, `ACT3_PATH`'s end) and plays to `end`, every choice the
  first **except `a4_offer`, which takes `fake`** (the third), so the run passes the backed wire and the stopped ice
  jam. `act4Plan.test.ts` proves headless that the path reaches `a4_wire` with `doubleAgentWorks` true and `a4_chase`
  with `iceJam` `'stopped'`, and that its start is the Act 3 run's end. Choose by asking `logic.ts`, not by a hard-coded
  index, so a later reordering of `a4_offer` fails the plan test rather than silently skipping the set pieces.
- Act 4 scenes have no place yet, so the beats cannot be "the first scene at each place" (Act 3's `act3Beats`). List
  them by scene: `a4_news`, `a4_offer`, `a4_wire`, `a4_curly`, `a4_jake`, `a4_icejam`, `a4_chase`, `a4_defuse`,
  `a4_testify`. When B5 lands places, the list becomes places, as Act 3's did.
- Baselines: nine beats × three bands = 27 frames, all the `story` backdrop, so identical; git stores one image (as
  Act 3's did). `make generate/baselines/act4`, `make test/game/smoke/act4`, and `generate/baselines` gains `act4`.
- CI: a `smoke-act4` job beside `smoke-act3`, same 30-minute limit. `docs/perf.md` gets an Act 4 paragraph;
  `budget.test.ts` already lists `'Act 4: Breakup'`, so no new budget row is needed until a C task adds a space.
- No owner decision: it plays the scenes as they are, and A1's renames do not change choice order.

**A4. The breakup lighting row.** Difficulty: standard.

- `LitSeason` includes `breakup` with its own row (long dawn light, grey-brown snowmelt, open water), replacing the
  `litAs` fallback to winter. Tests: `lighting.test.ts` checks breakup differs from winter and from summer.
- Colors are gray-box placeholders for #54 (palettes) to retune; say so in the PR. No scene has a breakup clock until
  B5, and `story` is an interior, so **no baseline moves**.
- Optional: drop it if the owner would rather wait for #54. Nothing in the first slice depends on it.

## 5. After the decisions: the ordered tasks

Three kinds of lane: the **story lane** (B tasks, all in `text-game/`, serial because they share `act4.ts`,
`logic.ts` and `end.ts`), the **space lanes** (C tasks, `game/`), and **sound** (D). Story tasks go to the
story engineer and get a story-reviewer pass.

### Story lane (serial: B1 → B2 → B3 → B4 → B5)

| # | Task | Claims | Blocked by | Tests | Ratchet and routes |
| --- | --- | --- | --- | --- | --- |
| B1 | `theIceJam` mission menu: crossing.struggle.fuse, 12 notes, landing on `a4_testify` | `missions.ts`, `missions.test.ts`, `docs/story-api.md` (the row and worked example), `docs/acts/act4-missions.md` (section status) | Spec section 2; Q1 | The spec's ice jam `missions.test.ts` items: the menu reads right at `a4_chase`, all 12 notes land on one state per route, every way through lands where a note does | Allowlist: drop the `a4_chase` to `a4_aftermath` keys A2 added, add `theIceJam:*` (12). Golden set must reach every note: routes may move |
| B2 | The caught tier (P3), `majorCaught`, `campFlooded`, Lucy's count (P6) | `logic.ts`, `logic.test.ts`, `scenes/act4.ts`, `scenes/end.ts`, `design.md` (the ice jam consequence line, on adoption) | Q2, P3, P6 | `iceJam` over all 27 rows of `offer` × `eliTrespass` × `afterConfession`; `caught` never with best or good; render tests for the caught `a4_aftermath` and the Major's epilogue line | Matrix ending counts must not move; only middle and bad transcripts change |
| B3 | The wire: `wireTape` (P1), `tape(s)`, `a4_wire_alone`, the lunch chain (P2), `theWire` and `theWireAlone` menus | `state.ts`, `logic.ts`, `liveness.ts`, `sceneIds.ts`, `scenes/act4.ts`, `scenes/end.ts`, `missions.ts`, and their tests | Spec section 1; P1, P2, Q3, Q5 | The spec's wire tests: `tape(s)` truth table; full and partial reach the same ending; the fake option routes by `doubleAgentWorks`; `wireTape` unset off the backed lunch; render tests on testimony and headlines; `verify.ts` passes | `theWire:full`, `theWire:partial`, `theWireAlone:caught` join; `a4_wire:continue` leaves. Sweep states grow on the fake-and-honest route |
| B4 | `secured(s)` and the testimony text (P4) | `logic.ts`, `logic.test.ts`, `scenes/act4.ts` (`a4_testify`), `scenes/end.ts` | Spec section 3; P4; needs B2 and B3 | `secured(s)` per row of the spec's table; `a4_testify` names each item once and nothing unsecured | Text only; routes move, endings do not |
| B5 | Places, clocks and goals for every Act 4 scene (P5), the new place ids | `types.ts` (`Place`), `scenes/act4.ts`, `story.test.ts`, `docs/town-map.md`, `docs/fact-checks.md` (Chatanika breakup date), `game/src/lighting.test.ts` | Q6, P5; after B3 so the new scenes get theirs | `story.test.ts` requires all three through Act 4; the sweep's clock check | `lighting.test.ts` uses `a4_news` as its undated scene and fails once it is dated: move it to an `ep_` scene in the same PR. Act 4 smoke beats become places (A3) |

B1 can start as soon as section 2 and Q1 are answered, before the rest of the story lane: it only adds a mission and
its notes, and reads no proposal.

### Space lanes (C tasks)

Each C task follows #413's shape: route the place to a space, play the mission there with a scripted bot, prove each
ending lands where `sendMission` does, add the space's senders to the ratchet, delete the lines, add the space to the
Act 4 smoke run's visits and a `docs/perf.md` row (`budget.test.ts` fails without it).

**Shared hotspots.** As the roadmap says, every new space also touches `levels.ts`, `router.ts`, `prologue.ts`,
`render.ts`, `notesRatchet.ts`, `notes-allowlist.txt`, `docs/perf.md` and the Act 4 smoke files. Keep those hunks small
and let the merge train land one C task at a time. A task's claims below name only the files it owns outright.

**Reused rooms in a new act.** `spaceFor` matches one act per space. Proposed: an Act 4 sibling entry per reused room
(`kitchen4` built by `kitchen.ts`'s builder with Act 4's spots), not a new multi-act field. This is an implementer's
call, not the owner's; the first C task to need it (C1) settles it for the rest.

| # | Task | Owns | Needs | Blocked by | Allowlist lines dropped | Smoke |
| --- | --- | --- | --- | --- | --- | --- |
| C1 | Lucy's kitchen in Act 4: `a4_news` (stay route) and the wire's night before (*Look*, *Talk*, the reel test) | `kitchen.ts`, `kitchen.test.ts` | B3, B5 | P2, P5 | `a4_news:continue` (stay route), the night-before key B3 names | Kitchen frames at `a4_news` in each band; the `kitchen` row covers it |
| C2 | The hotel dining room: Ashby's offer as a deliberate three-way prompt (decision 6, no timer) | a new `hotelDining.ts` and test, or the Act 2 hotel module after #200 | B5 | Q6, P5 | `a4_offer:take`, `:refuse`, `:fake` | New beat frames; a new perf row |
| C3 | The wire's lunch: reel clock, *Start*, *Steer* (the `talk.ts` radial), *Cover* (a hold), the two near-discovery beats, busted and retry from the door or the cleared plates; the alone version | new `wire.ts`, `wireBot.ts`, `wire.test.ts` | C2, B3 | Spec section 1; P1, P2, Q5 | `theWire:full`, `theWire:partial`, `theWireAlone:caught` | Frames mid-lunch per band; the run plays the bot through the lunch |
| C4 | Curly in the visiting room, Jake on crutches | `jail.ts`, `hospital.ts`, their tests | B5 | P5 | `a4_curly:continue`, `a4_jake:continue` | Two beats; existing rows if the spaces are reused |
| C5 | The jam, gray box: the river, floes classed rotten / holding / floating, the lead, the drift logs, the cutbank; *Look*, *Step*, Eli going first; rotten ice is a retry | new `iceJam.ts`, `iceJam.test.ts`, `iceRules.ts` (pure) and test | A4, B5 | Spec section 2; P5 | `a4_icejam:chase` (the boat to the jam's edge) | New `jam` perf row; frames at the jam's edge per band |
| C6 | The chase and the struggle: *Jump the lead* or *the drift logs*, then *Shoulder charge* or *Talk him down*, both deliberate | `iceJam.ts`, new `iceJamBot.ts` | C5 | Spec section 2 | none yet (the mission's note goes at the end) | Frames at the cutbank |
| C7 | The fuse and the second stack: a burning fuse with a real rate, *Pull the cap* / *Cut* / *Freeze*, Eli's "COUNT"; the second stack by tier; the mission's note sent at the end | `iceJam.ts`, `iceJamBot.ts`, new `fuse.ts` (pure) and test | C6, B1, B2 | Q1, Q2, P3 | `theIceJam:*` (12) | Frames with the fuse lit; a `jamPeak` moment if the fuse's smoke is the densest frame |
| C8 | The bluff on the blew tier: one cutscene, the sound like artillery, the car with base plates | new `bluff.ts` and test | B5 | Q4, P5 | `a4_icejam:continue` (blown route) | The run takes the earned route, so the bluff is sampled from a `starts.ts` start on a blown path |

`a4_testify` stays a menu at the troopers' post in this plan, so `a4_testify:testify` and `:silent` stay listed.
A space for it, and the endings and epilogues (roadmap area 11), are the endings lane's, which waits on B4 and C7.

The C lanes that can run in parallel once unblocked: **the wire** (C1 → C2 → C3), **the ice jam** (C5 → C6 → C7,
then C8), and **the town** (C4). C1 and C3 share nothing but hotspots; C5 to C7 are one lane because they share
`iceJam.ts`.

### Sound (D tasks)

| # | Task | Owns | Needs | Tests |
| --- | --- | --- | --- | --- |
| D1 | Act 4 beds: the hotel dining room (cutlery, a room of voices low enough to talk over), breakup on the river (meltwater, floes grinding, distant cracks); `act4Soundscapes` | `soundscape.ts` (an `act4Soundscapes` block), new `act4-audio.test.ts` | C2, C5 (the space ids) | Every Act 4 space has an ambience bed; the river bed's ground is breakup temperature |
| D2 | Act 4 cues: the recorder's click and reel hiss, the reel running out, the fuse's sputter, ice giving way, the charge going on the caught tier | `synth.ts` (new recipes), `act4-audio.test.ts` | C3, C7 | Each cue exists, plays on its bus, and the click is audible to the mixer at Ashby's distance |

CC0 field recordings (#63) may replace synth recipes later; D1 and D2 do not wait on them. #61's low tier stays blocked
on a quality-tier switch.

## 6. Test and smoke-baseline impact

| Task | Unit and text tests | Routes and matrix | Smoke baselines |
| --- | --- | --- | --- |
| A1 | new `act4.test.ts` | struggle transcripts move; endings fixed | none |
| A2 | `notesRatchet.test.ts` (rule test, Act 4 coverage) | none | none |
| A3 | `act4Plan.test.ts` | none | new `baselines/act4/` (27 identical frames) |
| A4 | `lighting.test.ts` | none | none (no dated Act 4 scene, `story` is interior) |
| B1 | `missions.test.ts` | may move if the golden set must reach every note | none |
| B2 | `logic.test.ts`, render tests | middle and bad transcripts; ending counts fixed | none |
| B3 | `logic.test.ts`, `missions.test.ts`, render, `verify.ts` | fake routes move; counts fixed | Act 4 run's path changes at the lunch: regenerate `act4` |
| B4 | `logic.test.ts`, render | testimony text moves | none |
| B5 | `story.test.ts`, `lighting.test.ts` | none (no text change) | Act 4 beats become places; the prologue run's `a4_news` start may now light by its clock: regenerate `act4` and check the prologue's |
| C1 to C8 | one test file per module, a parity test per mission, the ratchet's sender for it | none | new frames for each space; each new space adds a perf row |
| D1, D2 | `act4-audio.test.ts` | none | none (audio is not captured) |

Every PR that regenerates baselines says which frames moved and why, as #413 did.

## 7. Risks

- **CI time.** A3 adds a fifth Chromium job; Act 3's run allows 25 minutes inside a 30-minute job. Act 4 starts with
  27 frames of one backdrop and is cheap, but the ice jam (C5 to C7) is open terrain played by a bot through retries.
  Keep the bot on the shortest earned path, take frames at checkpoints rather than playing every variant in the browser
  (the unit parity tests cover the variants), and record the job's time in each C PR. If the job passes 20 minutes,
  split the run by mission, as the acts were split.
- **Chromium memory.** The smoke runs render in SwiftShader inside one long-lived page per act. The jam is the first
  outdoor space with water, many floe meshes and fuse smoke; the wire's lunch is a crowded room. Instance the floes,
  budget them in `docs/perf.md` before playing them (`budget.test.ts` enforces the row), and sample the bluff and other
  routes from fresh `starts.ts` starts instead of chaining them onto one page. No Chromium memory failure is on record
  today; this is a forecast, so each C PR should report `vramTextureBytes` at its peak.
- **Unit-test time.** The ratchet replays bots per stop (fight, photo lab, trail). C3 and C7 add two more bots; cache
  their landings per stop as `fought` and `labbed` do, or `make test/game/unit` grows with every route.
- **Sweep memory.** `make test/text/explore` runs in a 1.5 GB heap. P1 doubles states on the fake-and-honest route and
  P3 adds a tier; B3 runs the sweep locally once and reports the peak.
- **The shrink rule.** A2 is the only PR that adds Act 4 lines as a block; after it, a renamed Act 4 note on a scene on
  `main` fails. A story task that renames a note must delete the old line and either make the menu a mission or land
  its sender in the same PR.
- **Spec drift.** The specs are Proposed. A C task started on a guessed answer gets rewritten; that is why nothing past
  section 4 starts before its section is approved.
- **Rigs.** The ice jam's two figures are Eli (#232) and the Major, who has no rig ticket. Gray-box figures are fine
  for C5 to C7; file the Major's rig with the art pass.
- **Hotspot conflicts.** Eight files every C task touches. The merge train serializes them; workers rebase with
  `saddle sync` rather than holding long branches.

## 8. Not in this plan

The endings and epilogues in the engine (roadmap area 11), a space for testimony, the core package split (roadmap
barrier B1), and Mama's letters in Act 4. Filing the tickets for these tasks is a separate step once the owner approves.
