# Fairbanks 1967 — Design Draft v0.1

Working title: TBD
Engine: PlayCanvas (engine-only, TypeScript, glTF pipeline)
Targets: Browser first; Steam later via Electron wrapper

## Pitch

A grounded stealth-and-survival mystery set in Fairbanks, Alaska, from the Chena River flood of August 1967 to the Prudhoe Bay oil announcement in spring 1968: the last year before oil money changed Alaska. A bored young airman from Texas befriends a local Athabascan brother and sister, and a drowned geologist turns out to be the first casualty in a fight over who will own the land the oil runs under.

Inspirations: Breath of the Wild (traversal, physics, systemic puzzles), BioShock Infinite (place-as-character, companion bond, layered twists).

## Historical Backbone

- **Chena River flood, August 1967.** Most of Fairbanks underwater. Opening act.
- **Prudhoe Bay discovery, announced 1968.** State lease sale in 1969 brought in ~$900M. The game ends right before the money arrives.
- **Native land claims.** Federal freeze on land transfers pending Native claims (mid/late 1960s). Alaska Federation of Natives formed 1966. Native newspaper published in Fairbanks.
- **1906 Native Allotment Act.** Up to 160 acres per applicant; many applications lost, stalled, or rejected while others filed on the same land.
- **Rampart Dam proposal (backdrop).** Would have flooded Yukon Flats Athabascan villages; dead by ~1967.
- **Eielson AFB.** Est. 1943 as Mile 26 Satellite Field, Eielson AFB from 1948, ~26 miles from Fairbanks. 1960s: F-102/F-106 interceptor detachment (1960-69), SAC bomber/tanker staging facilities, Army brigades training on site, frequent Eielson rescue missions.
- **Anchorage.** Still rebuilding from the 1964 Good Friday earthquake.
- **Alaska Railroad.** Runs past Denali (then Mount McKinley National Park).

To verify before writing dialogue: exact munitions unit names and job titles at Eielson in 1967; which units responded to the 1967 flood; land freeze dates.

## Cast (placeholder names)

**Wade Pruett.** 19, Air Force munitions airman at Eielson, from the Texas plains, first time away from home, never seen snow. Creative tinkerer and musician (guitar). Bored, likable, easy to use. Drinks. Smokes. Water-skied growing up, behind his better-off cousins' boat on a Texas reservoir. Capable of turning gritty or evil depending on player choices. Partly inspired by a real Eielson munitions airman: a kind, creative guy who built homemade flamethrowers for his kids.

**Eli.** Local Athabascan man, Wade's friend. Funny, proud, angry underneath. Knows the rivers and country. Never drinks at any point in the game.

**Lucy.** Eli's sister. Left-handed (a possible brief red herring when the left-handed clue appears). Hates cigarettes, which puts her at odds with Wade. Clerk at the land office; the real brain of the investigation. Fully independent. Bush-competent, at least as capable as any pilot at winter survival. Not a love interest for Wade. Never a victim of a white-savior arc.

**Wade's mother.** Back home in Texas. Wade writes to her all year; she is his moral compass. He can be honest with her or lie to her, and she has no way to check (she's in Texas), which is the point: lying to her is free, so choosing honesty means something.

**The pilot.** Bush pilot on Lucy's crashed flight. Ambiguous, then innocent. He looks suspicious during the crash chapter (e.g. took a cash charter, changed the route), but he was paid to fly, not to crash. The ambiguity must be explicitly resolved on screen (a scene or document that clears him) so it never reads as a dropped thread. He is the city councilman's nephew. Not close to his uncle, but the connection is enough to make the player suspicious. The clearing beat: Wade's wreck-reading shows the sabotage was done on the ground before the pilot took the plane.

