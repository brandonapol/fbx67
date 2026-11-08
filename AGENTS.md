# `AGENTS.md`

## Purpose

These instructions tell coding agents how to work in this repository. [`CLAUDE.md`](CLAUDE.md) imports this file,
so this is the one place to edit. Never write a second copy of a rule somewhere else.

Second Rush is a stealth and survival mystery set in Fairbanks, Alaska, from the August 1967 flood to the 1968
Prudhoe Bay announcement. The plot is proven first as a choice-driven text build; the engine build plays the same
story with the text build's logic as its source of truth.

### Repo map

```text
design.md                     the story bible: cast, acts, endings, decisions (v0.3)
docs/story-api.md             the agreement between the engine and the story (notes, menus, read-only queries)
docs/fact-checks.md           period and place checks, plausible not archival
docs/town-map.md              downtown Fairbanks 1967: the walkable map, routes, spawns, flood depths (and .svg)
docs/art/                     style rules and the character concept sheets
text-game/src/logic.ts        ending gates and every derived fact; pure functions
text-game/src/state.ts        the immutable state and its bounded counters
text-game/src/engine.ts       scene stepping; rejects backward moves and unknown scenes
text-game/src/sceneIds.ts     every scene id, in play order
text-game/src/scenes/         the story, one file per act; scenes are data
text-game/src/explore.ts      the exhaustive sweep of every reachable state
text-game/src/matrix.ts       one runnable path per combination of plot decisions
text-game/routes/             golden routes, transcripts and the matrix summary, generated and committed
web/                          the browser build (Vite, vanilla TypeScript) on GitHub Pages
game/                         the engine build (PlayCanvas, TypeScript), served under /play/
git/hooks/                    the pre-commit hook, installed by make setup/hooks
```

### Where to read next

- [`design.md`](design.md) before touching any scene. It is the canon; the text build implements it.
- [`docs/story-api.md`](docs/story-api.md) before touching anything the engine and the story share.
- [`text-game/README.md`](text-game/README.md) for playing a path, finding a route, and the sweep.
- [`docs/art/README.md`](docs/art/README.md) before generating or placing any art.

## Working in this repository

### Use Makefile targets (always)

Use the existing targets rather than crafting shell commands. If an action needs repeating, add a target.
`make help` lists everything.

| Target                  | What it does                                                          |
| ----------------------- | --------------------------------------------------------------------- |
| `make setup`            | `npm ci` in both packages and the git hooks                           |
| `make check`            | the whole gate: typecheck, unit, verify, matrix, web typecheck, routes |
| `make check/fast`       | typecheck and unit tests for the packages with staged files           |
| `make check/attribution PR=<n>` | fail if a pull request carries AI attribution                 |
| `make test/text/unit`   | unit tests and golden route replay                                    |
| `make test/text/explore`| the exhaustive sweep (~15 s, 1.5 GB heap)                             |
| `make generate/routes`  | regenerate golden transcripts and `routes/matrix-summary.json`        |
| `make play`             | play the text build in the terminal                                   |
| `make serve/web`        | the browser build's dev server                                        |

A new target follows the existing naming: `check/...`, `test/...`, `generate/...`, `build/...`, `serve/...`.

### What the checks enforce

- **Types.** `tsc --noEmit` in both packages. Node runs TypeScript by type stripping, so only erasable syntax:
  no `enum`, no `namespace`, no parameter properties. Imports carry their `.ts` extension.
- **Every state renders.** The sweep fails on `undefined` or `NaN` in text, a choice that throws, an unreachable
  scene, or an unreachable ending.
- **Generated routes are committed.** CI runs `make check/routes` and fails on a diff in `text-game/routes/`.
  A story change that moves a golden transcript means rerunning `make generate/routes` and committing the result,
  after reading the diff to confirm the change is the one you meant.
- **Liveness pruning is safe.** `verify.ts` replays random paths with and without canonicalization; a new state
  field that changes text must be added to `liveness.ts` or the verifier fails.

### Scope discipline

- **Advice is not a request for edits.** When asked to review, explain, or advise, answer in chat.
- **Filing an issue is not implementing it.** When asked to write tickets or a plan, stop there.
- **An issue belongs to its epic as a sub-issue, not a link.** Create it with the parent set, or attach it
  afterwards with the sub-issue API. A `Parent: #N` line is a reading aid only.
