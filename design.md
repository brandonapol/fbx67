# Second Rush — Design v0.3

Working title: Second Rush
Engine: PlayCanvas (engine-only, TypeScript, glTF pipeline)
Targets: Browser first; Steam later via Electron wrapper

Source of truth for plot logic: the text build in `text-game/` (its `src/logic.ts` holds the ending rules). This doc describes intent; where they differ, the build wins and this doc gets fixed. Unadopted ideas live in [Ideas](#ideas-not-yet-adopted), not in the main sections.

Tracking: [roadmap epics](https://github.com/brandonapol/fbx67/issues/6), [code risks](https://github.com/brandonapol/fbx67/issues/1), [CI](https://github.com/brandonapol/fbx67/issues/2), [fact checks](https://github.com/brandonapol/fbx67/issues/3), [story decision API](https://github.com/brandonapol/fbx67/issues/4), [playable Act 4](https://github.com/brandonapol/fbx67/issues/5).

## Pitch

A grounded stealth-and-survival mystery set in Fairbanks, Alaska, from the Chena River flood of August 1967 to the Prudhoe Bay oil announcement in spring 1968: the last year before oil money changed Alaska. A bored young airman from Texas befriends a Lower Tanana brother and sister, and a drowned geologist turns out to be the first casualty in a fight over who will own the land the road to the oil has to cross. At its heart it's a land-back story: a family's stolen fish camp, and whether an outsider helps them get it back or helps take it.

Inspirations: Breath of the Wild (traversal, physics, systemic puzzles), BioShock Infinite (place-as-character, companion bond, layered twists), KOTOR (choices that change the plot).

## Historical Backbone

- **Chena River flood, August 1967.** Most of Fairbanks underwater. Opening act.
- **Prudhoe Bay discovery, 1968.** State lease sale in 1969 brought in ~$900M. The game ends right before the money arrives.
- **Native land claims.** Federal freeze on land transfers pending Native claims; Alaska Federation of Natives formed 1966; the Tundra Times published in Fairbanks.
- **1906 Native Allotment Act.** Up to 160 acres per applicant; many applications lost, stalled, or rejected while others filed on the same land.
- **Lower Tanana people.** Fairbanks sits on Lower Tanana (Tanana Athabascan) land at the Chena and Tanana rivers. Minto and Nenana are Lower Tanana villages with fish camps along the rivers; Minto families fish the lower Chatanika and the Tolovana. In 1915 Judge Wickersham met the Tanana chiefs in Fairbanks about land. The Tanana Chiefs Conference pressed Interior land claims in the period of the game.
- **Rampart Dam proposal (backdrop).** Would have flooded Yukon Flats villages; dead by ~1967.
- **Eielson AFB.** ~26 miles from Fairbanks. 1960s: interceptor detachment, SAC staging, Army training, frequent rescue missions.
- **Anchorage.** Still rebuilding from the 1964 earthquake. Off-screen only.

All historical and technical claims are tracked in [docs/fact-checks.md](docs/fact-checks.md) (issue #3), with verdicts, sources, and recommended changes. Adopted so far: the fish camp on the lower Chatanika as a gravel and pipeline/haul-road crossing site, the knot made a personal habit with physical corroboration, the BLM field check as the ice jam's deadline, and the small text fixes (prints, grandfather, St. Joseph's, Investigator, the Rescue Coordination Center, "nobody knows how big yet").

Accuracy bar: plausible to someone who lived in Fairbanks then, not archival precision. Dates drifting by a few months (for example exactly when Prudhoe was announced or sized) are fine. Fix things that would break immersion for a local or misrepresent the Lower Tanana people; treat the rest of the fact-check findings as optional polish.

## Cast

**Wade Pruett.** 19, Air Force munitions airman at Eielson, from the plains outside Lubbock, first time away from home, never seen snow. Tinkerer and guitar player. Bored, likable, easy to use. Drinks, smokes. Water-skied behind his cousins' boat. Can turn gritty or bad depending on player choices. Partly inspired by a real Eielson munitions airman who built homemade flamethrowers for his kids.

**Eli.** Lower Tanana, from a family out of Minto, living and working in Fairbanks. River freighter between Fairbanks and the villages. Funny, proud, angry underneath. Never drinks. His family's fish camp was his grandfather's, and his mother's before him. Councilman Tolliver holds title and has banned him from it. Speaks for his family at the Tanana Chiefs meeting. **His own aim:** he is rebuilding the claim himself. Across Acts 1-3 he gathers elders' testimony in Minto to refile the vanished allotment, the same testimony the endings win the claim on. It does not depend on Wade's investigation, and he would do it if Wade had never come. In Act 2 he makes the trip to Minto without Wade (see Act 2).

**Lucy.** Eli's sister. Clerk at the land office; the real brain of the investigation. Hates cigarettes. Bush-competent, at least as capable as any pilot at winter survival. Not a love interest. Never a white-savior beneficiary. She first befriended Wade because he had base access (Twist 2). In Act 2 she searches the land office's files herself, after hours (see Systems > Lucy).

**Mama.** Wade's mother in Texas. His moral compass. He can tell her the truth or lie, and she can't check. Her replies are stories about folks back home that mirror his next dilemma.

**Owen Marsh.** The geologist. Playable in the prologue. Contracted with oil money (through Ashby) to survey river crossings and gravel for a road north; realized the data was being used to grab Native land before claims settled and turned to Lucy. Murdered in the flood.

**Joan Halvorsen.** Nurse at St. Joseph's, the hospital the flood half emptied, now working the help tent on high ground. Wade first meets her there: on the medicine errand if he does it, otherwise when Owen's body is brought in. She sees the body and notices left-handed bruising. Writes Wade's letter for him when his arm is broken. The easy road: in the bad ending Wade gets her with the payoff; otherwise she marries a dentist.

**Jake Bueller.** Bush mechanic and pilot, 6'7", straight arrow, inspired by a real Fairbanks friend. Contract maintenance at Eielson. Councilman Tolliver's nephew; they don't talk. Passes Wade Curly's drunken getaway talk. Flies Lucy to Owen's camp and goes down with her; briefly looks guilty, cleared when Wade finds the sabotage.

**Officer Tom Peter (placeholder name).** Fairbanks PD, Alaska Native. Can't be bought. Went to college in Georgia and hated being treated like a curiosity. Watches and arrests Curly if warned. **Decided (2026-11-08): he speaks for himself, in two scenes.** He wants a case Barnette can't bury: he never believed Owen's death was an accident, and he knows Barnette ruled it one because it was quick. He reads Wade as the one man on the base who found the body and kept quiet about the knot, and he says so dryly, once. He knows nothing of the land buying and never says "oil"; he has the bowline, the cash and the line, not Ashby. He can't be bought, and no heat or choice changes that. His name stays `N.cop` until consultants supply one (see Open Questions).

**Investigator Vernon Barnette.** Alaska State Trooper investigator. Fictional grandson of town founder E.T. Barnette, who was charged when his bank failed, acquitted, and left town in disgrace anyway; wants to be the law his ancestor wasn't. Rushes Owen's death through as an accident. Keeps score on Wade (heat). Honest but wrong; in the best ending he makes the arrest himself.

**Dottie Vinson.** Counter waitress at the Northern Lights Café, former switchboard operator. Optional stop at three decision points; tells Wade in coarse tiers how much the law is watching him and Lucy. Never says whether a job is worth it.

**Hank Lyle.** Silver Pan bartender. His speech before the barfight is the in-world tutorial: the law keeps score, people remember, nothing you say stays where you said it, ask Dottie where you stand.

**Villains.** A conspiracy of mixed guilt.
- **Franklin Ashby, the land lawyer (hidden top villain).** Presents as a friend of the Native families; Owen mentions "a lawyer" in the prologue. Pays Wade's drunk-tank fine, wins real small claims for other families, attends the Tanana Chiefs meeting. Wants Wade for base access, a dark mirror of Lucy. Reveals himself at the offer. Never gets his hands dirty. Nothing early says "oil."
- **Councilman Ray Tolliver.** Holds title to the fish camp. In on the land grab, not the murder. Flips if he learns his nephew's plane was sabotaged. The player's main red herring.
- **Major Dekker.** Wade's CO. Trapped in his career, wants to retire to Florida with a boat; an oil job is waiting. Signed off Owen's photo access and saw his reports. Reads Wade's mail off the books and forges Wade's signature on demolition charges. Blows the ice jam himself in Act 4, because Ashby has him cornered: the Major kept the forgeries and the copied letters in his own cabinet (combination: his circled retirement date), that cabinet was robbed in October, and on the leak path his staff car was seen at the bush strip the night before the flight. Ashby's terms: finish the job, or Barnette gets a crooked officer instead of a Texas airman.
- **Curtis "Curly" Boone.** Bush mechanic, fellow Texan, Wade's foil. Kept Owen's plane running and flew Owen's charters. Took Ashby's money, held Owen under in the flood with yellow tie-down line off a coil in his hangar, rigged Lucy's plane. Ties his bowlines backward, tail outside the loop: his own habit, nothing to do with Texas. Left-handed (a separate clue; the knot's "left-hand bowline" name is about the knot, not the man). Steals a left-handed bow "for protection" when he realizes Ashby is cleaning up loose ends.

Cultural approach: Eli and Lucy are Lower Tanana, and the story's spine is land-back. The goal is respect and a story Lower Tanana people would recognize. The team is in contact with consultants and expects support; any group, place, or name can be changed later if they ask. Draft details already in the build (Minto, the fish camp's lineage, the Tanana Chiefs meeting, the Nenana elder's line) are marked for their review.

## The Real Wrong

**What the town knows (one rule, everywhere).** Until Prudhoe is announced in Act 4, there is no oil rush. The public knows a few companies are exploring up north, and nobody in Fairbanks takes it seriously or connects it to land near town. The secret is not the oil; it's that someone is quietly buying land along a future road north, betting on a strike nobody else believes in. Only Owen (from his survey), Ashby, and the conspirators know. No scene before Act 4 has anyone talk about an oil boom or link the land to oil. Prudhoe is when everyone else catches up, and nobody knows how big it is yet.

The family filed a Native allotment application for their fish camp decades ago. It vanished. Tolliver holds title. The camp is on the lower Chatanika, in Minto's fishing area. The Elliott Highway already bridges that river, so the camp's value is not a road crossing: Owen's survey shows it holds the best gravel on the river and the easiest place to put a pipeline or a heavy haul road across it, both things a road north to oil would need. Ashby is buying ahead of information nobody else has; the Act 4 Prudhoe announcement is the player's "oh, that's why."

The claim rests on proof of use. A BLM land examiner's summer field check of the camp is coming, so the Major has to wipe out the camp before anyone official sees it, which is why the ice jam has to go at breakup. Losing the camp badly hurts the claim but does not legally end it: the elders can still testify to generations of use. In the good and best endings the claim is won, later and partly on that testimony, and the camp returns to the family; in the bad and middle endings it is lost or stalled.

## Structure

**Prologue (July 1967), playing Owen.** Curly introduces Owen to Wade at the Silver Pan. Owen mentions a lawyer helping the Native families. That night he writes to Lucy. In the morning Owen mails the letter and meets Curly at the float dock on the Chena, where Curly flies him north from the river; the plane is on amphibian floats and lands on its wheels on the camp's gravel bar. At the survey camp the player chooses where he hides his real notes and tapes (a memory test Lucy faces in Act 3). Back in town he writes her again with the spot. In August a man in a hooded slicker offers him a skiff ride through the flood.

The prologue's town is ambient talk, not scenes: about 25 people in the Silver Pan, on the two walks and at the float dock, each with a role, a want and a habit (`text-game/src/ambient/prologueTown.ts`). They are role names, not new characters. None of them states the land scheme and none says "oil". Three overheard threads reward lingering; each is listed under the act that pays it off (Act 1, 2 and 3). A payoff is one line of scene text that reads as plain texture to a player who never heard the thread: it moves no state, and nothing later depends on having heard it.

**Act 1: Flood (Aug 1967), playing Wade.** Wade is on the sandbag line under his sergeant (unnamed, or a placeholder). A woman from Minto comes to him: her mother is stranded in a house on the edge of town, and only Eli's boat can reach her. Eli is somewhere in town. The choice:
- **Go** (break orders). Wade tracks Eli on the move through 2-3 short conversations with townspeople, each pointing a block or so further on. Delivering the message earns **+1 Eli trust** (the point the old riverboat choice gave). Back at the line the sergeant chews him out; color only, no heat. On the way, an older couple says Eli is on Third Avenue but they need medicine from the help tent and can't go themselves. *Doing the errand:* Wade meets the nurse, Joan, at the help tent and she likes him for it (Joan's interest up); by the time he reaches Third, Eli has gone, and folks say he went "a block or two south", so the trail is longer. *Skipping it:* Wade reaches Eli sooner. The errand trades time for Joan only; Eli's trust comes from going, not from skipping the errand.
- **Stay** (orders are orders). Someone else carries the message. Wade skips the search and the errand; that evening the boatman needs a strong back and the sergeant lends him out (the existing `a1_body` fallback). No trust point. He first meets Joan when the body reaches the help tent.

Wade and Eli find Owen tied under with a backward bowline, tail outside the loop, not the way anyone on Wade's cousins' boat ever tied one. Wade cuts the line on both sides of the knot and keeps it. St. Joseph's is half-flooded, so Owen's body goes to the help tent. Joan sees it there and tells Wade about the left-handed bruising; her choice (ask her, or make her laugh) happens there. Barnette rules it an accident. The woman from Minto is a draft detail for the consultants' review, like the other Minto details. Lucy needs Owen's aerial photographs from the base. Hank's speech, then the barfight; Curly drags Wade in on his side; everyone lands in the drunk tank; Barnette demands a name (decision 1). Ashby pays the fine. First letter home.

The flooded town is ambient talk too (`text-game/src/ambient/floodTown.ts`): the prologue's townspeople flooded out, airmen on the sandbag line, a family on a roof on Lacey, the St. Joseph's staff at the help tent, the land office crew hauling ledgers, and the barflies at the Silver Pan once the water goes down. They talk to Wade as an airman and a stranger, and he gives the replies. Nobody tells him where he stands (that is Dottie's), and none of it plants a clue or moves state. A Lower Tanana boatman up from Nenana and the clerk's line about Lucy saving the allotment books first are for the consultants' review.

*Paid off from the prologue's town* (`text-game/src/ambient/prologueTown.ts`): two single lines are fair clues. The pool-table airman says Curly shoots lefty (Joan's left-handed bruising), and the dock hand says Curly ties his plane off "like nobody ever showed him" (the backward bowline here, the tarp in Act 2). One overheard thread pays off here: `whichRoom`, the landlady telling a boarder that a man calling himself Owen's friend, talking slow with his cap down, asked which room was Owen's. At the help tent (`a1_ruling`), after Barnette has signed the ruling and gone, she comes asking the nurses after her boarder: his bed's not slept in, and "whoever came for him last night didn't ask me which room this time." Nobody follows it up. That is how the killer knew which door to come to; Curly's arrest in Act 3, or his confession in Act 4, confirms it for a player who put it together. Nothing else follows from it.

The engine build's beat sheet for these scenes (form, who is present, what the player's hands do, the space, and the transitions) is [docs/acts/act1.md](docs/acts/act1.md). The mission specs (the search for Eli, the body, the barfight: verbs, checkpoints, retry and each note) are [docs/acts/act1-missions.md](docs/acts/act1-missions.md).

