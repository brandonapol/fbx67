# Art

`concepts/`: first-pass character concept sheets (full body plus portrait), generated with Higgsfield (GPT Image 2.6)
from the style board's character specs. They are reference, not final art. Next-pass notes: Barnette's hat and coat read
more Army than State Trooper; Major Dekker shouldn't wear pilot wings; Tolliver's portrait leans toward caricature; Eli,
Lucy and the officer are for consultant review.

Scene stills for the browser build live in `web/public/stills/` (see that folder's README).

## Engine look

The engine build aims for **grounded painterly realism**: a third-person world with real proportions, real light and
worn materials, finished with a slightly painted texture. The feel to reach for is a grounded open-world western: low
sun, haze, things that have been used. Nothing is copied from an existing game: no assets, signage, logos, layouts or
framings lifted from one, and references are described in words, never traced from screenshots. Every rule below is
meant to be checked against a render; where a number is possible, there is one.

**Grade.** Muted and grounded, the palette of the concept sheets in [`concepts/`](concepts/): desaturated khaki,
olive, faded denim, brown duck, off-white. Warmth comes only from direct sunlight and practical lamps; shade is
neutral to cool. A frame that is orange all over is wrong even if it is pretty.

### Target frames

These are what renders get compared to. They are generated reference (GPT Image 2.6, 16:9, with the Owen, Hank,
Curly and Wade character sheets as image references), not final art. Their signage is placeholder, and the
`second-ave` frame is pending consultant review (see [`fact-checks.md`](../fact-checks.md), item 40).

The targets set **grade, light, density and period**. They do not set framing: where a target's camera height, lens
or offset differs from the Camera rules below, the Camera rules win.

| Frame | Shows |
| ----- | ----- |
| [`targets/silver-pan.webp`](targets/silver-pan.webp) | The Silver Pan at 11 pm in July 1967, over Owen's shoulder: low sun from the north-northwest over low hills, smoke, Hank behind the bar, Curly and Wade at a table, a dozen patrons. |
| [`targets/second-ave.webp`](targets/second-ave.webp) | 2nd Avenue under the July midnight sun, looking roughly northwest along the avenue's bend toward the low sun: paved street, concrete sidewalks, brick and a few false fronts, 1950s-60s cars. Street orientation is open ([`fact-checks.md`](../fact-checks.md) item 41). |
| [`targets/survey-camp.webp`](targets/survey-camp.webp) | Owen's survey camp on a clearwater gravel bar: Curly refueling the floatplane, the cook tent, the cache on stilts, willow, alder and poplar on the bar, white spruce behind; the sun off frame right, shadows falling toward the camera's left. |

**Pass test.** A render passes when, at the same size as its target (or as the rule it illustrates), it holds these
tolerances. Issue #37 can automate all of them.

| Measure | Tolerance |
| ------- | --------- |
| Camera height, at rest | 1.7 m ± 0.2 m (with the camera level, the horizon sits within 5% of frame height of center) |
| Sun elevation | the band's range below, ± 3 degrees |
| Sun azimuth | the band's azimuth, ± 15 degrees |
| 1st, 50th and 99th percentile luma | each within ± 10 of the target's (luma as defined under Light) |
| Mean hue of the frame | within ± 8 degrees of the target's (hue of the frame's mean sRGB color) |

Measured on the targets (1st / 50th / 99th percentile luma; mean hue): `silver-pan` 28 / 68 / 193, 27 degrees;
`second-ave` 32 / 88 / 205, 22 degrees; `survey-camp` 33 / 78 / 196, 32 degrees.

### Camera

Heights are above the ground under the player. Pitch is positive when the camera looks up and negative when it
looks down.

- **Pivot and height.** The pivot is the player's eye point, **1.7 m** up. At rest the camera sits at the same
  height, level (pitch **0 degrees**) and not above the pivot, so at rest it does not look down at the player.
  Orbiting may move it above the pivot (see the orbit clamp); it returns when released.
