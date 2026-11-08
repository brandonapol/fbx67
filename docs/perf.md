# Performance budgets

These are the limits the engine build's smoke test holds every space to. `make test/game/smoke` reads the tables
below, so a budget changes here and nowhere else.

## How it is measured

The smoke test plays the prologue in headless Chromium and, in each space, walks back and forth for 10 s while the
page records one sample per frame (see `game/src/probe.ts`):

- **Draw calls:** `app.stats.drawCallCount`, every draw call the device issued in the frame, shadow passes included.
- **Triangles:** the index count over three of every visible mesh instance in the scene, for one pass. The release
  build of PlayCanvas does not count primitives itself.
- **Texture memory:** `app.stats.vramTextureBytes`, every texture and render target alive, shadow maps included.
- **CPU frame time:** wall time from `frameupdate` to `frameend`. Headless Chromium renders in software
  (SwiftShader), so this is reported and never fails the build.
- **Initial download:** the size of everything in `game/dist`, uncompressed. Nothing is loaded lazily except the
  test probe, so this is an upper bound on what a player downloads.

A space fails when its peak frame goes over a limit. The report is `game/smoke-report/perf.json` and, in CI, the
job summary.

## Budgets

| Space   | Draw calls | Triangles | Texture memory (MB) |
| ------- | ---------: | --------: | ------------------: |
| `bar`   |      1,500 | 1,500,000 |                 512 |
| `room`  |      1,500 | 1,500,000 |                 512 |
| `camp`  |      1,500 | 1,500,000 |                 512 |
| `flood` |      1,500 | 1,500,000 |                 512 |

| Download         | Limit (MB) |
| ---------------- | ---------: |
| Initial download |         40 |
