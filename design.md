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
- **Anchorage.** Still rebuilding from the 1964 Good Friday earthquake. Off-screen only; referenced in reports and dialogue.
- **Alaska Railroad.** Runs past Denali (then Mount McKinley National Park).

To verify before writing dialogue: exact munitions unit names and job titles at Eielson in 1967; which units responded to the 1967 flood; land freeze dates.

## Cast (placeholder names)

**Wade Pruett.** 19, Air Force munitions airman at Eielson, from the Texas plains, first time away from home, never seen snow. Creative tinkerer and musician (guitar). Bored, likable, easy to use. Drinks. Smokes. Water-skied growing up, behind his better-off cousins' boat on a Texas reservoir. Capable of turning gritty or evil depending on player choices. Partly inspired by a real Eielson munitions airman: a kind, creative guy who built homemade flamethrowers for his kids.

**Eli.** Local Athabascan man, Wade's friend. Funny, proud, angry underneath. River freighter: runs freight and people by riverboat between Fairbanks and the villages, knows every slough, and his boat is a lifeline in the flood. Does odd jobs in winter when the boat is iced in. Hears everything up and down the river, which makes him a natural source of errands for Wade. Never drinks at any point in the game.

**Lucy.** Eli's sister. Hates cigarettes, which puts her at odds with Wade. Clerk at the land office; the real brain of the investigation. Fully independent. Bush-competent, at least as capable as any pilot at winter survival. Not a love interest for Wade. Never a victim of a white-savior arc.

**Wade's mother.** Back home in Texas. Wade writes to her all year; she is his moral compass. He can be honest with her or lie to her, and she has no way to check (she's in Texas), which is the point: lying to her is free, so choosing honesty means something.


