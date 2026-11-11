# Audio sources

Every sound in the engine build, where it came from and under what license. No sound ships without a row here.

## Budget

15 MB of compressed audio (Opus in WebM). The build ships **nine recordings, 1.6 MB**, in `game/public/audio`;
every other sound is synthesized at run time with the Web Audio API, from code in
[`game/src/synth.ts`](../../game/src/synth.ts) and data in [`game/src/soundscape.ts`](../../game/src/soundscape.ts).

Recordings load lazily: entering a space fetches only the files that space plays (`clipsOf` in
[`game/src/recordings.ts`](../../game/src/recordings.ts)), so the first download carries no audio at all. Until a
file has decoded, its procedural version plays, and the recording crossfades in over 1.5 s when it arrives. A file
that fails to fetch or decode leaves the procedural version in place for the session. There is no AAC fallback: a
browser that cannot decode Opus in WebM hears the procedural sounds, which is the build as it was before.

## Recordings

All CC0 (Creative Commons 0, public domain dedication), each confirmed on the sound's own freesound page, so the build
carries no attribution obligation. The source is the sound's HQ preview (OGG Vorbis, about 192 kbps), pinned by
MD5 in [`game/tools/audio.ts`](../../game/tools/audio.ts), which rebuilds every file with `make generate/audio`.

| Clip     | Freesound id and title                                      | Uploader     | URL                               | License | Edits                                                                                         |
| -------- | ----------------------------------------------------------- | ------------ | --------------------------------- | ------- | --------------------------------------------------------------------------------------------- |
| `walla`  | 455732, crowd int murmur bar pub comedy club roomy NYC.flac | kyles        | <https://freesound.org/s/455732/> | CC0     | 1.0 to 29.5 s; 1.5 s loop crossfade; normalized to 0.1 RMS; Opus 64 kbps stereo               |
| `creek`  | 231536, Creek 06 (loop)                                     | VKProduktion | <https://freesound.org/s/231536/> | CC0     | 0.5 to 35.5 s; 2 s loop crossfade; normalized to 0.1 RMS; Opus 64 kbps stereo                 |
| `spruce` | 403051, wind_forest_08_strong_l_01.wav                      | teadrinker   | <https://freesound.org/s/403051/> | CC0     | 0 to 80.5 s; 2.5 s loop crossfade; normalized to 0.1 RMS; Opus 48 kbps stereo                 |
| `rain`   | 405630, 2017 september - rain - the end of a rainstorm.wav  | Anthousai    | <https://freesound.org/s/405630/> | CC0     | 2 to 42 s, the heavy part; 2 s loop crossfade; 0.1 RMS, peaks soft-limited; Opus 64 kbps      |
| `flood`  | 721098, City river with light flooding, pedestrian bridge   | Garuda1982   | <https://freesound.org/s/721098/> | CC0     | 36 to 78 s; 2 s loop crossfade; normalized to 0.1 RMS; Opus 64 kbps stereo                    |
| `clink`  | 325195, Drinking Glasses contact (Clink)                    | EpicWizard   | <https://freesound.org/s/325195/> | CC0     | 13 takes of 0.7 s, the clipped hits left out; each faded and peak-normalized; mono 48 kbps    |
| `screen` | 45643, Screen Door Opening and Closing.mp3                  | snardin42    | <https://freesound.org/s/45643/>  | CC0     | one take, 0.6 to 8.1 s; faded and peak-normalized; mono 48 kbps                               |
| `wood`   | 208104, Wood Steps                                          | Phil25       | <https://freesound.org/s/208104/> | CC0     | 12 takes of 0.35 s from the first 13 s (the rest clips); faded, peak-normalized; mono 48 kbps |
| `gravel` | 353799, Footsteps_6_Dirt_shoe.wav                           | monte32      | <https://freesound.org/s/353799/> | CC0     | the 5 clear steps, 0.4 s each; faded and peak-normalized; mono 48 kbps                        |

Where they play:

- **The Silver Pan** (`bar`): `walla` replaces the procedural murmur, `clink` the glasses, `wood` the footsteps, and
  `screen` is the bar's spring screen door, banging now and then as someone comes or goes. The Act 2 hotel bar reuses
  `walla` and `clink`, and every wood floor in the game uses `wood`.
