# Performance budgets

These are the limits the engine build's smoke test holds every space to. `make test/game/smoke` reads the tables
below, so a budget changes here and nowhere else.

## How it is measured

The smoke test plays the prologue in headless Chromium and, in each space, walks back and forth for 10 s while the
page records one sample per frame. `story`, the backdrop for scenes with no space yet, is sampled for 40 frames in
each act's start from a path (`game/smoke/starts.ts`) while its menu is open (see `game/src/probe.ts`). The first 5 frames after recording starts or the player
enters a space are dropped, so a space's first build and shader compiles do not count. Every space in
`game/src/levels.ts` must have a row below, and so must every moment the probe holds (`moments` in `game/src/probe.ts`);
a space or moment that was sampled but has no row fails. 1 MB is 10^6 bytes.
A close-up is a camera in its space, not a space: the knot at the cabin (`game/src/knot.ts`) is props of the cabin,
counted in the `cabin` row, and its close-up frames are captured from the cabin's start in each moral-weather band.

Act 1 has its own run and its own CI job (`make test/game/smoke/act1`, `game/smoke/act1.test.ts`), so a failure names
the act. It opens the Act 1 path (`#path=1,1,1,1,1,1`) and plays to Act 2's first scene, every choice the first, while
recording; the steps are the ones `game/smoke/act1Plan.test.ts` plays headless against the text build. At each beat (each
space Wade comes into: `line`, `helpTent`, `cabin`, `office`, `jail`; the scenes `a1_flood`, `a1_errand`, `a1_trail`,
`a1_body`, `a1_ruling`, `a1_lucy`, `a1_tank`) it captures that space's frame in each
moral-weather band, into `game/smoke/baselines/act1/`. It fails on an Act 1 space with no frames, not on the
prologue's; the initial download is the prologue run's to measure. `make generate/baselines/act1` regenerates only
its baselines.

The barfight is the bar at its densest, so it has a row of its own beside the Pan's. At the `a1_barfight` beat the Act 1
run also captures the fight at its peak, `a1_brawl` in each band, from the probe's `brawl` pose: the fight played on its
own clock 16 s past the shove with Wade got up and idle, when every patron has come in and none has had enough, so all
ten men in the Pan are in it (`game/src/probe.ts`, `fightAt`). It then holds that pose still and samples 40 frames of
it under `panPeak`, a moment and not a space (`moments` in `game/src/probe.ts`), so the peak is held to its own row and
not averaged into the Pan's walk. The run fails with no `panPeak` frames. When the row was added (#428) the peak measured 140 draw calls, 120,572
triangles and 137.8 MB of texture memory, well under the limits below. There is one quality tier: the engine build
has no quality-tier switch yet, so the peak is measured on the one renderer there is. When tiers come, the peak is
sampled once per tier.

The search for Eli, Act 1's opening (`game/src/searchEli.ts`, `trail.ts`), is held by the `line` row: the whole trail
is the flooded town, with the errand's one trip up to `helpTent`, and its start is the `a1_flood` frame in each band.
Staying on the line instead cuts straight to `cabin`, which has its own row and `a1_body` frames.

Act 3's `a3_camp` start (`game/smoke/starts.ts`) is also sampled in the prologue run, over `story`; Act 3 plays through in its own run, below.

