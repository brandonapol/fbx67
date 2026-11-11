# Quality tiers for the engine build

**Status: Proposed.** Nothing here is decided or built. It answers the roadmap's open question 1
([`docs/roadmap.md`](../roadmap.md), section 5): file a ticket for a quality-tier switch in game code, or drop the low
audio tier. The owner approves, edits or rejects it in review. It was written against `main` at `3ad0d17a`.

Part of #61. #39 (closed) asked for "low / medium / high, auto-picked from a GPU benchmark at load and switchable in
settings"; that part of it was never built. #177 (closed) asked for the barfight "within the bar's perf budget at peak
density on every tier", and [`docs/perf.md`](../perf.md) records that there is one tier, so `panPeak` is sampled once.

## 1. What exists now

A grep of `game/src` for a quality setting finds nothing. Every knob a tier would turn is a constant today.

| Knob | Where | Today |
| --- | --- | --- |
| Pixel ratio | `game/src/render.ts` `createView`: `setCanvasResolution(pc.RESOLUTION_AUTO)` | PlayCanvas 2.23 caps it at `min(1, devicePixelRatio)` by default (`graphicsDevice.maxPixelRatio`), so every device renders at CSS pixels. A phone at 3x already renders at a third of its native resolution. |
| Shadows | `render.ts` `shadowsFor` and the `sun` light | Outdoors 3 cascades in a 4096 px atlas over 90 m; indoors 1 cascade at 2048 px over 40 m; `SHADOW_PCF5_32F`. The lamp casts none. Props and characters cast (`props.ts`, `characters.ts`, `campView.ts`). |
| Post | `render.ts`, the `CameraFrame` | HDR, ACES tonemapping, bloom (intensity 0.015, blur level 12), then the grade and vignette per moral-weather band (`applyGrade`, `lighting.ts` `grades`). No SSAO, light shafts or film grain exist, though #39 named them. |
| Draw distance | `render.ts` `farClipFor` | `max(200, fogEnd * 1.2)`: the art rule in `docs/art/README.md`, "Beyond the play area". Fog ranges are per space, season and band (`lighting.ts`). |
| Crowd LOD | `game/src/crowd.ts` `tierAt`, `UPDATE_EVERY`; `crowdView.ts` | Whole and posed every frame under 15 m, posed 4 times a second to 40 m, a box once a second to 90 m, hidden beyond. Who is present comes from the text build's ambient schedule (`ambient.ts` `poses`). |
| Rain | `render.ts` `build` | 220 separate box entities when the band rains, each its own draw call. |
| Sky | `render.ts` `SKY_FACE` | A 128 px cubemap built per space. |
| Camp plants | `campView.ts` | Drawn instanced. |
| Walla | `game/src/soundscape.ts` `walla` | The bar 7 voices (about 30 Web Audio nodes), the barfight 6, the hotel 5. |
| Footsteps | `game/src/synth.ts` step, `footsteps.ts` `snowAt` | Gravel fires 7 grains (a literal `7` in `synth.ts`); snow 3 to 7 by temperature. |
| Prefs | `game/src/frontEnd.ts` `Prefs`, `PREFS_KEY`; `settings.ts` `mountPrefs`; `game/index.html` `#settings` | `{ text, motion, cone }` in `localStorage` under `second-rush.prefs`, edited at the top of the settings panel. Volumes are separate (`mixer.ts`, `second-rush.volumes`). |
| URL | `game/src/start.ts`, `frontEnd.ts` | `#path=` and `?from=` pick the start; `?test=1` installs the probe (`probe.ts`). |

The smoke harness and budgets:

- `game/smoke/budget.ts` (the brief says `game/src/budget.ts`; there is no such file) parses the two tables under
  "## Budgets" in `docs/perf.md`. A space row must have exactly 4 cells and the header must match. `summarize` groups
  samples by `Sample.space`; `breaches` fails a peak over a limit, a played space with no frames, and a sampled space
  with no row.
- `game/src/probe.ts` holds moments: `moments = { panPeak: 'brawl' }`; `sampleMoment` captures the pose, records
  `WARMUP_FRAMES + 40 + 1` frames under the moment's id, then releases.
- `game/smoke/browser.ts` launches one headless Chromium under SwiftShader per run, a 960 x 600 viewport at device
  scale 1, one browser context per opened path.
