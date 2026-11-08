# Audio sources

Every sound in the engine build, where it came from and under what license. No sound ships without a row here.

## Budget

15 MB of compressed audio for the prologue (Opus in WebM, with an AAC fallback). Today the build ships **0 bytes**
of audio files: every sound below is synthesized at run time with the Web Audio API, from code in
[`game/src/synth.ts`](../../game/src/synth.ts) and data in [`game/src/soundscape.ts`](../../game/src/soundscape.ts).

## Sources

| Sound                                  | Where it plays            | Source                                        | License        |
| -------------------------------------- | ------------------------- | --------------------------------------------- | -------------- |
| Walla (bar murmur)                     | The Silver Pan            | Procedural: band-passed pink noise, 7 voices  | Original, repo |
| Glasses clinking                       | The Silver Pan            | Procedural: decaying sine partials            | Original, repo |
| Stove roar and crackle                 | The Silver Pan            | Procedural: brown noise and noise clicks      | Original, repo |
| Jukebox placeholder tune               | The Silver Pan            | Procedural: an original I-vi-IV-V shuffle     | Original, repo |
| Room tone                              | Owen's room               | Procedural: low-passed brown noise            | Original, repo |
| Distant street and passing cars        | Owen's room               | Procedural: filtered pink noise sweeps        | Original, repo |
| Reel-to-reel hiss and motor            | Owen's room               | Procedural: noise, mains hum, sawtooth motor  | Original, repo |
| Typewriter                             | Owen's room, the letter   | Procedural: noise clicks and a bell           | Original, repo |
| Door                                   | Arriving in Owen's room   | Procedural: creak, thump and latch            | Original, repo |
| Creek                                  | The survey camp           | Procedural: modulated band-passed noise       | Original, repo |
| Wind and wind in spruce                | The survey camp           | Procedural: slow-modulated brown, pink noise  | Original, repo |
| Mosquitoes                             | The survey camp           | Procedural: vibrato sawtooth                  | Original, repo |
| Jerry can glug                         | The survey camp, refuel   | Procedural: falling sine, noise, can ring     | Original, repo |
| Heavy rain                             | High water                | Procedural: high-passed pink, white noise     | Original, repo |
| Rushing water                          | High water                | Procedural: modulated low-passed brown noise  | Original, repo |
| Footsteps: wood, gravel, mud, water    | Everywhere                | Procedural: filtered noise bursts             | Original, repo |

"Original, repo" means the sound is the output of code written for this project: no third-party recording or sample
is involved, so it carries whatever license the repository carries.

## Tried and not used

- **freesound.org CC0.** Blocked: the build environment's network refused the connection (403 at the proxy).
- **Sonniss GDC bundles.** Blocked the same way, and each bundle is several gigabytes.
- **Generated audio services.** Not used for this pass: procedural sound costs no bytes and no credits, and its
  license is unambiguous. A recording that replaces a procedural sound gets a row above with its source URL,
  author and license, and lands as Opus in WebM.