- **The survey camp** (`camp`): `creek` runs along the creek line, `spruce` is the wind in the trees, `gravel` the
  footsteps (the mud strip by the creek stays procedural).
- **High water** (`flood`): `rain` and `flood` replace the procedural rain and water. The Act 1 sandbag line shares
  both: its rain, and the river along the line.

### Levels

Every bed is normalized to 0.1 RMS (−20 dBFS), then soft-limited above 0.8 so a rare transient (a big drop of rain,
a laugh) does not set the level of the whole bed. Its gain in `soundscape.ts` (`WALLA_GAIN`, `CREEK_GAIN`, and so on)
is the RMS of the procedural fallback it replaces, at unit gain, over 0.1: the fallback's filters were run offline
over the same seeded noise buffers, with a gain wobble counted at its mean power. So a recording comes in at the
level the mixer already balanced, and the bus sliders, ducking and limiter in `mixer.ts` apply unchanged.

| Bed      | Fallback RMS | Gain in `soundscape.ts` |
| -------- | ------------ | ----------------------- |
| `walla`  | 0.0179 × g   | `WALLA_GAIN` 0.18 × g   |
| `creek`  | 0.052        | `CREEK_GAIN` 0.52       |
| `spruce` | 0.038        | `SPRUCE_GAIN` 0.38      |
| `rain`   | 0.174 × g    | `RAIN_GAIN` 1.74 × g    |
| `flood`  | 0.189 × g    | `FLOOD_GAIN` 1.89 × g   |

Takes are peak-normalized to 0.5 and played at `SHOT_GAIN` in `recordings.ts`, scaled by the walker's tread weight
for footsteps and by a random 0.7 to 1.1 for spots, with a small random playback rate so no two sound alike. No take
plays twice in a row.

### Listen check

The recordings were chosen by their descriptions and checked by measurement: the loudness envelope of each source
to pick a steady stretch, the onset envelope of each set of takes, the RMS and peak of every output, and the seam
of every loop (the jump from the last sample to the first is no larger than an ordinary sample step). Nobody has
listened to them in the game yet; that pass, and any gain changes it brings, is still to do.

Per space, the first 20 s of its recorded beds mixed at their in-game gains (bus sliders at full, before the
procedural layers and spots on top), as spectrograms:

| Space      | Mix                              | RMS      | Spectrogram                          |
| ---------- | -------------------------------- | -------- | ------------------------------------ |
| Silver Pan | `walla` × 0.29                   | −30 dBFS | [listen/bar.png](listen/bar.png)     |
| Camp       | `creek` × 0.52 + `spruce` × 0.38 | −23 dBFS | [listen/camp.png](listen/camp.png)   |
| High water | `rain` × 0.96 + `flood` × 0.28   | −21 dBFS | [listen/flood.png](listen/flood.png) |

## Procedural sounds