- CI (`.github/workflows/check.yml`) runs four smoke jobs in parallel: `check-game` (prologue), `smoke-act1`,
  `smoke-act2`, `smoke-act3`, each with a 30-minute limit. They take about 20 to 27 minutes now, and Chromium's memory
  is already tight. Baselines are 3 bands per beat under `game/smoke/baselines/{act1,act2,act3}`.
- `game/fight.html` (`fightView.ts`) has its own `pc.Application`; it is a test space and stays out of scope.

Name clash: `crowd.ts` already exports `type Tier = 'full' | 'slow' | 'impostor' | 'hidden'` for crowd LOD. The new
type should be `Quality`, so the two never meet in one import.

## 2. What a tier would change

Three named tiers, `low`, `medium` and `high`. **Medium is exactly today's renderer and mix**, constant for constant,
so the change that introduces tiers moves no baseline and no budget row. The values below are proposed starting points,
to be tuned against a measurement, not decided here.

| Knob | `low` (phones, weak laptops) | `medium` (default, today) | `high` |
| --- | --- | --- | --- |
| Pixel ratio cap | 1 (an open question: 0.75) | 1 | `min(devicePixelRatio, 2)` |
| Shadows outdoors | 1 cascade, 2048 px, 40 m, PCF3 | 3 cascades, 4096 px atlas, 90 m, PCF5 | 4 cascades, 4096 px atlas, 120 m, PCF5 |
| Shadows indoors | 1024 px, 25 m, PCF3 | 2048 px, 40 m, PCF5 | 2048 px, 40 m, PCF5 |
| Small props cast shadows | no (characters still do) | yes | yes |
| Bloom | off | on | on |
| Grade, vignette, tonemapping | **on** | on | on |
| Fog and far clip | **unchanged** | unchanged | unchanged |
| Crowd LOD (full / slow / impostor) | 10 / 25 / 60 m | 15 / 40 / 90 m | 20 / 50 / 110 m |
| Crowd presence | **unchanged** | unchanged | unchanged |
| Rain boxes | 110 | 220 | 220 |
| Walla voices (bar / barfight / hotel) | 4 / 4 / 4 | 7 / 6 / 5 | 7 / 6 / 5 |
| Gravel grains, snow grains cap | 4, 4 | 7, 7 | 7, 7 |

What a tier never changes, because it is canon or story rather than cost:

- **The grade per moral-weather band.** The band is the story's moral weather made visible (`lighting.ts`,
  `docs/art/README.md`); every tier keeps it, the vignette and the tonemapping.
- **Fog ranges and the far clip.** They are the art rules' per space, season and band. Low saves draw distance through
  crowd LOD and shadow distance, inside the fog, not by moving it.
- **Who is in a space.** Townsfolk come from the text build's ambient schedule, and every man in the barfight is a
  side in the scene. A tier changes how coarsely a distant person is drawn and how often they are posed, never whether
  they are there. Thinning the camp's plants is out too unless the owner confirms no plant is cover for stealth.
- **Any state, gate, note or query.** The tier is renderer and mixer configuration only; the story API never sees it.

Not proposed: building SSAO, light shafts or film grain so that high has something to add. If the owner wants them,
each is its own ticket and lands on `high` first.

Observation outside this design: the 220 rain boxes are 220 entities. Drawing them instanced would cut draw calls in
every rain band on every tier and is worth a ticket of its own.

## 3. Where the setting lives and how it is chosen

### The data

One new pure module, `game/src/quality.ts`:

- `type Quality = 'low' | 'medium' | 'high'` and `type QualityPref = 'auto' | Quality`.
- `QUALITY: Readonly<Record<Quality, Knobs>>`, the table above as data. `render.ts`, `crowdView.ts`, `soundscape.ts`
  and `synth.ts` read their numbers from `Knobs` instead of their constants. Data over code: the walla and grain
  counts live in the table, as #61 asks, not in a per-device branch.
- `pickQuality(env)`: a pure function of what the page can see, so it is unit tested without a browser.

### Precedence

1. **URL:** `?quality=low|medium|high`. For testing, for sharing a link that reproduces a bug, and for the smoke
   harness. It applies for the session and is not saved.
2. **Saved preference:** a fourth field on `Prefs`, `quality: QualityPref`, default `'auto'`. `parsePrefs` must read an
   older saved value without the field as `'auto'`.
3. **Auto:** `low` when the primary pointer is coarse (`matchMedia('(pointer: coarse)')`) or
   `navigator.hardwareConcurrency <= 4`; otherwise `medium`. Auto never picks `high`; a player opts in.

### Why not a GPU benchmark at load

