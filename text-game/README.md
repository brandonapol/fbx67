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

`npm run matrix` writes `routes/matrix.json`: one runnable path for every combination of plot decisions (19,440 rows, generated, not committed).

Query it for a path that matches any combination of decisions:

```bash
node src/matrix.ts --where curlyPlan=warn,offer=fake,ending=best --limit 1
```

Fields: `barfight`, `coJob`, `leakedFlightDate`, `curlyPlan`, `eliTrespass`, `rashPlan`, `afterConfession`, `offer`, `testified`, `sharedWreck`, `ending`, `heat` (`cool` or `hot`).

`routes/golden.json` is a small committed set: one route per ending and per decision value. Tests replay it.

## Checks

```bash
npm test
```

Runs, in order:

1. `typecheck`: `tsc --noEmit`.
2. `test:unit`: truth-table tests for the logic gates, plus golden-route replay.
3. `verify`: differential test. Plays random games from both the real state and its canonical (pruned) form and asserts identical text and endings. This is what makes the explorer's shortcuts trustworthy.
4. `explore`: walks every path (about 7 trillion) by merging equivalent states. Fails on any choice error, unreachable scene, or unreachable ending.

## Layout

- `src/logic.ts`: the plot's logic gates (endings, routes, ice jam, Curly's fate, Eli's jail, best-run requirements). Pure functions over state, no prose. The future engine should import this as-is.
- `src/state.ts`: state shape helpers and bounded counters (`BOUNDS`).
- `src/scenes/*.ts`: the prose and choices, one file per act.
- `src/engine.ts`: pure step/replay/render.
- `src/liveness.ts`: which state fields are dead after which scene; used only by the explorer, guarded by `verify`.
- `src/explore.ts`, `src/matrix.ts`, `src/verify.ts`: analysis tools.
- `src/names.ts`: all character names in one place. Placeholders still to be decided: the Fairbanks PD officer (from Athabascan consultants), the CO, the councilman's first name, Dottie, and Hank the bartender.

## Design rules encoded here

- Bounded counters: heat 0 to 6, Eli's trust -3 to 5, Joan 0 to 3, honesty with Mom -3 to 3.
- Heat limit for the best ending: 3. Dottie at the café reports heat in coarse tiers at three decision points.
- Mama's replies deliver one hint each before decisions 4, 6, and 7.
- Decision numbering follows `design.md`: 1 barfight, 2 letter leak, 3 Curly's escape plan, 4 Eli's trespass, 5 after the confession, 6 the offer, 7 testifying.
