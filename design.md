# Second Rush — Design Draft v0.2

Working title: Second Rush
Engine: PlayCanvas (engine-only, TypeScript, glTF pipeline)
Targets: Browser first; Steam later via Electron wrapper

## Pitch

A grounded stealth-and-survival mystery set in Fairbanks, Alaska, from the Chena River flood of August 1967 to the Prudhoe Bay oil announcement in spring 1968: the last year before oil money changed Alaska. A bored young airman from Texas befriends a local Athabascan brother and sister, and a drowned geologist turns out to be the first casualty in a fight over who will own the land the road to the oil has to cross.

Inspirations: Breath of the Wild (traversal, physics, systemic puzzles), BioShock Infinite (place-as-character, companion bond, layered twists).

## Historical Backbone

- **Chena River flood, August 1967.** Most of Fairbanks underwater. Opening act.
- **Prudhoe Bay discovery, announced 1968.** State lease sale in 1969 brought in ~$900M. The game ends right before the money arrives.
- **Native land claims.** Federal freeze on land transfers pending Native claims (mid/late 1960s). Alaska Federation of Natives formed 1966. Native newspaper published in Fairbanks.
- **1906 Native Allotment Act.** Up to 160 acres per applicant; many applications lost, stalled, or rejected while others filed on the same land.
- **Rampart Dam proposal (backdrop).** Would have flooded Yukon Flats Athabascan villages; dead by ~1967.
- **Eielson AFB.** Est. 1943 as Mile 26 Satellite Field, Eielson AFB from 1948, ~26 miles from Fairbanks. 1960s: F-102/F-106 interceptor detachment (1960-69), SAC bomber/tanker staging facilities, Army brigades training on site, frequent Eielson rescue missions.
- **Anchorage.** Still rebuilding from the 1964 Good Friday earthquake. Off-screen only; referenced in reports and dialogue.

To verify before writing dialogue: exact munitions unit names and job titles at Eielson in 1967; which units responded to the 1967 flood; land freeze dates.

## Cast

**Wade Pruett.** 19, Air Force munitions airman at Eielson, from the Texas plains, first time away from home, never seen snow. Creative tinkerer and musician (guitar). Bored, likable, easy to use. Drinks. Smokes. Water-skied growing up, behind his better-off cousins' boat on a Texas reservoir. Capable of turning gritty or evil depending on player choices. Partly inspired by a real Eielson munitions airman: a kind, creative guy who built homemade flamethrowers for his kids.

**Eli.** Local Athabascan man, Wade's friend. Funny, proud, angry underneath. River freighter: runs freight and people by riverboat between Fairbanks and the villages, knows every slough, and his boat is a lifeline in the flood. Does odd jobs in winter when the boat is iced in. Hears everything up and down the river, which makes him a natural source of errands for Wade. Never drinks at any point in the game.

**Lucy.** Eli's sister. Hates cigarettes, which puts her at odds with Wade. Clerk at the land office; the real brain of the investigation. Fully independent. Bush-competent, at least as capable as any pilot at winter survival. Not a love interest for Wade. Never a victim of a white-savior arc.

**Wade's mother.** Back home in Texas. Wade writes to her all year; she is his moral compass. He can be honest with her or lie to her, and she has no way to check (she's in Texas), which is the point: lying to her is free, so choosing honesty means something.