**Act 2: Freeze-up (fall).** The Major mentions things Wade only wrote to Mama. Eli's own trip: at freeze-up he goes to Minto to sit with the elders and take their testimony for the refiled allotment. Wade isn't there and hears about it afterward, from Eli or Lucy (`a2_minto`, in Lucy's kitchen in November, after the airstrip and before Jake's warning: Eli tells it himself if he trusts Wade, otherwise Lucy does while Eli works; the trip is the same either way, and the passage is in [docs/consultant-review.md](docs/consultant-review.md)). The scene moves no gate on its own; the testimony and Lucy's logbook entry (below) together strengthen the claim. Heists: the base photo lab, the hotel bar (overhearing Tolliver and a quiet man: "before is what counts"), the Tanana Chiefs meeting (Eli speaks; Ashby is a guest; Wade can stay quiet, slip out, or make it about himself), the Major's cabinet (Wade does it, or refuses and Lucy goes in herself and is seen). Curly ties a tarp down with the same backward bowline, in the same yellow line, and flashes a roll of cash. **The officer stops Wade (decided 2026-11-08).** On the street, short and dry, he reads Wade's heat back to him in lines that tier by heat: at low heat he is only curious why an airman keeps turning up where a dead man's business is; at middling heat he lists what he has seen, without charging anything; at high heat he says Wade is making himself easy to hang, and that a case Barnette can't bury needs Wade standing up, not run out. It never offers a deal and never takes one. It reads existing `heat` and adds no state; the tier cut points are set in the implementing PR (#215). Jake's warning about Curly (decision 3). The flight date is set. Letter home (decision 2: whether the date goes in it). Optionally lie low.