- **Offset.** Camera offset **0.5 m** to the player's right; the player sits left of center, on about the left third
  line of a 16:9 frame.
- **Lens: 35-40 mm full-frame equivalent.** PlayCanvas `fov` is vertical, so that is **33-38 degrees**; use **36**.
  The blockout's 45 degrees reads as a wide security camera.
- **Boom: 2.6 m outdoors, 1.8 m indoors.** At 36 degrees a 2.6 m boom shows about **1.69 m** of height at the player:
  the player is cropped at mid-thigh and fills about **55-60%** of frame height. Indoors 1.8 m shows about **1.17 m**:
  waist-up, about the same share of the frame, which is what we want in a crowded bar.
- **Doors and walls.** Crossing a door blends the boom over **0.4 s**. A **0.25 m** collision sphere pulls the camera
  in so it never clips a wall, beam or patron; near clip **0.05 m**.
- **Orbit clamp.** The player may orbit pitch from **-20** to **+15 degrees**; it returns to 0 when released. No
  top-down or isometric view in play; a high angle is for cutaways only.

### Light

- **Sun elevation by band and season.** The key light follows the real sun closely enough to hold up to a local,
  with one stated cheat in the Prologue.
  - **Prologue, July at 11 pm:** azimuth **330-350 degrees** (north-northwest), disc **0 to +4 degrees** above the
    horizon. This is a deliberate cheat under "plausible, not archival": the Prologue text says "The midnight sun is
    still up at eleven", so the engine keeps the disc up.
  - The rest of the Prologue's summer is the real sun at the scene's `clock(state)` (`game/src/sun.ts`, standard
    time): the July morning at the camp has it high in the southeast. Only while the real sun is below **+3
    degrees** does the cheat hold the disc at +3, its azimuth clamped into the 330-350 arc.
  - The real sky: at 64.84 N, 147.72 W, 23:00 on July 1 / 15 / 31 puts the sun at **-1.5 / -3.0 / -6.3 degrees** on
    standard time (UTC-10), or **+0.7 / -0.8 / -4.0 degrees** on daylight time. Whether Alaska kept daylight saving
    in 1967 is open ([`fact-checks.md`](../fact-checks.md) item 38).
  - After the Prologue, the sun follows the band and season table under Moral weather.
  - Why the winter sun is so low: at Fairbanks it reaches about **1.7 degrees** at noon on the solstice and about
    **10-12 degrees** by mid-February.
  - Why breakup's sun is higher: the noon sun passes 20 degrees by mid-March and nears 40 by early May.
  - Sun shadows are on, at least **2048 px** per cascade.
- **Interiors are lit by their practicals.** Bare bulbs and shaded fixtures at about **2700 K** (`#ffb877`), neon,
  a stove, and the window. The window is the key; bulbs are fill. Warm bounce off wood floors lifts the shadows. No
  unmotivated light: every bright area has a source the player can find in frame. Owen's boarding house: the hall
  and the bathroom each have one bare bulb, the parlor a shaded floor lamp and the radio's lit dial, and Owen's room
  the midnight sun through a thin curtain over the desk, with the ceiling bulb as fill.
- **Haze and shafts.** Smoke indoors, dust and mosquito haze outdoors in summer, ice fog in deep winter. Wherever the
  sun or a lamp crosses haze, it shows as a shaft or a halo.
- **Shadow floor.** Measured as Rec.709 luma (0.2126 R + 0.7152 G + 0.0722 B) on the final sRGB frame at
  1920x1080 without UI: the **1st percentile is 16 or above**. The targets measure **28-33**. Shadow color carries
  the scene's temperature: warm brown indoors, neutral to cool outdoors.

#### Summer, the Prologue (July 1967)

Sampled from the concept sheets and the Prologue stills (`web/public/stills/p_*.webp`), not from the target frames.
The sky values are carried over from the blockout and are provisional.