**Joan Halvorsen (the nurse, Wade's side romance).** Hospital nurse in Fairbanks. Introduced early, in Act 1 during the flood (triage, evacuation, or when the geologist's body comes in). She saw the body and is a good source for conversations about how he really died. The romance picks up in Act 3/4 when Wade comes back with a broken arm. She isn't scheming: she represents the easy road (a nice girl, a good job, staying out of trouble). In the bad ending Wade gets her along with the payoff, and the game lets you feel what that comfort cost. In the good ending she gives up on a man who keeps choosing trouble.
  - Fact-check: which hospital served Fairbanks in 1967 (likely St. Joseph's) and how the flood hit it.

**Jake Bueller (the straight-arrow mechanic and pilot).** Bush plane mechanic and pilot. Inspired by a real Fairbanks friend, a mechanic and medevac pilot: 6'7", skis and bikes, super pragmatic, quit a job once because his boss asked him to do something wrong. Picks up civilian contract maintenance work at Eielson, which is how Wade knows him and why he can get on base. Becomes Wade's informant and points his suspicion in the right direction. He flies Lucy to the survey camp in Act 3 and goes down with her. He is the city councilman's nephew and doesn't get along with his uncle, which gives the player a flicker of doubt about their informant.
  - As the pilot he looks briefly suspicious during the crash chapter, then is cleared on screen: Wade spots the tampered fuel system, proving the water was added on the ground on purpose, not left by a pilot who skipped his preflight. The ambiguity must be explicitly resolved so it never reads as a dropped thread.

**The Native cop.** Fairbanks PD, Alaska Native. Overlapping jurisdiction with Barnette and different instincts: they cooperate when it's convenient and fight over turf otherwise. Went to college in Georgia and hated being treated like a curiosity for being Alaskan. Knows the crooked mechanic. The incorruptible one: can't be bought, arrests Curly in Act 3, and keeps him safe in custody.

**Inspector Vernon Barnette.** Alaska State Trooper investigator (the force had just been renamed in 1967), with statewide reach. Looking into the frontier chaos from early in the game. A fictional descendant of E.T. Barnette, who founded Fairbanks as a trading post and left town in disgrace after his bank collapsed. Carries a chip on his shoulder about the family name and wants to be the law his ancestor wasn't. Swamped by the flood, he's the one who rushes the geologist's death through as an accident. Every time Wade and Lucy dig, they make him look bad; after the barfight he also ties Wade to Curly. He decides he hates Wade and keeps turning up throughout the game. Honest but wrong. In the best ending he swallows his pride and makes the arrest himself. Agency and exact title TBD.
  - Fact-check: E.T. Barnette details (trading post 1901, bank collapse and embezzlement charges around 1911, left Fairbanks) and whether real descendants exist who might object.
  - Fact-check: Alaska State Troopers' 1967 renaming, investigator ranks/titles, and Trooper vs. Fairbanks PD jurisdiction in town.

**Dottie Vinson (placeholder name), the gossip.** Counter waitress at the Northern Lights Café on Second Avenue; ran the telephone switchboard for eleven years, cousin married to a city cop. An optional stop at the three decision points where heat matters (before the CO heist, before lying low, before Wade's rash act). She tells Wade, in coarse in-character tiers, how much the law is watching him and Lucy. She never says whether a job is worth doing, which protects the uncertain-stakes pillar. Asking her costs nothing and changes nothing.

**Villains.** A conspiracy of mixed guilt; nobody is a cartoon.
- **Franklin Ashby, the land lawyer (the landman, hidden).** The ultimate villain, disguised. Presents as a sympathetic lawyer helping Native families with allotment claims. In the prologue, the geologist mentions to Wade at the bar that there's "a lawyer who's helping me do right by the Native families": a throwaway nice detail that is actually the first clue. The landman fooled the geologist too. Lucy trusts him because the geologist did, and hands him evidence. His interest in Wade is the same as Lucy's: an airman with base access is useful, a dark mirror of Twist 2. Why players like him: he helps Wade personally (gets him out of the drunk tank after the barfight, talks Barnette down, and Wade owes him), and he genuinely wins small claims for other Native families, so his reputation is earned, which makes the betrayal worse. Secretly working for the oil interests, which is how the family's paperwork keeps vanishing. Orders things done but never gets his own hands dirty. The reveal flips everything Lucy did. Players should suspect the councilman and the CO first. Nothing in his early scenes should say "oil."
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

**Prologue — The geologist (summer 1967, before the flood).** The player starts as the geologist, Dr. Owen Marsh. He meets Wade at a bar, introduced by Curly Boone, his charter mechanic-pilot and Wade's fellow Texan: friendly small talk, nothing ominous. All three share the first scene. After the prologue Owen stays present through memory: Curly, Ashby, Joan, and Wade each remember a different Owen, which tells you as much about them as about him. His reel-to-reel tapes at the survey camp exist as a clue (paper route), not a recurring device. The player learns the town, the controls, and likes this guy before he dies. Wade's first friend in Fairbanks is the first casualty.


**Act 1 — Flood (Aug 1967).** Wade is sent into drowned Fairbanks. Meets Eli. They find the geologist's body drowned in a flooded cabin, tied to submerged debris; Barnette, overwhelmed by the flood, rushes it through as an accident ("tangled in a line in the current"). Lucy disagrees. Lucy needs base access because the geologist's survey relied on Air Force aerial photography, and the originals are on base.
Barfight set piece: Wade's first real fight, Eli steps in, friendship begins. The barfight is an ensemble scene that introduces as much of the cast as possible (see Barfight Ensemble). The crooked mechanic is in it and gets hauled in afterward; the cops already know him. Teaches stealth and survival systems in flooded streets.
  - Fact-check: Air Force aerial photo coverage of Interior Alaska in the 1950s-60s and where originals were kept.

**Act 2 — Freeze-up (fall).** Wade joins Lucy's investigation. He can go where she can't: the base, officers' club, hotel bars. Spying, eavesdropping, document theft, tailing. Anchorage happens off-screen: Lucy's trips there (land office records, the land lawyer) are reported back, not played. Freeze-up grounds bush planes while they switch from floats to skis, which is why the survey-camp flight has to wait until deep winter.
  - Fact-check: float-to-ski changeover timing for Interior bush planes.

**Act 3 — Deep winter.** Lucy and Jake fly to Owen's survey camp in the hills north of Fairbanks, toward the Yukon crossing, where he was scouting the gravel and river crossings a road north would need. She recovers his notes, samples, and reel-to-reel tapes. On the flight home the plane goes down with the evidence aboard. The sabotage: water in the fuel, which freezes in the lines in deep cold, a classic Alaskan crash cause that looks like pilot error (Jake supposedly skipped draining the fuel sumps), which is why Jake looks briefly guilty. Lucy (playable) and Jake survive one to two days in the wreck before the search party finds them. Wade gets onto the rescue team through his own base connections: the searchers need a munitions man for flares and signal charges. Near the crash site the team splits up to search, which opens a survival/exploration section: Wade alone on cross-country skis, moving through the northern hills in deep winter dark. He reaches the wreck out of his depth, breaks his arm trying to get Lucy out, and has to be told what to do to stay alive. While they wait, he shares a cigarette with Jake (a quiet beat with the man the player briefly suspects), and that's when he spots the deliberately loosened sump drain or doctored fuel cap that proves the water was put there on purpose.
  - Fact-check: water-in-fuel icing as a winter bush-plane crash cause; sump draining practice in 1960s light aircraft.
  - Broken arm: carries into later chapters (one-handed climbing and crafting, no guitar for a while). Extent TBD.
  - Idea: lighting up near a wreck that might be leaking fuel is its own tension beat.
  - Fact-check: who actually ran a 1967 winter crash search north of Fairbanks (Air Force rescue out of Eielson or Elmendorf, Civil Air Patrol, Army ski troops from Fort Wainwright/Fort Greely), and how an airman from munitions could plausibly tag along.

**Act 4 — Breakup (spring 1968).** Prudhoe Bay goes public. At breakup, the CO, trapped and desperate for his payout, blows an ice jam himself with the Eielson charges he forged out under Wade's name, flooding out the family's fish camp and wiping out the signs of use and occupancy their allotment claim depends on. This is the CO's hands-on villain moment and the Act 4 set piece: a confrontation on the river ice at breakup, where Wade can stop him, catch him, or fail to (outcome follows the decisions, not its own choice). What Wade knows now matters. Endings.
  - Fact-check: dynamiting ice jams on Interior rivers in the 1960s; whether 1906 Act allotments required proof of use and occupancy (likely five years, per the 1956 amendment).

## Twists

1. The geologist was on the family's side. Owen was contracted, through Ashby it turns out, with oil money to survey routes and gravel north. He realized his data was being used to grab Native land before claims settled and turned to Lucy. He died on his way to give her proof. After the murder Curly stripped the survey camp, but Owen had cached his real notes and tapes somewhere only Lucy knew about, from a letter he'd sent her. That's why the plane is rigged: Lucy coming back means the cache is found.
2. Lucy befriended Wade at first because she needed base access. The friendship became real later. Mirrors Wade's own betrayal option.
3. Wade's CO is feeding information to the oil men, and Wade has been feeding it to his CO without knowing, through his letters home. The worst possible leak: Wade tells Mom the date of Lucy's survey-camp flight. The crash happens in every playthrough; the leak decides whose fault it is. If Wade leaked it, the CO passed it on and Curly rigged the plane in time: it's Wade's fault, Eli suspects Wade (only four people knew the date: Eli, Lucy, Jake, and Wade), and that guilt runs through Act 4. If Wade didn't leak, Curly learned the date by watching Jake prep the plane at the airfield: Wade is innocent and Eli trusts him.
4. Eielson munitions are going missing under Wade's forged signature (the CO's work). Lucy, recovering after the crash, finds the paper trail in the CO's files stolen during the Act 2 heist (by Wade, or by Lucy if he refused); in Act 4 the charges are used to blow the ice jam that floods the fish camp. He is being set up as the fall guy.
5. Eli was out on the water near the cabin the night of the flood and saw a skiff there. He keeps quiet because he was trespassing: the councilman, who holds title to the family's fish camp, had banished him from the land, and Eli went back in the flood to retrieve his own belongings. Illegal only because of the stolen land claim. The player assumes he's guilty; the truth is he's a reluctant witness. He tells Wade after the crash, once Lucy nearly dies (decision 4). In the bad ending, the trespass puts him near the murder scene and he's wrongfully imprisoned.

## Lucy's Confession

- **When.** Late Act 3, after the crash, once Wade has read the sabotaged wreck and the frame-up (Twist 4) is coming together.
- **How.** Under duress. Wade is angry and about to act on it, and his plan assumes Lucy's loyalty. She has to tell him before he commits, because the move only works (or only stays survivable) if he knows the truth. ("I picked you because you had access. Now they've picked you too.")
- **Trigger.** Furious about the crash, Wade blusters about going after the councilman (whom he wrongly believes is the top villain) and assumes Lucy has his back. The player chooses the plan, and each one is its own short preparation adventure: e.g. blow the councilman's safe one-armed for the stolen allotment file (which isn't even there; Ashby has it), burn his hunting cabin, or confront him at gunpoint. She lets him vent. When he actually starts carrying it out, one-armed in a cast, she realizes how reckless he's become and intercepts him. Whatever the plan, she intercepts at the same point with the same result; what changes is what the player chose to become on the way there. She tells him the truth because any crime he commits now is exactly what the frame-up needs (Twist 4), and Eielson explosives in his hands most of all.
- **Reveal timing.** The player learns it at the same moment Wade does. Lucy's playable chapters are honest but never show her motive, so on a replay her early scenes read completely differently.
- Rule: the confession is never romantic or gratitude-driven.