**Joan Halvorsen (the nurse, Wade's side romance).** Hospital nurse in Fairbanks. Introduced early, in Act 1 during the flood (triage, evacuation, or when the geologist's body comes in). She saw the body and is a good source for conversations about how he really died. The romance picks up in Act 3/4 when Wade comes back with a broken arm. She isn't scheming: she represents the easy road (a nice girl, a good job, staying out of trouble). In the bad ending Wade gets her along with the payoff, and the game lets you feel what that comfort cost. In the good ending she gives up on a man who keeps choosing trouble.
  - Fact-check: which hospital served Fairbanks in 1967 (likely St. Joseph's) and how the flood hit it.

**Jake Bueller (the straight-arrow mechanic and pilot).** Bush plane mechanic and pilot. Inspired by a real Fairbanks friend, a mechanic and medevac pilot: 6'7", skis and bikes, super pragmatic, quit a job once because his boss asked him to do something wrong. Picks up civilian contract maintenance work at Eielson, which is how Wade knows him and why he can get on base. Becomes Wade's informant and points his suspicion in the right direction. He flies Lucy to the survey camp in Act 3 and goes down with her. He is the city councilman's nephew and doesn't get along with his uncle, which gives the player a flicker of doubt about their informant.
  - As the pilot he looks briefly suspicious during the crash chapter, then is cleared on screen: Wade's wreck-reading shows the sabotage was done on the ground before Jake took the plane. The ambiguity must be explicitly resolved so it never reads as a dropped thread.

**The Native cop.** Fairbanks PD, Alaska Native. Overlapping jurisdiction with Barnette and different instincts: they cooperate when it's convenient and fight over turf otherwise. Went to college in Georgia and hated being treated like a curiosity for being Alaskan. Knows the crooked mechanic. The incorruptible one: can't be bought, arrests Curly in Act 3, and keeps him safe in custody.

**Inspector Vernon Barnette.** Alaska State Trooper investigator (the force had just been renamed in 1967), with statewide reach. Looking into the frontier chaos from early in the game. A fictional descendant of E.T. Barnette, who founded Fairbanks as a trading post and left town in disgrace after his bank collapsed. Carries a chip on his shoulder about the family name and wants to be the law his ancestor wasn't. Swamped by the flood, he's the one who rushes the geologist's death through as an accident. Every time Wade and Lucy dig, they make him look bad; after the barfight he also ties Wade to Curly. He decides he hates Wade and keeps turning up throughout the game. Honest but wrong. In the best ending he swallows his pride and makes the arrest himself. Agency and exact title TBD.
  - Fact-check: E.T. Barnette details (trading post 1901, bank collapse and embezzlement charges around 1911, left Fairbanks) and whether real descendants exist who might object.
  - Fact-check: Alaska State Troopers' 1967 renaming, investigator ranks/titles, and Trooper vs. Fairbanks PD jurisdiction in town.

**Villains.** A conspiracy of mixed guilt; nobody is a cartoon.
- **Franklin Ashby, the land lawyer (the landman, hidden).** The ultimate villain, disguised. Presents as a sympathetic lawyer helping Native families with allotment claims. In the prologue, the geologist mentions to Wade at the bar that there's "a lawyer who's helping me do right by the Native families": a throwaway nice detail that is actually the first clue. The landman fooled the geologist too. Lucy trusts him because the geologist did, and hands him evidence. Secretly working for the oil interests, which is how the family's paperwork keeps vanishing. Orders things done but never gets his own hands dirty. The reveal flips everything Lucy did. Players should suspect the councilman and the CO first. Nothing in his early scenes should say "oil."
- **The city councilman.** Holds title to the family's fish camp. In on the land grab, not the murder. His nephew Jake was flying the plane the conspiracy rigged; when he learns that, he becomes the conspirator who can flip (part of the hidden best run).
- **Wade's CO.** Feels trapped in his career and wants to retire into money; an oil company job is waiting if he plays along. Reads Wade's mail off the books to learn what Wade knows, and controls the munitions paperwork, forging Wade's signature on the missing charges. Twists 3 and 4 are both him.
- **Curtis "Curly" Boone (the crooked mechanic).** A bush plane mechanic and a fellow Texan, Wade's foil: what Wade could turn into if he takes the money. Their shared accent and homesickness make him easy for Wade to like and trust, which makes the betrayal personal. Introduced early as a likable local. Keeps the geologist's charter plane running and ferried him to field sites all summer, so he knows the survey camp, the flight schedules, and what the data means. Hungry for money; sold him out to the landman and was part of his murder. Left-handed. He is the one who rigged Lucy's plane. Arc:
  - **The murder (Aug 1967):** during the flood, Curly offers his friend the geologist a skiff ride across the water to Lucy. He takes him to a flooded cabin instead, holds him under, and leaves the body tied to submerged debris. The proof the geologist carried disappears. Two separate clues: the knot is a cowboy bowline, the version of the bowline Texas ranch hands tie (points at a Texan, briefly including Wade); and Joan noticed bruising on the body consistent with a left-handed grip holding him under.
    - Fact-check: the cowboy bowline's name, handedness, and association with Texas/ranch work; 1967 flood death toll.
  - **Act 1:** in the barfight, hauled in and let go; the cops already know him.
  - **Fair-play clues before the bow:** he casually ties a cowboy bowline in front of Wade while doing some job; and he gets drunk and lets slip to Jake Bueller how he's planning to get out of town (money coming, a way out), which Jake later passes along to Wade.
  - **Act 3:** after the crash, he realizes the landman is cleaning up loose ends and he's next. He breaks into a cabin and steals a new left-handed hunting bow as preemptive self-defense, figuring a killing with a bow would be harder to trace to him than a rifle. The Native cop arrests him for the burglary.
  - **Custody keeps him alive.** The landman can't arrange an "accident" for a man in active police custody, and the Native cop is a straight arrow who can't be bought. The left-handed bow is how Wade learns Curly is a lefty; with the knot and Joan's bruising, it clicks.
  - Fact-check: left-handed hunting bows were available in 1967 (Bear Archery and others likely made them); bowhunting in 1960s Alaska.

Cultural note: bring in Athabascan writers/consultants for Eli, Lucy, their family, and language.

## The Real Wrong

Eli and Lucy's family filed a Native allotment application for their fish camp decades ago. The paperwork vanished. A white settler now on the city council holds title. The geologist's survey data shows why that land suddenly matters.

Why a fish camp near Fairbanks matters to oil found ~400 miles north: the geologist's data is an early insider read on Prudhoe (the discovery well wasn't drilled out until winter 1967-68 and wasn't public until 1968), and the fish camp sits on the river crossing and gravel source any future haul road or pipeline north would need. The landman is buying ahead of information nobody else has. The Act 4 Prudhoe announcement is the player's "oh, that's why."
  - Fact-check: Prudhoe discovery well timeline; gravel's role in North Slope road/pipeline construction; plausible route geography near Fairbanks.

## Barfight Ensemble

Goal: introduce as many characters as possible in one chaotic Act 1 scene, then tie them back in later (or cut).
- Confirmed: Wade, Eli, Curly Boone, the Native cop, Inspector Barnette (arrives in the aftermath).
- Candidates: Jake Bueller, Joan Halvorsen (patching people up afterward), the councilman, the land lawyer (as a friendly face, not a suspect).

## Structure (one year, four seasons)

**Prologue — The geologist (summer 1967, before the flood).** The player starts as the geologist, Dr. Owen Marsh. He meets Wade at a bar, introduced by Curly Boone, his charter mechanic-pilot and Wade's fellow Texan: friendly small talk, nothing ominous. All three share the first scene. The player learns the town, the controls, and likes this guy before he dies. Wade's first friend in Fairbanks is the first casualty.


**Act 1 — Flood (Aug 1967).** Wade is sent into drowned Fairbanks. Meets Eli. They find the geologist's body drowned in a flooded cabin, tied to submerged debris; Barnette, overwhelmed by the flood, rushes it through as an accident ("tangled in a line in the current"). Lucy disagrees. Lucy needs base access because the geologist's survey relied on Air Force aerial photography, and the originals are on base.
  - Fact-check: Air Force aerial photo coverage of Interior Alaska in the 1950s-60s and where originals were kept. Barfight set piece: Wade's first real fight, Eli steps in, friendship begins. The barfight is an ensemble scene that introduces as much of the cast as possible (see Barfight Ensemble). The crooked mechanic is in it and gets hauled in afterward; the cops already know him. Teaches stealth and survival systems in flooded streets.

**Act 2 — Freeze-up (fall).** Wade joins Lucy's investigation. He can go where she can't: the base, officers' club, hotel bars. Spying, eavesdropping, document theft, tailing. Anchorage happens off-screen: Lucy's trips there (land office records, the land lawyer) are reported back, not played. Freeze-up grounds bush planes while they switch from floats to skis, which is why the survey-camp flight has to wait until deep winter.
  - Fact-check: float-to-ski changeover timing for Interior bush planes.

**Act 3 — Deep winter.** Lucy flies to the geologist's survey camp in the Alaska Range to recover his notes and samples. The plane goes down. Lucy (playable) and Jake survive one to two days in the wreck before the search party finds them. Wade gets onto the rescue team through his own base connections: the searchers need a munitions man for flares and signal charges. Near the crash site the team splits up to search, which opens a survival/exploration section: Wade alone on cross-country skis, moving through the Alaska Range in deep winter. He reaches the wreck out of his depth, breaks his arm trying to get Lucy out, and has to be told what to do to stay alive. While they wait, he shares a cigarette with Jake (a quiet beat with the man the player briefly suspects), and that's when he notices the damage that tells him the plane was sabotaged.
  - Broken arm: carries into later chapters (one-handed climbing and crafting, no guitar for a while). Extent TBD.
  - Idea: lighting up near a wreck that might be leaking fuel is its own tension beat.
  - Fact-check: who actually ran a 1967 Alaska Range crash search (Air Force rescue out of Eielson or Elmendorf, Civil Air Patrol, Army ski troops from Fort Wainwright/Fort Greely), and how an airman from munitions could plausibly tag along. Wade's contribution is reading the wreck: it was sabotaged. Railroad past Denali.

**Act 4 — Breakup (spring 1968).** Prudhoe Bay goes public. At breakup, someone blows an ice jam with Eielson charges signed out under Wade's name, flooding out the family's fish camp and wiping out the signs of use and occupancy their allotment claim depends on. What Wade knows now matters. Endings.
  - Fact-check: dynamiting ice jams on Interior rivers in the 1960s; whether 1906 Act allotments required proof of use and occupancy (likely five years, per the 1956 amendment).

## Twists

1. The geologist was on the family's side. Oil interests were using his survey data to grab land before Native claims settled. He died on his way to give proof to Lucy.
2. Lucy befriended Wade at first because she needed base access. The friendship became real later. Mirrors Wade's own betrayal option.
3. Wade's CO is feeding information to the oil men, and Wade has been feeding it to his CO without knowing, through his letters home. The worst leak: Wade tells Mom the date of Lucy's survey-camp flight. The CO passes it on, and Curly rigs the plane. Eli catches on because only four people knew the date: Eli, Lucy, Jake, and Wade.
4. Eielson munitions are going missing under Wade's forged signature (the CO's work). Lucy uncovers the paper trail late in Act 3; in Act 4 the charges are used to blow the ice jam that floods the fish camp. He is being set up as the fall guy.
5. Eli was out on the water near the cabin the night of the flood and saw a skiff there. He keeps quiet because he was trespassing: the councilman, who holds title to the family's fish camp, had banished him from the land, and Eli went back in the flood to retrieve his own belongings. Illegal only because of the stolen land claim. The player assumes he's guilty; the truth is he's a reluctant witness. In the bad ending, the trespass puts him near the murder scene and he's wrongfully imprisoned.