Act 2 has its own run and CI job the same way (`make test/game/smoke/act2`, `game/smoke/act2.test.ts`). It opens `a2_major`
where the Act 1 run reaches it (every choice the first, so Eli still trusts Wade and the heat alone sets the band) and
plays to Act 3's first scene, every choice the first, with the steps `game/smoke/act2Plan.test.ts` plays headless. The photo lab and its records room (on `eielson`), Lucy's kitchen (`kitchen`), the hotel bar (`hotelBar`), the bush strip (`strip`), the Silver Pan's booth (`steak`), the base hangar's door (`hangar`), Dottie's café at the gossip visits (`cafe`) and Barnette's roadside stop at `a2_heat` (`highway`) have spaces; the rest of the act plays as panels
over `story`, and its beats are the story's places: at the first scene at each place it captures the frame of the
space it plays in, in each moral-weather band, into `game/smoke/baselines/act2/`. It then visits each Act 2 space
(`eielson`, the base blockout, `kitchen`, Lucy's kitchen, `hotelBar`, the hotel bar, `strip`, `steak`, `hangar`, `cafe` and `highway`) from the Act 2 start, samples it and captures its frame in each band. It fails on an
Act 2 space with no frames. `make generate/baselines/act2` regenerates only its baselines.

Act 3 has its own run and CI job the same way (`make test/game/smoke/act3`, `game/smoke/act3.test.ts`). It opens
`a3_camp` where the Act 2 run reaches it (every choice the first, so the three act runs are one playthrough) and plays
to Act 4's first scene, every choice the first, with the steps `game/smoke/act3Plan.test.ts` plays headless. The ski
search has a space, `search` (the slope, `game/src/skiing.ts`), which the run skis by the ridge; the rest of the act
plays as panels over `story`, the long night among them (played as its live panel, `game/src/survivalPlay.ts`), and the
dig, the wreck and the rash plans as their mission menus. Its beats are the story's places: at the first scene at each
place it captures the frame of the space it plays in, in each moral-weather band, into `game/smoke/baselines/act3/`.
It then visits each Act 3 space (`search`) from the Act 3 start, samples it and captures its frame in each band, and
fails on it with no frames or no row below. The prologue run samples `search` from the `a3_ski_down` start, Wade on skis on the ridge.
`make generate/baselines/act3` regenerates only its baselines.

`game/smoke/budget.test.ts` fails, per act, when a space in `game/src/levels.ts` has no row below, so a new space in
any act is budgeted before it is played.

- **Draw calls:** `app.stats.drawCallCount`, every draw call the device issued in the frame, shadow passes included.
- **Triangles:** the index count over three of every visible mesh instance in the scene, times its instance count when
  it is drawn instanced (the camp's plants), for one pass. The release build of PlayCanvas does not count
  primitives itself.
- **Texture memory:** `app.stats.vramTextureBytes`, every texture and render target alive, shadow maps included.
- **CPU frame time:** wall time from `frameupdate` to `frameend`, reported as median, 95th percentile and peak.
  Headless Chromium renders in software (SwiftShader), so this is reported and never fails the build.
- **Initial download:** the bytes on the wire (`responseBodySize`, compressed when the server compresses) of every
  response the page fetched from navigation until the test probe is ready, without the probe's own chunk. Anything loaded later, on demand, is not initial and does not
  count.

A space fails when its peak frame goes over a limit. The report is `game/smoke-report/perf.json` and, in CI, the
job summary. The smoke test reads only the two tables under this heading, and checks their header rows.

## Budgets

| Space   | Draw calls | Triangles | Texture memory (MB) |
| ------- | ---------: | --------: | ------------------: |
| `bar`   |      1,500 | 1,500,000 |                 512 |
| `pan`   |      1,500 | 1,500,000 |                 512 |
| `boarding` |   1,500 | 1,500,000 |                 512 |
| `room`  |      1,500 | 1,500,000 |                 512 |
| `camp`  |      1,500 | 1,500,000 |                 512 |
| `flood` |      1,500 | 1,500,000 |                 512 |
| `line`  |      1,500 | 1,500,000 |                 512 |
| `downtown` |   1,500 | 1,500,000 |                 512 |
| `jail`  |      1,500 | 1,500,000 |                 512 |
| `helpTent` |   1,500 | 1,500,000 |                 512 |
| `office` |     1,500 | 1,500,000 |                 512 |
| `eielson` |    1,500 | 1,500,000 |                 512 |
| `cabin` |      1,500 | 1,500,000 |                 512 |
| `kitchen` |    1,500 | 1,500,000 |                 512 |
| `hotelBar` |   1,500 | 1,500,000 |                 512 |
| `strip` |      1,500 | 1,500,000 |                 512 |
| `steak` |      1,500 | 1,500,000 |                 512 |
| `hangar` |     1,500 | 1,500,000 |                 512 |
| `cafe`  |      1,500 | 1,500,000 |                 512 |
| `highway` |    1,500 | 1,500,000 |                 512 |
| `search` |     1,500 | 1,500,000 |                 512 |
| `story` |      1,500 | 1,500,000 |                 512 |
| `panPeak` |    1,500 | 1,500,000 |                 512 |

| Download         | Limit (MB) |
| ---------------- | ---------: |
| Initial download |         40 |