*Lucy's after-hours search (decided 2026-11-08, #84).* Lucy is playable in Act 2 at the land office, at night, as a stealth mission: she searches the files for the family's allotment application. She finds the logbook: the application was received and date-stamped, then signed out and never returned. The signature is a dead end (a scrawl and a box number that lead nowhere), so it names no one and does not reveal Ashby (Twist 6); nothing on the page says why anyone wanted the file. She takes nothing and leaves the drawers as she found them. Getting caught sends her back to the start of the search (retry only, as the other heists). The mission exists only if she still has the job: at `lucyHeat` >= 2 she is let go before it (see Systems > Heat) and it never runs.

*Paid off from the prologue's town* (`text-game/src/ambient/prologueTown.ts`): `gravelCash`, two bush pilots in the Silver Pan on a man paying new bills for gravel leases north of town and flying over the land without landing. At the hotel bar (`a2_hotel_set`) the quiet man in the gray suit (Ashby, as Act 4 reveals) pays for each round out of a fold of new bills in order, and the gray-haired pilot at the bar says "Seen that kind of money before." He knows the money, not the man: whoever paid at Phillips Field can be someone Ashby sent. It ties the quiet man to the cash and says nothing about why; Prudhoe in Act 4 is when the player sees why anyone would pay cash for gravel.

