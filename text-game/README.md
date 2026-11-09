# Second Rush: text build

A choice-driven text version of the plot in `../design.md`. It exists to prove the story logic before any engine or UI work. Every permutation of the plot is reachable through numbered choices, so a human or an agent can play any path from the command line.

Requires Node 22.18+ (runs TypeScript directly, no build step).

```bash
npm install
```

## Play

Interactive:

```bash
npm run play
```

Replay a path (this is how agents play: one step at a time, appending a choice each call):

```bash
node src/cli.ts --choices 1,2,1 --last
```

- `--last` prints only the current scene; omit it for the full transcript.
- `--state` prints the full state as JSON, plus the ending and what is missing for the best ending once the game is over.
- `--random --seed 42` plays a random game.

## Find a route

`npm run matrix` writes `routes/matrix.json`: one runnable path for every combination of plot decisions (about 31,000 rows, generated, not committed).

Query it for a path that matches any combination of decisions:

```bash
node src/matrix.ts --where curlyPlan=warn,offer=fake,ending=best --limit 1
```

Fields: `barfight`, `coJob`, `leakedFlightDate`, `curlyPlan`, `eliTrespass`, `rashPlan`, `afterConfession`, `offer`, `testified`, `sharedWreck`, `ending`, `heat` (`cool` or `hot`).

`routes/golden.json` is a small committed set: one route per ending and per decision value, each with its full transcript in `routes/transcripts/`. Tests replay every golden route and compare the ending and the whole transcript. `routes/matrix-summary.json` holds the committed combination count per ending. `npm run golden` regenerates both; review the transcript diff before committing.

## Checks

```bash
npm test
```

Runs, in order:

1. `typecheck`: `tsc --noEmit`.
2. `test:unit`: `src/*.test.ts`. Truth tables for the logic gates, state bounds, engine errors, scene order, liveness rules (each must commute with every later step), and golden transcript replay.
3. `test:matrix`: rebuilds the decision matrix and fails if its counts differ from `routes/matrix-summary.json`. After an intended story change, run `npm run matrix:summary` (or `npm run golden`) and commit the result.
4. `verify`: differential test. Plays random games from both the real state and its canonical (pruned) form and asserts identical text and endings. This is what makes the explorer's shortcuts trustworthy. `--seed-offset N` (alias `--seed N`) starts at a different seed, for rotating seeds in CI.
5. `explore`: walks every path (about 50 trillion) by merging equivalent states, and renders each distinct state once. Fails on any choice error, scene text that throws or shows `undefined`/`NaN`, unreachable scene, unreachable ending, a sweep over its budget (below), or a transition whose clock runs backward (`src/clock.ts` whitelists the Act 3 POV overlap by scene pair). Takes about 15 to 30 s and 0.6 GB of heap. The JSON report carries `mergedStates`, `edges`, `seconds`, `peakHeapMB` and `peakRssMB`.

### The sweep budget

`explore-budget.json` caps `mergedStates` and `peakHeapMB` at about twice what the sweep measured when the budget was set (its `baseline`). New state for Acts 1 to 3 multiplies the graph, so a run over either limit fails `explore --strict` (and `make test/text/explore`) with the number it hit. `--budget-table FILE` writes a Markdown table of baseline, current run and budget; the explore and nightly jobs put it in their summaries, so the trend since the baseline is visible on every run.

When the budget fails, first look for fields that stop mattering after some scene and mark them dead in `src/liveness.ts`, so equivalent states merge again. If the growth is real and wanted, raise the budget on purpose: a PR that changes `explore-budget.json` (new `limit`, and a new `baseline` with today's date if you re-measured) and says in its description why the story needs the extra states. Keep `peakHeapMB` under the 1.5 GB heap the `explore` script runs with, so a blow-up fails with a message instead of an out-of-memory crash.

## CI

GitHub Actions workflows in `../.github/workflows/`, all run from `text-game/` on the Node version in `.nvmrc`:

- `text-game-checks.yml` (PRs and pushes to `main` touching `text-game/`): typecheck, unit tests with golden transcript replay, `verify` seeded from the run number, and the matrix summary check.
- `text-game-explore.yml` (PRs and pushes touching `text-game/src/` or dependencies): the exhaustive `explore --strict` sweep with a 1.5 GB heap. The JSON report and the budget table go to the job summary.
- `text-game-nightly.yml` (daily, or run by hand): full sweep with the budget trend in the job summary, `verify` at 20,000 trials with a rotating seed, and matrix regeneration. Reports, including runtime and peak memory, are uploaded as the `text-game-reports-<run>` artifact.

Jobs run on `ubuntu-latest` unless the repository variable `TEXT_GAME_RUNNER` names another runner label, such as an Actions Runner Controller scale set.

## Layout

- `src/logic.ts`: the plot's logic gates (endings, routes, ice jam, Curly's fate, Eli's jail, best-run requirements). Pure functions over state, no prose. The future engine should import this as-is.
- `src/state.ts`: state shape helpers and bounded counters (`BOUNDS`). Bounded counters only change through their helpers; `set` cannot write them, `evidence`, or `scene`.
- `src/sceneIds.ts`: every scene ID, in play order. `SceneId` is derived from it, so a misspelled scene or liveness rule is a compile error. The engine refuses to start if the scene registry does not match this list, and refuses any transition to an earlier scene.
- `src/scenes/*.ts`: the prose and choices, one file per act.
- `src/engine.ts`: pure step/replay/render.
- `src/liveness.ts`: which state fields are dead after which scene; used only by the explorer, guarded by `verify`.
- `src/explore.ts`, `src/matrix.ts`, `src/verify.ts`: analysis tools. `src/args.ts` and `src/random.ts` are shared by the command-line tools.
- `src/names.ts`: all character names in one place. Placeholders still to be decided: the Fairbanks PD officer (from Athabascan consultants), the CO, the councilman's first name, Dottie, and Hank the bartender.

## Design rules encoded here

- Bounded counters: heat 0 to 6, Eli's trust -3 to 5, Joan 0 to 3, honesty with Mom -3 to 3, Barnette's interest in Lucy 0 to 4.
- Heat limit for the best ending: 3. Dottie at the café reports heat in coarse tiers at three decision points.
- Mama's replies deliver one hint each before decisions 4, 6, and 7.
- Decision numbering follows `design.md`: 1 barfight, 2 letter leak, 3 Curly's escape plan, 4 Eli's trespass, 5 after the confession, 6 the offer, 7 testifying.
