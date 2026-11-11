# Saves and mid-scene checkpoints

**Status: Proposed.** Nothing here is decided and nothing here is built by this document. It answers the owner's
question about saves: what the engine build keeps today, where that falls short, and three ways to go further, with a
recommendation. The owner approves, edits or rejects it in review. Every recommendation below is Proposed.

Canon this document does not reopen: letters home "double as journal and save system" (`design.md`, Systems); getting
busted is a retry the story never hears about (Rule 4 in [`docs/story-api.md`](../story-api.md); `design.md`, "high
heat is retry only"); the text build is the story's source of truth.

## 1. What exists today

Read from `main` at `3ad0d17a`.

### The save: the path, per note

- **What is kept.** The path played so far, the text build's own format (`1,2,1,…`), under the `localStorage` key
  `second-rush.path` (`SAVE_KEY`, `game/src/frontEnd.ts:124`). The journal's people, lines heard and places seen go
  with it under `second-rush.journal` (`JOURNAL_KEY`, `saveLog`, `parseLog`), tagged with the path they were written
  at, and are dropped if the path does not match.
- **When.** Every frame of play, `save` in `game/src/main.ts:713` writes both keys if they changed. The path changes
  only when the game sends a note through `sendNote`, so in practice the game saves once per menu choice: at scene
  boundaries, and at any note a mission sends from inside itself (the photo lab sends its way in at the records room
  door, `game/src/photoLab.ts:246`).
- **Continue.** The title shows Continue when `savedPath` accepts the stored path (`frontEnd.ts:129`): it must parse and
  `replayPath` (`game/src/start.ts`) must replay it through the story's menus. Continue then builds the game with
  `startFrom('#path=…')`, which replays the story and calls `resume` → `arrive` (`game/src/prologue.ts:282, 353`):
  the player is placed at the route's spawn for the current scene, not where they stood.
- **What is not kept.** Everything in `Game` that is not the story: position and facing, what is held, a mission's
  own state (`lab`, `brawl`, `swept`, a letter's page in progress), `busts`, and the town's `talk` log. A reload, a
  quit or a crash loses all of it and lands at the start of the current scene.
- **The text build.** `web/src/session.ts` keeps its own path under a different key, `second-rush:path` (a colon, not
  a dot). The two builds do not share a Continue. The engine hands off to the text build by URL (`textBuildHash`,
  `main.ts:243`), not through storage.
- **No slots.** One save, overwritten. #31 put save slots out of scope for the prologue epic; nothing has been filed
  since (`docs/roadmap.md`, open question 3).

### The retries: four patterns, none persisted

Every in-mission checkpoint today lives only in memory. Each is a retry after a fail or a restart from the pause
menu; none survives a reload.

| Where | Pattern | Files |
| --- | --- | --- |
| The barfight | **Snapshot.** `main.ts` keeps the whole `Game` as it stood at the shove (`live.shove`), updated through `checkpoint(kept, before, after)` on every change. The pause menu shows "Restart from the shove" while `canRestart` holds; `restart` swaps the snapshot back in. No fail state: it is a voluntary restart. | `game/src/barfight.ts:221-232`, `main.ts:173, 260-263, 697-700`, `frontEndView.ts:65-66` |
| The photo lab | **Checkpoint in the mission's state.** `Lab.checkpoint` holds pose, clock, phase and method. Reached at the records room door and when the drawers' method is picked. Busted (the watcher's line, `CAUGHT_TIME`), then a "Try again" panel calls `retryLab`, which restores pose and `restart(lab)`. | `game/src/photoLab.ts:179-232`, `prologue.ts:408-418, 547` |
| The search for Eli | **Derived from the story.** `CHECKPOINTS` are named poses; `lastCheckpoint(state, path)` reads which one is behind Wade from the scene he is at (and, for the boat, the path). The current takes his feet, a fade, then `retry`. Nothing is stored at all. | `game/src/hazards.ts:113-195`, `current.ts` |
| The survey camp (prologue) | **Re-enter the space.** Busted hiding the notes, "Try again" calls `enter(g, g.space)`: the space's spawn. | `prologue.ts:365-372, 547` |
| Winter survival (Act 3) | **Generic run.** `Run<T>` carries a `checkpoint` of whatever the mission carries, the body and the fire; `reach` sets it, `retry` restores it, `tick` retries on `failure`. Pure and tested, not yet wired into any space. | `game/src/survival.ts:179-226` |

All four keep Rule 4: a retry never sends a note, so the story and its path are as they were.

## 2. The problems

1. **Long stealth and survival missions lose everything on quit.** The barfight is 75 seconds of play; losing it
   costs little. The Act 3 survival missions run at `CLOCK_RATE` 20, so three hours of grey light is about nine
   minutes of play, and the long night sends its one note (order and signal) only at the end
   (`docs/acts/act3-missions.md`). Act 2's heists (the cabinet, Lucy's land-office search) and Act 4's ice jam are
   multi-checkpoint missions by spec. Quitting at the last checkpoint of any of them today means replaying from its
   start.
2. **A crash or a closed tab is the same as quitting.** The path is written synchronously as it grows, so no story
   choice is ever lost. What is lost is in-mission progress, and on a browser build the tab being closed or the phone
   reclaiming memory is the common case, not the rare one.
3. **Continue lands at the scene's spawn, not at the checkpoint.** Even for the search for Eli, whose checkpoint is
   derivable from the path, Continue does not call `lastCheckpoint`; it uses `arrive`'s spawn.
4. **Four checkpoint patterns.** Each new mission picks one. The barfight's snapshot is the easiest to write and the
   one that cannot be persisted: a whole `Game` is large, holds derived and transient fields, and would break on any
   change to the type.
5. **A saved path can silently move.** `replayPath` checks only that each step is a valid option number. A story
   change that reorders a menu's options replays an old save to a different place without error. This exists today
   and any option below inherits it.
6. **Two builds, two keys.** The text build and the engine build do not see each other's save. Whether they should is
   a question, not a bug (section 7).

## 3. The options

All three keep the save's core: the path, in the text build's format, as the only record of the story. None adds a
field to `State`.

### Option A: autosave at note boundaries only (today, made explicit)

Keep what exists. Write it down as the rule: the save is the path; a mission's progress is never persisted; Continue
starts the current scene over. Fix the small gaps: Continue on the search for Eli uses `lastCheckpoint`, since it is
already derived from the path.

- **For.** No new storage, nothing to version but the path. Simple to explain. Every retry pattern stays as it is.
- **Against.** Problem 1 stays. The longer Act 3 and Act 4 missions punish a quit by up to their whole length.
  Designers would be pushed to split long missions into more notes only to get saves, which is the story's shape
  bent to fit the save.
- **Cost.** One small change (Continue on the trail).

### Option B: per-mission named checkpoints, persisted beside the path

Make one pattern the rule for every mission: **a checkpoint is a named id in the mission's own data**, the way
`hazards.ts` does it, and what the mission carries at that id is plain data. When the player reaches one, the game
writes a small record beside the path:

```text
second-rush.checkpoint = { path: "1,2,1,…", mission: "theLongNight", at: "orderDone", carried: { … } }
```

On Continue, the path replays as today; then, if the record's `path` equals the saved path exactly and
`mission(state)` names the same mission, the game places the player at the named checkpoint with what was carried.
Any mismatch drops the record and falls back to Option A.

- **Reuse.** `survival.ts`'s `Run<T>` already has this shape (`checkpoint: { carried, body, fire, played }`) and is the
  natural core. The photo lab's `Checkpoint` and the trail's `CHECKPOINTS` become instances. The barfight keeps its
  in-memory snapshot for the pause-menu restart (it is 75 seconds and has no checkpoint worth persisting), and that
  stays the one exception.
- **For.** Fixes problems 1 to 4. Retry and Continue become the same code path: a retry is "restore the checkpoint
  record", a Continue is "replay the path, then restore it". The checkpoint lists already in the mission specs
  (`act1-missions.md` to `act4-missions.md`, each mission's "Checkpoints" line) become data a test can walk.
- **Against.** A second thing to version: a checkpoint id or a `carried` shape that changes between releases. The
  path guard catches most of it; the rest needs a version number on the record. Every mission must declare its
  checkpoints as data, not as ad hoc state.
- **Cost.** A shared type, one storage key, and each mission's checkpoints written as data as the mission is built.
  The barfight, photo lab and trail would move to it in their own tickets.

### Option C: letters as the save (diegetic)

Make writing a letter home the act that saves, in the letter view. The canon already says letters double as the save
system; this option takes that literally. Variants, from least to most:

1. **The letter marks the save.** Saving still happens at every note (Option A). Finishing a letter adds a visible
   beat, the envelope sealed, and the title's Continue reads as "the last letter home". Purely presentation.
2. **Letters are chapter starts.** Each finished letter is kept as a path. The title offers "Start from a letter":
   the stack of letters Wade wrote, each restarting the story from the path it was sealed at. These are, in effect,
   save slots, keyed to the story rather than to the player.
3. **Letters are the only save.** Nothing persists between letters.

- **For.** It is the canon's own idea, and it is in the game's voice: the player's history is Wade's correspondence.
  Variant 2 gives replay of the big choices without a slot screen.
- **Against.** There are five letter scenes, all in Acts 1 to 3 (`hands` in `game/src/letters.ts`: `a1_letter`,
  `a2_letter_work`, `a2_letter_friends`, `a3_curly`, `a3_joan`). None is in the prologue or Act 4. Variant 3 would
  leave whole acts with no save, so it is not viable alone. Variant 2 is save slots in diegetic form, which #31 put out
  of scope for the prologue epic; whether that ruling holds beyond the prologue is the owner's call.
- **Cost.** Variant 1 is presentation in `letterView.ts`. Variant 2 adds a list of paths to storage and a title
  screen. Neither touches the story.

## 4. Recommendation

**Option B for the engine's saves, with Option C variant 1 as the face of it.** Variant 2 waits on the owner.

- Option A is already the floor and stays: no story choice is ever lost, because the path is written as it grows.
- Option B closes the real gap (long missions, quit and crash) with one pattern instead of four, built on the
  survival run that already exists and the hazards module's derived-checkpoint idea. It also makes Continue land
  where a retry would.
- Option C variant 1 honors the canon line that letters are the save without making them the only one, and costs
  only presentation. Variant 2 (letters as chapter starts) is worth having if the owner wants replay of the big
  choices; it is an owner question, not a default.
- Persist only named checkpoints, never a `Game` snapshot. The barfight's snapshot stays in memory as the one
  exception, because its whole length is shorter than a reload.

## 5. The text build stays the source of truth

Every option holds these lines:

- **`State` stays a pure value, and the path is its only record.** A checkpoint never enters `State`, never sends a
  note, and is never read by `logic.ts`. A retry or a Continue from a checkpoint leaves `replay(path)` exactly as it
  was (Rule 4).
- **The sweep and the golden routes do not move.** No option touches `text-game/src`. `make check/routes` must show no
  diff in `text-game/routes/` on any implementing PR; if it does, the PR has put save logic in the story and is wrong.
- **The save stays in the text build's format.** The engine's path can always be handed to the text build
  (`textBuildHash`), and a text-build path always starts the engine.
- **What the checkpoint carries is the game's, not the story's.** A pack's contents, the fire's fuel, the lab's clock
  are mission state. Anything the story must remember is a note, sent when the mission ends, as today.

## 6. Tests each option needs

All in `game/src`, run by `make check/fast` and `make check`.

**Option A**

- `frontEnd.test.ts`: `savedPath` accepts a valid path and refuses a malformed or refused one (exists); add a case
  that a saved path from before a reordered menu is caught (needs the versioning in question 5).
- `hazards.test.ts`: Continue on a trail path places Wade at `lastCheckpoint`, not the spawn.

**Option B**, in addition

- A round-trip test per mission: reach each named checkpoint, serialize the record, parse it, Continue from the path,
  and get the same pose and `carried` as the in-memory retry.
- A guard test: a record whose `path` differs from the saved path, whose mission does not match `mission(state)`, or
  whose `at` is not one of the mission's ids is dropped, and Continue falls back to the scene start.
- A Rule 4 property test: for every checkpoint of every mission, retry and Continue leave `g.story` and `g.path` equal
  to `replay(path)`'s last state and the path. (`hazards.test.ts` and `photoLab.test.ts` already check this for their
  retries; it becomes one shared check.)
- A spec test: each mission's checkpoint ids match the "Checkpoints" line of its spec, the way the parity ratchet
  (`notesRatchet.ts`) checks notes.
- The headless smoke (`game/smoke/`): reload mid-mission, Continue, and land at the checkpoint.

**Option C**

- Variant 1: `letterView.test.ts`, the sealed beat shows after the last line is written, and the save written then
  equals the path at the letter's last note.
- Variant 2: the list of letter paths grows by one per letter finished, each replays to its letter's scene, and
  "Start from a letter" starts there with an empty journal tagged to that path.

## 7. Open questions for the owner

1. **What does "letters double as the save system" mean?** The visible face of a save that happens anyway (variant 1),
   a set of chapter starts (variant 2), or the only save (variant 3, which leaves the prologue and Act 4 with none)?
2. **Does #31's "no save slots" hold past the prologue?** Variant 2 is slots in diegetic form.
3. **Is quitting mid-mission meant to cost the mission?** Some games make a quit a retry from the mission start, on
   purpose. If yes, Option A is enough and Option B is only for crashes, which changes nothing in its design but
   lowers its priority.
4. **Should the two builds share a save?** Today the text build (`second-rush:path`) and the engine
   (`second-rush.path`) keep separate ones. Sharing means one key and one format, and a player who switches builds
   continues where they were.
5. **What happens to an old save after a story change?** A reordered menu replays an old path to the wrong place
   silently. Options: a story version stamped on the save that drops it on mismatch, or saving notes instead of option
   numbers. This is needed under any option and probably wants its own ticket.
6. **Should the barfight stay the one snapshot?** Option B leaves it as is. Moving it to a named checkpoint ("the
   shove") is possible and would make it like the rest.
