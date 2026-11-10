# Act 4 mission specs

How Act 4's two climaxes play in the engine build, the note each sends the story
([`story-api.md`](../story-api.md), Rules 1 to 5), and how the testimony reflects what Wade secured. Epic #5. The
scene text is in [`text-game/src/scenes/act4.ts`](../../text-game/src/scenes/act4.ts) and the gates in
[`logic.ts`](../../text-game/src/logic.ts); the menus will be in [`missions.ts`](../../text-game/src/missions.ts) once
each spec is approved and implemented. Where this file and [`design.md`](../../design.md) disagree, the design wins.

**Status: Proposed.** Nothing here is decided. The sections below implement canon where the design already speaks;
everything the design does not yet say is collected under [Proposed (not canon)](#proposed-not-canon), numbered P1 to
P6, and each mission section points at the proposals it leans on. If the owner rejects a proposal, its section falls
back to the canon line it names.

**Ground rules for both.** The ones in [`act1-missions.md`](act1-missions.md), [`act2-missions.md`](act2-missions.md)
and [`act3-missions.md`](act3-missions.md) hold, plus:

- **The moral route decides; playing shades.** Which version of each climax exists is fixed by decisions 4, 5 and 6
  before the mission starts (`honestWithFriends`, `offer`). How the player plays decides how it goes, and at most a
  detail inside a tier, never the tier itself (Rule 3; the design's Act 4 line: "Choices shape how it goes, not
  whether it works; the moral route already decided that"). No ending gate reads anything the player's skill sets.
- **The arm.** `oneHanded(state)` is true through Act 4 (#88). The upper arm is in a sling; nothing asks Wade to climb,
  drive a stick shift or shoot a rifle. Fine work (a recorder's switch, a blasting cap, a pocketknife) is unchanged. The
  design turns "swing the cast" into a shoulder charge at the ice jam; see section 2.
- **Failure is a retry.** Busted at lunch, a fall through the ice, a fuse that burns down: a fade, then the last
  checkpoint. The story never hears about it (Rule 4).
- **Eli and Lucy have their own aims.** Lucy wants Ashby on the record for the claim; the wire is her rig and her
  plan for the reel, and Wade wears it. Eli wants his family's camp and his grandfather's graves standing when the BLM
  examiner flies out in July; he hears about the man on the jam through his own river people, picks the line through
  the floes, and reads the ice. Neither is there to rescue Wade or to be rescued, and neither says so: it shows in what
  they do first.
- **The oil rule.** Act 4 is Prudhoe, so oil is speakable here, by people who have just heard the radio. Nobody knows
  how big yet. Ashby talks about money and a road north, not about a boom he saw coming.

## 1. The wire

**Status: Proposed.**

From the third option at `a4_offer` ("Say you need a day to think…", `offer: 'fake'`) until Wade walks out of the
second lunch, landing on `a4_curly`. Two scenes in the engine: the night before, where the recorder is rigged, and the
lunch. March 1968, a week or so after the radio says Prudhoe; the hotel downtown (`hotelBar`, its dining room; see
Q5).

The design gives the wire two versions, and the gate that picks between them already exists:
`doubleAgentWorks(s)` (`offer === 'fake' && honestWithFriends(s)`, i.e. Eli's secret kept and Wade stayed with
Lucy). The playable part is the backed version. The unbacked version is the existing "mostly silverware" beat, played
short.

### 1a. Backed: Lucy rigs it, Wade wears it

- **The night before (Lucy's kitchen, `lucysKitchen`).** Lucy has bought the recorder herself: a battery reel-to-reel
  small enough for a coat pocket, thirty minutes to a side. She runs the microphone lead up Wade's sleeve, tapes the
  machine against the cast in the sling, and plays a test back twice. She tells him what she needs on it, in her
  words: the land, and before. Eli says he'll be parked across the street and doesn't say why. Not played beyond
  *Look* and *Talk*; it is where the player learns the reel is thirty minutes and the lunch will be an hour.
- **Objective.** The `goal` line: "Get Ashby talking. The reel runs thirty minutes." Nothing says what counts.
- **Verbs.**
  - *Start* (and nothing else): the recorder's switch, reached through the sling. One press, once. A small click the
    player hears and Ashby might.
  - *Steer*: at the lunch's pauses Wade picks a line from a short radial of two or three, as Ask about does in the
    prologue (`game/src/talk.ts`). Some feed Ashby's pride (how he saw the road coming before anybody, what a man like
    him does with the Major), some push (is Curly going to be a problem, what about the plane). Pride opens him up;
    pushing makes him careful. The player is never told which is which.
  - *Cover*: keep the sling turned from Ashby, tug the cuff over the lead, move the cup. A held input, like Lean at the
    hotel bar.
- **Near-discovery.** Two scripted moments the player must cover, plus the room. Ashby reaches over to sign the cast
  ("everybody signs a cast"); the waiter brushes the sling setting down the plates. Covering is a quick deliberate
  response (hold it out on the far side, make the bad-luck-in-Texas joke, shift the cup) and costs nothing. Not
  covering, or a click of the switch while Ashby is looking at the sling, is *busted*: he goes quiet, pays, leaves.
  Fade, retry from the last checkpoint.
- **What the reel gets.** Ashby says the land and the money early (the survey he paid for, the Major's pension and the
  forms with Wade's name) and the rest late, after the plates are cleared and he thinks he's bought Wade: Curly, Owen,
  the plane. Thirty minutes covers one half or the other. Started at the handshake, the reel clicks off over dessert,
  a minute before Curly's name. Started when the coffee comes, it misses the land but gets the rest, *if* Wade fed his
  pride; pushed, Ashby says "I wouldn't know anything about that" and talks about the weather. Per Lucy's aim, the land
  half is the half she wanted; the late half is the half Barnette needs. The player does not know which is worth more,
  and neither does the scene.
- **Seen and busted.** Busted is above. There is no seen ending: a man who saw a wire does not sit through dessert.
- **Checkpoints.** The hotel door; the plates cleared.
- **The note.**

  > The wire. Tape: full / partial

  *Full*: the reel was running when Ashby said Curly's name, Owen's and the plane's. *Partial*: anything else that got
  to the check unbusted. In the text build (P2) *full* applies `late` then `flatter`; *partial* is the other three
  pairs (`early.flatter`, `early.push`, `late.push`), all landing on the same state. Both set `wireTape` (P1) and land
  on `a4_curly`. The near-discovery beat in the text build is a color choice, `holdOut` or `joke`, carrying nothing.
- **What shades heat or trust.** Nothing. The tape's strength is the only thing playing changes, and it moves no
  ending (P1).

### 1b. Unbacked: alone

- **The beat.** Today's text: no one to wire him (Eli won't look at him, or Lucy won't open the door), a recorder from
  the Army-Navy store taped in by himself, and at the lunch Ashby pats the cast, smiles, and talks about the weather
  for an hour. In the engine it plays as a short version of 1a with no Lucy and no kitchen: the same table, the same
  Steer radial, and at the first near-discovery Ashby's hand finds the lump in the sling and stays there a moment. That
  is the whole outcome; there is nothing to retry toward.
- **The note.**

  > The wire, alone. Tape: caught

  One ending, `caught`, at its own start scene (P2), landing on `a4_curly`. It sets nothing: *caught* is
  `offer === 'fake' && !doubleAgentWorks(s)`, already true before the lunch, and `isBad` already reads it ("a failed
  double-agent play").

### Mapping to state and gates (the wire)

| Outcome | Comes from | Gates that read it |
| --- | --- | --- |
| full | `doubleAgentWorks(s)` and `wireTape: 'full'` (P1) | `tape(s)` (P1): `a4_testify`, the best and good headlines in `end.ts` |
| partial | `doubleAgentWorks(s)` and `wireTape: 'partial'` (P1) | same |
| caught | `offer === 'fake' && !doubleAgentWorks(s)` (existing) | `isBad` (existing), `tape(s)`, the bad headline's fake branch (existing) |

`doubleAgentWorks`, `isBad` and `isBest` are unchanged. A full tape and a partial tape reach the same ending on every
path.

## 2. The ice jam

**Status: Proposed.**

From `a4_icejam` until the Major is sitting on a slab with Eli standing over him (`a4_aftermath`), landing on
`a4_testify`. May 1968, breakup, dawn; the jam on the lower Chatanika above the family's fish camp (fact-check: the
Corps had the Air Force blast a Chena jam at Ladd on 2 May 1960, so early May is right).

Canon: the jam is stopped and the Major caught only if Wade kept Eli's secret, stayed with Lucy and didn't take the
money (`iceJam(s) === 'stopped'`); otherwise it blows and the camp floods before the examiner can see it. The design's
set piece (chase, struggle, fuse, confession on the ice) plays on the stopped route. The epic asks for three outcomes,
stopped / caught / fails, which the design lists under Ideas (not yet adopted). This spec proposes the third tier as
P3, picked by the moral route, never by playing.

### The tiers

| Tier | When (P3) | What happens |
| --- | --- | --- |
| stopped | `honestWithFriends(s) && offer !== 'take'` (today's gate) | The set piece. Both stacks of charges found, the fuse beaten, the Major taken. The camp stands. |
| caught | Eli's secret kept (`eliTrespass === 'quiet'`), Wade walked away from Lucy (`afterConfession === 'walk'`), money not taken | The same set piece, but nobody counted the charges. Wade beats the fuse he can see; a second stack under the next slab goes. The Major is taken; the camp floods. |
| blew | everything else (today's `blown`) | No mission. The bluff at night, too late, the car with base plates. |

Why *caught* sits where it does: over the winter Lucy tallies the Major's igloo count sheets (the `shortCount` payoff
in her Act 3 folder) and knows how many pounds went missing, so on the stopped route she tells Eli and Wade there are
two satchels' worth before they set out. Wade walked away from her, so on the caught route nobody has the number. Eli
still comes for him: it is his family's camp, and Wade is the man who knows charges, which is reason enough, not
friendship. Kept secret is why Eli will have him in the boat at all.

### The mission (stopped and caught)

- **Way in.** Eli at the barracks gate before dawn: a freighter downriver saw a man in an Air Force parka walking the
  jam. On the stopped route he has Lucy's number with him. Not played; it ends in Eli's boat.
- **Reading the ice.** In the boat and on the jam, Eli goes first. He reads it aloud as little as he can: grey and
  candled is rotten; white and heaved is holding; stay on what's anchored, never on what's floating. The player sees
  it in where Eli steps. Wade's verb is *Look* (Eli's line ahead, the colors of the ice, the Major's track) and *Step*.
  Stepping on rotten ice is a retry (in to the waist, Eli hauls him out, fade).
- **Reaching the jam: the chase.** The Major is fifty yards ahead across a six-foot lead of open water. The prompt
  is *Jump the lead* or *Go round by the drift logs* (`jump`, `logs`). It is a choice of route, not a skill check. The
  jump is fast and always half fails: one boot in, and Eli, who followed without a word, drags him out. The drift logs
  are slow, and the Major reaches the cutbank first and turns with his back to it. Either way Wade closes on him.
- **Confronting the Major: the struggle.** At the cutbank, a deliberate prompt, no timer: *Shoulder charge* or *Talk
  him down* (`shoulder`, `talk`). The design is canon here and the scene text is not: the arm is in a sling, so the
  attack is a shoulder charge pinning him against the frozen bank, not a swing of the cast (today's "Hit him with the
  cast" is the regression; see the test list). Talking him down names the boat he'll never get in Florida. Both end
  with the satchel on the ice.
- **The fuse.** "It's lit. I lit it before you got here." The prompt: *Pull the cap*, *Cut the fuse ahead of the
  burn*, or *Freeze* (`cap`, `cut`, `freeze`). In the engine the fuse is a burning thing in the world with a real rate
  (about forty seconds a foot, two feet left). *Pull the cap*: run to the stack, pin the charge with a knee, draw the
  cap with the good hand. *Cut*: the knife open with his teeth, a cut ahead of the burn. *Freeze*: the player's input
  locks for a beat, then Eli: "You count these things for a living. COUNT." and the cap. A fuse that burns down is a
  retry from the struggle's end, never an outcome.
- **The second stack.** On the stopped route Lucy's number says there's more: the player follows the Major's track
  to a second satchel under the next slab, not yet lit, and Eli throws it on the bank. On the caught route there is no
  number and no prompt; as Eli sits the Major down, the second stack goes. Same verbs, different knowledge; nothing the
  player does on the caught route can find it, because nothing told them to look.
- **The confession on the ice.** Not played: Eli stands over the Major, who talks (the cabinet robbed, the staff car
  if leaked, Ashby's terms, Florida). On the caught route he says it with the river already moving behind them.
- **Checkpoints.** In the boat at the jam's edge; the far side of the lead; the satchel on the ice, before the fuse.
- **The note.**

  > The ice jam. Crossing: jumped / drift logs. Struggle: shoulder / talked down. Fuse: cap / cut / froze

  One note per combination, `jumped.shoulder.cap` and so on, twelve in all, applying `jump` or `logs`, `shoulder` or
  `talk`, then `cap`, `cut` or `freeze`, and following the single-option beats between them. All twelve land on
  `a4_testify` on the same state for a given route: the details are color, like the ski search's route. The tier is
  not in the note. The story already knows it (`iceJam(s)`), and the engine asks it before the mission to know whether
  to place the second stack and whether Lucy's number is in Eli's pocket (Rule 5).
- **The blew tier has no mission.** `a4_icejam` on that route is one cutscene: the bluff, the sound like artillery, the
  car, then `Continue` to `a4_testify`. The engine plays it and sends that scene's note; there is no "it blew" for the
  engine to report, because playing never chose it.
- **What shades heat or trust.** Nothing.

### Mapping to state and gates (the ice jam)

| Tier | `iceJam(s)` | Readers |
| --- | --- | --- |
| stopped | `'stopped'` (unchanged) | `isBest` (unchanged), `majorCaught(s)` and `campFlooded(s)` (P3) |
| caught | `'caught'` (P3) | `majorCaught(s)`: the Major's epilogue line and the middle headline (court-martialed); `campFlooded(s)`: the silt clause (today only in the good headline) and the middle headline's line on the camp |
| blew | `'blown'` (unchanged) | same two readers, both the other way |

`isBest` keeps reading `iceJam(s) === 'stopped'`, and *caught* needs `afterConfession === 'walk'`, which already rules
out best and good. So no ending changes: *caught* appears only in middle (refused) and bad (faked without backing), and
changes only their text. The matrix summary's ending counts must not move (test list).

## 3. Testimony

**Status: Proposed.**

`a4_testify` stays dialogue and decision 7 stays the same two choices. What changes is that Barnette's case, and what
Wade can add to it, is read from one list instead of three scattered checks (P4): `secured(s)`, a pure function in
`logic.ts` returning what the investigation holds, in order.

| Item | When | Where it comes from |
| --- | --- | --- |
| the cut line and Curly's coil | always | Act 3 (`a3_curly`) |
| the Major's files, with Lucy's memo to Ashby | always | `coFiles` path; on `turn`, Barnette took them from Lucy |
| Lucy's logbook page | `recordsLog > 0` and not `turn` | Lucy's records search; she brings it to Barnette herself |
| Curly's statement | `curlyTalks(s)` | `curlyNamesAshby` evidence |
| Tolliver | `councilmanFlips(s)` | `councilmanFlips` evidence |
| the tape: full / partial | `tape(s)` (P1) | the wire |
| the Major, and what he said on the ice | `majorCaught(s)` (P3) | the ice jam |

How the scene reads it:

- **The case Barnette lays out** is the list, in his words, one sentence each. A full tape is "Ashby, on your cast,
  saying Curly's name." A partial one is "Ashby on the land and the Major, and the reel ran out before anything a jury
  would hang him for." A caught wire is not on the list; on that route Barnette has heard from Ashby's lawyers first,
  about an airman who tried to set their client up.
- **What Wade is asked for** depends on the Major. With the Major in custody, Wade's testimony is the second half of
  the Major's: the sign-outs were forged and here is the man who forged them. Without him, it is Wade's word against
  every page with his name on it, which is today's text.
- **Barnette's belief** stays `barnetteTrustsWade` (heat), unchanged.
- **The epilogue** reads the same list where it names causes: the best headline's tape line only when `tape(s)` is
  `full`; the good headline's "indicted, then thrown out" names murder for a full tape and fraud for a partial one.
  Neither moves an ending (Rule 3).

No new state: `secured(s)` is derived from fields that already exist plus P1 and P3.

## Engine side

The order the engine plays Act 4 in, and the one call per mission it makes.

| Scene | Engine | Note sent |
| --- | --- | --- |
| `a4_news` | Lucy's kitchen, or the café, by `afterConfession` | `Continue` |
| `a4_offer` | the hotel lunch: Ashby's offer, the three-way prompt (decision 6, deliberate, no timer) | `take` / `refuse` / `fake` (new note ids; today `option1..3`) |
| `a4_wire` → `a4_curly` | 1a, the wire | `sendMission(s, 'full' or 'partial')` |
| `a4_wire_alone` → `a4_curly` | 1b, alone | `sendMission(s, 'caught')` |
| `a4_curly`, `a4_jake` | visiting room; Jake's crutches | `Continue` |
| `a4_icejam` | stopped/caught: the gate and the boat, then the mission; blew: the bluff | `Continue` on blew |
| `a4_chase` → `a4_testify` | section 2 | `sendMission(s, '<crossing>.<struggle>.<fuse>')` |
| `a4_testify` | Barnette's visit (decision 7) | `testify` / `silent` |

- **What the engine asks first (Rule 5).** `doubleAgentWorks(s)` picks 1a or 1b (in the text build the two start
  scenes do it, P2). `iceJam(s)` picks the tier: it places the second stack and puts Lucy's number in Eli's pocket on
  `stopped`, places it without the number on `caught`, and on `blown` loads the bluff instead of the jam.
- **Who the player is.** `pov(state)` is `'wade'` throughout; `oneHanded(state)` is true.
- **Where and when.** Act 4 scenes have no `place`, `clock` or `goal` yet, so the queries return `undefined` (story-api,
  "Where, when and what next"). P5 proposes them. The engine has no breakup lighting and falls back to winter until the
  art band exists.
- **Parity.** As in Acts 1 to 3, the engine sends the scenes' own notes as the player plays and its tests check that
  the story lands where `sendMission` with the mission's note lands. The new menus join the parity ratchet
  (`game/src/notesRatchet.ts`); notes the engine can't send yet go in `game/notes-allowlist.txt`, which may only
  shrink.
- **Story-api table.** The two Act 4 rows change when this is implemented (not in this PR): the wire to "tape: full /
  partial; or, alone, caught", the ice jam to "crossing: jumped / drift logs; struggle: shoulder / talked down; fuse:
  cap / cut / froze (the tier is the story's: stopped / caught / blew)". The worked examples at the end of
  `story-api.md` are updated to match.

## Proposed (not canon)

Every item here is a new idea for the owner to adopt, change or reject. None is a decision. If adopted, it goes into
`design.md` in the same PR that builds it.

- **P1. `wireTape`: how much the reel got.** New field `wireTape?: 'full' | 'partial'` in `State` (a two-value enum, so
  bounded; unset everywhere the backed wire didn't run). Set only by the backed wire's lunch choices. Read by a new
  gate `tape(s): 'full' | 'partial' | 'caught' | 'none'` in `logic.ts` (`caught` and `none` derived from `offer` and
  `doubleAgentWorks`, as today), which `a4_testify`, `secured(s)` and the best and good headlines read. No ending gate
  reads it, by design (Rule 3: skill shades). Liveness: it is read at `end`, so nothing drops it. The sweep covers it
  through the lunch's choices; it doubles states only on the fake-and-honest route. If rejected, the wire has one
  backed outcome (today's text) and the note is "Tape: got it / caught".
- **P2. Two start scenes for the wire, and the lunch as a short chain.** `a4_offer`'s fake option goes to `a4_wire`
  when `doubleAgentWorks(s)` and to a new `a4_wire_alone` otherwise, so each menu is fixed per start scene (as the
  records search runs only where it can). The backed chain: `a4_wire` (Lucy's kitchen, the reel; choices *Start it when
  you sit down; he'll talk business early* / *Start it when the coffee comes; men brag after they eat*, notes `early`,
  `late`) → `a4_wire_early` or `a4_wire_late` (the lunch; *Ask how he saw the road coming before anybody* / *Ask if
  Curly's going to be a problem*, notes `flatter`, `push`, each setting `wireTape`; on `a4_wire_early` both set
  `partial`) → `a4_wire_cast` (Ashby asks to sign the cast; *Hold it out* / *Say it's bad luck in Texas*, `holdOut`,
  `joke`, color) → `a4_curly`. Routing by scene, not a transient field, keeps the reel's timing out of `State`.
- **P3. The third ice jam tier, `caught`.** `IceJam` becomes `'stopped' | 'caught' | 'blown'`:

  ```ts
  export const iceJam = (s: State): IceJam =>
    s.offer === 'take' ? 'blown'
    : honestWithFriends(s) ? 'stopped'
    : s.eliTrespass === 'quiet' && s.afterConfession === 'walk' ? 'caught'
    : 'blown'
  export const majorCaught = (s: State): boolean => iceJam(s) !== 'blown'
  export const campFlooded = (s: State): boolean => iceJam(s) !== 'stopped'
  ```

  The design's "Consequences" bullet on the ice jam would change to name the caught tier. The second stack and Lucy's
  count are what make it happen in the fiction: the tier is earned by who Wade kept faith with, not by how he played.
  `end.ts`'s two `iceJam(s) === 'stopped'` / `=== 'blown'` reads move to `majorCaught` and `campFlooded`. If rejected,
  the ice jam keeps two tiers and the note keeps only the color details.
- **P4. `secured(s)`, one list for the case.** Section 3. Derived, no new state. Replaces the three inline `has(...)`
  and `doubleAgentWorks` checks in `a4_testify`'s text.
- **P5. Places and clocks for Act 4.** Proposed: `a4_news` `lucysKitchen` 1968-03-14T19:00 (or `nlCafe` on the turn
  route, which needs its own scene per the fixed-per-scene rule); `a4_offer` `hotelBar` 1968-03-20T12:00;
  `a4_wire` `lucysKitchen` 1968-03-20T20:00; the lunch scenes `hotelBar` 1968-03-21T12:00; `a4_curly` `cityJail`
  (the Birch Hill route needs its own scene, by the same rule); `a4_jake` `hospital`; `a4_icejam` onward two new places, `chatanikaJam` and, for the blew tier, `chatanikaBluff`,
  1968-05-06T04:30; `a4_testify` `troopersPost`. Dates are plausible, not archival; the Chatanika's breakup date
  belongs in `docs/fact-checks.md`.
- **P6. Lucy's count.** On the stay route, one line in `a4_news` (or the night of 1a) shows Lucy with the Major's
  count sheets spread on her table, adding the short weeks: "Forty pounds. That's two satchels, not one." It is what
  she does with the files she risked her job for, and it is the stopped tier's second stack. No state: it reads
  `afterConfession`.

## Tests

Each implementing PR carries the tests for its part; a bug found on the way gets its failing test first.

**The wire**

- `logic.test.ts`: `tape(s)` is `caught` exactly when `offer === 'fake' && !honestWithFriends(s)`, `none` unless
  `offer === 'fake'`, and `full` or `partial` only when `doubleAgentWorks(s)`.
- `logic.test.ts`: for every state reaching `a4_wire`, the `full` and `partial` notes reach the same `ending(...)`
  (Rule 3: the tape never moves a tier).
- `missions.test.ts`: `theWire` reads "The wire. Tape: full / partial" at `a4_wire`; `theWireAlone` reads "The wire,
  alone. Tape: caught" at `a4_wire_alone`; each note agrees with playing the scenes one note at a time; every way
  through lands where a note does.
- `missions.test.ts` (or `act4.test.ts`): `a4_offer`'s fake option goes to `a4_wire` iff `doubleAgentWorks`.
- Sweep (`explore.ts`): `wireTape` is unset on every state that never passed `a4_wire_early`/`_late`.
- Render tests: `a4_testify` and the best and good headlines differ between `full` and `partial`, and `caught` names
  Ashby's lawyers.

**The ice jam**

- `logic.test.ts`: `iceJam` over the full table of `offer` × `eliTrespass` × `afterConfession` (27 rows) against P3.
- `logic.test.ts`: `majorCaught` and `campFlooded` agree with `iceJam`; `caught` never coincides with `best` or `good`.
- `matrix-summary.json`: the ending counts do not change (only text does). Read the routes diff after
  `make generate/routes` and confirm only middle and bad transcripts moved.
- `missions.test.ts`: `theIceJam` reads "The ice jam. Crossing: jumped / drift logs. Struggle: shoulder / talked down.
  Fuse: cap / cut / froze" at `a4_chase`; all twelve notes land on `a4_testify`, on one state per route.
- Regression for the design disagreement: `a4_struggle` offers a shoulder charge, and no Act 4 text has Wade swing the
  cast (fails today on "Hit him with the cast").
- Render tests: the caught tier's `a4_aftermath` names the second stack and the river moving; the Major's epilogue line
  is court-martialed on caught and stopped.

**Testimony**

- `logic.test.ts`: `secured(s)` lists exactly the items in section 3's table for a state built for each row.
- Render test: `a4_testify` names each secured item once and nothing unsecured (no tape line without a tape).

**Shared**

- `story.test.ts`: if P5 is adopted, every Act 4 scene has `place`, `clock` and `goal`, and the clock never runs
  backward (the sweep already checks the latter).
- Liveness: `verify.ts` passes with `wireTape` (read at `end`, never dropped).
- Engine: a parity test per mission (as `knot.test.ts`) that sending the scenes' notes lands where `sendMission` does;
  the ratchet covers the new menus.
- Story lint: the Act 4 lines stay inside the oil rule's Act 4 allowance and the 120-character line limit.

## Open questions for the owner

1. **Who picks the ice jam's outcome?** This spec has the moral route pick the tier and play pick only how it goes
   (the design's Act 4 line and Rule 3). The epic and the story-api table read as if the engine reports stopped /
   caught / blew. Keep the tier the story's, or let a deliberate in-mission prompt (say, the fuse or the fleeing
   Major) pick between stopped and caught on the earned route?
2. **Adopt the caught tier (P3), and on which route?** Proposed: Eli's secret kept but Wade walked away from Lucy.
   Alternatives: no third tier; or caught on every route where Eli's secret was kept, regardless of Lucy.
3. **Should the tape's strength (P1) ever move an ending?** Proposed no. If yes, the likeliest place is the good
   ending: a full tape surviving the motion to suppress, which would make Ashby's fate depend on play.
4. **Eli on the blew tier.** Canon shows only the bluff. Eli would go for his own camp whether or not Wade was in the
   boat. Should the blew route show what Eli did that night (and what it cost him), rather than leave him absent?
5. **Is there a cast?** The design has the arm in a sling with "no cast comes off", and the scenes and the epic put the
   recorder "in the cast". Proposed: a hanging cast in the sling, which holds the recorder. Confirm, or the recorder
   rides in the sling.
6. **The lunch's place.** Reuse `hotelBar` for the hotel dining room, or add a `hotelDining` place?