- **Working an issue means owning it.** Assign it to the user running you before starting.
- **Ask before a large change.** A new dependency, a new abstraction layer, or edits across more than ~10 files
  gets two or three options with tradeoffs before any code is written.
- **Build what was asked.** No knobs, modes or abstractions nobody requested.

### Story rules

The story has decisions behind it. Agents do not relitigate them; they implement them.

- **Canon lives in `design.md`.** If a scene and the design disagree, the design wins until the user changes it.
  A new idea goes in the design's "Ideas (not yet adopted)" section, not into a scene.
- **The oil rule.** There is no oil rush until Prudhoe in Act 4. Before that the secret is quiet land buying along
  a future road north, known only to Owen, Ashby and the conspirators. Never write "oil rush" before Act 4.
- **Show, don't tell.** A character's honesty or menace is something they do, not an adjective.
- **Respect.** Eli and Lucy are Lower Tanana, from a Minto family with a fish camp on the lower Chatanika. Their
  land is a central thread. Write them as people with their own aims, never as props for Wade.
- **Plausible, not archival.** Period detail should hold up to a local; it does not need a citation. Open
  questions go in `docs/fact-checks.md`.
- **New state is explicit.** Any new outcome is a field in `state.ts` with a bound, read by a gate in `logic.ts`,
  and covered by the sweep. No outcome lives only in prose.

### Say it once

When every branch of a `switch` or a ternary ends the same way, write the branches so they differ only where they
differ. Shared scene text goes in one constant (see `talkRest` in `scenes/prologue.ts`). Pure functions over
classes; data over code.

### Root cause over symptom

- **State the causal chain before writing a fix:** the choice path that reaches the bug, the line responsible, and
  how you will prove it. A failing test or a `--choices` path that reproduces it comes first.
- **Sweep for siblings.** A text bug on one route usually exists on its neighbors: check every scene that shares
  the constant or the gate.
- **Fix the shared source of truth:** the gate in `logic.ts`, the constant, the name in `names.ts`.

### Verification before claiming done

- Report exactly what was run. Never write "tested manually" unless it happened in this session. When the suites
  ran only in GitHub Actions, the PR says "tested by CI".
- Prove a story change with a path: `node src/cli.ts --choices <path> --last` showing the new text.

#### CI-first for agents

Run the cheap checks yourself: `make check/fast`, the one test file you touched, and `make generate/routes` when
you changed text. Leave the sweep and the long verify to CI unless you are reproducing a failure.

## Git and pull requests

- **Branch off `main`.** `feat/<issue>-short-description`, `fix/<issue>-short-description`,
  `chore/<issue>-short-description`. Agent sessions may be handed a branch name; use the one given.
- **Linear history.** Rebase on `main`, never merge `main` into a branch. One focused commit per PR is the norm.
- **No AI attribution.** Commits and pull requests carry no `Co-authored-by` trailer naming Claude or an
  `anthropic.com` address, no "Generated with Claude Code" footer, and no `claude.ai/code` session link. The
  `commit-msg` hook rejects them in commits and the `check-attribution` CI job rejects them in pull requests.
- **Commit subjects** are imperative, under 80 characters, American spelling. A body explains why, wrapped at 120.
- **Pull requests** fill in [`.github/pull_request_template.md`](.github/pull_request_template.md) and carry
  `Closes #N` for the issue they finish. A PR that finishes part of an issue says `Part of #N`.
- **Stacks.** Work with separable layers (a rule change then the code, a core change then the scene that uses it)
  ships as a stack of PRs, bottom first, each saying `Stacked on #M`.

## Working an epic

An epic is a parent issue whose sub-issues are ordered. To work one:

1. List the epic's open sub-issues in order. Pick the first one whose blockers (its `Blocked by` line) are closed.
2. Work it end to end with the steps above: own it, branch, reproduce or specify, implement, verify, PR.
3. Move to the next unblocked sub-issue. Independent sub-issues may run in parallel in separate worktrees.
4. The epic is done when every sub-issue is closed and its acceptance criteria hold on `main`.
