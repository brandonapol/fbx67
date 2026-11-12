# Act 3 mission specs

How Act 3's five playable missions play in the engine build, the survival rules the night and the search share, and
the one note each mission sends the story ([`story-api.md`](../story-api.md), Rules 1 to 4). Issue #97. The scene text
is in [`text-game/src/scenes/act3.ts`](../../text-game/src/scenes/act3.ts); all five menus are in
[`missions.ts`](../../text-game/src/missions.ts). Where this file and
[`design.md`](../../design.md) disagree, the design wins.

**Status: Proposed.** Every section below is a proposal; the owner approves the specs in review. Section 1's menu,
`lucysDig`, section 2's, `theLongNight`, sections 3 and 4's, `theSkiSearch` and `theWreck`, and section 5's,
`theRashPlan`, are in `missions.ts`, and Act 3 plays through them as panels over `story` in its own smoke run
(`make test/game/smoke/act3`, `game/smoke/act3.test.ts`). The mission spaces and their play are not built yet.

**Ground rules for all five.** The ones in [`act1-missions.md`](act1-missions.md) and
[`act2-missions.md`](act2-missions.md) hold, plus:

- **Two players.** Lucy plays the dig and the night (`pov(state)` is `'lucy'` from `a3_camp` through
  `a3_survive_jake`); Wade plays from the search on. Lucy is the one who knows what she is doing. The player sees it in
  what she reaches for and how fast, never in a line that says so.
