# Art

`concepts/`: first-pass character concept sheets (full body plus portrait), generated with Higgsfield (GPT Image 2.6)
from the style board's character specs. They are reference, not final art. Next-pass notes: Barnette's hat and coat read
more Army than State Trooper; Major Dekker shouldn't wear pilot wings; Tolliver's portrait leans toward caricature; Eli,
Lucy and the officer are for consultant review.

Scene stills for the browser build live in `web/public/stills/` (see that folder's README).

## Engine look

The engine build aims for **grounded painterly realism**: a third-person world with real proportions, real light and
worn materials, finished with a slightly painted texture and grade. The feel to reach for is a grounded open-world
western: warm low sun, haze, things that have been used. Nothing is copied from an existing game: no assets,
signage, logos, layouts or framings lifted from one, and references are described in words, never traced from
screenshots. Every rule below is meant to be checked against a render; where a number is possible, there is one.

### Target frames

These are what renders get compared to. They are generated reference (GPT Image 2.6, 16:9), not final art, and their
signage is placeholder.

| Frame | Shows |
| ----- | ----- |
| [`targets/silver-pan.webp`](targets/silver-pan.webp) | The Silver Pan at 11 pm in July 1967: midnight sun through smoke, a dozen patrons, the long bar and brass rail, the bartender. |
| [`targets/second-ave.webp`](targets/second-ave.webp) | 2nd Avenue under the July midnight sun: false fronts and brick, period cars, people on the boardwalk. |
| [`targets/survey-camp.webp`](targets/survey-camp.webp) | Owen's survey camp on a clearwater gravel bar: the floatplane, the cook tent, the cache on stilts, black spruce. |

A render passes when, side by side with its target at the same size, it matches in camera height, light direction
and color, value range and density, even if every prop is different.

### Camera

- **Third person, over the shoulder.** The camera sits at **1.7 m** above the ground (a standing adult's eyes), the
  pivot on the player's upper chest, framed **0.5 m** right of center. The player fills about a third of the frame
  height at rest.
- **Lens: 35-40 mm full-frame equivalent.** PlayCanvas `fov` is vertical, so that is **33-38 degrees**; use **36**.
  The blockout's 45 degrees reads as a wide security camera.
- **Boom: 2.6 m outdoors, 1.4 m indoors.** Indoors the camera pulls in over **0.4 s** when the player crosses the
  door, and a **0.25 m** collision sphere keeps it from ever clipping a wall, beam or patron; near clip **0.05 m**.
- **Pitch: -5 to +10 degrees** at rest (looking slightly up is allowed, looking down at the player is not). No
  top-down or isometric views in play; a high angle is for cutaways only.

### Light

- **Low sun, long shadows.** The key light in every exterior sits **3-15 degrees** above the horizon (July in
  Fairbanks at 11 pm is about 3 degrees; winter noon never clears 3). Never above **25 degrees**, except under the
  flood's overcast, which has no visible sun. Shadows are on for the sun, at least **2048 px** per cascade.
- **Interiors are lit by their practicals.** Bare bulbs and shaded pendants at about **2700 K** (`#ffb877`), neon,
  a stove, and the window. The window is the key; bulbs are fill. Warm bounce off wood floors (`#6d442b`) lifts the
  shadows. No unmotivated light: every bright area has a source the player can find in frame.
- **Haze and shafts.** Smoke indoors, dust and mosquito haze outdoors in summer, ice fog in deep winter. Wherever the
  sun or a lamp crosses haze, it shows as a shaft or a halo.
- **Shadows are never pure black.** The darkest 1% of pixels in a frame sits at **luma 16/255 or above** (the
  targets measure 20-25). Shadow color carries the scene's temperature: warm brown indoors (`#311d12`), cool slate
  outdoors in winter.

#### Summer, the Prologue (July 1967)

Midnight sun: palette sampled from the target frames and the Prologue stills.

| Role | Hex |
| ---- | --- |
| Sun and lit faces | `#d3a990`, `#9a6541` |
| Mid tones (wood, duck canvas) | `#987359`, `#765843`, `#6d442b` |
| Shadow floor | `#311d12`, `#34261b` |
| Sky toward the sun / away | `#f3b98a` / `#8f86a8` |

Fog: **start 50 m, end 350 m** outdoors; indoors **15 m / 120 m** at low density, so the far wall of a smoky bar is
slightly veiled but readable.

#### Moral weather (Act 1 on)

The three bands from [`design.md`](../../design.md) ("Moral weather") are lighting presets the engine picks from
story state. Same places, same props; only light, fog and sky change. The palettes below are drafted from the
stills and the style board's description; resample them from the owner's alpenglow photo once it is committed.

| Band | When | Sun / key | Sky (zenith, horizon) | Lit surface, shade | Fog color | Fog start-end |
| ---- | ---- | --------- | --------------------- | ------------------ | --------- | ------------- |
| **Alpenglow** | clean | `#ffc7a6`, 3-8 degrees | `#7f8fb5`, `#f2b8a8` | `#f6d7cf`, `#9aa5c4` | `#e7c4c0` | **80-450 m** |
| **Blue hour** | strained | streetlights `#ffd9a0`; no sun | `#2f3d6b`, `#6d7fae` | `#8b9ac4`, `#4a5680` | `#4f5f8a` | **35-180 m** |
| **Sodium in ice fog** | danger | sodium lamps `#ff9a3c` | `#1a1a20`, `#3a3026` | `#8a6f50`, `#2a2622` | `#6b5a44` | **6-70 m** |

At danger, sight lines collapse to one block: nothing past **70 m** is visible, and each sodium lamp reads as a halo
about **4 m** across. The values in `game/src/lighting.ts` today are blockout placeholders; this table supersedes
them.

### Materials

- **PBR, metal/rough.** Albedo, normal, roughness and ambient occlusion on everything; metalness only on bare metal.
- **Texel density.** **512 px/m** for hero props, anything within arm's reach or read up close (the bar top, the
  notebook, the tape recorder, guns, tools, the floatplane cowling). **256 px/m** for buildings, interiors' walls and
  floors, and vehicles. **128 px/m** for terrain, with a tiling detail map. Characters **1024 px/m** for the body,
  **2048 px/m** for the head and hands. Why: at a 36 degree vertical lens and 1080 lines, a surface **3 m** away gets
  about 520 screen px per meter, and a building **6 m** away about 260, so these densities match what the camera can
  resolve at the distances where each class is usually seen, without paying for texels nobody sees.
- **Wear and grime.** Edges are worn through to the layer below (paint to wood, wood to grain, enamel to rust).
  Grime collects in corners, under rails, at the base of walls, around handles and where hands go. Floors show paths:
  a worn track from door to bar, a clean patch under the stools' footrests.
- **The painterly feel comes from texture painting and the grade**, not from flat or toon shading: hand-painted
  albedo with visible stroke breakup at about 5-10 cm scale, slight color variation across any flat surface, and a
  warm, slightly lifted, slightly desaturated grade.
- **No-go list.**
  - plastic sheen: no roughness below **0.3** except glass, wet surfaces, brass and polished bar tops;
  - saturated primaries: no albedo above about **70% HSV saturation**, and no pure red, blue or yellow;
  - pure black shadows (see Light);
  - flat, unlit color: no material without a normal map and roughness variation, no `useLighting = false` on world
    geometry;
  - real brand names, logos or legible real signage; signs are fictional and hand-painted.

### Density

- **Every surface tells you who uses it.** A bar top has rings, ashtrays and someone's hat; a workbench has the tool
  its owner reaches for most; a boardwalk has the cigarette butts outside the door people smoke at.
- **Interiors: at least 1.5 dressing props per square meter of floor**, counting anything a glass or larger. The
  Silver Pan (about 12 x 8 m) carries at least 150. No camera-facing 2 x 2 m patch of wall or floor is bare.
- **Street: at least 0.3 props per square meter** of boardwalk and frontage (a 5 m strip on each side), plus a parked
  vehicle every **15 m** of curb, a power pole every **30 m**, and at least **6 people per 100 m** of block in daytime.
- **Camps and wilderness: clustered.** At least 1 prop per square meter within 6 m of a tent or fire; bare gravel and
  brush beyond, so use reads as a pocket in the country.

### Characters

- **Realistic proportions** (about 7.5 heads tall) and the faces from [`concepts/`](concepts/). The rigged models are
  built from clean A-pose references in the same grounded painterly realism; nothing is stylized or caricatured.
- **1967 Fairbanks clothing, by season.**
  - Summer (Prologue, Act 1): flannel and chambray shirts, Carhartt-type duck jackets and bib overalls, work pants,
    ball caps and felt hats; airmen in olive utility fatigues; women in cardigans, knee-length skirts or slacks.
  - Fall (Act 2): wool shirts, mackinaws, down vests, rubber-bottomed boots, knit caps.
  - Winter, after freeze-up only (Act 3): parkas with fur ruffs, Air Force N-3B parkas and white bunny boots, wool
    liners and mittens, fur hats. No parka appears before freeze-up.
  - Breakup (Act 4): rubber boots, mud to the shin, layers coming off.
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