**Act 3: Deep winter.** Lucy at Owen's camp (the cache memory test), then the crash on the way home: water in the fuel, with the sump drain jammed so Jake's preflight came out clean. Lucy's survival night. The Rescue Coordination Center at Elmendorf runs the search and Eielson sends people; Wade goes as the munitions man for flares, alone on skis, breaks his arm reaching the wreck, finds the sabotage, chooses whether to show Jake. Back in town: the staff car at the strip if Wade leaked the date. Curly is arrested (warned or not) or found dead; the officer matches Wade's cut piece of line to a coil of tie-down line in Curly's hangar. **On the warn path (decided 2026-11-08) he speaks:** he lays Wade's cut line beside the coil and asks Wade where it came from. Wade has to answer for having kept it since the flood; the scene reads existing state and moves no gate (#216). The not-warned arrest and the found-dead route are unchanged. Eli confesses the skiff and his trespass (decision 4). Wade's rash plan against Tolliver, or he stays out of it. If he tries the plans anyway, the arm makes them hopeless: he grinds the gears one-handed and can't shoulder the rifle. Lucy's confession, with the Major's files: forged sign-outs and copies of Wade's letters (decision 5). Joan writes his letter.

*Paid off from the prologue's town* (`text-game/src/ambient/prologueTown.ts`): `shortCount`, an airman in the Silver Pan whose munitions count keeps coming up short until the sheet comes back initialed. At the confession (`a3_confession`) the Major's folder holds, under the forged sign-outs, the summer's igloo count sheets: the demolition count short week after week, every short sheet initialed up the line as if it added up. His demolition stores were already going short by July; the forgeries in Wade's name came later, and the missing charges blow the Act 4 ice jam.

**Act 4: Breakup (spring 1968).** Prudhoe goes public (nobody knows how big yet); the last tape reel has Owen doubting "him." Ashby's offer (decision 6), the wire if faked, Curly in custody (or his grave), Jake and his uncle, the ice jam (the Major must destroy the camp before the BLM examiner's July field check), testimony (decision 7). Endings. The ice jam, on the route where Wade earned it, is a set piece: the Major runs across the jam, Wade chases (jump the open lead with Eli hauling him out, or go the long way by the drift logs), they struggle against the cutbank (a shoulder charge into the Major against the cutbank, since the arm is in a sling, or talk him down by naming the boat he'll never get), and the fuse is already burning: Wade defuses it (pull the blasting cap one-handed, the good hand only, cut the fuse ahead of the burn, or freeze until Eli yells him back to his training). Choices shape how it goes, not whether it works; the moral route already decided that. In the engine it becomes a real chase and defusal with retry on failure. Then the Major's confession on the ice. Direction for the engine build: the wire and the ice jam become playable action sequences, not summaries (issue #5).

## Twists

1. Owen was on the family's side and died bringing Lucy proof. His real notes survived in a cache only Lucy knew about, which is why her plane was rigged.
2. Lucy put the target on Wade. In August, proud of finding an ally with base access, she told everyone about him, Ashby included. That's how the conspirators picked Wade as their fall guy. The using-him-for-access part is obvious by Act 2; the twist is that her using him is how he got framed.
3. The Major reads Wade's mail. If Wade wrote Mama the flight date, his letter is how the saboteurs knew; if not, Curly learned it watching Jake prep the plane. The crash happens either way; the leak decides whose fault it is.
4. Demolition charges go missing under Wade's forged signature. He's the fall guy, and the charges blow the ice jam.
5. Eli saw a skiff at the cabin the night of the flood while trespassing on his own family's land. A reluctant witness, not a suspect.
6. Ashby, the families' friendly lawyer, is behind all of it.

## Lucy's Confession

Late Act 3. Wade, furious, picks a rash plan against Tolliver (blow his safe one-armed, burn his cabin, confront him at gunpoint; with the arm in a sling, driving a stick and shooting a rifle read as hopeless) or stays out of it. Lucy intercepts at the same point regardless, with the Major's files: the forged sign-outs and copies of his letters. Then the real confession: why him, out of every airman on the base. In August she bragged about her good-hearted Texas airman to anyone who'd listen (the office, the Chiefs' meeting, Mr. Ashby every time he came by about the claim), and somebody she told passed his name along. "Your name was in their hands because I put it there. I picked you because you were useful, and that's how they picked you too." Ashby is named only in passing among others: a fair clue, not a spoiler; she doesn't suspect him yet. Never romantic or gratitude-driven. The player learns it when Wade does.

**Variant: Lucy let go.** If `lucyHeat` crossed the gate before Act 3 (see Systems > Heat), she comes to the confession already out of the land office. The scene is the same beats with a different weight: she brings the Major's files from the trunk she kept, not from a desk drawer; the sign-outs and letters are all she has left of the work; and she says it plainly, once, that the job went for the file run and she'd do it again. No pity and no apology beyond the real one (her bragging put Wade's name in their hands). Wade does not offer to fix it, and the scene does not ask him to.

## Endings

The rules live in `text-game/src/logic.ts`; this table summarizes them.

### Decisions

1. **Barfight (Act 1).** Cover for Eli (trust up, heat up), blame Eli (trust down sharply), or side with Curly (heat up).
2. **The letter (Act 2).** Whether Wade writes Mama Lucy's flight date.
3. **Curly's escape plan (Act 2).** Warn Lucy (the officer watches Curly; he's arrested safely and will talk), confront Curly (arrested, hostile, silent), or let it go (Ashby's people kill him first).
4. **Eli's trespass (Act 3).** Keep quiet, report it to Barnette, or hold it as leverage.
5. **After the confession (Act 3).** Stay with Lucy, walk away, or turn on her (sell her out to Barnette).
6. **Ashby's offer (Act 4).** Take it, refuse it, or fake it and wear a wire.
7. **Testify (Act 4).** Air Force inquiry and state grand jury.

Also gating: **heat** (bounded 0-6; the best ending needs 3 or less) and **showing Jake the sabotage** at the wreck (makes Tolliver flip).

Early choices color the story without locking anyone out; late turns in either direction are honored, except where noted below. Every key decision must be legible as a dilemma in the moment.

### Outcomes

| Ending | Requires | What happens |
|---|---|---|
| **Bad** | Took the offer; or turned on Lucy; or faked the offer without being honest with friends (decision 4 not "quiet", or decision 5 not "stay") | Ashby wins; the claim is lost. Variants: paid off (Wade gets Joan and a parcel on the river), testified after taking money (ignored), sold out Lucy, or a failed double-agent play. |
| **Middle** | Not bad, and the paper route not finished (didn't stay with Lucy, or didn't testify) | Some go down, Ashby walks, the claim stalls, the oil money arrives anyway. Flavors: burned Ashby's office (rash plan was "burn"), walked away, or stayed silent. |
| **Good** | Not bad, stayed with Lucy, testified | Ashby exposed and recalled Outside, never convicted; the claim is reopened and won years later on the elders' testimony, and the fish camp returns. With Lucy's logbook entry (`recordsLog`) the claim is won sooner (see Epilogue timing below). A double-agent tape gets him indicted but thrown out without Curly or Tolliver to back it. |
| **Best** | All of: warned Lucy (3), kept Eli's secret (4), stayed (5), refused or faked (6), testified (7), showed Jake the sabotage, heat ≤ 3, and never wrote Mama the flight date (2) | Barnette arrests Ashby on the courthouse steps. Curly testifies. The Major is caught on the ice. The claim is won three years later, on the elders' testimony; the fish camp is theirs again. |

**Epilogue timing (the logbook).** In the good and best endings the claim is won on the elders' testimony either way; the logbook entry from Lucy's Act 2 search (#84) only moves the date. With the logbook, the court has paper to put beside the testimony, so the claim wins sooner: best, two years rather than three; good, about three years rather than "years later". Without it the claim still wins on testimony, later. The flag changes epilogue wording only: no ending gate reads it, and nothing is locked out. In the bad and middle endings the claim does not win, so the flag is color at most (Lucy mentions the page she found).

### Consequences that cut across endings

- **Eli is jailed** if Wade reported or used his trespass, or took the offer, in any ending. In the good ending that makes it bittersweet: Wade won, Eli watches it from a cell, and Lucy never speaks to Wade again.
- **Curly:** killed by Ashby's people (decision 3 "let it go"), testifies (best), convicted (good or middle), or dies in prison of "pneumonia" after his statement goes missing (bad).
- **The ice jam** is stopped and the Major caught only if Wade kept Eli's secret, stayed with Lucy, and didn't take the money; otherwise it's blown and the fish camp floods before the BLM examiner can see it.
- **Epilogues** name the cause where they can: Barnette never believed you (heat), nobody told Jake so nobody told Ray (sabotage not shared), the flight-date letter (leak), Eli's boat named after Owen (trust).
- **Mama's last letter** reflects how honest Wade was with her, and differs between good and bad endings.

Measured over every path: best is about 0.19% of paths, good 7%, middle 19%, bad 74%. Random play isn't real play; careful players reach best on the first or second run.

## Systems

- **Letters home.** Wade writes Mama throughout; doubles as journal and save system. Each letter offers honest, softened, or lie lines; the dangerous one is visible as a choice. The Major reads them off the books. Mama's replies are three stories that mirror the next dilemma: Wanda and the Hendersons' secret (before Eli's trespass), Earl Dobbs and the Tate boy (before the offer and testimony), the Midland land man and the salt well (before the offer).
- **Heat.** One bounded value the law keeps on Wade, plus a flag for Lucy if she's seen on base. Raised by heists, the barfight, covering for friends, and the rash plan; lowered by lying low. Readable through Hank's speech, Dottie, Barnette's roadside stop, and his reaction when you testify.
- **Decided (2026-11-08): high heat is retry only.** Getting busted stays a mission retry (Rule 4); no drunk tank, interrogation, lost evidence or forced lie-low follows in Acts 1-3, and no new state. High heat shows only in how the world reacts: Barnette's roadside stop, Dottie, and the moral weather.
- **Decided (2026-11-08): Lucy's heat gates her job at the land office.** `lucyHeat` (bounded 0-4) is Lucy's own standing with the law, separate from Wade's `heat`. At high Lucy heat she is let go from the land office before Act 3. The threshold is 2 (proposed in the implementing PR): the cabinet refusal and the October base run each add 2, so one sighting with a description out is enough, and it is the only pre-Act 3 source; a threshold of 3 or 4 would never trigger. Losing the job closes the records thread (Lucy's playable records work, #84): after it she has no land-office access, so no after-hours search and no logbook flag. Nothing is locked out of an ending; the claim still wins on the elders' testimony. It is her cost in her own story: shown in what she does (the desk emptied, the key handed back), never explained, and never a punishment for Wade to rescue her from. Below the threshold she keeps the job and the records thread stays open. If she was already let go, Wade's turn-on at the Trade (+2) has no job left to suspend, so Barnette's response there changes to match. Dottie still reads `lucyHeat` as color. Implementation: #211.
- **Moral weather.** Lighting and weather follow Wade's standing. Clean (low heat, friends trust him): scenes play in long pink winter alpenglow and clear air. Strained (some heat or a broken trust): the same scenes start later, at blue hour under streetlights. Danger (high heat, betrayals, the bad road): night, forty below, sodium lamps smeared through ice fog, sight lines collapsing to a block. Same places and beats; the time of day is the player's report card, felt before it's explained. The narrative core should expose this as a pure function of state (heat, trust, betrayals) that the engine reads to pick lighting and fog. Reference palette sampled from the owner's winter alpenglow photo on the style board.
- **Stealth and spying.** Eavesdropping (music as cover, partial information) and heists (case, enter, solve the room, exit). Uncertain stakes as a design pillar: the player rarely knows whether a job is worth it while doing it. Some jobs can be refused; for the Major's cabinet, Lucy goes herself and is seen.
- **Survival.** Cold, light, calories, frostbite; seasons change the map (flood, freeze, dark, breakup). Lucy's crash night; Wade's ski search (water-skier's balance on downhills, hopeless at kick-and-glide).
- **Broken arm.** A break of the upper arm, in a sling, from `a3_arm` through Act 4 (no cast comes off at breakup). The arm is fully out of use. Ruled out: climbing (ladders, fences, hand-over-hand get a detour or a helper), driving a stick shift and shooting a rifle (someone else drives; in the Act 3 rash plans he tries anyway and it reads as hopeless). Unchanged: skiing and lock or fine work are not limited. No guitar, and Joan writes his letter. In the Act 4 ice jam the arm turns "swing the cast" into a shoulder charge. Feeds `oneHanded(state)`: true from `a3_arm` to the end.
- **Choices that carry state (Acts 1-3).** Early choices color without locking anyone out of an ending. Adopted: the **barfight move** (the bottle adds 1 heat on the spot, and Hank remembers the move Wade made if Wade got up on his own: `barfightMove`, read by `hankRemembers` when he brings the steaks in Act 2; if Curly dragged Wade in, Hank remembers him as the airman who stayed on his stool); the **survival-night order and signal** (Jake's frostbite carries into Act 4: `nightOrder`, read by `jakeFrostbitten` at the wreck and in `a4_news`, where Jake splices the last reel; fire first leaves his left foot frozen at the wreck, kept back from the fire until a hospital, and three toes taken in February; Jake first leaves him whole and Lucy's fingertips blistered. The signal changes how long the search takes: `nightSignal`, read by `searchHours`, the hours from the ground team setting out at `a3_search` until the rest of it reaches the wreck: smoke 3, which Lucy feeds all morning; the X 5, on a spotter plane's bearing at dusk; the saved fire 7, to Wade's flares in the dark. Wade gets there first on every path, and his radio breaks in the fall. Neither moves a gate); the **photo-lab method** (the borrowed key adds heat later, when it is missed: `photoLab`, read by `keyMissed` at `a2_flight` in November, when the flight date is set: the duty sergeant finds the unsigned night and has Wade's name, +1 heat). Each is a bounded field with a reader in `logic.ts` and sweep coverage. The magnitudes are set in code (#285, #325, #327); the numbers above are the built ones. Stays color: the **ski route**. The old sandbag line vs riverboat choice is replaced by the Act 1 opening.
- **Crafting.** Munitions skills: flares, noisemakers, small charges, lock tools, engine thawing. Same tools serve help or harm.
- **Music.** Guitar as social stealth (the hotel bar, gigs to lie low).
- **Combat.** Rare and grounded. The barfight is the showcase.
- **Lucy.** Companion in town and playable at Owen's camp, the crash, and (Act 2) the land office after hours. **Decided (2026-11-08): the records search.** A stealth mission in the land office at night: she finds the logbook entry showing the allotment application was received, date-stamped, then signed out and never returned. Its signature is a dead end, so Ashby is not revealed. It sets one bounded flag, `recordsLog` (0 or 1), read by the epilogue timing for the good and best endings (the claim is won sooner; see Outcomes). Without it the claim still wins on the elders' testimony (Eli's trip, #82), later. Nothing is locked out. It is her work, shown in what she does (reading the sign-out column, not the files she was told to pull), and she is not rescued or praised for it. Busted restarts the search and never reaches the story. It ends before it starts if high `lucyHeat` costs her the job (see Heat): `lucyHeat` >= 2 closes the records thread, `recordsLog` stays 0. Implementation: #104 (story), #228 (engine mission, specified under #96).

Engine direction: the 3D game talks to the narrative core only through typed story actions, so every plot permutation stays machine-checkable as mechanics grow (issue #4).

## Tech Notes

- Engine-only PlayCanvas with TypeScript so agents can work entirely in the repo.
- Dense downtown hub plus discrete levels (Eielson, the northern crash site).
- Steam: Electron for consistent Chromium.
- `text-game/` is the plot source of truth: playable from the CLI by humans and agents, with an exhaustive path explorer, a decision matrix, and differential tests (see its README).

## Open Questions

- Real name for the Native officer (placeholder `N.cop`, waiting on the consultants).
- Smoking mechanics: which hooks to keep.
- Whether the remaining text-only choices (aerial photos, the cache spot) should affect anything.
- Act 4 action sequences: outcomes of the wire and the ice jam (issue #5).
- Story action granularity (issue #4).

## Ideas (not yet adopted)

- Owen stays present after his death through memory: Curly, Ashby, Joan, and Wade each remember a different Owen.
- Wade shares a cigarette with Jake at the wreck (the build has Wade smoke alone while Lucy glares).
- Lighting up near a wreck that might be leaking fuel as a tension beat.
- Ice jam with three outcomes: stop, catch, or fail to (issue #5).
- Ashby physically holds the stolen allotment file; Wade's safe job comes up empty because of it.
- The two lawmen track heat separately and cooperate or clash depending on it.
- Refusing other jobs causes someone else to do them worse.
- Smoking hooks: lighter as a fire source, cigarettes as currency, cravings vs stamina, smoke giving away position.
- A homemade flamethrower (nod to the real airman).
- Lucy's trips to Anchorage as off-screen reports.
- Fourth and fifth letter topics (work, friends, the investigation, how he's doing) in the engine build.
- A named delegate at the Tanana Chiefs meeting with their own stake in the story.
- How long the search for Eli took shades the light at the cabin that evening (lighting only, no state).

## Process Notes

When continuing design in Claude Code: interview the owner about open questions one or two at a time with concrete options, flag history that affects decisions, update this file and the text build together, and keep the text build's checks green.