- **The arm.** From the fall in `a3_arm`, `oneHanded(state)` is true and the upper arm is in a sling (#88). From then
  on nothing in Act 3 asks Wade to climb, drive a stick shift or shoot a rifle: those verbs don't exist for him. Where
  the story has him try anyway (the rash plans), the attempt is staged, not played, and it reads as hopeless. Skiing,
  looking at an engine, and lock or fine work are unchanged.
- **Failure is a retry.** Freezing, the light running out, or busted: a fade, then the last checkpoint. Nobody dies in
  a way the story hears about (see [Survival](#survival)).
- **The oil rule.** Owen's cache is field notebooks, claim maps and tapes about land along a future road north. Nothing
  in Act 3 says oil money or anything bigger; that waits for Prudhoe in Act 4.

## Survival

**Status: Proposed.**

The rules for Lucy's dig, the long night and Wade's ski search. As few numbers as possible: two things to watch, and
both are things in the world, not bars on the screen.

The rules exist as pure code in `game/src/survival.ts` (the sky's light from the clock, the four warmth steps, the fire,
the meal, hands and feet) with unit tests, and the arm's rules in `game/src/oneHand.ts` (every engine interaction
declares whether it works one-handed; climbing, driving a stick shift and shooting a rifle are ruled out). The long
night's play over them is `game/src/survivalPlay.ts` (section 2): where Lucy is, the tasks and how long they take, the
order's gate, sweat that makes her wet, the fire, the checkpoints, and what the cold looks like (breath, white fingers,
a slower walk, frost at the edge of the screen; reduced motion stills the breath and the shiver, high contrast trades
the frost haze for words). It is not wired into the game loop yet. The numbers in `survival.ts` and `survivalPlay.ts`
other than the clock rate are their own tuning. Hands held to a burning fire warm back: the bare-handed count starts
again there, which is how *fire first* keeps Lucy's fingers and *Jake first* does not.

- **Light.** The sky is the clock. In a survival mission the game clock runs at about twenty times real time, so the
  dig's three hours of grey light are about nine minutes of play, and the engine lights each moment from the date and
  hour as it does everywhere else (`timeOf`, after fact-check 54: sun up about 09:40 to 13:50 on 12 December, civil
  twilight until about 15:10). That is the only rate in this section. The night itself is not played hour by hour: it
  plays as a few tasks, then a fade to first light.
- **Warmth.** One hidden value with four named steps: *warm*, *chilled*, *cold*, *freezing*. The player reads it from
  Lucy's or Wade's breath, posture and hands, and from the sound of the wind, not from a meter. It falls in the open, in
  the wind, standing still, with mitts off, and fastest when wet (sweat counts). It rises by a fire and after food.
- **Fire.** A thing in the world with a reach and a fuel load. Inside its reach warmth climbs; outside it, warmth falls.
  It burns down unless fed: spruce boughs and deadfall cut with the kit's axe. Lighting it takes bare hands, which costs
  warmth. Fire is the only way back to *warm* at night.
- **Calories.** Not a number. Eating from the survival kit (fact-check 55: the law requires a week's food, an axe, a
  first-aid kit and, in winter, a sleeping bag) stops warmth from falling for a while. A cold body that hasn't eaten
  falls a step faster. That is the whole rule.
- **Frostbite.** What *freezing* does to whatever is exposed. Bare hands go white and fumble: the axe, matches, a knot,
  the dig all take longer. Numb feet slow walking and skiing. It is a slowdown, never a fail, and it clears at the next
  checkpoint. It reaches the story only where a deliberate prompt already put it there: the night's order (section 2).
- **Fail and retry.** Staying at *freezing* too long whites out the screen: a fade, then the last checkpoint, with what
  Lucy or Wade carried then. The light running out in the dig is the same. The story never hears about either (Rule 4).
  No one dies of cold in a way that reaches the story; the cost the story keeps is what the player chose, not how well
  they managed a fire.

## 1. Lucy's dig

**Status: Proposed.**

From Jake's landing at `a3_camp` until Lucy has the bundle inside her parka and the plane takes off: `a3_found`'s
`home`, which lands on `a3_crash`.
12 December, thirty-eight below, Owen's survey camp. Playing Lucy.

- **Objective.** Find what Owen hid before the light goes. The `goal` line says only that. There is no marker.
- **The camp.** Torn apart: the tent slashed, crates emptied, the stove kicked over. Somebody searched it and didn't
  find what Lucy came for. The three places from the prologue are there to be dug: the floorboards behind the cook-tent
  stove, the old meat cache up on stilts, and the survey marker. The meat cache is reached by its own pole ladder.
- **The memory test.** The player hid the notes as Owen in the prologue (`owenCache`). A player who remembers digs in
  the right place at once. A player who doesn't can *Read* Owen's second letter: the line is buried halfway down a page
  about the weather, and reading it means mitts off.
- **Verbs.** *Read*: the second letter, mitts off. *Dig*: frozen ground with the camp's shovel or the axe, slow, or
  pry up boards. *Climb*: the meat cache's ladder (Lucy). *Look*: what the searchers turned over.
- **The wrong spot.** Digging in the wrong place costs time and fingers: light the player doesn't get back, and bare
  hands that go white (see [Survival](#survival)). After a wrong dig the letter is the honest way out; the text build's
  `a3_wrong_spot` is that beat, twenty minutes of light for the line.
- **Fail and retry.** The light running out, or *freezing* too long: a fade, then the last checkpoint. Jake keeps the
  engine warm and never leaves without her.
- **Checkpoints.** Stepping off the plane; the first spot dug, whichever it was.
- **The note.**

  > Lucy's dig. First dig: stove / cache / marker

  Each label is the place Lucy dug first, `stove`, `cache` or `marker`, applying that choice at `a3_camp`. The story
  compares it with `owenCache`: the right spot goes on to `a3_found`, a wrong one through `a3_wrong_spot` and its
  single `dig`. Further wrong digs in the engine cost light, not story. The menu is `lucysDig`; every note lands on
  `a3_crash` with the `tapes` evidence, and `owenCache` cleared.
- **What shades heat or trust.** Nothing.
- **New state.** None. Lucy's fingers stay inside the mission.

## 2. The crash and the long night

**Status: Proposed.**

From the engine's cough in `a3_crash` until first light, when the night ends and the search sets out (`a3_search`). A
hillside of black spruce forty minutes out from the camp. Playing Lucy.

- **The crash.** A cutscene: the cough, Jake on the primer, "Fuel's icing," the engine quits and he puts the plane into
  the spruce. Nothing in it is played.
- **Way in.** When Lucy comes to, Jake is pinned and bleeding, the cabin is on its side, and the light is going. The
  prompt is *Build a fire first* or *Get Jake free first* (`fire`, `jake`). It is a deliberate two-way prompt with no
  timer (Rule 3): neither choice can kill Jake, and neither is read off where the player walks.
- **Objective.** Get through the night, and get seen.
- **Verbs.** *Cut*: boughs and deadfall with the kit's axe. *Light*: the fire, bare hands. *Work free*: the bent seat
  frame off Jake's leg. *Tie off*: the bleeding with her scarf. *Carry*: boughs under Jake, the sleeping bag over him.
  *Feed*: the fire. *Eat*: from the kit. The order the player chose decides which comes first; both happen.
- **The order.** *Fire first*: Lucy gets the fire going in the lee of the fuselage, then warms her hands and works the
  frame off Jake's leg; Jake has waited in the cold, lips blue. *Jake first*: Lucy works the frame and ties off the
  bleeding with bare hands, and by the time the fire is lit she can't feel her fingers, so the fire is slow to start.
- **The signal.** Once the fire is going and Jake is under the bag, the second prompt: *Smoke* (oil-soaked rags in a
  cowling panel, kept for first light), *Stamp an X* (a big X on the open slope, out of the fire's reach, at the cost of
  warmth), or *Save it all for the fire* (`smoke`, `stampX`, `saveFire`). Deliberate, no timer.
- **The night.** After the signal, the night plays as tasks: keep the fire fed, keep Jake warm, eat. Then a fade to
  first light.
- **Fail and retry.** *Freezing* too long, or the fire out with Lucy away from it: a fade, then the last checkpoint.
- **Checkpoints.** Lucy coming to in the cabin, before the prompt; the order done, before the signal prompt.
- **The note.**

  > The long night. Order: fire first / Jake first. Signal: smoke / X / saved the fire

  Each pair is a note, `fire.smoke` and so on, applying `fire` or `jake`, then `smoke`, `stampX` or `saveFire`. The
  menu is `theLongNight`; all six notes land on `a3_search`, each on its own state, since both choices carry (below).
- **What shades heat or trust.** Nothing about how it is played.
- **New state.** `design.md` adopts the survival-night order and signal as state: Jake's frostbite carries into Act 4,
  and the signal changes how long the search takes. Built: `nightOrder` (`fire` or `jake`), read by `jakeFrostbitten`
  (fire first leaves Jake frostbitten), and `nightSignal` (`smoke`, `stampX` or `saveFire`), read by `searchHours`
  (3, 5 or 7 hours until the rest of the team reaches the wreck), both covered by the sweep and in `liveness.ts`. The
  menu adds none: how well the night is played (warmth, the fire, frostbite on Lucy's hands) stays inside the mission.
- **Wiring (to do).** `survivalPlay.ts` is the whole mission as pure functions; the game loop does not call it yet.
  Until a space is built for the crash site it plays as a live panel over the story backdrop. The steps, all additive:
  1. `prologue.ts`: a `night?: Night` field on `Game`.
  2. `press`: on `note:fire` or `note:jake` while `survivalPlay.starts(story)` holds, set `night` to
     `begins(story, note)` instead of sending the note. Route `night:*` buttons to `survivalPlay.press`; an `undefined`
     result clears `night` and reopens the story's menu panel (the first checkpoint is before the prompt).
  3. `tick`: before the open-panel early return, step `night` with `survivalPlay.step` and set the panel from
     `panelOf(story, night)`, keeping the old panel object while its buttons are unchanged so `main.ts` does not
     rebuild them every frame (its text is read every frame). At `dawned(night)`, send
     `sceneNotes(story, noteOf(night))` one note at a time, as the barfight's `report` does, clear `night` and `arrive`.
  4. `smoke/act3Plan.ts`: when `g.night` is set, the next step is `nextPress(g.night)` as a key for that button, or a
     wait while it is `undefined`. The run still takes every first choice (fire first, smoke).
  5. The view (issue #185): draw `tells(body, wet, access)` with `access.reduced` from `frontEnd.ts`'s `reduced`.
     High contrast needs a preference that does not exist yet: whether it is a game-wide option is the owner's call.

## 3. The ski search

**Status: Proposed.**

From the ground team splitting up at `a3_search` until Wade reaches the wreck, `a3_arm`. 13 December, first light,
near the last known heading. Playing Wade, two-handed.

- **The team.** The Rescue Coordination Center at Elmendorf calls Eielson for a ground team; Wade goes as the munitions
  man, carrying flares and signal charges (fact-check 10). Proposed: a soldier from Fort Wainwright is on the team, and
  the skis are army-surplus with cable bindings (fact-checks 10 and 56). The team splits up to cover ground and Wade is
  on his own.
- **Way in.** The prompt is *The ridge* or *The creek* (`downhill`, `climb`).
- **Objective.** Find Lucy's plane. Once there is smoke, follow it.
- **Verbs.** *Ski*: downhill is a water-skier's balance and Wade is good at it; on the flats kick-and-glide is hopeless
  and he falls every few yards. *Climb*: sidestep or herringbone up the drainage, slow, and sweat that freezes. *Look*:
  scan for smoke, an X, a spotter plane. *Smell*: smoke, once close.
- **The routes.** *The ridge*: a fast, fun downhill, then the flats, where he falls on his face. *The creek*: the
  climb, sweat through his layers, toes numb. Both reach the same slope above the wreck.
- **Follow the smoke.** The wreck always has its fire, so there is always smoke to follow at the end. How early the
  player can find it comes from the night's signal (section 2): a smoke signal stands up over the trees from the start,
  an X is found by a spotter plane circling it, and a saved fire is only a smell, late and close. This is the search
  getting longer or shorter; the magnitudes belong to the implementing ticket.
- **Fail and retry.** *Freezing* too long, or lost in the flats when the light goes: a fade, then the last checkpoint.
  There is no way to miss the wreck for good.
- **Checkpoints.** The team splitting up; the top of the slope above the wreck.
- **The note.**

  > The ski search. Route: ridge / creek

  `ridge` applies `downhill`; `creek` applies `climb`; both follow `follow`. The menu is `theSkiSearch`; both notes
  land on `a3_arm`.
- **What shades heat or trust.** Nothing. The route is color (`design.md`, choices that carry state).
- **New state.** None.
- **Built (#141).** The ski mode is pure code in `game/src/skiing.ts` with tests in `skiing.test.ts`: the slope's
  ground (`heightAt`, the two routes and the drop to the wreck), the rules (downhill under gravity with a snowplow and
  no falls; on the flats a held push shuffles safely, a kick in its window glides, one kick too soon staggers him and a
  second while he staggers falls him; the climb is slow, holds where he stops and soaks him in sweat that the survival
  rules count as wet), and the space's props (`searchSpace`). `game/src/skiView.ts` draws the slope. The headless
  test skis both routes and checks the story lands where `sendMission` and the `--choices` path do.
- **Not wired yet.** The controller and the space registry were claimed by other work when this landed. To play it:
  add `'search'` to `SpaceId` and `search: { id: 'search', ...searchSpace }` to `spaces` (`levels.ts`) and to
  `soundscapes` (its bed is `slope`); in `prologue.ts` carry `ski?: Ski` on `Game`, clear it in `enter`, and in
  `arrive` for the search space start `setOff(routeOf(story))` when a route scene is current (the a3_search prompt
  plays as its menu); in `tick`, before the walk, run `skiFrame` with `input.dir` and the space's solids, sending
  `ARRIVE_NOTE` on `'arrived'`; `footY` is `skiFootY` on skis; in `render.ts` call `buildSlope` instead of the flat
  ground box. The smoke at the follow-the-smoke signal and the act's smoke plan for the new space come after.

## 4. The wreck

**Status: Proposed.**

From the top of the slope at `a3_arm` until Wade decides what to do with what he found, `a3_wreck`. The wreck in its
stand of black spruce, late morning. Playing Wade, one-handed from the fall on.

- **The fall.** Lucy, alive, waves Wade off the slope. The player can't wave back or wait: the only way on is down to the
  fuselage, and the only verb at the cabin door is *Reach*, to haul her up by the arm. The snow under his skis gives way
  and he goes down against the fuselage with his right arm under him. It always happens and it is not a fail: a short
  cutscene, the crack, then the sling. From here `oneHanded(state)` is true (#88).
- **Lucy's turn.** A cutscene: she climbs out on her own, splints the arm with a strip of aluminum off the wing strut,
  works the feeling back into his toes and makes him eat. She was doing fine before he got there.
- **Objective.** None from the story until Wade wanders to the engine to get away from her look. Then: find out why it
  quit.
- **Verbs.** *Look*, one-handed: the fuel cap, the sump bowl, the drain. Each look is a close camera and a notebook line:
  the cap's gasket has been cut; the sump bowl is solid ice; the drain is jammed with a sliver of wood, wired so it looks
  clean, so a preflight drain gave only the little gas above the plug (fact-check 8). All three are required, because
  both endings give the `wreckProof` evidence. Looking is fine work, which the arm doesn't limit. Proposed, after
  fact-check 8: Jake mutters that the plane sat in a heated hangar the night before.
- **The choice.** Once all three are found, the prompt is *Wake Jake and show him* or *Keep it to yourself*
  (`wakeJake`, `keepIt`). Jake drifts by the fire saying he drained those sumps; nothing about how the player looked
  decides it.
- **Fail and retry.** None. The fire is close and Lucy is in charge.
- **Checkpoints.** After the splint, by the fire.
- **The note.**

  > The wreck. Jake: shown / not shown

  `shown` applies `wakeJake` (the `wreckProof` evidence and `sharedWreck`, which `councilmanFlips` reads); `notShown`
  applies `keepIt` (the evidence only). Both follow `yell` on the way. The menu is `theWreck`; both notes land on
  `a3_home`.
- **What shades heat or trust.** Only the choice.
- **New state.** None.

## 5. The rash plans

**Status: Proposed.**

From the decision at `a3_rash` until Lucy steps out of the dark, `a3_confession_<plan>`. Thursday night into Friday, 28
and 29 December. Playing Wade, one-handed. Lucy always intercepts.

- **Way in.** The prompt at `a3_rash` is *Blow the safe*, *Burn his cabin*, *At gunpoint*, or *Stay out of it*
  (`safe`, `burn`, `gunpoint`, `none`). A visit to the café first (`a3_rash_gossip`) is Dottie's read on the heat, not
  part of the note. *Stay out of it* is not a mission: the barracks, Lucy's call from the pay phone
  outside the main gate (`a3_rash_none`).
- **Objective.** The plan's `goal` line: the safe, the cabin, or Tolliver. The player never reaches it.
- **The lead-ins.** Each is short, playable on foot, and visibly doomed before Lucy is there. Where the plan needs a
  verb the arm rules out, Wade tries it in a staged beat the player watches, not a verb the player gets.
  - **The safe.** A night shift: Wade lifts a demolition kit from the munitions bunker and builds the charge on his bunk
    with his teeth and his good hand (fine work; played as a few clumsy steps). Then the walk down Cushman Street at
    eleven with it in a lunchbox, keeping out of headlights. The office is on the ground floor; nothing to climb.
  - **The cabin.** The borrowed truck is a stick shift. The drive out is a staged beat: Wade grinds the gears with his
    one hand, the truck lurches and stalls on the cabin road, and he gets out. The player takes over on foot in the dark
    with the kerosene, one can at a time in the good hand, so the second can is left by the truck.
  - **Gunpoint.** The borrowed rifle is slung. Waiting in the dark outside Tolliver's house for the car from the council
    meeting, Wade tries to bring it up and can't get it to his shoulder: a staged beat. The player keeps out of sight
    of the street until the headlights turn in. There is no aim verb and no fire verb.
- **Lucy's interception.** She has followed him. Nothing the player does can get past her (acceptance criterion):
  - **No verb finishes a plan.** The mission has no *place the charge*, no *pour*, no *aim*, no *fire*. Tolliver's
    office door, the cabin's walls and Tolliver himself are never in reach.
  - **Every route is covered.** The interception fires at a line before the target that every way to it crosses, on the
    lead-in's own timer (the headlights turning in, the cabin coming into sight), and on turning back past the start,
    because she is behind him. Whichever comes first.
  - **No other ending.** Busted (a patrol car's lights on Wade, a neighbor at a window) is a retry from the last
    checkpoint, not an ending. There is no seen ending to accept and no way to quit the plan from inside it: the
    decision was the prompt at `a3_rash`.
  - **The note is sent only at the interception.** Every note on the menu lands on its plan's `a3_confession_*`, so
    the story has no ending where a plan was carried out.
- **Checkpoints.** The start of the lead-in; the staged beat (the charge built, the truck stalled, the rifle that
  won't come up).
- **The note.**

  > The rash plan. Plan: safe / burn / gunpoint; or stayed out

  `safe`, `burn` and `gunpoint` apply that choice (`rashPlan`, +1 heat on `go`); `stayedOut` applies `none` and
  follows `letHerIn`. The menu is `theRashPlan`; every note lands on its plan's `a3_confession_*`. `rashPlan` is read
  by the middle ending's flavor (`burn`).
- **What shades heat or trust.** Only the plan: +1 heat for any of the three, as today. How well Wade sneaks shades
  nothing.
- **New state.** None.