## Endings

### Shape: double helix

Two strands (Wade's loyalty, and the evidence/justice trail) wind through the game.
- **Acts 1-2 (seeding).** Choices and relationships are planted: what Wade tells Mom, who he trusts, what he notices, what he steals, who he drinks with.
- **Act 3 crash (the center).** The plane crash and Lucy's confession are the crossing point where both strands meet.
- **Act 3 aftermath - Act 4 (unwinding).** Earlier choices pay off KOTOR-style: specific late-game details change based on early decisions (who's alive, who's in jail, who believes Wade, which evidence exists).

### Three real endings

**Wade is good.** Eli and Lucy survive and stay out of jail. Joan ends up with someone else. The family's land claim survives. Ashby is publicly exposed and called back Outside by the company, but never sees a cell.

**Wade is in the middle.** One ending with flavors: Curly and some conspirators go down, but the landman walks and the oil money arrives anyway. Bittersweet and historically honest. Flavor depends on path, e.g. **burn it down** (Wade uses his munitions skills for revenge and becomes the dangerous airman Barnette always said he was).

**Double agent** is a route, not an ending: Wade pretends to sell out to the landman to get him on the record. If he's been honest with Lucy and Eli (decision 4: kept quiet; decision 5: stayed), it lands in the good ending (and is the road to the hidden best outcome); if he's lied to them, it collapses into the bad one.

**Wade is bad.** Ashby wins. The landman pays Wade to keep quiet. Wade gets Joan, the payoff, and some land (the irony being that it's land). Eli ends up wrongfully imprisoned, tied to what he was doing on the water the night of the flood (Twist 5). Eli's imprisonment happens if Wade reported or used Eli's trespass (decision 4) or took the offer (decision 6).

### What decides it

Seven key decision points, not a running meter. Smaller choices change details and epilogues, not which of the three endings you get.

Before the crash:
1. **Barfight aftermath.** Questioned by Barnette, Wade covers for Eli, blames Eli, or throws in with Curly.
2. **The letter leak.** What Wade tells Mom about the investigation (honest, vague, or a lie) decides what the CO learns. Above all: whether he mentions Lucy's flight date, which decides whether the crash is his fault (see Twist 3). The crash happens either way.
3. **Curly's escape plan.** When Jake passes on Curly's drunken getaway talk: warn Lucy, confront Curly, or let it go.
   - Warn Lucy: she tips the Native cop, who's watching Curly and grabs him at the Act 3 burglary before anyone gets hurt. Curly is alive, grateful, and willing to talk (opens the confession route).
   - Confront Curly: he panics and runs early. Still arrested, but hostile; won't talk.
   - Let it go: arrested late and bitter; won't talk.

After the crash:
4. **Eli's trespass.** After Lucy nearly dies, Eli stops protecting himself and tells Wade he saw the skiff, and that he was trespassing on the banished land. Wade keeps quiet, reports it, or uses it as leverage.
5. **After the confession.** Wade stays with Lucy, walks, or turns on her.
6. **The landman's offer.** Money, land, and a way out for silence: take it, refuse it, or fake taking it (double agent).
7. **Testifying.** Wade goes on the record, or doesn't. Two arenas: the Air Force inquiry into the missing munitions, where testifying against the CO risks Wade's own court-martial since it's his signature; and, if Barnette's case gets there, a state grand jury against Ashby.

The Act 4 ice jam plays out according to these choices rather than being its own decision point.

**How they combine.** Decisions 1-3 (before the crash) set Wade's leaning and decide which routes stay open (e.g. whether Curly is alive and trusting enough for the confession route). Decisions 4-7 (after the crash) pick the ending. Players can redeem themselves or fall late; early choices shape details and epilogues. This is deliberate and fits Wade as a complicated character: early sins (blaming Eli, leaking the flight date) color the story but don't lock anyone out, and a late turn in either direction is honored. Requirement: every key decision must be legible as a moral dilemma in the moment, so players who fail can work out why and find the best run on a replay.

### How the land lawyer gets exposed

Three arrangements, each growing out of a different route through the story.

- **A. Paper route (Lucy's).** Default path toward the good ending. During a heist, Wade or Lucy finds a document in the CO's files that Lucy gave only to the lawyer. If Wade leaked the flight date, Eli's deduction lines up with it: the CO had no reason to care about Lucy's flight unless someone asked him. After the crash, the geologist's reel-to-reel tapes from the survey camp have him doubting the lawyer the week before he died. Lucy knows, but on paper alone it's circumstantial: Wade testifying (decision 7) is what makes it public.
- **B. Confession route (Curly's).** Road to the hidden best outcome. Wade kept Curly alive and earned some trust (acted on the escape-plan tip, handled the arrest well). Scared and in custody, Curly names the man who paid him. The councilman flips over Jake's crash: a second witness. Barnette swallows his pride and makes the arrest.
- **C. Offer route (Wade's).** Bad ending and double agent. The lawyer comes to Wade with the offer (decision 6) himself; being bought is how Wade learns who's at the top. Take it: he knows and keeps quiet (bad ending). Fake taking it: he gets the lawyer on the record (double agent).
- **Curly's murder of Owen** follows the route: confession route, it comes out in court as part of taking down Ashby; paper route, he's convicted of the burglary only and the murder stays a secret Wade, Lucy, and Eli carry; offer route, Ashby's money makes it disappear.
- **No route finished.** Middle ending: Lucy suspects him, can't prove it, and he walks.

### Epilogues

Per-character beats that vary within each ending: Eli, Lucy, Curly, Barnette, Joan, Jake, the councilman, the CO, the landman, Mom (her last letter reflects what Wade told her vs. what happened).

### Hidden best outcome

Ashby in handcuffs, arrested by Barnette. Expected to take 2-3 varied playthroughs to find. Requires all of:
- Decision 3: warned Lucy (Curly alive and talking; this is the scenario where Wade saves Curly).
- Decision 4: kept Eli's trespass quiet. Decision 5: stayed with Lucy.
- Decision 6: refused or faked the offer. Decision 7: testified.
- The councilman flips: Wade shared the wreck evidence with Jake, who confronts his uncle (a smaller choice after the crash).
- The CO is stopped or caught at the ice jam.

## Systems

- **Letters home.** Wade and his mother write back and forth all year; doubles as journal/save system. Each letter is a chance to tell her the truth or lie. Her replies react to what he tells her, not what really happened. Each letter has three or four topics (work, friends, the investigation, how he's doing); for each the player picks a line: honest, softened, or a lie. The assembled letter reads like a real one, and the dangerous leak is visible as a choice, which is the tension. 
  - **Mama's replies.** Three replies, each a story about folks back home that quietly mirrors the decision Wade is about to face. She never states the moral. Earl Dobbs, whose friends showed up to vouch for him in court while nobody came for the Tate boy (before the double-agent and testimony choices); Wanda at the church office, who passed on the Hendersons' secret to help them and lost them for good (before Eli's trespass); and the land man from Midland who paid Wade's father to sign a lease and do nothing, leaving the well pumping salt (before Ashby's offer). Her framing shifts with how honest Wade has been; the stories don't.
  - **The CO reads Wade's mail.** Neither Wade nor Lucy knows; most players won't expect it either. This is how Twist 3 works: Wade lets slip something in a letter to his mother that the CO isn't supposed to know, and the CO acts on it. If Wade leaked the flight date, Eli, running fuel out to the bush strip, sees the CO's staff car there the night before the flight: a base officer at a civilian strip at night. Wade realizes the only way the CO could know was his letter. If Wade never leaked the date, the protagonists find out later and more slowly: smaller leaks about the investigation turn up in the CO's files during a heist.
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
- Dense downtown hub plus discrete levels (Eielson, the northern crash site) instead of a full open world, to keep browser loading sane.
- Steam: Electron for consistent Chromium; Tauri on Linux uses WebKitGTK, which can differ on WebGL/WebGPU.
- Multi-agent Saddle split candidates: narrative/lore, level layout, systems, QA.

## Open Questions

- Endings: the specific late-game changes each early choice causes
- Native cop's name (from Athabascan consultants)
- Smoking mechanics: which hooks to keep
- Heat system: whether the two lawmen track it separately (heat is readable through Dottie)
- Dottie's real name

## Continuing in Claude Code

Use the AskUserQuestion tool to interview me about the open questions in this doc, one or two questions at a time with concrete options. Ask about history I might not know when it affects a decision, and flag anything that needs fact-checking. After each answer, update this file and remove resolved items from Open Questions.