| Sound                               | Where it plays          | Source                                                     | License        |
| ----------------------------------- | ----------------------- | ---------------------------------------------------------- | -------------- |
| Walla (bar murmur), fallback        | The Silver Pan          | Procedural: band-passed pink noise, 7 voices               | Original, repo |
| Glasses clinking, fallback          | The Silver Pan          | Procedural: decaying sine partials                         | Original, repo |
| Stove roar and crackle              | The Silver Pan          | Procedural: brown noise and noise clicks                   | Original, repo |
| Jukebox placeholder tune            | The Silver Pan          | Procedural: original I-vi-IV-V in even time                | Original, repo |
| Room tone                           | Owen's room             | Procedural: low-passed brown noise                         | Original, repo |
| Distant street and passing cars     | Owen's room             | Procedural: filtered pink noise sweeps                     | Original, repo |
| Reel-to-reel hiss and motor         | Owen's room             | Procedural: noise, mains hum, sawtooth motor               | Original, repo |
| Typewriter                          | Owen's room, the letter | Procedural: noise clicks and a bell                        | Original, repo |
| Door                                | Arriving in Owen's room | Procedural: creak, thump and latch                         | Original, repo |
| Creek, fallback                     | The survey camp         | Procedural: modulated band-passed noise                    | Original, repo |
| Wind in spruce, fallback            | The survey camp         | Procedural: slow-modulated brown, pink noise               | Original, repo |
| Mosquitoes                          | The survey camp         | Procedural: vibrato sawtooth                               | Original, repo |
| Jerry can glug                      | The survey camp, refuel | Procedural: falling sine, noise, can ring                  | Original, repo |
| Heavy rain, fallback                | High water              | Procedural: high-passed pink, white noise                  | Original, repo |
| Rushing water, fallback             | High water              | Procedural: modulated low-passed brown noise               | Original, repo |
| Footsteps: wood, gravel, fallback   | Everywhere              | Procedural: filtered noise bursts                          | Original, repo |
| Footsteps: mud, water               | Everywhere              | Procedural: filtered noise bursts                          | Original, repo |
| Footsteps: concrete                 | Act 1 hospital, cell    | Procedural: bright noise click, brown-noise heel           | Original, repo |
| Rain on the line, fallback          | Act 1 sandbag line      | Procedural: high-passed pink, white noise                  | Original, repo |
| River along the line, fallback      | Act 1 sandbag line      | Procedural: modulated low-passed brown noise               | Original, repo |
| Outboards on the river              | Act 1 sandbag line      | Procedural: two-stroke sawtooth, white-noise rasp          | Original, repo |
| Sandbags landing                    | Act 1 sandbag line      | Procedural: brown thud, burlap grit, a slosh               | Original, repo |
| Shouting across water               | Act 1 sandbag line      | Procedural: falling sawtooth through two formants          | Original, repo |
| Hallway room tone and hum           | Act 1 hospital          | Procedural: low-passed brown noise, faint mains hum        | Original, repo |
| Drips                               | Act 1 hospital          | Procedural: rising sine blip and its hallway echo          | Original, repo |
| Floodwater in the ground floor      | Act 1 land office       | Procedural: low-passed brown noise, the street through the door | Original, repo |
| Ceiling drips, the door             | Act 1 land office       | Procedural: the hospital's drip spot, the interior door spot | Original, repo |
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
| Hotel bar murmur, glasses, fallback | Act 2 hotel bar         | Procedural: walla (5 voices), clinks                       | Original, repo |
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
is involved, so it carries whatever license the repository carries. A row marked "fallback" plays only until its
recording above has loaded, or if it never does.

### Sounds that stay procedural, and why

- **The jukebox.** The issue allows a recording only if it is CC0 and plausibly 1960s. Searches for jukebox, 1960s
  radio and old radio music turned up jukebox mechanics, sound design and modern pastiche, nothing that passes for a
  record in a 1967 Fairbanks bar, and any real record of the period is under copyright. The original I-vi-IV-V tune
  stays.
- **The barfight crowd.** Its walla has to swell and die with the fight (the `roar` spot); a steady murmur under
  it would flatten the beat, so the Act 1 barfight keeps its procedural crowd.
- **Interior doors** (`door`: Owen's room, the boarding house, the hospital, the base, the land office). The screen
  door suits the bar only; a spring screen door slapping in a hospital corridor would be wrong.
- **Wind elsewhere** (downtown, the Act 3 slope and crash, Eielson). The `spruce` recording is a summer forest; the
  winter winds keep their procedural bed until a winter recording is found.
- **Everything else in the table above**: no recording was asked for in this pass.

## Follow-ups

- **Act 1 spaces.** The sandbag line (`line`), the help tent (`hospital`, in `levels.ts` as `helpTent`), the land office
  (`office`) and the cell (`cell`, as `jail`) are built and play their beds from `soundscapes`. The barfight bed is
  still in `act1Soundscapes`, keyed by `barfight` (the Silver Pan in August, mud floor), until the barfight space is
  on main. The fight foley runs on timers inside that bed; the barfight mission can later fire the same spots from
  its own beats.

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

- **freesound.org CC0, from the cloud environment.** Blocked there (403 at the proxy). The recordings above were
  fetched from a local machine, where freesound answers normally; the HQ previews need no account.
- **keweldog, breeze.wav (181801).** CC0 and the right description (breeze through pines), but recorded 50 to 60 dB
  down: normalized to the bed level it would be mostly recorder hiss. `spruce` uses teadrinker's instead.
- **Sonniss GDC bundles.** Blocked the same way, and each bundle is several gigabytes.
- **Generated audio services.** Not used for this pass: procedural sound costs no bytes and no credits, and its
  license is unambiguous. A recording that replaces a procedural sound gets a row above with its source URL,
  author and license, and lands as Opus in WebM.
