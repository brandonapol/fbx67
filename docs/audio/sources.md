# Audio sources

Every sound in the engine build, where it came from and under what license. No sound ships without a row here.

## Budget

15 MB of compressed audio for the prologue (Opus in WebM, with an AAC fallback). Today the build ships **0 bytes**
of audio files: every sound below is synthesized at run time with the Web Audio API, from code in
[`game/src/synth.ts`](../../game/src/synth.ts) and data in [`game/src/soundscape.ts`](../../game/src/soundscape.ts).

## Sources

| Sound                               | Where it plays          | Source                                                     | License        |
| ----------------------------------- | ----------------------- | ---------------------------------------------------------- | -------------- |
| Walla (bar murmur)                  | The Silver Pan          | Procedural: band-passed pink noise, 7 voices               | Original, repo |
| Glasses clinking                    | The Silver Pan          | Procedural: decaying sine partials                         | Original, repo |
| Stove roar and crackle              | The Silver Pan          | Procedural: brown noise and noise clicks                   | Original, repo |
| Jukebox placeholder tune            | The Silver Pan          | Procedural: original I-vi-IV-V in even time                | Original, repo |
| Room tone                           | Owen's room             | Procedural: low-passed brown noise                         | Original, repo |
| Distant street and passing cars     | Owen's room             | Procedural: filtered pink noise sweeps                     | Original, repo |
| Reel-to-reel hiss and motor         | Owen's room             | Procedural: noise, mains hum, sawtooth motor               | Original, repo |
| Typewriter                          | Owen's room, the letter | Procedural: noise clicks and a bell                        | Original, repo |
| Door                                | Arriving in Owen's room | Procedural: creak, thump and latch                         | Original, repo |
| Creek                               | The survey camp         | Procedural: modulated band-passed noise                    | Original, repo |
| Wind and wind in spruce             | The survey camp         | Procedural: slow-modulated brown, pink noise               | Original, repo |
| Mosquitoes                          | The survey camp         | Procedural: vibrato sawtooth                               | Original, repo |
| Jerry can glug                      | The survey camp, refuel | Procedural: falling sine, noise, can ring                  | Original, repo |
| Heavy rain                          | High water              | Procedural: high-passed pink, white noise                  | Original, repo |
| Rushing water                       | High water              | Procedural: modulated low-passed brown noise               | Original, repo |
| Footsteps: wood, gravel, mud, water | Everywhere              | Procedural: filtered noise bursts                          | Original, repo |
| Footsteps: concrete                 | Act 1 hospital, cell    | Procedural: bright noise click, brown-noise heel           | Original, repo |
| Rain on the line                    | Act 1 sandbag line      | Procedural: high-passed pink, white noise                  | Original, repo |
| River along the line                | Act 1 sandbag line      | Procedural: modulated low-passed brown noise               | Original, repo |
| Outboards on the river              | Act 1 sandbag line      | Procedural: two-stroke sawtooth, white-noise rasp          | Original, repo |
| Sandbags landing                    | Act 1 sandbag line      | Procedural: brown thud, burlap grit, a slosh               | Original, repo |
| Shouting across water               | Act 1 sandbag line      | Procedural: falling sawtooth through two formants          | Original, repo |
| Hallway room tone and hum           | Act 1 hospital          | Procedural: low-passed brown noise, faint mains hum        | Original, repo |
| Drips                               | Act 1 hospital          | Procedural: rising sine blip and its hallway echo          | Original, repo |
| Crowd that swells and dies          | Act 1 barfight          | Procedural: walla (6 voices), slow pink-noise roar         | Original, repo |
| Shoves                              | Act 1 barfight          | Procedural: cloth swish, brown-noise body thud             | Original, repo |
| Body against the stove              | Act 1 barfight          | Procedural: thud and inharmonic sine ring                  | Original, repo |
| Bottles breaking                    | Act 1 barfight          | Procedural: high-passed noise shards, glass rings          | Original, repo |
| The moose rack coming down          | Act 1 barfight          | Procedural: resonant noise knocks, wall thud               | Original, repo |
| Radiator hiss and knocking          | Act 1 cell              | Procedural: high-passed white noise, triangle clank        | Original, repo |
| Keys                                | Act 1 cell              | Procedural: scattered high sine pings                      | Original, repo |
| Barnette's footsteps                | Act 1 cell              | Procedural: six concrete steps, near then away             | Original, repo |
| Footsteps: snow, soft to squeaking  | Act 2 town              | Procedural: noise grains, pitch by temperature             | Original, repo |
| Wind down the street                | Act 2 town              | Procedural: slow-modulated brown, pink noise               | Original, repo |
| Plug-in cars idling                 | Act 2 town              | Procedural: low sawtooth engine, brown exhaust             | Original, repo |
| Ravens                              | Act 2 town              | Procedural: falling sawtooth through a formant             | Original, repo |
| Base interior hum                   | Act 2 base              | Procedural: 60 Hz mains, harmonics, ballast buzz           | Original, repo |
| Base ventilation and distant doors  | Act 2 base              | Procedural: low-passed noise, the door spot                | Original, repo |
| Wade's guitar                       | Act 2 hotel bar         | Procedural: plucked sawtooth, original I-IV-I-V boom-chick | Original, repo |
| Hotel bar murmur and glasses        | Act 2 hotel bar         | Procedural: walla (5 voices), clinks                       | Original, repo |
| Hall room tone                      | Act 2 community hall    | Procedural: low-passed brown noise                         | Original, repo |
| Coffee urn perking                  | Act 2 community hall    | Procedural: rising sine bubbles, element hum               | Original, repo |
| Snow at forty below                 | Act 3 outdoors          | Procedural: noise grains, temperature from the season      | Original, repo |
| Ice-fog hush                        | Act 3 town              | Procedural: low-passed brown noise, one far idling car     | Original, repo |
| Engine drone, slipstream            | Act 3 flight            | Procedural: low sawtooth engine, high-passed pink noise    | Original, repo |
| Engine coughing and quitting        | Act 3 flight            | Procedural: sawtooth coughs, a falling wind-down           | Original, repo |
| Spruce impact                       | Act 3 crash             | Procedural: noise branch cracks, brown thud, metal, slough | Original, repo |
| Fire through the night              | Act 3 crash             | Procedural: wobbling brown noise, noise crackles           | Original, repo |
| Wind on the slope                   | Act 3 crash, slope      | Procedural: slow-modulated brown, pink noise               | Original, repo |
| Spruce cracking in the cold         | Act 3 outdoors          | Procedural: band-passed noise crack, brown boom            | Original, repo |
| Ski glide                           | Act 3 slope             | Procedural: band-passed pink hiss, pitch by temperature    | Original, repo |
| Falls on skis                       | Act 3 slope             | Procedural: ski clatter, brown thump, snow whump           | Original, repo |
| Search team calling, fading out     | Act 3 slope             | Procedural: distant sawtooth formant calls, each quieter   | Original, repo |