#39 asked for one. Proposed against it: it adds seconds to a load the initial-download budget is already watching, a
few hundred milliseconds of rendering is a noisy signal on a phone that is still warming up, and under SwiftShader it
would always answer low, so CI would test a tier no desktop player gets. A heuristic is deterministic and testable. A
later improvement could watch the real frame time for the first minute and *suggest* a lower tier in a toast; it would
never switch on its own mid-scene.

### The toggle

The pause menu already opens the settings panel (`main.ts`, the `settings` action; `#settings` in `game/index.html`,
`mountPrefs` in `settings.ts`). Add a "Quality" select (Auto, Low, Medium, High) beside text size and reduced motion. It applies at
once, like the other prefs:

- Render knobs apply live: shadows through the sun's light properties (`applyLighting` already reassigns them per
  space), bloom on the `CameraFrame`, pixel ratio through `graphicsDevice.maxPixelRatio` and `resizeCanvas()`, crowd
  LOD on the next `crowdView` tick, rain on the next space build.
- Audio rebuilds the current space's beds without a restart (#61's third criterion), crossfading like a space change.

## 4. Smoke baselines and budgets per tier

The constraint: four smoke jobs already take 20 to 27 minutes of a 30-minute limit, and Chromium's memory is tight. A
naive matrix (every run at every tier) triples CI time or triples the jobs, and triples the baselines. The design rests
on three facts:

- **Draw calls, triangles and texture memory are counts, not timings.** Under SwiftShader they are the same as on a
  GPU, so a short held sample at each tier measures what the budget measures. CPU time is reported only already.
- **The tier can switch in place.** The probe can switch tiers in the open page, so a per-tier sample needs no new page,
  no new browser context and no second load; only the shadow atlas and bloom targets are reallocated.
- **A held moment is cheap.** `sampleMoment` is one pose, a 5-frame warmup and 40 frames.

### Keying the budgets

The existing per-space table stays as it is and **is the medium tier**. Its header, rows and parser do not change. A
third table under "## Budgets" holds per-tier rows for moments only:

```markdown
| Moment    | Tier | Draw calls | Triangles | Texture memory (MB) |
| --------- | ---- | ---------: | --------: | ------------------: |
| `panPeak` | low  |        ... |       ... |                 ... |
| `panPeak` | high |        ... |       ... |                 ... |
```

- `Sample` gains `quality`; `summarize` groups by space and quality; a medium sample is checked against the existing
  table, a low or high one against the new table.
- `budget.test.ts` fails when a moment in `moments` has no row for a tier the run samples, and when a low row is above
  medium's or a high row is below it in any column (a low tier that costs more is not a tier).
- The numbers are set from the first measurement plus headroom, the way the existing rows were. The low row should be
  tight enough to mean "a phone": an open question below.

### Keying the frames

Frames stay on medium only: the same baselines, the same 3 bands. A low tier with shadows thinned and bloom off would
change nearly every pixel, so a per-tier baseline set would triple the PNGs and the reviews of every art change. At
most, one low-tier frame per run (say `a1_brawl_low`, one band) catches "low renders black". That is an open question.

## 5. Options

### Option A: one tier in CI

Build the switch; CI tests only medium. Tier tables, `pickQuality` and the per-tier audio node counts are unit tests.

- For: no CI time at all, no harness change.
- Against: `panPeak` is never measured on low, so #177's "on every tier" stays unmet, and a low-tier regression
  (a shadow setting that throws, a bed that never rebuilds) is found by a player.

### Option B: per-tier moments inside the existing runs (recommended)

Medium plays every run exactly as today. After the Act 1 run's `a1_barfight` beat samples `panPeak` on medium, the
probe switches to low, samples `panPeak` again, switches to high, samples it again, and switches back. A new probe
call, `sampleMoment(moment, n, quality)`, does the switch, sample and restore. Optionally one low-tier frame.

- For: meets #177 and perf.md's "sampled once per tier"; adds two held samples and two tier switches to one job, an
  estimated tens of seconds under SwiftShader (measure it before merging); no new job, page or context, so memory
  barely moves; medium baselines unchanged.
- Against: low and high are measured at one moment, not across every space. A space that is cheap on medium but
  pathological on low (unlikely, since low only removes work) would slip by. High's pixel ratio is not exercised,
  because the headless viewport is at device scale 1; that is fine because pixel ratio moves fill rate, which the
  budget does not measure.

### Option C: a nightly tier matrix

