# Performance budgets

These are the limits the engine build's smoke test holds every space to. `make test/game/smoke` reads the tables
below, so a budget changes here and nowhere else.

## How it is measured

The smoke test plays the prologue in headless Chromium and, in each space, walks back and forth for 10 s while the
page records one sample per frame. `story`, the backdrop for scenes with no space yet, is sampled for 40 frames in
each act's start from a path (`game/smoke/starts.ts`) while its menu is open (see `game/src/probe.ts`). The first 5 frames after recording starts or the player
enters a space are dropped, so a space's first build and shader compiles do not count. Every space in
`game/src/levels.ts` must have a row below, and a space that was sampled but has no row fails. 1 MB is 10^6 bytes.

- **Draw calls:** `app.stats.drawCallCount`, every draw call the device issued in the frame, shadow passes included.
- **Triangles:** the index count over three of every visible mesh instance in the scene, for one pass. The release
  build of PlayCanvas does not count primitives itself.
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
| `story` |      1,500 | 1,500,000 |                 512 |

| Download         | Limit (MB) |
| ---------------- | ---------: |
| Initial download |         40 |