| Role | Hex |
| ---- | --- |
| Sunlit skin and wood | `#b98251`, `#a77c5e` |
| Mid tones (khaki, brown duck, worn wood) | `#936f4b`, `#7c5a3c`, `#593d28` |
| Light neutrals (shirts, canvas, paper) | `#b7a798`, `#b39f8f` |
| Shadow floor | `#2f2219`, `#2f2726` |
| Sky toward the sun / away (provisional) | `#f3b98a` / `#7d8fb8` |

Fog is linear (`FOG_LINEAR`).

- **Outdoors: start 30 m, end 220 m.** The downtown play area is about 250 x 200 m, so fog never has to hide more
  than the town.
- **Indoors: start 2 m, end 60 m.** In the 12 x 10 m Silver Pan, looking along the room's length, the far wall about
  11 m from the camera is veiled **10-20%** (here about 15%). A 25 m end would veil it about 40% and read as a fire.

#### Moral weather (Act 1 on)

The three bands from [`design.md`](../../design.md) ("Moral weather") are lighting presets the engine picks from
story state. Same places, same props; only light, fog and sky change.

**These palettes are provisional.** They are drafted from the stills and the style board's description, because the
owner's alpenglow photo is not in the repo. They are to be resampled from the photo in #54.

| Band | When | Key | Sky (zenith, horizon) | Lit surface, shade | Fog color | Fog start-end |
| ---- | ---- | --- | --------------------- | ------------------ | --------- | ------------- |
| **Alpenglow** | clean | sun `#ffc7a6` | `#7f8fb5`, `#f2b8a8` | `#f6d7cf`, `#9aa5c4` | `#e7c4c0` | **60-240 m** |
| **Blue hour** | strained | streetlights `#ffd9a0` | `#2f3d6b`, `#6d7fae` | `#8b9ac4`, `#4a5680` | `#4f5f8a` | **30-160 m** |
| **Sodium in ice fog** | danger | sodium lamps `#ff9a3c` | `#1a1a20`, `#3a3026` | `#8a6f50`, `#2a2622` | `#6b5a44` | **6-70 m** |

At danger, sight lines collapse to one block: nothing past **70 m** is visible, and each sodium lamp reads as a halo
about **4 m** across. The palettes above are written for winter (Acts 2-3); the flood and breakup rows below reuse
them for their keys until #54 resamples them. `game/src/lighting.ts` carries the summer rules, the Act 1 flood row,
the Act 2 fall row and the Act 3 winter row today (with breath fog, snow load and the 4 m ice-fog halo as flags
render.ts reads), and `game/src/lighting.test.ts` holds it to these tables; the breakup row lands with its layer.
Which row applies is the story's `season(state)`, never a space's own.

**Freeze-up on the town** (`game/src/freezeup.ts`). The same downtown data, with a layer for the date: from
**1 September** ice in the puddles, chimney smoke and the birches turned; from **21 September** bare birches; from
**10 October** the first snow that stays, on the lots and roofs (roadways and walks kept bare) and every parked car on
its plug-in cord; from **25 October** the river skimming over, shelf ice at the bank and pans in the channel. Deep
winter keeps all of it. The low sun and short days are the fall row's clean cell below.

**Band by season.** Each cell is the key light, the sun's elevation and azimuth (or "none"), and the fog range. When
the prose elsewhere and this table disagree, this table wins. The Prologue (July) is not banded; it uses the summer
rules above.