"Original, repo" means the sound is the output of code written for this project: no third-party recording or sample
is involved, so it carries whatever license the repository carries.

## Follow-ups

- **Act 1 spaces.** The four Act 1 beds live in `act1Soundscapes` in `soundscape.ts`, keyed by `line` (the sandbag
  line on the flooded street), `hospital`, `barfight` (the Silver Pan in August, mud floor) and `cell`. They play once
  those spaces exist in `levels.ts`, the same way as Act 2. The fight foley runs on timers inside the barfight bed;
  the barfight mission can later fire the same spots from its own beats.

- **Act 2 spaces.** The four Act 2 beds live in `act2Soundscapes` in `soundscape.ts`, keyed by `town`, `base`,
  `hotel` and `hall`. They play once those spaces exist in `levels.ts`: add the ids to `SpaceId` and move each bed
  into `soundscapes`.

- **Act 3 spaces.** The four Act 3 beds live in `act3Soundscapes` in `soundscape.ts`, keyed by `icefog` (the town
  at forty below), `cockpit` (the flight home), `crash` (Lucy's night at the wreck) and `slope` (Wade's search on
  skis). They play once those spaces exist in `levels.ts`, the same way as Act 2. The cough runs on a timer in the
  cockpit bed; the spruce impact (`impact`) and a fall on skis (`fall`) are beats the missions fire. Snow underfoot
  takes its temperature from the story's season (`SEASON_F` in `footsteps.ts`) whenever the scene has a clock.

- **A low tier for phones.** The bar's walla runs 7 voices (about 30 nodes) and a gravel step 7 grains. No Act 1 bed
  builds more nodes than the bar (a unit test holds it); the barfight's walla runs 6 voices. A low tier
  (4 walla voices, 4 grains) for coarse-pointer or low-core devices is not built yet.

## Tried and not used

- **freesound.org CC0.** Blocked: the build environment's network refused the connection (403 at the proxy).
- **Sonniss GDC bundles.** Blocked the same way, and each bundle is several gigabytes.
- **Generated audio services.** Not used for this pass: procedural sound costs no bytes and no credits, and its
  license is unambiguous. A recording that replaces a procedural sound gets a row above with its source URL,
  author and license, and lands as Opus in WebM.
