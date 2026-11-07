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

**Lucy.** Eli's sister. Clerk at the land office; the real brain of the investigation. Fully independent. Bush-competent, at least as capable as any pilot at winter survival. Not a love interest for Wade. Never a victim of a white-savior arc.

**Wade's mother.** Back home in Texas. Wade writes to her all year; she is his moral compass. He can be honest with her or lie to her, and she has no way to check (she's in Texas), which is the point: lying to her is free, so choosing honesty means something.

**The pilot.** Bush pilot on Lucy's crashed flight. Ambiguous, then innocent. He looks suspicious during the crash chapter (e.g. took a cash charter, changed the route), but he was paid to fly, not to crash. The ambiguity must be explicitly resolved on screen (a scene or document that clears him) so it never reads as a dropped thread. He is the city councilman's nephew. Not close to his uncle, but the connection is enough to make the player suspicious. The clearing beat: Wade's wreck-reading shows the sabotage was done on the ground before the pilot took the plane.

**Side romance (Wade).** Casual, elsewhere in the story. Candidates: bar waitress/musician, hospital nurse, daughter of the oil landman or city councilman.

**Villains.** Some mix of the city councilman holding the family's land, an oil company landman, and Wade's commanding officer at Eielson. Main face TBD.

Cultural note: bring in Athabascan writers/consultants for Eli, Lucy, their family, and language.

## The Real Wrong

Eli and Lucy's family filed a Native allotment application for their fish camp decades ago. The paperwork vanished. A white settler now on the city council holds title. The geologist's survey data shows why that land suddenly matters.

## Structure (one year, four seasons)

**Act 1 — Flood (Aug 1967).** Wade is sent into drowned Fairbanks. Meets Eli. They find the geologist's body in a collapsed cabin; ruled an accident. Lucy disagrees. Barfight set piece: Wade's first real fight, Eli steps in, friendship begins. Teaches stealth and survival systems in flooded streets.

**Act 2 — Freeze-up (fall).** Wade joins Lucy's investigation. He can go where she can't: the base, officers' club, oil men's hotel bar. Spying, eavesdropping, document theft, tailing.

**Act 3 — Deep winter.** Lucy flies to the geologist's survey camp in the Alaska Range to recover his notes and samples. The plane goes down. Lucy (playable) and the pilot survive one to two days in the wreck before the search party finds them. Wade gets onto the rescue team through a buddy on it. Near the crash site the team splits up to search, which opens a survival/exploration section: Wade alone on cross-country skis, moving through the Alaska Range in deep winter. He reaches the wreck out of his depth and has to be told what to do to stay alive.
  - Fact-check: who actually ran a 1967 Alaska Range crash search (Air Force rescue out of Eielson or Elmendorf, Civil Air Patrol, Army ski troops from Fort Wainwright/Fort Greely), and how an airman from munitions could plausibly tag along. Wade's contribution is reading the wreck: it was sabotaged. Railroad past Denali; Anchorage side trip (oil offices, land lawyers, post-earthquake city).

**Act 4 — Breakup (spring 1968).** Prudhoe Bay goes public. What Wade knows now matters. Endings.

## Twists

1. The geologist was on the family's side. Oil interests were using his survey data to grab land before Native claims settled. He died on his way to give proof to Lucy.
2. Lucy befriended Wade at first because she needed base access. The friendship became real later. Mirrors Wade's own betrayal option.
3. Wade's CO is feeding information to the oil men, and Wade has been feeding it to his CO without knowing, through his letters home. Eli is the one who catches on.
4. The cabin collapse used explosives from Eielson's munitions stock, traced to Wade's signature. He is being set up as the fall guy.
5. (Optional) Eli was at the cabin the night of the flood. He's hiding something, but not what the player assumes.

## Lucy's Confession

- **When.** Late Act 3, after the crash, once Wade has read the sabotaged wreck and the frame-up (Twist 4) is coming together.
- **How.** Under duress. Wade is angry and about to act on it, and his plan assumes Lucy's loyalty. She has to tell him before he commits, because the move only works (or only stays survivable) if he knows the truth. ("I picked you because you had access. Now they've picked you too.")
- **Trigger.** Furious about the crash, Wade blusters about going after the councilman (e.g. blowing his safe for the stolen allotment file; exact act TBD) and assumes Lucy has his back. She lets him vent. When he actually starts getting ready to do it, she intercepts him and tells him the truth, because Eielson explosives in his hands are exactly what the frame-up needs (Twist 4).
- Rule: the confession is never romantic or gratitude-driven.

## Endings

Driven by player morals and early-game choices.

- **Betrayal.** Wade gives up his friends for promotion, money, a ticket home.
- **Complicity.** Earlier choices (where he was, who he was with, what he wrote) trap him in the murder cover-up.
- **Sacrifice.** Wade exposes everything at personal cost (career, freedom, maybe life); the family gets their land back.

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
- Main face of the villains
- When the player learns Lucy was using Wade
- Side romance pick and whether it pulls toward betrayal
- Eli's secret (Twist 5): keep or cut, and what it is
- Title
- Smoking mechanics: which hooks to keep

## Continuing in Claude Code

Use the AskUserQuestion tool to interview me about the open questions in this doc, one or two questions at a time with concrete options. Ask about history I might not know when it affects a decision, and flag anything that needs fact-checking. After each answer, update this file and remove resolved items from Open Questions.