| Season | Clean | Strained | Danger |
| ------ | ----- | -------- | ------ |
| **Act 1, flood** (Aug 1967, overcast) | overcast daylight; sun none; fog **10-120 m** | overcast dusk, streetlights; sun none; fog **8-80 m** | night in rain, streetlights; sun none; fog **4-40 m** |
| **Act 2, fall** (Sep-Nov, freeze-up) | alpenglow; sun **0 to +12 degrees**, azimuth **160-230**; fog **60-240 m** | blue hour, streetlights; sun none; fog **30-160 m** | night, sodium lamps in frost haze; sun none; fog **15-100 m** |
| **Act 3, winter** (Dec-Feb) | alpenglow; sun **0 to +12 degrees**, azimuth **160-220**; fog **60-240 m** | blue hour, streetlights; sun none; fog **30-160 m** | sodium lamps in ice fog, forty below; sun none; fog **6-70 m** |
| **Act 4, breakup** (spring 1968) | clear spring sun; sun **15 to 40 degrees**, azimuth **150-250**; fog **80-240 m** | blue hour after sunset, streetlights; sun none; fog **30-160 m** | night, sodium lamps in river mist; sun none; fog **10-80 m** |

Ice fog at forty below belongs to deep winter only; the fall and breakup danger cells use the same sodium key with
thinner haze.

#### Beyond the play area

- Every outdoor space has a **skyline and terrain shell** beyond the playable edge: the hills, the river line, the
  far side of town, as low-poly cards or terrain out to about **5 km**.
- The shell's haze follows the preset. For summer and clean presets its haze is baked into its albedo and it sets
  `useFog = false`, so it stays visible past the scene's fog end. For strained presets a runtime tint fades it toward
  the band's fog color. At danger it is hidden: the fog ends the world at one block.
- **Two passes.** The shell renders on its own layer, drawn first by a background camera with its own near and far
  (about **50 m** and **6000 m**). The world camera then draws everything else with near **0.05 m** and `farClip` at
  the fog end plus a **20%** margin.
- Why: a depth buffer's error grows with distance squared over the near plane (about z² / (near x 2^24) for 24-bit
  depth). At a near plane of 0.05 m that is about 5 cm at 200 m but about 2 m at 1.3 km, so distant ridges would
  shimmer and z-fight. With its own 50 m near plane the shell resolves 5 km to about 3 cm.

### Materials

- **PBR, metal/rough.** Each material set is albedo, normal, and one packed map with ambient occlusion, roughness and
  metalness in its R, G and B channels. Metalness is non-zero only on bare metal.
- **Compression.** All textures ship as KTX2 with Basis Universal, with mipmaps: UASTC for normals and the packed
  AO/roughness/metal map, ETC1S or UASTC for albedo.
- **Texel density.** Screen pixels per meter at 36 degrees and 1080 lines are 1080 / (2 d tan 18), about **554 px/m
  at 3 m** and **277 px/m at 6 m**. The densities match the distances where each class is usually seen:
  - **512 px/m** for hero props, anything within arm's reach or read up close (the bar top, the notebook, the tape
    recorder, tools, the floatplane cowling);
  - **256 px/m** for architecture and vehicles, built from tiling materials and trim sheets, not unique unwraps;
  - **128 px/m** for terrain, with a tiling detail map.
- **Characters.** Each hero character gets at most one **2k** body set (about 1024 px/m on a 1.8 m figure) and one
  **1k** head set (about 2048 px/m on the face). NPCs share sets or drop a mip. Higher densities are kept for
  dialogue close-ups only, loaded for the shot.
