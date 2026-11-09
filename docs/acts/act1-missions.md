# Act 1 mission specs

How Act 1's three playable missions play in the engine build, and the one note each sends the story
([`story-api.md`](../story-api.md), Rules 1 to 4). Issue #94. Who is present, the spaces and the transitions are in
the beat sheet, [`act1.md`](act1.md); the scene text is in
[`text-game/src/scenes/act1.ts`](../../text-game/src/scenes/act1.ts). Where this file and
[`design.md`](../../design.md) disagree, the design wins.

**Status: draft.** The owner approves the specs in review.

**Ground rules for all three.**

- **One note, sent at the end.** The steps inside a mission never reach the story. The engine sends the note when
  the mission ends, and the story applies the matching choices from the scene file in order. The single-option
  beats along the way (`lacey`, `drink`, `liftBody` and the rest) are places the player reaches, not menus.
- **Retry is silent.** A fail puts Wade back at the last checkpoint with what he was carrying then. The story never
  hears about it (Rule 4), and nothing a retry undoes is counted.
- **Deliberate choices are prompts.** A choice that moves trust (go or stay, point out or cut, sit or stand) is an
  explicit two-way prompt with no timer. It is never read off where the player happened to walk or what they did by
  accident (Rule 3).
- **Skill shades only existing counters,** `heat` and `eliTrust`, by at most one point per mission, and only where
  a spec below says so. No ending gate reads `eliTrust`; heat's best-ending limit (3) is the only gate skill can
  touch, and the barfight's skill heat replaces the bottle's point instead of adding to it.

## 1. The search for Eli

`a1_track` to `a1_line`, on the go path only. The stay path has no mission: the bags keep coming and it fades to
evening (`a1_body`).

- **Way in.** At `a1_flood`, after the woman from Minto has spoken, the prompt is *Go find Eli* or *Stay on the
  line* (`findEli`, `stayOnLine`). That prompt is a conversation choice, not part of the note.
- **Objective.** Find Eli and give him the message, then get back to the line. The `goal` line says only that much.
  There is no marker on the map: each townsperson points ("toward Lacey", "up Cushman, toward Third") and the player
  walks where they point.
- **Verbs.** *Wade*: speed falls with depth, slowest past the knee. *Ask*: talk to whoever is next on the trail.
  *Lend a hand*: the one context action at each stop: take the mattress's end, catch the cup on its string, take the
  slip, hand over the envelope. Each of those stops is required, because the next person only points once Wade has
  helped.
- **The errand.** On the porch the old woman holds the slip out and doesn't ask. *Take the slip* changes the goal to
  the help tent. Walking past her toward Third is the skip; it needs no prompt, because skipping costs nothing the
  story counts. Once Wade has the slip, the corner of Third stands empty until the envelope is back on the porch: the
  boat has gone, and the boy with the coffee can isn't there yet to say where. The world pays the hour, not a timer.
- **Fail and retry.** The only fail is the river. North of Second the water runs past a meter and moving (row A,
  First Avenue, the bank; see the depth table in [`town-map.md`](../town-map.md)). If Wade wades in past his waist
  there, the current takes his feet: a fade, then the last checkpoint. There is no time limit and no way to be seen.
- **Checkpoints.** Stepping off the line; the mattress set on the porch roof; the porch (before the slip); the help
  tent (with the slip handed over and the envelope in his hand); finding the boat (`a1_eli` or Fifth).
- **The note.**

  > Search for Eli. Errand: ran it / skipped it

  *Ran it* applies `helpTent`, `envelope` (+1 Joan), `waitBaby` (+1 Eli trust), `wadeBack`, `passBags`.
  *Skipped it* applies `sendSomebody`, `tellEli` (+1 Eli trust), `wadeBack`, `passBags`. Both are existing choices;
  no new state. The menu is `searchForEli` in [`missions.ts`](../../text-game/src/missions.ts), notes `ranIt`
  and `skippedIt`; it applies `passBags` too, so the story lands on `a1_body`.
- **What shades heat or trust.** Nothing about how it is played. The trust point comes from going, and Joan's from
  the errand (owner, #230). The sergeant's chewing-out at `a1_line` is color: no heat.

## 2. The body

From the cut to the boat in `a1_body` until Owen is lying in the boat. Both paths play it; on the go path Eli
asked for Wade by name, on the stay path the sergeant lent him out (the scene text reads `eliTrust`).

- **Objective.** Find out what the pole hit; then get Owen into the boat.
- **Verbs.** *Ride*: Eli poles; the player can look around and shift his weight, nothing more. *Lean and look*:
  when the pole knocks something soft, Wade leans over the gunwale. Looking at the knot is required, because both
  paths add the `knot` evidence: the camera goes close on the yellow line, a bowline with the tail outside the loop,
  and the notebook gets its line. *Point*: show Eli. *Cut*: two cuts, a hand's width either side of the knot, then
  pocket it. *Lift*: Owen into the boat with Eli, both pulling together, the weight of a wet man. Wade can't do it
  alone.
- **The choice.** Once Wade has looked, the prompt is *Show Eli* or *Cut it and say nothing* (`pointOutKnot`,
  `cutKnot`). *Show Eli* plays `a1_knot`: Eli looks a long time, says "Don't untie that, Texas," and Wade makes the
  same two cuts. Both paths end with the lift.
- **Fail and retry.** The knot can't be lost: the knife only offers the two safe cuts, because the story always
  grants the evidence. The one fail is leaning too far out: the boat rocks and Wade goes in, then a fade back to the
  checkpoint in the boat.
- **Checkpoints.** On the water, before the knock; at the knot, after the look (so the prompt is offered again).
- **The note.**

  > The body. Knot: pointed it out / cut it silently

  *Pointed it out* applies `pointOutKnot` (the knot, +1 Eli trust) and `liftBody`. *Cut it silently* applies
  `cutKnot` (the knot). Both existing; no new state. The menu is `theBody` in
  [`missions.ts`](../../text-game/src/missions.ts), notes `pointedItOut` and `cutItSilently`; both land on
  `a1_ruling`.
- **What shades heat or trust.** Only the choice. Nothing about how it is played.
- **Out.** A fade to the help tent at night (`a1_ruling`, a conversation). The engine offers no "show Barnette"
  prompt there.

## 3. The barfight

From the drunk's shove at `a1_barfight` until the law bursts in. Short and environmental, per the owner's decision
on #94: 60 to 90 seconds, a few verbs, no combo system, no game-over.

- **Objective.** Stand with Eli. The fight can't be won and doesn't need to be: it ends when the law comes through
  the door, however it is going.
- **Opening.** The drunk shoves Eli. Eli doesn't move. The prompt is *Get up* or *Stay in your seat* (the
  `stayInSeat` choice, -1 Eli trust). If Wade stays, Eli takes the first punch alone. A few seconds later Curly comes
  off his stool yelling "Texas!" and drags Wade in by the collar (`a1_tank_sat`). The fight then plays the same way.
