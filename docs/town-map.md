# Downtown Fairbanks, summer 1967: the town map

This is the walkable downtown for the prologue (issue #35), and the same blocks under the August flood. It is meant to
hold up to someone who lived there: plausible, not archival. Every landmark has a fact-check entry in
[`fact-checks.md`](fact-checks.md), items 19 to 37. Where this map and [`design.md`](../design.md) disagree, the
design wins.

![Top-down map of the footprint](town-map.svg)

The SVG is hand-written in the same meters as the tables below. Its viewBox is the coordinate system, so a value read
off the drawing is a world coordinate. Edit the two together.

## Coordinates

- **Units:** meters.
- **Origin:** the south end of the Cushman Street bridge, on its centerline, where the deck lands on the south bank.
- **Axes:** x east, z south, y up. North is −z. In the SVG, x is x and y is z.
- **Rectangles:** written as `x0..x1, z0..z1`.
- **Yaw:** placements use 0° or 180°. At 0°, world = center + local. At 180°, world = (cx − local x, cz − local z):
  the space is turned to face the other way.

## Footprint

The owner approved this footprint because "most stuff will happen right on the water or in the bars and buildings on
2nd". The street-address evidence (item 19) puts that bar row, the Nordale, the Lacey Street Theater, the Co-op, the
Polaris and the Northward **east** of Cushman. The footprint is therefore sited east of the bridge: the Chena
riverfront from the Cushman Street bridge east past Lacey toward Noble, First to Third Avenue, plus Cushman Street up
to about Fifth. The Northern Commercial Company and the Federal Building, west of Cushman, form a thin strip at the
west edge.

| | Value |
|---|---|
| Play area | x −55..195, z −60..140 (250 × 200 m) |
| Walkable | the south bank, First to Third Avenue from the N.C.'s Cushman front to just past Noble, and Cushman Street to Fifth |
| On the water | the river inside the play area: skiffs, the float dock, the plane |
| Backdrop only | the north bank (church and hospital), the Northward Building, Barnette Street and everything west of it, everything past the edges |

### Streets

The river is drawn straight, running east-west. In town it bends, and First Avenue bends with it.

| Street | Right of way | Surface (1967, plausible) | Notes |
|---|---|---|---|
| First Avenue (old Front Street) | z 2..16, roadway z 5..13 | paved; walk on the river side | runs along the south bank |
| Second Avenue ("Two Street") | z 48..64, roadway z 52..60 | paved, concrete walks | the bar row and the widest street on the map |
| Third Avenue | z 96..110, roadway z 99..107 | paved | Owen's boarding house faces it |
| Fourth Avenue | z 124..134 (open for x −40..40) | paved | a stub; backdrop beyond |
| Fifth Avenue | z 140..150 | paved | just past the south edge; seen, not reached |
| Cushman Street | x −7..7, roadway x −4..4 | paved, concrete walks | lines up with the bridge |
| Lacey Street | x 74..88 | paved | first street east of Cushman |
| Noble Street | x 154..168 | gravel | second street east; the edge of the dense blocks |
| Barnette Street | x −88..−74 | paved | first street west of Cushman; backdrop |
| Blanchfield lane | x 39..44, z 16..48 | gravel | the real little street between Cushman and Lacey; the Silver Pan's side door opens onto it |
| Alley | z 78..82, x 7..195 | gravel | behind Second's south side and Third's north side |

### Blocks

| Id | Between | Rectangle |
|---|---|---|
| A1w | 1st–2nd, Cushman–Blanchfield | x 7..39, z 16..48 |
| A1e | 1st–2nd, Blanchfield–Lacey | x 44..74, z 16..48 |
| A2 | 1st–2nd, Lacey–Noble | x 88..154, z 16..48 |
| A3 | 1st–2nd, east of Noble (edge) | x 168..195, z 16..48 |
| B1 | 2nd–3rd, Cushman–Lacey | x 7..74, z 64..78 and z 82..96 |
| B2 | 2nd–3rd, Lacey–Noble | x 88..154, z 64..78 and z 82..96 |
| B3 | 2nd–3rd, east of Noble (edge) | x 168..195, z 64..78 and z 82..96 |
| W1 | 1st–2nd, Barnette–Cushman (the N.C.) | x −74..−7, z 16..48; playable to x −55 |
| W2 | 2nd–3rd, Barnette–Cushman (Federal Building) | x −74..−7, z 64..96; playable to x −55 |
| C | 3rd–4th, one lot deep on Cushman | x −40..−7 and x 7..40, z 110..124 |
| D | 4th–5th, one lot deep on Cushman | x −40..−7 and x 7..40, z 134..140 |

## Ground, bank and bridge

### Ground

Grade is one function of z, the same for every x. It is piecewise-linear, and its knots are the flood marks
(see [The flood](#the-flood-august-1967)):

| z | Grade y | Why this knot |
|---|---|---|
| 0 to 2 | −0.30 | bank crest and First Avenue's river walk; the "about five feet" near the river |
| 64 | 0.60 | the Co-op's wall on Second Avenue's south walk, 2 ft mark |
| 80 | 0.82 | the post office door on Cushman, 15 in mark |
| 170 | 1.05 | the City Hall mark at 800 Cushman, about Eighth Avenue (off the map; 6 in) |

Between knots, interpolate linearly. Past z 170, the grade stays at 1.05. The rise is about 1.2 m over 140 m of play
space, too gentle to see.

**Buildings:** floor = grade at the front door + 0.3. An upper floor is that plus 3.0 per storey.

### Riverbank

| z | y | What |
|---|---|---|
| −60..−10 | −3.5 | summer water surface, in the river |
| −10 | −3.5 | the water's edge: bank toe, gravel |
| −10..0 | −3.5 to −0.3 | the bank, about 18° (3.2 m up over 10 m), grass and willow with a worn path |
| 0..2 | −0.3 | the bank crest, flat, joining First Avenue's river walk |

Skiffs are pulled up on the lower half of the bank (z −10..−5, y −3.5 to −1.9), where the slope is easy to drag a
boat up.

### Bridge

- **Span:** the Cushman Street bridge is a late-1950s concrete-deck girder span (1958–60; item 20), x −6..6.
- **Abutment:** a concrete abutment at z 0..2. The deck lands at grade there (y −0.3) and meets First Avenue level.
- **Deck profile:** rises at 6% to a crown of y 1.5 at mid-river (z −30), then falls the same way to the north bank
  (z −60).
- **Clearance:** the girders are about 1 m deep, so the soffit is about 2.8 m above summer water at the water's edge
  and 4 m at the crown.
- **North of the river:** the deck ends at the north bank (z −60); Cushman continues north as an ordinary street,
  backdrop.
- **In the flood:** water at y 1.2 covers both approaches. The crown stays about 0.3 m dry.

### Float dock

- **Float:** log and plank, x 112..126, z −22..−10. Its deck is 0.4 m above summer water (y −3.1).
- **Gangway:** hinged at the bank crest (z 0, y −0.3) and resting on the float's inner edge (z −10, y −3.1), x
  117..120. That is 10 m of run and 2.8 m of drop, about 16°.
- **The morning:** Curly is out on the plane's near (west) float at the hand pump, the plane tied to a cleat on the float's east edge with a bowline in yellow line (`game/src/floatDock.ts`). The panel `p_dock` opens at the dock's door, (118.5, −16), at the foot of the gangway.
- **In the flood:** the float rides up on its pilings to y 1.6, and the gangway tips up about 11°.

## Places

### Real landmarks

| Place | Where | Rectangle | Front door | Floor (y) | Height |
|---|---|---|---|---|---|
| Northern Commercial Co. ("the N.C.") | W1, First Avenue just west of Cushman | x −74..−7, z 16..48 (playable to −55) | (−31, 16), north onto First | 0.20 | 2 floors, 9 m; power-plant stacks at (−66, 22) and (−66, 30), 28 m |
| Federal Building and Post Office | W2, Cushman between Second and Third, west side | x −74..−7, z 64..96 (playable to −55) | (−7, 80), east onto Cushman | 1.12 | 3 floors, 13 m |
| Polaris Building | A2, First and Lacey, east corner (123 Lacey) | x 88..112, z 16..32 | (88, 24), west onto Lacey | 0.32 | 11 floors, about 35 m |
| Lacey Street Theater | A1e, north side of Second at Lacey (500 Second Avenue) | x 56..74, z 26..48; tower x 70..74, z 44..48 | (66, 48), south under the marquee | 0.67 | 2 floors, 9 m; stepped tower 16 m |
| Nordale Hotel | B1, south side of Second, Cushman–Lacey | x 18..38, z 64..78 | (28, 64), north onto Second | 0.90 | 3 floors, 11 m |
| Co-op Drug | B1, south side of Second next to the Nordale (535 Second Avenue), facing the Blanchfield lane's mouth | x 39..57, z 64..78 | (48, 64), north onto Second | 0.90 | 2 floors, 8 m |
| Cushman Street bridge | over the river | x −6..6, z −60..2 | | | see [Bridge](#bridge) |
| Immaculate Conception church | north bank, by the bridge's north end | x −40..−22, z −88..−66 | backdrop | | steeple about 15 m |
| St. Joseph's Hospital | north bank, a little downstream (west) of the church | x −130..−80, z −118..−82 | backdrop | | 4 floors (a guess) |
| Northward Building | south of Third between Lacey and Noble | x 88..154, z 112..160 | backdrop | | 8 floors, about 26 m |
| Gravel lot (Pioneer Hotel site) | First Avenue across Barnette, a full block west of the N.C., off the map | x −112..−92, z 16..32 | backdrop | | none |

The Pioneer Hotel burned in 1952. "Half a block west of the N.C." is all the sources say. The map puts the lot across
Barnette, a full block west; the spot is ours (item 23).

Off the map:

- **The Alaska 67 Centennial Exposition ("A-67")** on Airport Way at Peger Road, about 2.5 km southwest. It ran
  through the summer of 1967 and was renamed Alaskaland afterward. In July people say "A-67", "the Centennial" or
  "the Exposition", not "Alaskaland".
- **Phillips Field**, the bush strip on the north side of the river beyond the railroad yards, where most small
  operators were based. Curly's hangar belongs there.
- **Eielson Air Force Base**, about 26 miles southeast. `eielsonBarracks` is Wade's bunk there (the Act 1 letter
  home). The base is its own space, with its own coordinates: see [`base-map.md`](base-map.md).

Place ids used by the scenes that are not on the walkable map (the `Place` type in `text-game/src/types.ts`):

- `floodCabin`: the half-sunk cabin on the edge of town where Eli's pole finds Owen (Aug 15). Off the map: the
  scene needs no spot downtown, and the flood tables already cover the water. The engine plays it as its own space
  in its own coordinates (`game/src/cabinRide.ts`): Eli's riverboat up a flooded slough to the cabin, its spawn the
  boat's first seat.
- `cityJail`: the Fairbanks PD cell and front desk (Aug 20). Off the map: no jail is placed downtown, and the scene
  never walks to or from it.
- `eielsonBarracks`: Wade's room on the base map ([`base-map.md`](base-map.md)).
- `surveyCamp`: Owen's camp on a gravel bar up the river, reached by Curly's plane. Its own space, not downtown.
- `helpTent`: off the map south along Cushman beyond Fifth; its spot is a gap for the place-id ticket (#89).
- `majorsOffice`: the Major's office in the squadron building (Sept 12, Oct 24), on the base map ([`base-map.md`](base-map.md)).
- `squadronBuilding`: the squadron building's hall and duty desk (Oct 25), on the base map ([`base-map.md`](base-map.md)).
- `photoLab`: the base photo lab's counter (Sept 14), on the base map ([`base-map.md`](base-map.md)).
- `photoRecords`: the records room at the back of the photo lab (Sept 14), on the base map ([`base-map.md`](base-map.md)).
- `baseHangar`: outside the hangar where Jake does contract maintenance (Nov 17), on the base map ([`base-map.md`](base-map.md)).
- `lucysKitchen`: Lucy's kitchen table, where she reads what Wade brings her (Sept to Nov). Off the map: the design
  does not say where she lives, and no scene walks there.
- `hotelBar`: the hotel bar downtown where Tolliver drinks with men from Outside (Oct 7). Fictional (the Pioneer is
  gone, item 23); off the walkable map until a building on it is chosen, a gap to fill.
- `communityHall`: the hall on the edge of town where the Tanana Chiefs meet (Oct 21). Unnamed (fact-checks item 52)
  and off the map.
- `bushStrip`: Curly's tie-down at Phillips Field, north of the river (Nov 8). Off the map (see Phillips Field above).
- `richardsonHighway`: the road between town and the base, where Barnette pulls Wade over (Nov 30). Off the map.
- `crashSite`: Jake's wreck in a stand of black spruce on a hillside, a day's ski from the road (Dec 12 to 13). Its
  own space, not downtown.
- `searchRidge`: the ridge and creek drainage near the plane's last heading, where the ground team splits up (Dec 13).
  Its own space, with `crashSite` below it.
- `hospital`: St. Joseph's, the front desk and the ward (Dec 13 to Jan 3). Off the map: backdrop on the north bank.
- `hospitalLot`: St. Joseph's parking lot at forty below, ice fog and headbolt-heater cords (Dec 26; item 58). Off the
  map, with the hospital.
- `tolliversHouse`: outside Tolliver's house in the dark, where Wade waits with a borrowed rifle (Dec 28). The design
  does not place it; off the map.
- `tolliversOffice`: Tolliver's office downtown, where Wade walks down Cushman with a charge in a lunchbox (Dec 28). Not
  yet a building on the map, a gap to fill.
- `tolliversCabin`: Tolliver's hunting cabin out the road, where Wade drives with the kerosene (Dec 29). Off the map.
- `troopersPost`: the State Troopers' office where Barnette takes down Wade's story about Lucy (Dec 29). Off the map.

### Ours

| Id | Place | Where | Rectangle | Front door | Floor (y) | Height |
|---|---|---|---|---|---|---|
| `silverPan` | The Silver Pan | A1w, north side of Second, on the Blanchfield lane corner | x 23..39, z 32..48 | (33, 48) south onto Second; side door (39, 35) east onto the lane | 0.67 | 1 floor, false front 6 m |
| | The Ptarmigan (bar) | A1w, corner of Second and Cushman | x 7..21, z 34..48 | (14, 48) south | 0.67 | 1 floor, 5.5 m |
| | The Sluice Box (bar) | A1e, Second Avenue | x 44..56, z 34..48 | (50, 48) south | 0.67 | 1 floor, 5 m |
| | The Blue Spruce Lounge | A2, corner of Second and Lacey | x 88..102, z 34..48 | (95, 48) south | 0.67 | 2 floors, 7 m |
| `nlCafe` | Northern Lights Café | B1, corner of Second and Cushman | x 7..17, z 64..78 | (12, 64) north onto Second | 0.90 | 1 floor, 4.5 m |
| `landOffice` | The land office | B2, south side of Second, east of Lacey | x 100..114, z 64..78 | (107, 64) north onto Second | 0.90 | 2 floors, false front 7 m |
| `boardingHouse` | Owen's boarding house | B2, north side of Third | x 126..142, z 82..96 | (134, 96) south onto Third | 1.16 | 2 floors, 7 m |
| `owensRoom` | Owen's room | upstairs at the back of the boarding house | x 131..137, z 82..88 | the stairs | 4.16 | |
| | Quonset float shed | A2, First Avenue | x 130..150, z 18..28 | (140, 18) north onto First | 0.23 | 5 m arch |
| `floatDock` | The float dock | south bank between Lacey and Noble | see [Float dock](#float-dock) | | | |
| | Curly's floatplane | moored alongside the float's east edge (`MOORED` in `game/src/flight.ts`) | hull's middle at (129.2, −16); floats x 127.65..128.15 and 130.25..130.75, z −19.4..−13; wing x 123.7..134.7 | | | nose north (−z), a high-wing bush plane on floats; the flood has no plane |
| `helpTent` | The help tent (field hospital / Red Cross station) | high ground off the map, south along Cushman beyond Fifth Avenue; coordinates are a gap for the place-id ticket (#89) | not yet placed | not yet placed | | canvas tents and a school-gym-style cot line, 6 m |
| | Skiff and riverboat landing | lower bank east of the bridge | x 22..70, z −10..−5 | | | |

**The land office** is Lucy's. It is on the boarding house's own block but faces Second; neither route passes its
door, so Owen does not walk past it with her letter in his pocket. Whether the federal land office was in the Federal Building in 1967 is
open (item 30), so the office stays an invented building on Second. The owner decided it is a two-story building with
a staircase between the floors (item 45), which the Act 1 scene uses when Lucy hauls ledgers upstairs.

**Generic buildings** (pale on the map) are unnamed frame storefronts, rooming houses, cabins and sheds. See
[Building types](#building-types).

### Spaces in `game/src/levels.ts`

One space is not placed: `story`, the backdrop for a scene that has no space. Spaces with their own coordinates, off this map, are listed under "Place ids" above and in `levels.ts`: `jail` (`cityJail`), `helpTent`, `office` (the land office's two floors, `landOffice`, Act 1), `cabin` (`floodCabin`) and `eielson` (the base, [`base-map.md`](base-map.md)).

| Space | Placement: center (x, z), yaw | Floor (y) | Check |
|---|---|---|---|
| `bar` (12 × 10) | (33, 43), 0° | 0.67 | the door spot at local (0, 4.4) lands at (33, 47.4), on the Silver Pan's front wall; local x ±6 spans x 27..39, so the bar's east wall is the building's east wall on the lane |
| `boarding` (16 × 14) | (134, 89), 0° | 1.16 | spans x 126..142, z 82..96, the whole house; the front door at local (0, 7) lands at (134, 96), Owen's door on Third, and the spawn (0, 6.2) at (134, 95.2) just inside it. The ground floor: the hall with the pay phone, the landlady's parlor west of it, the shared bathroom at the back east of the hall, and the stair rising south from local z −0.5 (z 88.5) to the landing over the door. The stair spot (0.4, −0.6) lands at (134.4, 88.4), at the foot of the stair and just south of Owen's room, which is above at the back |
| `room` (6 × 6) | (134, 85), 0° | 4.16 | spans x 131..137, z 82..88, inside the house; its window wall (local z −2.9) is the house's north wall at z 82, over the alley; the desk faces it |
| `camp` | off the map | | |
| `downtown` (250 × 200) | (70, 40), 0° | 0 for now (see below) | the play area itself, x −55..195, z −60..140, in world coordinates: a local coordinate is a map coordinate. Built by `game/src/downtown.ts`; see [In the engine](#in-the-engine-pass-1-gray-box) |
| `line` (250 × 200) | (70, 40), 0° | the grade; water 1.2 | Act 1's flooded town (story place `floodedStreet`), the morning after `flood`: the same pieces and high water, without the walkway's banks, so Wade wades the streets; built by `game/src/searchEli.ts`. See [The search for Eli](#the-search-for-eli-act-1) |
| `flood` (250 × 200) | (70, 40), 0° | street grade 0.87; water 1.2 | `downtown` itself under the August flood: the same pieces in world coordinates, with the high-water layer of `game/src/highwater.ts` over them, and no plane. Its story place is `boardingHouse` (`p_end`, 14 August). Owen comes out of his door onto the porch at the `floodedStreet` spawn; the plank walkway runs along Third's north walk, x 118..154. The skiff (`game/src/skiff.ts`) lies across the street at the steps, its stern at (135.2, 99.4) and the hooded man in the bow at (135.2, 102.4) with his back to the house |

## The prologue route

The bar scene is a July night: the sun is still up at eleven, so "night" is a low gold light, not dark.

| Leg | Path (waypoints) | Length | What the player passes |
|---|---|---|---|
| Night: Silver Pan to boarding house | (33, 47.6) door, (33, 50), east on Second's north walk to (81, 50) at Lacey, south on Lacey to (81, 98), east on Third to (134, 98), (134, 96) door | about 153 m, 2 minutes on foot | the Sluice Box, the Lacey Street Theater's marquee and tower, the Nordale and the Co-op across the street, the Blue Spruce on the far corner |
| Morning: boarding house, post box, float dock | (134, 96), (134, 98.8), west on Third to Cushman's west walk at (−5.5, 98.8), north on Cushman past the post box at the curb (−4.5, 66), on to (−5.5, 3) at First, east on the river walk to (118.5, 3), down the gangway to (118.5, −16) on the float | about 380 m, 4 to 5 minutes | the Federal Building, the N.C., the bridge, the skiff landing, the Polaris, the float shed |
| August: the skiff | waits at (135.2, 100.5) in front of Owen's door on flooded Third (the `flood` space's skiff); leaves west to Lacey, then north toward the river | | the night route's blocks under water; where the ride ends is the story's business, not the map's |

The post box is a street collection box at the curb outside the Federal Building, painted red, white and blue (the
colors of the time; item 30).

## Spawn points

Facing is a unit vector (x, z); (0, −1) faces north. y is grade or floor from [Ground](#ground).

| Id | Position (x, y, z) | Facing | Notes |
|---|---|---|---|
| `silverPan` | (33, 0.67, 46) | (0, −1) | inside the door; the same spot as `bar.spawn` (0, 3.0) |
| `secondAve` | (33, 0.40, 50.5) | (1, 0) | Second's north walk outside the Silver Pan; the night walk starts here |
| `boardingHouse` | (134, 0.87, 98.5) | (0, −1) | Third's north walk, facing the door; the morning walk starts here |
| `owensRoom` | (134, 4.16, 86.2) | (0, −1) | the same spot as `room.spawn` (0, 1.2) |
| `floatDock` | (118.5, −0.30, 1) | (0, −1) | top of the gangway, looking down at the float and the plane |
| `floodedStreet` | (135.4, 0.87, 97.5) | (0, −1) | the `flood` space's spawn (the id is the spawn's, not the story place's), on the porch at Owen's door (the engine turns him to face the street); water 0.33 m deep below it |
| `postBox` | (−6, 0.63, 66) | (1, 0) | Cushman's west walk, facing the box at the curb, (−4.5, 66) |
| `landOffice` | (107, 0.57, 62) | (0, 1) | Second's south walk at Lucy's door |
| `nlCafe` | (12, 0.57, 62) | (0, 1) | Second's south walk at Dottie's door |
| `bridgeSouth` | (0, −0.18, −2) | (0, 1) | on the deck at the south end, looking into town |

## In the engine: pass 1, gray box

`game/src/downtown.ts` builds the `downtown` space from the tables above, in the same meters: a coordinate read off
this map is a coordinate in the scene, and `game/src/downtown.test.ts` checks the spawn table against it row by row.
It is procedural boxes only, no art assets (issue #41, pass 1).

- **Built:** the streets, walks, the Blanchfield lane and the alley; the boardwalks on Noble; one low mass per block
  with the named buildings standing out of it at their rectangles and heights; door slabs at every front door; the
  water, the bank, the skiff landing, the float, the gangway, the plane; the bridge deck and rails; the post box;
  the church, the hospital, the Northward and the N.C.'s stacks as backdrop.
- **Street signs:** a post at every corner where an avenue crosses a street, the two names on two blades, from the
  street tables above (`game/src/streetSigns.ts`); in the `flood` space too. The pocket map and the directions a
  passer-by gives read the same street tables (`game/src/pocketMapCharts.ts`; see
  [`story-api.md`](story-api.md), "Where to go next"). A street name changed here changes all three.
- **People:** the ambient schedule's street people stand on the street (`game/src/townsfolk.ts`) and will tell the
  player the way. The Silver Pan is dressed and seated by `game/src/silverPan.ts`.
- **The post box:** a hold at the box (−4.5, 66) on the morning walk mails Owen's letter to Lucy. Walking past it is
  allowed. At the dock the story's menu offers the one note that matches: `fly` with the letter in the mail, `keep`
  with it still in his jacket (`game/src/floatDock.ts`, #412). The box is blue under a red lid.
- **The flight:** `fly` at the dock plays the plane off the Chena over town and down at the camp
  (`game/src/flight.ts`); interact skips it.
- **Collision:** every building and block is solid, the water is solid except the bridge deck and the float, and the
  play area's edge stops Owen. South of Third only Cushman's lots are play space.
- **Flat for now:** Owen walks at y 0. The grade, the bank's slope, the gangway's drop and the bridge's crown are drawn
  flat; the y values in the spawn table are kept for the pass that adds them.
- **The prologue walks it.** The Silver Pan's door opens onto Second at `secondAve`, and Owen walks the night leg to
  the boarding house door, which leads up to his room. After the letter he sleeps (the screen fades, a date card for the morning), comes out at `boardingHouse` and walks the
  morning leg to the float, where the dock's menu opens. The waypoints are the route table's, moved off the walls by
  Owen's width.
- **Doors:** a door opens when the story is at the place behind it (the Silver Pan, Owen's room, the float). The land
  office's street door is locked on the downtown walk and says so; its two floors are the `office` space, played from
  Act 1.
- **Not yet:** the navmesh for NPCs, natural out-of-bounds edges (today the play area's edge is a plain stop), the
  Silver Pan's side door, preloading interiors near their doors, LODs, and the skyline shell.

## The flood (August 1967)

The Chena came over its banks on August 14 and crested at Fairbanks on August 15. In the flood variant, water is
**one flat plane at y = 1.2** over the ground in [Ground](#ground). The grades were chosen so that the measured marks
hold at their buildings (item 34):

| Mark | Its building | Measured | On the map |
|---|---|---|---|
| "about five feet" near the river (USGS hydrologist, 2017) | the bank crest at the bridge | 1.5 m | 1.50 m at z 0..2 |
| Co-op Plaza, 2nd Avenue (Waymarking; not one of the NWS tour's official signs) | Co-op wall, z 64 | about 2 ft (0.6 m) | 0.60 m |
| Old post office, Cushman (NWS tour #8) | Federal Building door, z 80 | about 15 in (0.38 m) | 0.38 m |
| City Hall, 800 Cushman (NWS tour #11) | about Eighth Avenue, off the map (z 170) | about 6 in (0.15 m) | 0.15 m |
| Cushman a "waterway", canoes and motorboats in 3 to 4 ft (ADN) | Cushman, First to Second | 0.9 to 1.2 m | 1.40 to 0.72 m: shallower than the report from about the middle of row A south (the report likely describes the blocks nearest the river) |

Depth over grade by band (center):

| Band | z | Grade y | Depth |
|---|---|---|---|
| Bank crest | 0..2 | −0.30 | 1.50 m |
| First Avenue | 9 | −0.20 | 1.40 m |
| Row A (First to Second) | 32 | 0.13 | 1.06 m |
| Second Avenue | 56 | 0.48 | 0.72 m |
| Row B, Second's south frontage | 64 | 0.60 | 0.60 m |
| Row B, middle | 80 | 0.82 | 0.38 m |
| Third Avenue | 103 | 0.88 | 0.32 m |
| Row C | 117 | 0.91 | 0.29 m |
| Fourth Avenue | 129 | 0.95 | 0.25 m |
| Row D | 137 | 0.97 | 0.23 m |
| Fifth Avenue | 145 | 0.99 | 0.21 m |

Inside, with floors 0.3 m above grade, the water is 0.3 m shallower than in the street outside:

| Building | Floor y | Water inside |
|---|---|---|
| The N.C. | 0.20 | 1.00 m |
| Quonset float shed | 0.23 | 0.97 m |
| Polaris lobby | 0.32 | 0.88 m |
| The Silver Pan, the Ptarmigan, the Sluice Box, the Blue Spruce, the Lacey Street Theater | 0.67 | 0.53 m |
| Nordale, Co-op, Northern Lights Café, land office | 0.90 | 0.30 m |
| Federal Building | 1.12 | 0.08 m (at the sill) |
| Boarding house, ground floor | 1.16 | 0.04 m (at the sill); Owen's room is dry |

What changes on these blocks:

- The river is over the bank and First Avenue is part of it. The bank, the skiff landing and the float shed's floor
  are under 1 to 1.5 m of brown, moving water. The float dock rides up on its pilings; the plane is gone.
- The bar row stands in water to the knee or thigh. Doors are open or sandbagged; boards, trash and fuel drums drift.
  People pole and motor skiffs up the streets.
- At Owen's door on Third the water is a shin-deep 0.33 m: enough to float a flat-bottomed skiff, poled, with the
  motor tilted up.
- **Engine note:** the engine's ground is flat (pass 1), so `game/src/highwater.ts` draws one water sheet at the
  depth at Owen's door, 0.33 m, over the whole town, up to the house walls; depth elsewhere shows in what is sunk in
  it. Owen walks on the porch and a plank walkway above it. Inside the boarding house the engine draws the ground
  floor knee-deep (0.45 m) with furniture afloat, as issue #50 asks, though the floor table above gives 0.04 m at
  the sill: an open question for this doc.
- The bridge is an island: both approaches are under water, and the crown stands just clear.
- Across the river, St. Joseph's is being evacuated and the church stands in water. The displaced patients and the nurses who stayed work from a help tent on high ground south of town (`helpTent`; fact-checks item 42). Owen's body is taken there.

### The search for Eli (Act 1)

The trail of `docs/acts/act1-missions.md`, section 1, on the `line` space. Each stop is where that scene's menu opens;
who stands there comes from the scene (`game/src/searchEli.ts`), and the walks between them are `LEGS` in
`game/src/trail.ts`. Depth is the table above: wading slows Wade above the knee (0.5 m), most at the waist (1 m).

| Stop | Scene | Where | Depth |
|---|---|---|---|
| The sandbag line | `a1_flood`, `a1_line` | across Cushman just south of Second, z 64.8, from the Federal Building's wall (x −7) to a gap at the east curb (x 5..7); Wade at (3.4, 66.3), the sergeant behind it at (−2.6, 68.6) | 0.59 m, thigh |
| The man with the mattress | `a1_track` | Cushman's east walk at the Ptarmigan's corner, (6.2, 46.4), north across Second | 0.86 m |
| The coffee window | `a1_track_2` | upstairs on Second's south side toward Lacey, (68, 64); Wade below it at (68, 62.2) | 0.63 m |
| The couple's porch | `a1_couple` | Cushman's east side just short of Third, (6.3, 93.5) | 0.35 m |
| The riverboat at Third | `a1_eli` | the corner of Cushman and Third, (−1.6, 104) | 0.32 m |
| The way up to the help tent | `a1_errand` | the south end of Cushman, (3.5, 139.2): Wade goes up to `helpTent` here and comes back down here | 0.23 m |
| The boy bailing a skiff | `a1_trail` | Third, east of the corner, (10.5, 104.5) | 0.32 m |
| The riverboat on Fifth | `a1_trail` | Cushman at Fifth, (−1.8, 137), under the family on the roof | 0.23 m |

`a1_delivered` opens where Wade caught up with Eli: at Third without the errand, on Fifth with it.

## Building types

What a local would expect on these blocks (item 33):

- **Frame false-fronts:** one or two storeys, clapboard or board-and-batten, with a square front hiding a gable roof.
  Most of the bars and small shops, the Silver Pan included.
- **Concrete and brick, two to three storeys:** the Co-op (1927), the Lacey Street Theater (1939), the Federal
  Building (1933), the N.C.
- **The 1952 high-rises:** the Polaris and the Northward, plain concrete slabs that dwarf everything else.
- **Quonset huts:** postwar surplus, used as sheds, garages and warehouses on back lots and near the river.
- **Log cabins:** a few survive at the edges of downtown. The Gould cabin on Dunkel Street, from about 1910, is real.
  For us, one in the backdrop east of Noble.

**Surfaces:** the main avenues and Cushman are paved, with concrete walks. Noble, the lane and the alley are gravel,
with a few board walks left on the older frame blocks. July is dust, from the gravel streets, the trucks and the
summer's construction. August is mud.

## Who is in town in July

The crowd should be honest about who was downtown, and ordinary. All of this is for consultant review (item 36).

- **Village families on ordinary business:** in on the river or by air to buy supplies at the N.C. and the Co-op, to
  see a doctor, or to visit relatives in St. Joseph's.
- **People working:** riverboat and barge crews at the landing (Eli is one of them), summer firefighting crews from
  the villages passing through town, people with jobs in town.
- **Golden Days:** the town's July festival. The games that began in 1961 as the World Eskimo Olympics were held on
  the Chena's bank downtown. Optional dressing for the riverbank, not canon (item 37).
- **Fairbanks people:** Lower Tanana families who live in town, airmen and soldiers on pass, miners, construction
  crews, and tourists in for the Centennial.

Do not use Second Avenue's drinking as the setting for Native extras. Do not use the period slur that village crews
set fires to get work; it appears in a 1969 magazine piece (item 36).

## Scale and compression

- **Kept:** the order of streets and landmarks, which side of the street each one is on (where known), what you can
  see from where, and the walk times that matter: bar to bed in about two minutes, bed to dock in about five.
- **Compressed:** blocks are about half their real depth north to south. Cushman from Third to Fifth is squeezed
  hardest, because it is a vista, not a play space. The river is narrowed to 50 m of water and straightened.
- **Dropped:** everything west of the N.C. and the Federal Building, the streets east of Noble, Garden Island, and
  the railroad north of the river.
- **Estimates to replace:** real block sizes and the river's width were not measured for this pass. The USGS flood
  map (Hydrologic Atlas 294, 1:24,000) or a period Sanborn map would settle both.

## What's real, what's ours

**Real** (checked; item numbers refer to [`fact-checks.md`](fact-checks.md)):

- **Streets:** the Chena River; its south-bank First Avenue (once Front Street); Second Avenue's bar row; Third,
  Fourth and Fifth Avenues; Cushman, Lacey, Noble and Barnette Streets; and the Blanchfield lane (19, 21).
- **The bridge:** the late-1950s Cushman Street bridge (20).
- **Buildings:** the Nordale Hotel, the Lacey Street Theater, the Co-op Drug building, the Northern Commercial
  Company, the Polaris and Northward buildings, and the Federal Building and post office (22, 24, 25, 28, 29, 30).
- **Across the river:** Immaculate Conception church and St. Joseph's Hospital (26, 27).
- **What isn't there:** the Pioneer Hotel, which burned in 1952 (23).
- **Events and places:** the flood's dates and the depths at the marks (34); the Centennial Exposition, off the map
  (31); Golden Days and the games (37).

**Ours** (invented, kept plausible):

- **Bars:** the Silver Pan, the Ptarmigan, the Sluice Box and the Blue Spruce Lounge, and their lots.
- **Owen and Lucy:** Owen's boarding house and room, and the land office, a two-story building on Second.
- **On the river:** the float dock's spot, the quonset float shed, and Curly's plane. Floatplanes did use the Chena
  at Fairbanks, but a 1967 dock downtown is not documented (35).
- **Lots:** the Northern Lights Café's corner (the café is design canon; its lot is ours) and the Pioneer lot's spot.
- **Sides of the street:** for the Lacey Street Theater, the Co-op and the Federal Building, these follow the
  address numbers (19), not a map.
- **The ground and the flood:** the grade between the marks, the floor heights, the bank and the bridge profile
  (34).

## Open questions

- The help tent's exact spot and rectangle (`helpTent`): place-id ticket #89. It is off the map; the Act 1 medicine errand walks there and back.
- Confirm the street order (Lacey and Noble east of Cushman, Barnette west) against a period map. It rests on
  address numbers (item 19).
- The N.C.'s block is "between Cushman and Turner", but Barnette is the first street west of Cushman here. Either
  the N.C. ran Cushman to Barnette and "Turner" is loose; or Turner, not Barnette, is the first street west; or the
  N.C.'s holdings spanned two blocks across Barnette (item 19).
- Was the Lacey Street Theater open again by July 1967 after the 1966 fire (item 24)?
- Where exactly did floatplanes tie up on the Chena in 1967, and who ran them (item 35)?
- Was the BLM's Fairbanks land office in the Federal Building (item 30)?
- Did the 1967 games during Golden Days still run on the riverbank downtown, and under which name (item 37)?
- How high above the Cushman Street bridge's deck did the 1967 flood stand? The Fairbanks Daily News-Miner's flood
  photos, or the National Weather Service's high-water-mark walking tour, would settle this and the floor heights.
