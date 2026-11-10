# Act 1 beat sheet for the engine

What each Act 1 scene in [`text-game/src/scenes/act1.ts`](../../text-game/src/scenes/act1.ts) needs from the engine
build, beyond what its fields already say. Place and clock live in the scene file; this sheet does not copy them.
Where this sheet and [`design.md`](../../design.md) disagree, the design wins. Issue #93; the mission specs (verbs,
checkpoints, retry, each note's details) are #94's, in [`act1-missions.md`](act1-missions.md).

**Status: draft.** The owner approves the forms in review.

**Forms.** *Walk*: free movement to a goal, no fail state. *Conversation*: the story's choices as dialogue, the player
standing. *Mission*: a playable stretch with a goal and checkpoints that ends in one note (Rule 1 in
[`story-api.md`](../story-api.md)). *Set piece*: a short scripted action stretch. *Cutscene*: the camera takes over.
*Letter*: the letters-home screen (design, "Letters home").

**Spaces.** Every space below is one of the `Place` ids in [`town-map.md`](../town-map.md). Spots inside
`floodedStreet` use the town map's coordinates and the flood tables (water one flat plane at y 1.2). Engine spaces
today (`game/src/levels.ts`): the prologue's `bar`, `boarding`, `room`, `camp`, `flood` and `downtown`, Act 1's
`line` (`floodedStreet`), `helpTent`, `cabin` (`floodCabin`), `office` (`landOffice`) and `jail` (`cityJail`), Act 2's
`eielson` and the `story` backdrop. The `flood` space is a 20 × 16 m piece of Third at Owen's door; Act 1 builds on
it and extends the flooded downtown as needed (owner decision on #93). The "Engine space" column below is the plan;
where it says "new", the space above is the one that was built. The barfight (`silverPan`) has no Act 1 space: `bar`
belongs to the prologue, so `a1_barfight` and `a1_tank_sat` play as menus, and there is no space for `a1_ashby` or
`a1_letter` either.

## At a glance

| Scene | Form | Space (place id) | Engine space |
|---|---|---|---|
| `a1_flood` | set piece, then choice | `floodedStreet`: the sandbag line on Cushman | new: flooded downtown, extended from `flood` |
| `a1_track` | mission: the search for Eli | `floodedStreet`: north of the line, toward Lacey | flooded downtown |
| `a1_track_2` | mission | `floodedStreet`: Second Avenue | flooded downtown |
| `a1_couple` | mission, choice | `floodedStreet`: a porch just short of Third | flooded downtown |
| `a1_eli` | mission | `floodedStreet`: the corner of Third | flooded downtown |
| `a1_errand` | mission (optional leg) | `helpTent` | new: the help tent, off the map |
| `a1_trail` | mission | `floodedStreet`: the porch, Third, then Fifth | flooded downtown, reaching Fifth |
| `a1_delivered` | conversation | `floodedStreet`: wherever Eli was found | flooded downtown |
| `a1_line` | walk, then cutscene | `floodedStreet`: back to the line | flooded downtown |
| `a1_body` | set piece, then choice | `floodCabin` | new: the cabin in the water, off the map |
| `a1_knot` | conversation, then set piece | `floodCabin` | same |
| `a1_ruling` | conversation, choice | `helpTent` | the help tent, at night |
| `a1_joan_ask` | conversation | `helpTent` | same |
| `a1_joan_laugh` | conversation | `helpTent` | same |
| `a1_lucy` | walk, then conversation, choice | `landOffice` | new: two-story interior with a staircase |
| `a1_barfight` | conversation, then mission: the barfight | `silverPan` | reuse `bar`, muddied for August |
| `a1_tank_sat` | cutscene inside the barfight | `silverPan` | `bar` |
| `a1_tank` | cutscene, then conversation, choice | `cityJail` | new: a cell, off the map |
| `a1_ashby` | conversation | `cityJail` | new: the front desk, off the map |
| `a1_letter` | letter | `eielsonBarracks` | none: a still behind the letter screen |

The **search for Eli** is one mission (owner decision on #93): `a1_track` to `a1_line` on the go path, with the help
tent errand as its optional leg. Its one real choice is the errand at `a1_couple`; the single-option notes along the
trail are beats the player reaches, not menus. Nothing is locked out: the stay path skips it and still reaches every
ending.

## Scenes

### `a1_flood`: Drowned Town

- **Present.** Wade on a sandbag line across Cushman, thigh-deep; airmen passing bags; the sergeant counting heads
  every quarter hour. The woman from Minto in a man's rain slicker, coming down the line looking at faces.
- **Hands.** Catch and pass sandbags in the line's rhythm. The woman stops at Wade and talks; the choice comes while
  the sergeant is looking the other way.
- **In.** Act card and point-of-view change from Owen (`p_end`, the skiff on the night of the 14th) to Wade.
- **Out.** *Go*: Wade steps off the end of the line and wades north, into `a1_track` with no cut. *Stay*: the bags
  keep coming; fade to evening, `a1_body`.

### `a1_track`: Which Way He Went

- **Present.** A man in hip waders carrying a mattress over his head out of a rooming house.
- **Hands.** Wade through knee-to-thigh water; ask; take the mattress's end and help get it onto a porch roof.
- **In.** Continuous from the line. **Out.** Walk on toward Lacey; the next voice is on Second.

### `a1_track_2`: Coffee on Second

- **Present.** A woman at an upstairs window on Second, lowering paper cups of coffee on a string.
- **Hands.** Catch the cup on its string; drink.
- **In.** Walk. **Out.** Walk on toward Third.

### `a1_couple`: The Porch on Third

- **Present.** An old couple on the top step of a porch just short of Third: him with a cane across his knees, her
  folding and unfolding a prescription slip. She holds it out and doesn't ask.
- **Hands.** Take the slip, or don't. That is the mission's choice: the errand trades time for Joan; Eli's trust comes
  from going, not from this.
- **In.** Walk. **Out.** *Errand*: walk south out of the flood toward the help tent (`a1_errand`). *Skip*: walk on to
  the corner of Third (`a1_eli`).

### `a1_eli`: The Riverboat

- **Present.** Eli at the tiller of his flat-bottomed freighter, a kicker on the back, low in the water with
  somebody's furniture; he's shoving a dresser off the bow.
- **Hands.** Wade up and catch the gunwale.
- **In.** Walk; the boat is idling, so it waits. **Out.** Straight into `a1_delivered`.

### `a1_errand`: The Help Tent

- **Present.** Three army tents and a line of cots where the water stops; St. Joseph's patients and nurses. Joan,
  sleeves rolled to the elbow, at a crate of bottles from the hospital pharmacy.
- **Hands.** Hand her the slip; take the envelope.
- **In.** Walk south past Fifth, out of the water, to the edge of the map; a fade into the help tent space (it is off
  the map). **Out.** Fade back to the map's south edge and walk down to the porch (`a1_trail`).

### `a1_trail`: A Block or Two South

- **Present.** The old couple; his wife reads Joan's block letters to him. On Third, a boy bailing a skiff with a
  coffee can. On Fifth, a family on a roof waving a sheet, and Eli below handing a baby into the boat.
- **Hands.** Give the envelope. Ask the boy. Follow the sheet; wait while the baby goes down.
- **In.** From the help tent fade. **Out.** Into `a1_delivered`.

### `a1_delivered`: The Message

- **Present.** Wade and Eli at the boat. Eli tips the last of the furniture onto a porch and turns the bow into the
  current while Wade is still talking.
- **Hands.** None: Wade talks, Eli acts. The point is that Eli doesn't need telling twice.
- **In.** From either finding scene. **Out.** The boat leaves; Wade walks back to Cushman (`a1_line`).

### `a1_line`: The Sergeant

- **Present.** The sergeant, speech ready. The woman from Minto is gone from the line.
- **Hands.** Walk back; take the chewing-out standing; join the heaviest end of the line. Color only, no heat.
- **In.** Walk. **Out.** Fade over the afternoon of bags to evening (`a1_body`). The search mission ends here.

### `a1_body`: The Cabin

- **Present.** Eli, poling the riverboat; Wade in the boat. Owen, held under by a yellow braided line tied to a
  drowned sawhorse near a half-sunk cabin.
- **Hands.** Ride; the pole knocks something soft. Lean over and look at the knot (the backward bowline, tail outside
  the loop). Then the choice: point it out, or cut it.
- **In.** *Go path*: Eli ties up at the end of the sandbag line and asks the sergeant for Wade by name. *Stay path*:
  the sergeant lends Wade out to the boatman. Both start at the line and cut to the boat on the water.
- **Out.** *Point out*: `a1_knot`. *Cut*: Wade cuts the line on both sides of the knot and pockets it; then the lift,
  and fade to the help tent (`a1_ruling`).

### `a1_knot`: Eli Looks

- **Present.** Eli, looking at the knot for a long time.
- **Hands.** Cut a hand's width above and below the knot so it stays tied; pocket it. Lift Owen into the boat with Eli.
- **In.** Continuous. **Out.** Fade to the help tent at night (`a1_ruling`).

Both paths cut the knot and lift the body. The lift is Wade's and Eli's together, the heavy wet weight of a man; it
belongs to both branches, though only this one names it as a choice.

The body mission ends with the fade: the engine sends one note, *pointed it out* or *cut it silently*
([`act1-missions.md`](act1-missions.md), section 2).

### `a1_ruling`: An Accident

- **Present.** Owen on a cot at the back of the help tent under a tarp. Barnette, with six drownings and a town
  underwater, lifts the tarp, looks for about a minute, signs. Joan stays at the tarp after he's gone.
- **Hands.** Carry Owen in with Eli. Stand by while Barnette looks. The knot stays in Wade's pocket; the engine should
  not offer a "show Barnette" prompt, since the scene has none.
- **In.** Fade from the boat. On the errand path Joan knows Wade ("You again"); otherwise this is the first meeting.
- **Out.** Ask her, or make her laugh (`a1_joan_ask`, `a1_joan_laugh`).

### `a1_joan_ask` and `a1_joan_laugh`: Joan

- **Present.** Joan. *Ask*: she lowers her voice at the cot. *Laugh*: she catches Wade's sleeve as he leaves.
- **Hands.** Listen. On the laugh path, the sleeve catch stops Wade mid-walk to the tent flap.
- **In.** Continuous. **Out.** Date card, next morning, Wade and Eli on Second (`a1_lucy`).

### `a1_lucy`: The Land Office

- **Present.** Eli, bringing Wade. Lucy, hauling wet ledgers up the staircase between the two floors. The ground
  floor has 0.30 m of water inside (the town map's flood table); upstairs is dry.
- **Hands.** Walk in behind Eli, through the water, to the foot of the stairs. Light a cigarette; Lucy takes it out of
  Wade's mouth and drops it in a puddle. Then the conversation and the offer.
- **In.** Date card (Aug 16), then a short walk on Second to Lucy's door (the `landOffice` spawn). **Out.** Date card to
  Saturday night (`a1_barfight`).

### `a1_barfight`: Saturday at the Silver Pan

- **Present.** Packed bar, the water gone and the mud left. Curly at the bar, Jake folded into a booth, Eli with a
  soda, Hank behind the bar. The drunk.
- **Hands.** Sit; take the beer; Hank's speech (the in-world tutorial for heat, Dottie and how talk travels). Then the
  drunk shoves Eli and the barfight mission starts: the mud floor, the hot stove, the moose rack, the bottles. Its
  form (60-90 seconds, shove, grab, use the room, no combo system, ends when the law bursts in, no game-over) is the
  owner's #94 decision.
- **In.** Walk in from Second through the front door. **Out.** *Fight*: the law bursts in; cutscene to the cell
  (`a1_tank`). *Sit*: `a1_tank_sat`.

### `a1_tank_sat`: Not Your Fight

- **Present.** Eli, taking the first punch alone. Curly, coming off his stool yelling "Texas!".
- **Hands.** None until Curly drags Wade in by the collar; then the fight plays as above.
- **In.** Wade stays seated. **Out.** Into the fight, then the cell.

### `a1_tank`: The Drunk Tank

- **Present.** The officer (placeholder Tom Peter) hauling Wade, Eli and Curly to the car; Curly's folded twenty,
  tucked back into his shirt pocket. In the morning, Barnette at the cell.
- **Hands.** The car ride is a cutscene: the twenty is something the player sees, not does. In the cell, Barnette's
  question is decision 1.
- **In.** Cutscene from the bar; date card to morning. **Out.** Cut to the front desk (`a1_ashby`).

### `a1_ashby`: A Friend in Town

- **Present.** Barnette at the desk; Ashby in a good coat, talking him down until the charge sheet is torn up. Eli
  stays in the cell on the blame path; Curly claps Wade on the back on the side-with-Curly path.
- **Hands.** Take Ashby's card. Thank him.
- **In.** Cut. **Out.** Fade; the drive back to base is not shown (`a1_letter`).

### `a1_letter`: Letter Home

- **Present.** Wade alone on his bunk.
- **Hands.** The letter screen: choose what to tell Mama.
- **In.** Fade to the barracks still. **Out.** Act card to Act 2 (`a2_major`, September).

## Gaps

Named, not filled. Each needs an owner call or the place-id ticket (#89).

- **The sandbag line's spot.** The scene says "across Cushman Street, thigh-deep". On the town map thigh-deep (about
  0.7 m) is Cushman at Second (0.72 m); south of there it is shin-deep. The trail then goes north toward Lacey, along
  Second, and up to Third without passing back through the line.
- **Water on the trail's south end.** The town map's single water plane makes Third 0.32 m and Fifth 0.21 m deep. A
  loaded freighter idling at Third, and a family on a roof on Fifth, need more water than that. Either the depths
  there are a plausible-not-archival allowance, or the trail's last block moves. "A block or two south" is the
  design's own line, so this is the owner's call, with a fact-check entry if kept.
- **Fifth Avenue is "seen, not reached".** `a1_trail` ends there and `a1_errand` walks past it to the help tent. The
  walkable footprint needs to reach Fifth, at least along Cushman.
- **`helpTent` coordinates.** Off the map, south past Fifth; spot and rectangle are #89's. It is used twice, by day
  (the errand) and at night (the body), so it needs both lights.
- **`floodCabin`.** Off the map with no spot. The town map's building types put one log cabin in the backdrop east of
  Noble; whether the engine uses that or its own off-map space is open.
- **`cityJail`.** Off the map, no interior. Act 1 needs a cell and a front desk; the scenes never walk to or from it.
- **The car ride** from the Silver Pan to the jail has no place id; it is a cutscene, so it may not need one.
- **The riverboat** is a new vehicle the prologue doesn't have (its skiff is smaller). Owen's skiff in the `flood`
  space is the nearest model to start from.
- **Issue #93's decision line** says the sergeant sends Wade with the message. The design and the scene have the woman
  from Minto ask Wade, and the sergeant not know. This sheet follows the design.