## Lucy's Confession

- **When.** Late Act 3, after the crash, once Wade has read the sabotaged wreck and the frame-up (Twist 4) is coming together.
- **How.** Under duress. Wade is angry and about to act on it, and his plan assumes Lucy's loyalty. She has to tell him before he commits, because the move only works (or only stays survivable) if he knows the truth. ("I picked you because you had access. Now they've picked you too.")
- **Trigger.** Furious about the crash, Wade blusters about going after the councilman (e.g. blowing his safe for the stolen allotment file; exact act TBD) and assumes Lucy has his back. She lets him vent. When he actually starts getting ready to do it, one-armed in a cast, she realizes how reckless he's become and intercepts him and tells him the truth, because Eielson explosives in his hands are exactly what the frame-up needs (Twist 4).
- **Reveal timing.** The player learns it at the same moment Wade does. Lucy's playable chapters are honest but never show her motive, so on a replay her early scenes read completely differently.
- Rule: the confession is never romantic or gratitude-driven.

## Endings

### Shape: double helix

Two strands (Wade's loyalty, and the evidence/justice trail) wind through the game.
- **Acts 1-2 (seeding).** Choices and relationships are planted: what Wade tells Mom, who he trusts, what he notices, what he steals, who he drinks with.
- **Act 3 crash (the center).** The plane crash and Lucy's confession are the crossing point where both strands meet.
- **Act 3 aftermath - Act 4 (unwinding).** Earlier choices pay off KOTOR-style: specific late-game details change based on early decisions (who's alive, who's in jail, who believes Wade, which evidence exists).

### Three real endings

**Wade is good.** Eli and Lucy survive and stay out of jail. Joan ends up with someone else. The family's land claim survives.

**Wade is in the middle.** One ending with flavors: Curly and some conspirators go down, but the landman walks and the oil money arrives anyway. Bittersweet and historically honest. Flavor depends on path, e.g. **burn it down** (Wade uses his munitions skills for revenge and becomes the dangerous airman Barnette always said he was).

**Double agent** is a route, not an ending: Wade pretends to sell out to the landman to get him on the record. If he's been honest with Lucy and Eli, it lands in the good ending (and is the road to the hidden best outcome); if he's lied to them, it collapses into the bad one.

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

### How the land lawyer gets exposed

Three arrangements, each growing out of a different route through the story.

- **A. Paper route (Lucy's).** Default path toward the good ending. During a heist, Wade or Lucy finds a document in the CO's files that Lucy gave only to the lawyer. Eli's flight-date deduction lines up with it: the CO had no reason to care about Lucy's flight unless someone asked him. After the crash, the geologist's reel-to-reel tapes from the survey camp have him doubting the lawyer the week before he died. Lucy knows, but on paper alone it's circumstantial: Wade testifying (decision 7) is what makes it public.
- **B. Confession route (Curly's).** Road to the hidden best outcome. Wade kept Curly alive and earned some trust (acted on the escape-plan tip, handled the arrest well). Scared and in custody, Curly names the man who paid him. The councilman flips over Jake's crash: a second witness. Barnette swallows his pride and makes the arrest.
- **C. Offer route (Wade's).** Bad ending and double agent. The lawyer comes to Wade with the offer (decision 6) himself; being bought is how Wade learns who's at the top. Take it: he knows and keeps quiet (bad ending). Fake taking it: he gets the lawyer on the record (double agent).
- **No route finished.** Middle ending: Lucy suspects him, can't prove it, and he walks.

### Epilogues

Per-character beats that vary within each ending: Eli, Lucy, Curly, Barnette, Joan, Jake, the councilman, the CO, the landman, Mom (her last letter reflects what Wade told her vs. what happened).

### Hidden best outcome

The landman can be arrested, but only with near-flawless play: the right evidence, the right trust, the right timing. Expected to take 2-3 varied playthroughs to find. One scenario also lets Wade save Curly.

## Systems

- **Letters home.** Wade and his mother write back and forth all year; doubles as journal/save system. Each letter is a chance to tell her the truth or lie. Her replies react to what he tells her, not what really happened. Writing-choice mechanism TBD. 
  - **The CO reads Wade's mail.** Neither Wade nor Lucy knows; most players won't expect it either. This is how Twist 3 works: Wade accidentally lets slip something in a letter to his mother that the CO isn't supposed to know. The CO acts on it, and Eli notices that decision and realizes the CO knows something he shouldn't. That is how the protagonists find out.
  - Fact-check: routine censorship of personal mail was mostly a wartime practice; peacetime airmen in 1967 probably weren't censored as policy. Easy fix that keeps the plot: the CO does it quietly and off the books, so the realism holds up for players who know the history.
- **Stealth.** Primary mode in town and on base.
- **Spying (core).**
  - **Eavesdropping.** Overhear conversations through walls, vents, and crowded bars, with music as cover. Partial information; the player fills in the gaps.
  - **Document theft.** Both Wade and Lucy steal. Wade lifts files from the CO's office on base; Lucy takes documents from the land office and the offices she can get into. Lift, copy, or photograph. Lucy reads what Wade steals.
  - **Heist structure.** Each theft is a self-contained job: case the place, get in, solve the room (escape-room-style puzzles: locked drawers, combination safes, filing systems, timed patrols), get out.
  - **Uncertain stakes (design pillar).** The pressure should feel real while the player isn't sure it's justified. Is this theft worth it? Does it even matter? Some jobs turn up nothing useful, some turn up evidence whose value only shows later, and the player rarely knows which while doing it. Mildly stressful as a moral dilemma, not a puzzle with a known payoff.
  - **Refusing a job.** Wade can refuse some jobs. For a small number of key ones (at least the CO theft), someone else does it anyway, worse, and it plays out later: e.g. Lucy or Eli takes the risk and draws the heat. Kept to a few jobs to contain scope.
    - **The CO theft.** If Wade refuses, Lucy does it herself: she gets in through a cleaning crew or a delivery, gets the file, and is spotted on the way out. Barnette now has a Native woman tied to a break-in on an Air Force base, and Lucy carries the heat for the rest of the act. The evidence still reaches the investigation; Wade lives with having said no.
  - **Heat.** Thefts raise heat with the law. Barnette and the Native cop get on the trail; high heat means patrols, questioning, searches, and a chance of capture. Getting caught has consequences rather than a game over (drunk tank, interrogation by Barnette, lost evidence).
- **Survival.** Cold, light, calories, frostbite; seasons change the map (flood, freeze, dark, breakup).
- **Skiing.** Cross-country skis for the Act 3 rescue search. Wade has never seen snow, but he grew up water skiing, so he's overconfident. His balance on downhills carries over; kick-and-glide on the flats and climbing don't, and he has to learn those.
- **Smoking.** Wade smokes. Possible hooks (TBD): lighter and matches as a fire source, cigarettes as social currency on base and in bars, cravings vs. stamina in the cold, smoke or a lit cigarette giving away his position in stealth.
- **Crafting/tinkering.** Munitions skills: flares, noisemakers, small charges (ice jams, doors), lock tools, engine thawing, one sketchy homemade flamethrower. Same tools serve help or harm.
- **Music.** Guitar as social stealth: house parties, bars, fish camp, access to rooms a uniform can't enter.
- **Combat.** Rare and grounded. Barfight is the chaos showcase: mud, hot stove, moose rack, bottles, slippery floor, regulars picking sides. Losing has consequences (drunk tank, recognized by a cop).
- **Lucy.** Companion in town (people and paper puzzles, paired with Wade's physical problem-solving) and playable in her own chapters: land office records puzzle, crash survival.

## Tech Notes

- Engine-only PlayCanvas with TypeScript so agents can work entirely in the repo (the hosted editor isn't agent-friendly).
- Dense downtown hub plus discrete levels (Eielson, Denali crash site) instead of a full open world, to keep browser loading sane.
- Steam: Electron for consistent Chromium; Tauri on Linux uses WebKitGTK, which can differ on WebGL/WebGPU.
- Multi-agent Saddle split candidates: narrative/lore, level layout, systems, QA.

## Open Questions

- Letter-writing choice mechanism
- Wade's exact rash act against the councilman (safe job or otherwise)
- Whether the crooked mechanic's guilt is exposed publicly or kept quiet (player choice), now that the Eli-rescue beat is replaced by the arrest
- Ashby: early scenes that make him likable
- Owen Marsh's presence after the prologue (journals, reel-to-reel tapes at the survey camp)
- Twist 5: when Eli finally tells Wade he saw the skiff, and what makes him talk
- Endings: how the seven decisions combine into good/middle/bad, and which early choices map to which late-game changes
- Title
- Native cop's name (from Athabascan consultants)
- Smoking mechanics: which hooks to keep
- Heat system: how heat rises and cools, and whether the two lawmen track it separately

## Continuing in Claude Code

Use the AskUserQuestion tool to interview me about the open questions in this doc, one or two questions at a time with concrete options. Ask about history I might not know when it affects a decision, and flag anything that needs fact-checking. After each answer, update this file and remove resolved items from Open Questions.