- **The clock.** It starts at the shove. At about 65 seconds headlights sweep the front window and a siren winds
  down outside. At about 75 seconds the officer (placeholder Tom Peter) comes through the door and the fight stops.
  Same timing on both paths.
- **Verbs.**
  - *Shove*: push a man away. Into something, it is the room's move.
  - *Grab*: a man by the collar, or a thing: the rack, a bottle.
  - *Use the room*: shove a man into the hot stove and he yelps, his coat smoking, and is out of it for a while. Pull
    the moose rack off the wall: it is heavy, wide and slow, good for pinning a man to the wall or keeping two back,
    useless for swinging. Break a bottle on the bar: the men near Wade back off and the noise drops around him.
  - *Get up*: Wade gets knocked down; getting up takes a moment. Getting knocked down costs time, nothing else.
- **The mud floor.** The water is gone and the mud stayed. A shoved man slides further than he should. Wade running
  across it can slip and go down.
- **Who fights.** The drunk and two friends; Curly on Wade's side, loud; Hank behind the bar. Eli fights his own
  fight, mostly with the drunk's friend: he defends himself and doesn't throw the first punch. The rest of the bar
  taking sides within budget is #177's.
- **Fail and retry.** No fail and no game-over. One checkpoint at the shove, so the pause menu can restart the fight;
  the note is only sent when the officer comes in.
- **The note.**

  > The barfight. Opened: got up / stayed seated. Move: shove / rack / bottle. Stood with Eli: yes / no.
  > Caught: clean / red-handed

  - **Opened.** *Got up* applies the move's choice. *Stayed seated* applies `stayInSeat` then the move's choice.
  - **Move.** *Bottle* if Wade broke a bottle at any point; otherwise the first room move that landed (*shove* for the
    stove, *rack*); otherwise *shove*, since bare hands are shoving. It maps to `shove`, `mooseRack` and `bottle`.
    The field that makes it carry state is #205's (the bottle adds heat, or Hank remembers it later).
  - **Stood with Eli.** *Yes* if Wade spent at least half the fight within arm's reach of Eli, so nobody got Eli two
    on one. Hank's second rule, done instead of said.
  - **Caught.** *Red-handed* if Wade is holding the rack or a bottle, or is mid-shove, when the officer comes through
    the door. The headlights are the warning; a player who drops what he's holding is *clean*.
- **What shades heat or trust (Rule 3).**

  | Detail | Effect |
  | --- | --- |
  | Stayed seated | -1 Eli trust (existing choice) |
  | Stood with Eli: yes | +1 Eli trust |
  | Bottle, or caught red-handed | +1 heat, once: both together are still +1 |

  So the fight adds at most 1 heat, as the bottle does today, and Eli trust moves from -1 to +1. The cell
  (`a1_tank`, decision 1) stays a conversation: it is deliberate, and it is where the big trust and heat moves are.
- **New state.** None: *Stood with Eli* and *Caught* shade existing counters. The menu is `theBarfight` in
  [`missions.ts`](../../text-game/src/missions.ts): every combination of the four details is a note, written
  `opened.move.stood.caught` (for example `gotUp.rack.stoodWithEli.redHanded`), and all of them land on `a1_tank`.
  In the text build both openings lead to the same moves (`a1_tank_sat` offers them after Curly drags Wade in); a
  shove or the rack goes on to `a1_headlights` (`clean`, or `redHanded` for +1 heat), and a bottle skips it, since
  its point of heat is the shared one; then `a1_whistle` asks where Wade stood (`stoodWithEli` +1 Eli trust, or
  `leftEli`). So the text build offers one option per distinct effect, and the bottle's two caught notes, and shove
  against rack, land on the same state until the move carries state (#205).
- **Out.** The officer's whistle; a cutscene to the car (Curly's twenty) and the cell (`a1_tank`).

## Follow-ups

Already filed, and blocked on this spec: #151 (the search for Eli as a menu; its body still names the old sandbag line
vs riverboat choice), #152 (the body), #153 (the barfight, with the two new details above), #205 (the barfight move
field), #175 (the combat core).