Option B on pull requests, plus a nightly workflow that replays the prologue and Act 1 runs whole with
`?quality=low`, against the per-space table with a low column or a low table per space, frames off.

- For: every space on low, every night, at no cost to a pull request's wall time.
- Against: two more 25-minute jobs a night, a second full budget table to keep, and a regression found the next
  morning, not on the PR. It is worth it only once a phone tier has real players.

## 6. Recommendation

**Option B, with two tiers built now and high reserved.** Build `low` and `medium`; add `high` to the type and table
only when something exists for it to add (more cascades alone is not much of a reason to carry a third tier in the
budgets and the panel). With two tiers, Option B's cost halves: one extra held sample of `panPeak` on low. Auto picks
low on coarse pointers or 4 cores and under; the URL and the settings select override it. Leave Option C for when the
phone tier ships.

Proposed tickets, in order, once this is approved:

1. **The switch.** `quality.ts`, the `Prefs` field and its migration, `?quality=`, the settings select, render knobs
   (shadows, bloom, pixel ratio, crowd LOD, rain) applied live. Medium pinned to today's constants.
   **Difficulty: standard (well-scoped, one module and its readers).**
2. **Per-tier budgets.** The moment-per-tier table in `docs/perf.md`, the parser and `breaches` keyed by tier, the
   probe's tier switch, `panPeak` on low in the Act 1 run. **Difficulty: standard (harness change with a CI-time
   constraint).** Blocked by 1.
3. **#61, the low audio tier**, now unblocked: walla and grain counts read through `Knobs`, beds rebuilt on a switch.
   Blocked by 1; independent of 2.

## 7. Tests needed

Unit (in `make check/fast`):

- `quality.test.ts`: medium equals today's constants (3 cascades, 4096, 90 m; 1 cascade, 2048, 40 m; bloom 0.015
  and 12; LOD 15 / 40 / 90; rain 220; walla 7, 6 and 5; gravel 7), so the tier change moves no frame.
- `quality.test.ts`: every numeric knob is monotonic, low no greater than medium no greater than high.
- `pickQuality`: coarse pointer gives low; 4 cores or fewer gives low; otherwise medium; never high; the URL beats
  the pref, the pref beats auto; an unknown URL value or pref falls through to auto.
- `frontEnd.test.ts`: `parsePrefs` reads a saved value with no `quality` as `'auto'`, and garbage as the defaults.
- `render` (pure part): `shadowsFor(outdoor, l, knobs)` for each tier, indoor and outdoor; the grade and fog are the
  same on every tier for every band.
- Audio (#61's criteria): with the fake context (`fake-audio.ts`), the bar's walla builds 4 voices on low and 7 on
  medium, a gravel step fires 4 and 7 grains; the existing "no Act 1 bed builds more nodes than the bar" test holds
  per tier.
- Crowd: `tierAt` with low's distances; the set of people `crowdIn` returns is the same on every tier.
- `budget.test.ts`: the per-tier table parses; a moment missing a tier row fails; a low row above medium fails; a
  low sample is checked against the low row, not the medium one.

Smoke (CI):

- The Act 1 run samples `panPeak` on each built tier and fails with no frames for any of them.
- A switch from medium to low and back in the open page throws no page error and restores medium's numbers
  (a sample after the switch back is within the medium row).

## 8. Open questions for the owner

1. **Two tiers or three?** Recommended: `low` and `medium` now, `high` when there is something to put on it. Or
   build all three as #39 said.
2. **Auto-detect.** A coarse-pointer and core-count heuristic, as recommended, or the GPU benchmark at load that #39
   asked for?
3. **The low budget.** Which phone is the target, and what draw-call and texture-memory ceiling should `panPeak` hold
   on low? Today's 1,500 draw calls is a desktop number.
4. **Bloom off on low.** Acceptable to the art direction? The grade, vignette and tonemapping stay on every tier.
5. **Pixel ratio on low.** Keep PlayCanvas's cap of 1, or go to 0.75 on phones at the cost of softness?
6. **Low-tier frames.** None, as recommended, or one low frame per run as a "does it render" check?
7. **Crowd.** Confirm that a tier may only coarsen how distant people are drawn and never remove anyone the ambient
   schedule places. And may low thin the camp's plants, or are they cover?
8. **The nightly matrix (Option C).** Wanted now, at ship of the phone tier, or never?
9. **The tickets.** File the three in section 6 under #39's successor, or as subs of an existing epic? #61 stays
   blocked until ticket 1 lands.