- **Budget: 512 MB of texture memory per space**, after compression (the figure #37 measures).

  Worked example, the Silver Pan at peak density. A 2k set (albedo, normal, packed) is about 16.8 MB with mips
  (4.2 M texels x 1 byte x 3 maps x 1.33); a 1k set is about 4.2 MB.

  | Use | Sets | MB |
  | --- | ---- | -- |
  | Architecture: 4 tiling materials, 2 trim sheets | 6 x 2k | 101 |
  | Hero props (bar top, register, jukebox, recorder, notebook) | 2 x 2k atlases | 34 |
  | Dressing props, 180 or more | 6 x 2k atlases | 101 |
  | Hero characters: Owen, Hank, Curly, Wade | 4 x (2k + 1k) | 84 |
  | About ten other patrons | 3 shared x (2k + 1k) | 63 |
  | Decals (grime, rings, scuffs) | 1 x 2k | 17 |
  | Lightmaps and reflection probe | | 46 |
  | UI and fonts | | 10 |
  | **Total** | | **456** |

- **Wear and grime.** Edges are worn through to the layer below (paint to wood, wood to grain, enamel to rust).
  Grime collects in corners, under rails, at the base of walls, around handles and where hands go. Floors show paths:
  a worn track from door to bar, a clean patch under the stools' footrests.
- **The painterly feel comes from texture painting**, not from flat or toon shading: hand-painted albedo with visible
  stroke breakup at about 5-10 cm scale, and slight color variation across any flat surface.
- **No-go list.**
  - plastic sheen: no roughness below **0.3** except glass, wet surfaces, brass and polished bar tops;
  - saturated color: no albedo above about **70% HSV saturation**;
  - pure black shadows (see the shadow floor under Light);
  - flat, unlit color: no material without a normal map and roughness variation, no `useLighting = false` on world
    geometry;
  - real brand names, logos or legible real signage; signs are fictional and hand-painted.

### Density

- **Every surface tells you who uses it.** A bar top has rings, ashtrays and someone's hat; a workbench has the tool
  its owner reaches for most; a sidewalk has the cigarette butts outside the door people smoke at.
- **What counts as a prop:** an object with its own mesh, at least about **15 cm** in its largest dimension. Decals
  and smaller items add texture but do not count.
- **Interiors: at least 1.5 props per square meter of floor.** The Silver Pan is 12 x 10 m in `game/src/levels.ts`,
  so it carries at least **180**. No camera-facing 2 x 2 m patch of wall or floor is bare.
- **Street: at least 0.3 props per square meter** of sidewalk and frontage (a 5 m strip on each side), plus a parked
  vehicle every **15 m** of curb, a power pole every **30 m**, and at least **6 people per 100 m** of block in the
  summer evening.
- **Camps and wilderness: clustered.** At least 1 prop per square meter within 6 m of a tent or fire; bare gravel and
  brush beyond, so use reads as a pocket in the country.

### Characters

- **Realistic proportions** (about 7.5 heads tall) and the faces from [`concepts/`](concepts/). The rigged models are
  built from clean A-pose references in the same grounded painterly realism; nothing is stylized or caricatured.
- **1967 Fairbanks clothing, by season.**
  - Summer (Prologue, Act 1): flannel and chambray shirts, brown duck-canvas work jackets and bib overalls, work
    pants, ball caps and felt hats; airmen in olive utility fatigues; women in cardigans, knee-length skirts or
    slacks.
  - Fall (Act 2): wool shirts, mackinaws, rubber-bottomed boots, knit caps.
  - Winter, after freeze-up only (Act 3): parkas with fur ruffs, Air Force N-3B parkas and white bunny boots, wool
    liners and mittens, fur hats. No parka appears before freeze-up.
  - Breakup (Act 4): rubber boots, mud to the shin, layers coming off.
  - Any season: light down or canvas vests on field workers (Owen wears his in July).
- Eli, Lucy and other Native residents wear the same town and work clothes as everyone else in the season, with
  their own particulars from the concept sheets; nothing is costume.
- Clothes carry wear the way materials do: knees and cuffs, grease where hands wipe, salt and sweat at the collar.

### What we reject

From the current blockout (`game/src/render.ts`):

- **Capsule figures**: a capsule, a sphere for a head and a sphere for hair (`addFigure`). People are rigged models
  from day one of the art pass, even if their faces are rough.
- **Flat-colored boxes**: every prop a box or cylinder with one color and the same gloss (`material`, `addProp`). A
  box is a placeholder for collision only.
- **The overhead camera**: the blockout's camera hangs 7-25 m up (`cameraOffset`). It reads as a board game, not a
  place.
- **Uniform light**: one ambient color and one sun with no practicals, no bounce and no haze.
- **Unlit color**: the glowing cones and unlit materials are debug views, not part of the look.