**Joan Halvorsen (the nurse, Wade's side romance).** Hospital nurse in Fairbanks. Introduced early, in Act 1 during the flood (triage, evacuation, or when the geologist's body comes in). She saw the body and is a good source for conversations about how he really died. The romance picks up in Act 3/4 when Wade comes back with a broken arm. Whether she pulls him toward betrayal is TBD.
  - Fact-check: which hospital served Fairbanks in 1967 (likely St. Joseph's) and how the flood hit it.

**Jake Bueller (the straight-arrow mechanic).** The other bush plane mechanic. Inspired by a real Fairbanks friend: 6'7", skis and bikes, super pragmatic, quit a job once because his boss asked him to do something wrong. Picks up civilian contract maintenance work at Eielson, which is how Wade knows him and why he can get on base. Becomes Wade's informant and points his suspicion in the right direction.

**The Native cop.** Fairbanks cop, Alaska Native. Went to college in Georgia and hated being treated like a curiosity for being Alaskan. Knows the crooked mechanic. A straight arrow who can't be bought; arrests the crooked mechanic in Act 3 and keeps him safe in custody.

**Inspector Barnette.** Investigator looking into the frontier chaos from early in the game. A fictional descendant of E.T. Barnette, who founded Fairbanks as a trading post and left town in disgrace after his bank collapsed. Carries a chip on his shoulder about the family name and wants to be the law his ancestor wasn't. First name TBD. After the barfight he ties Wade to the crooked mechanic and decides he hates Wade, and he keeps turning up throughout the game. Agency and exact title TBD.
  - Fact-check: E.T. Barnette details (trading post 1901, bank collapse and embezzlement charges around 1911, left Fairbanks) and whether real descendants exist who might object.
  - Fact-check: who would investigate in 1967 Fairbanks (Fairbanks PD detective, the newly renamed Alaska State Troopers, a federal agent) and what title fits.

**Villains.** A conspiracy of mixed guilt; nobody is a cartoon.
- **The oil landman.** The ultimate villain. Orders things done but never gets his own hands dirty; uses everyone else.
- **The city councilman.** Holds the family's land. Complicit; degree of guilt TBD. Uncle of the bush pilot.
- **Wade's CO.** Reads Wade's mail and feeds the oil men. Complicit; degree of guilt TBD.
- **Curtis "Curly" Boone (the crooked mechanic).** A bush plane mechanic and a fellow Texan, Wade's foil: what Wade could turn into if he takes the money. Their shared accent and homesickness make him easy for Wade to like and trust, which makes the betrayal personal. Introduced early as a likable local. Friend of the geologist and hungry for money; sold him out to the landman and was part of his murder. Left-handed. He is the one who rigged Lucy's plane. Arc:
  - **The murder (Aug 1967):** during the flood, Curly offers his friend the geologist a skiff ride across the water to Lucy. He takes him to a flooded cabin instead, holds him under, and leaves the body tied to submerged debris. The proof the geologist carried disappears. The knot is a cowboy bowline, the left-handed version of the bowline that Texas ranch hands tie: the lefty-Texan clue (briefly points at Lucy, who's left-handed, and Wade, who's Texan).
    - Fact-check: the cowboy bowline's name, handedness, and association with Texas/ranch work; 1967 flood death toll.
  - **Act 1:** in the barfight, hauled in and let go; the cops already know him.
  - **Fair-play clues before the bow:** he casually ties a cowboy bowline in front of Wade while doing some job; and he gets drunk and lets slip to Jake Bueller how he's planning to get out of town (money coming, a way out), which Jake later passes along to Wade.
  - **Act 3:** after the crash, he realizes the landman is cleaning up loose ends and he's next. He breaks into a cabin and steals a new left-handed hunting bow as preemptive self-defense, figuring a killing with a bow would be harder to trace to him than a rifle. The Native cop arrests him for the burglary.
  - **Custody keeps him alive.** The landman can't arrange an "accident" for a man in active police custody, and the Native cop is a straight arrow who can't be bought. The left-handed bow is what makes Wade suspect him in the geologist's death (the left-handed evidence at the scene is TBD).
  - Fact-check: left-handed hunting bows were available in 1967 (Bear Archery and others likely made them); bowhunting in 1960s Alaska.

Cultural note: bring in Athabascan writers/consultants for Eli, Lucy, their family, and language.

## The Real Wrong

Eli and Lucy's family filed a Native allotment application for their fish camp decades ago. The paperwork vanished. A white settler now on the city council holds title. The geologist's survey data shows why that land suddenly matters.

## Barfight Ensemble

Goal: introduce as many characters as possible in one chaotic Act 1 scene, then tie them back in later (or cut).
- Confirmed: Wade, Eli, Curly Boone, the Native cop, Inspector Barnette (arrives in the aftermath).
- Candidates: Jake Bueller, Joan Halvorsen (patching people up afterward), the pilot, the councilman or landman watching from a booth, Wade's rescue-team buddy.

## Structure (one year, four seasons)

**Act 1 — Flood (Aug 1967).** Wade is sent into drowned Fairbanks. Meets Eli. They find the geologist's body drowned in a flooded cabin, tied to submerged debris; ruled an accident ("tangled in a line in the current"). Lucy disagrees. Barfight set piece: Wade's first real fight, Eli steps in, friendship begins. The barfight is an ensemble scene that introduces as much of the cast as possible (see Barfight Ensemble). The crooked mechanic is in it and gets hauled in afterward; the cops already know him. Teaches stealth and survival systems in flooded streets.

**Act 2 — Freeze-up (fall).** Wade joins Lucy's investigation. He can go where she can't: the base, officers' club, oil men's hotel bar. Spying, eavesdropping, document theft, tailing.

**Act 3 — Deep winter.** Lucy flies to the geologist's survey camp in the Alaska Range to recover his notes and samples. The plane goes down. Lucy (playable) and the pilot survive one to two days in the wreck before the search party finds them. Wade gets onto the rescue team through a buddy on it. Near the crash site the team splits up to search, which opens a survival/exploration section: Wade alone on cross-country skis, moving through the Alaska Range in deep winter. He reaches the wreck out of his depth, breaks his arm trying to get Lucy out, and has to be told what to do to stay alive. While they wait, he shares a cigarette with the pilot (a quiet bonding beat with the man the player suspects), and that's when he notices the damage that tells him the plane was sabotaged.
  - Broken arm: carries into later chapters (one-handed climbing and crafting, no guitar for a while). Extent TBD.
  - Idea: lighting up near a wreck that might be leaking fuel is its own tension beat.
  - Fact-check: who actually ran a 1967 Alaska Range crash search (Air Force rescue out of Eielson or Elmendorf, Civil Air Patrol, Army ski troops from Fort Wainwright/Fort Greely), and how an airman from munitions could plausibly tag along. Wade's contribution is reading the wreck: it was sabotaged. Railroad past Denali; Anchorage side trip (oil offices, land lawyers, post-earthquake city).

**Act 4 — Breakup (spring 1968).** Prudhoe Bay goes public. At breakup, someone blows an ice jam with Eielson charges signed out under Wade's name, flooding out the family's fish camp and wiping out the signs of use and occupancy their allotment claim depends on. What Wade knows now matters. Endings.
  - Fact-check: dynamiting ice jams on Interior rivers in the 1960s; whether 1906 Act allotments required proof of use and occupancy (likely five years, per the 1956 amendment).

## Twists

1. The geologist was on the family's side. Oil interests were using his survey data to grab land before Native claims settled. He died on his way to give proof to Lucy.
2. Lucy befriended Wade at first because she needed base access. The friendship became real later. Mirrors Wade's own betrayal option.
3. Wade's CO is feeding information to the oil men, and Wade has been feeding it to his CO without knowing, through his letters home. Eli is the one who catches on.
4. Eielson munitions are going missing under Wade's signature. Lucy uncovers the paper trail late in Act 3; in Act 4 the charges are used to blow the ice jam that floods the fish camp. He is being set up as the fall guy.
5. Eli was out on the water near the cabin the night of the flood and saw a skiff there. He keeps quiet because he was trespassing: the councilman, who holds title to the family's fish camp, had banished him from the land, and Eli went back in the flood to retrieve his own belongings. Illegal only because of the stolen land claim. The player assumes he's guilty; the truth is he's a reluctant witness. In the bad ending, the trespass puts him near the murder scene and he's wrongfully imprisoned.

## Lucy's Confession

- **When.** Late Act 3, after the crash, once Wade has read the sabotaged wreck and the frame-up (Twist 4) is coming together.
- **How.** Under duress. Wade is angry and about to act on it, and his plan assumes Lucy's loyalty. She has to tell him before he commits, because the move only works (or only stays survivable) if he knows the truth. ("I picked you because you had access. Now they've picked you too.")
- **Trigger.** Furious about the crash, Wade blusters about going after the councilman (e.g. blowing his safe for the stolen allotment file; exact act TBD) and assumes Lucy has his back. She lets him vent. When he actually starts getting ready to do it, she intercepts him and tells him the truth, because Eielson explosives in his hands are exactly what the frame-up needs (Twist 4).
- Rule: the confession is never romantic or gratitude-driven.

## Endings

### Shape: double helix

Two strands (Wade's loyalty, and the evidence/justice trail) wind through the game.
- **Acts 1-2 (seeding).** Choices and relationships are planted: what Wade tells Mom, who he trusts, what he notices, what he steals, who he drinks with.
- **Act 3 crash (the center).** The plane crash and Lucy's confession are the crossing point where both strands meet.
- **Act 3 aftermath - Act 4 (unwinding).** Earlier choices pay off KOTOR-style: specific late-game details change based on early decisions (who's alive, who's in jail, who believes Wade, which evidence exists).

### Three real endings

**Wade is good.** Eli and Lucy survive and stay out of jail. Joan ends up with someone else. The family's land claim survives.

**Wade is in the middle.** Variants, depending on the path:
- **Partial justice.** Curly and the councilman go down, but the landman walks and the oil money arrives anyway. Bittersweet and historically honest.
- **Double agent.** Wade pretends to sell out to the landman to get him on the record. Works only if he's been honest with Lucy and Eli; if he's lied to them, it collapses into real betrayal.
- **Burn it down.** The gritty path: Wade uses his munitions skills for revenge and becomes the dangerous airman Barnette always said he was.

**Wade is bad.** The landman pays Wade to keep quiet. Wade gets Joan, the payoff, and some land (the irony being that it's land). Eli ends up wrongfully imprisoned, tied to what he was doing on the water the night of the flood (Twist 5).

### What decides it

Seven key decision points, not a running meter. Smaller choices change details and epilogues, not which of the three endings you get.

Before the crash:
1. **Barfight aftermath.** Questioned by Barnette, Wade covers for Eli, blames Eli, or throws in with Curly.
2. **The letter leak.** What Wade tells Mom about the investigation (honest, vague, or a lie) decides what the CO learns and how bad Twist 3 gets.
3. **Eli's trespass.** When Wade learns Eli was on the banished land that night: keep quiet, report it, or use it as leverage.
4. **Curly's escape plan.** When Jake passes on Curly's drunken getaway talk: warn Lucy, confront Curly, or let it go.

After the crash:
5. **After the confession.** Wade stays with Lucy, walks, or turns on her.
6. **The landman's offer.** Money, land, and a way out for silence: take it, refuse it, or fake taking it (double agent).
7. **Testifying.** Wade goes on the record against the CO and the landman at the cost of his career, or doesn't.

The Act 4 ice jam plays out according to these choices rather than being its own decision point.

### Epilogues

Per-character beats that vary within each ending: Eli, Lucy, Curly, Barnette, Joan, Jake, the pilot, the councilman, the CO, the landman, Mom (her last letter reflects what Wade told her vs. what happened).

### Hidden best outcome

The landman can be arrested, but only with near-flawless play: the right evidence, the right trust, the right timing. Expected to take 2-3 varied playthroughs to find. One scenario also lets Wade save Curly.

## Systems

- **Letters home.** Wade and his mother write back and forth all year; doubles as journal/save system. Each letter is a chance to tell her the truth or lie. Her replies react to what he tells her, not what really happened. Writing-choice mechanism TBD. 
  - **The CO reads Wade's mail.** Neither Wade nor Lucy knows; most players won't expect it either. This is how Twist 3 works: Wade accidentally lets slip something in a letter to his mother that the CO isn't supposed to know. The CO acts on it, and Eli notices that decision and realizes the CO knows something he shouldn't. That is how the protagonists find out.
  - Fact-check: routine censorship of personal mail was mostly a wartime practice; peacetime airmen in 1967 probably weren't censored as policy. Easy fix that keeps the plot: the CO does it quietly and off the books, so the realism holds up for players who know the history.
- **Stealth.** Primary mode in town and on base.
- **Survival.** Cold, light, calories, frostbite; seasons change the map (flood, freeze, dark, breakup).
- **Skiing.** Cross-country skis for the Act 3 rescue search. Wade has never seen snow, but he grew up water skiing, so he's overconfident. His balance on downhills carries over; kick-and-glide on the flats and climbing don't, and he has to learn those.
- **Smoking.** Wade smokes. Possible hooks (TBD): lighter and matches as a fire source, cigarettes as social currency on base and in bars, cravings vs. stamina in the cold, smoke or a lit cigarette giving away his position in stealth.
- **Crafting/tinkering.** Munitions skills: flares, noisemakers, small charges (ice jams, doors), lock tools, engine thawing, one sketchy homemade flamethrower. Same tools serve help or harm.
- **Music.** Guitar as social stealth: house parties, bars, fish camp, access to rooms a uniform can't enter.
- **Combat.** Rare and grounded. Barfight is the chaos showcase: mud, hot stove, moose rack, bottles, slippery floor, regulars picking sides. Losing has consequences (drunk tank, recognized by a cop).
- **Lucy.** Companion in town (people and paper puzzles, paired with Wade's physical problem-solving) and playable in her own chapters: land office records puzzle, Anchorage, crash survival.

## Tech Notes

- Engine-only PlayCanvas with TypeScript so agents can work entirely in the repo (the hosted editor isn't agent-friendly).
- Dense downtown hub plus discrete levels (Eielson, Denali crash site, Anchorage) instead of a full open world, to keep browser loading sane.
- Steam: Electron for consistent Chromium; Tauri on Linux uses WebKitGTK, which can differ on WebGL/WebGPU.
- Multi-agent Saddle split candidates: narrative/lore, level layout, systems, QA.

## Open Questions

- Letter-writing choice mechanism
- What exactly Wade leaks in the letter, and what decision the CO makes that tips off Eli
- Wade's exact rash act against the councilman (safe job or otherwise)
- Whether the crooked mechanic's guilt is exposed publicly or kept quiet (player choice), now that the Eli-rescue beat is replaced by the arrest
- Exact guilt of the councilman and the CO in the geologist's death and the plane sabotage
- When the player learns Lucy was using Wade
- Joan: whether she pulls Wade toward betrayal
- Twist 5: when Eli finally tells Wade he saw the skiff, and what makes him talk
- Endings: how the seven decisions combine into good/middle/bad; which early choices map to which late-game changes; what the landman-arrest run requires; the scenario where Wade saves Curly
- Title
- Inspector Barnette's first name
- Native cop's name (from Athabascan consultants)
- Native cop's larger role beyond the arrest
- Smoking mechanics: which hooks to keep

## Continuing in Claude Code

Use the AskUserQuestion tool to interview me about the open questions in this doc, one or two questions at a time with concrete options. Ask about history I might not know when it affects a decision, and flag anything that needs fact-checking. After each answer, update this file and remove resolved items from Open Questions.
