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
- **Lower Tanana people.** Fairbanks sits on Lower Tanana (Tanana Athabascan) land at the Chena and Tanana rivers. Minto and Nenana are Lower Tanana villages with fish camps along the rivers. In 1915 Judge Wickersham met the Tanana chiefs in Fairbanks about land. The Tanana Chiefs Conference pressed Interior land claims in the period of the game.
- **Rampart Dam proposal (backdrop).** Would have flooded Yukon Flats villages; dead by ~1967.
- **Eielson AFB.** ~26 miles from Fairbanks. 1960s: interceptor detachment, SAC staging, Army training, frequent rescue missions.
- **Anchorage.** Still rebuilding from the 1964 earthquake. Off-screen only.

All historical and technical claims are tracked in [docs/fact-checks.md](docs/fact-checks.md) (issue #3), with verdicts, sources, and recommended changes. Its plot recommendations are not adopted yet.

Accuracy bar: plausible to someone who lived in Fairbanks then, not archival precision. Dates drifting by a few months (for example exactly when Prudhoe was announced or sized) are fine. Fix things that would break immersion for a local or misrepresent the Lower Tanana people; treat the rest of the fact-check findings as optional polish.

## Cast

**Wade Pruett.** 19, Air Force munitions airman at Eielson, from the plains outside Lubbock, first time away from home, never seen snow. Tinkerer and guitar player. Bored, likable, easy to use. Drinks, smokes. Water-skied behind his cousins' boat. Can turn gritty or bad depending on player choices. Partly inspired by a real Eielson munitions airman who built homemade flamethrowers for his kids.

**Eli.** Lower Tanana, from a family out of Minto, living and working in Fairbanks. River freighter between Fairbanks and the villages. Funny, proud, angry underneath. Never drinks. His family's fish camp was his grandfather's, and his mother's before him. Councilman Tolliver holds title and has banned him from it. Speaks for his family at the Tanana Chiefs meeting.

**Lucy.** Eli's sister. Clerk at the land office; the real brain of the investigation. Hates cigarettes. Bush-competent, at least as capable as any pilot at winter survival. Not a love interest. Never a white-savior beneficiary. She first befriended Wade because he had base access (Twist 2).

**Mama.** Wade's mother in Texas. His moral compass. He can tell her the truth or lie, and she can't check. Her replies are stories about folks back home that mirror his next dilemma.

**Owen Marsh.** The geologist. Playable in the prologue. Contracted with oil money (through Ashby) to survey river crossings and gravel for a road north; realized the data was being used to grab Native land before claims settled and turned to Lucy. Murdered in the flood.

**Joan Halvorsen.** Hospital nurse. Saw Owen's body and noticed left-handed bruising. Writes Wade's letter for him when his arm is broken. The easy road: in the bad ending Wade gets her with the payoff; otherwise she marries a dentist.

**Jake Bueller.** Bush mechanic and pilot, 6'7", straight arrow, inspired by a real Fairbanks friend. Contract maintenance at Eielson. Councilman Tolliver's nephew; they don't talk. Passes Wade Curly's drunken getaway talk. Flies Lucy to Owen's camp and goes down with her; briefly looks guilty, cleared when Wade finds the sabotage.

**Officer Tom Peter (placeholder name).** Fairbanks PD, Alaska Native. Can't be bought. Went to college in Georgia and hated being treated like a curiosity. Watches and arrests Curly if warned.

**Inspector Vernon Barnette.** Alaska State Trooper investigator. Fictional descendant of town founder E.T. Barnette, who left in disgrace; wants to be the law his ancestor wasn't. Rushes Owen's death through as an accident. Keeps score on Wade (heat). Honest but wrong; in the best ending he makes the arrest himself.

**Dottie Vinson (placeholder name).** Counter waitress at the Northern Lights Café, former switchboard operator. Optional stop at three decision points; tells Wade in coarse tiers how much the law is watching him and Lucy. Never says whether a job is worth it.

**Hank Lyle (placeholder name).** Silver Pan bartender. His speech before the barfight is the in-world tutorial: the law keeps score, people remember, nothing you say stays where you said it, ask Dottie where you stand.

**Villains.** A conspiracy of mixed guilt.
- **Franklin Ashby, the land lawyer (hidden top villain).** Presents as a friend of the Native families; Owen mentions "a lawyer" in the prologue. Pays Wade's drunk-tank fine, wins real small claims for other families, attends the Tanana Chiefs meeting. Wants Wade for base access, a dark mirror of Lucy. Reveals himself at the offer. Never gets his hands dirty. Nothing early says "oil."
- **Councilman Ray Tolliver.** Holds title to the fish camp. In on the land grab, not the murder. Flips if he learns his nephew's plane was sabotaged. The player's main red herring.
- **Major Dekker (placeholder name).** Wade's CO. Trapped in his career, wants to retire to Florida with a boat; an oil job is waiting. Signed off Owen's photo access and saw his reports. Reads Wade's mail off the books and forges Wade's signature on demolition charges. Blows the ice jam himself in Act 4.
- **Curtis "Curly" Boone.** Bush mechanic, fellow Texan, Wade's foil. Kept Owen's plane running. Took Ashby's money, held Owen under in the flood, rigged Lucy's plane. Left-handed. Steals a left-handed bow "for protection" when he realizes Ashby is cleaning up loose ends.

Cultural approach: Eli and Lucy are Lower Tanana, and the story's spine is land-back. The goal is respect and a story Lower Tanana people would recognize. The team is in contact with consultants and expects support; any group, place, or name can be changed later if they ask. Draft details already in the build (Minto, the fish camp's lineage, the Tanana Chiefs meeting, the Nenana elder's line) are marked for their review.

## The Real Wrong

The family filed a Native allotment application for their fish camp decades ago. It vanished. Tolliver holds title. Owen's survey shows the camp sits on the best river crossing and gravel source for a future road north. Ashby is buying ahead of information nobody else has; the Act 4 Prudhoe announcement is the player's "oh, that's why."

## Structure

**Prologue (July 1967), playing Owen.** Curly introduces Owen to Wade at the Silver Pan. Owen mentions a lawyer helping the Native families. That night he writes to Lucy and the player chooses where he hides his real notes and tapes at the survey camp (a memory test Lucy faces in Act 3). In August a man in a hooded slicker offers him a skiff ride through the flood.

**Act 1: Flood (Aug 1967), playing Wade.** Wade helps Eli on the river and they find Owen tied under with a cowboy bowline. Barnette rules it an accident. Joan noticed left-handed bruising. Lucy needs Owen's aerial photographs from the base. Hank's speech, then the barfight; Curly drags Wade in on his side; everyone lands in the drunk tank; Barnette demands a name (decision 1). Ashby pays the fine. First letter home.

**Act 2: Freeze-up (fall).** The Major mentions things Wade only wrote to Mama. Heists: the base photo lab, the hotel bar (overhearing Tolliver and a quiet man: "before is what counts"), the Tanana Chiefs meeting (Eli speaks; Ashby is a guest; Wade can stay quiet, slip out, or make it about himself), the Major's cabinet (Wade does it, or refuses and Lucy goes in herself and is seen). Curly's backward bowline and his roll of cash. Jake's warning about Curly (decision 3). The flight date is set. Letter home (decision 2: whether the date goes in it). Optionally lie low.

**Act 3: Deep winter.** Lucy at Owen's camp (the cache memory test), then the crash on the way home: water in the fuel, with the sump drain jammed so Jake's preflight came out clean. Lucy's survival night. Wade on the rescue team (needed for flares), alone on skis, breaks his arm reaching the wreck, finds the sabotage, chooses whether to show Jake. Back in town: the staff car at the strip if Wade leaked the date. Curly is arrested (warned or not) or found dead. Eli confesses the skiff and his trespass (decision 4). Wade's rash plan against Tolliver, or he stays out of it. Lucy's confession, with the Major's files: forged sign-outs and copies of Wade's letters (decision 5). Joan writes his letter.

**Act 4: Breakup (spring 1968).** Prudhoe goes public; the last tape reel has Owen doubting "him." Ashby's offer (decision 6), the wire if faked, Curly in custody (or his grave), Jake and his uncle, the ice jam, testimony (decision 7). Endings. Direction for the engine build: the wire and the ice jam become playable action sequences, not summaries (issue #5).

## Twists

1. Owen was on the family's side and died bringing Lucy proof. His real notes survived in a cache only Lucy knew about, which is why her plane was rigged.
2. Lucy befriended Wade for base access. The friendship became real later.
3. The Major reads Wade's mail. If Wade wrote Mama the flight date, his letter is how the saboteurs knew; if not, Curly learned it watching Jake prep the plane. The crash happens either way; the leak decides whose fault it is.
4. Demolition charges go missing under Wade's forged signature. He's the fall guy, and the charges blow the ice jam.
5. Eli saw a skiff at the cabin the night of the flood while trespassing on his own family's land. A reluctant witness, not a suspect.
6. Ashby, the families' friendly lawyer, is behind all of it.

## Lucy's Confession

Late Act 3. Wade, furious, picks a rash plan against Tolliver (blow his safe one-armed, burn his cabin, confront him at gunpoint) or stays out of it. Lucy intercepts at the same point regardless, with the Major's files: the forged sign-outs and copies of his letters. Then: "I picked you in August because you had base access. It's not why now. But it's why then." Never romantic or gratitude-driven. The player learns it when Wade does.

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
| **Bad** | Took the offer; or turned on Lucy; or faked the offer without being honest with friends (decision 4 not "quiet", or decision 5 not "stay") | Ashby wins. Variants: paid off (Wade gets Joan and a parcel on the river), testified after taking money (ignored), sold out Lucy, or a failed double-agent play. |
| **Middle** | Not bad, and the paper route not finished (didn't stay with Lucy, or didn't testify) | Some go down, Ashby walks, the oil money arrives anyway. Flavors: burned Ashby's office (rash plan was "burn"), walked away, or stayed silent. |
| **Good** | Not bad, stayed with Lucy, testified | Ashby exposed and recalled Outside, never convicted; the claim holds and the fish camp returns. A double-agent tape gets him indicted but thrown out without Curly or Tolliver to back it. |
| **Best** | All of: warned Lucy (3), kept Eli's secret (4), stayed (5), refused or faked (6), testified (7), showed Jake the sabotage, heat ≤ 3, and never wrote Mama the flight date (2) | Barnette arrests Ashby on the courthouse steps. Curly testifies. The Major is caught on the ice. The fish camp is theirs again. |

### Consequences that cut across endings

- **Eli is jailed** if Wade reported or used his trespass, or took the offer, in any ending. In the good ending that makes it bittersweet: Wade won, Eli watches it from a cell, and Lucy never speaks to Wade again.
- **Curly:** killed by Ashby's people (decision 3 "let it go"), testifies (best), convicted (good or middle), or dies in prison of "pneumonia" after his statement goes missing (bad).
- **The ice jam** is stopped and the Major caught only if Wade kept Eli's secret, stayed with Lucy, and didn't take the money; otherwise it's blown and the fish camp floods.
- **Epilogues** name the cause where they can: Barnette never believed you (heat), nobody told Jake so nobody told Ray (sabotage not shared), the flight-date letter (leak), Eli's boat named after Owen (trust).
- **Mama's last letter** reflects how honest Wade was with her, and differs between good and bad endings.

Measured over every path: best is about 0.19% of paths, good 7%, middle 19%, bad 74%. Random play isn't real play; careful players reach best on the first or second run.

## Systems

- **Letters home.** Wade writes Mama throughout; doubles as journal and save system. Each letter offers honest, softened, or lie lines; the dangerous one is visible as a choice. The Major reads them off the books. Mama's replies are three stories that mirror the next dilemma: Wanda and the Hendersons' secret (before Eli's trespass), Earl Dobbs and the Tate boy (before the offer and testimony), the Midland land man and the salt well (before the offer).
- **Heat.** One bounded value the law keeps on Wade, plus a flag for Lucy if she's seen on base. Raised by heists, the barfight, covering for friends, and the rash plan; lowered by lying low. Readable through Hank's speech, Dottie, Barnette's roadside stop, and his reaction when you testify.
- **Moral weather.** Lighting and weather follow Wade's standing. Clean (low heat, friends trust him): scenes play in long pink winter alpenglow and clear air. Strained (some heat or a broken trust): the same scenes start later, at blue hour under streetlights. Danger (high heat, betrayals, the bad road): night, forty below, sodium lamps smeared through ice fog, sight lines collapsing to a block. Same places and beats; the time of day is the player's report card, felt before it's explained. The narrative core should expose this as a pure function of state (heat, trust, betrayals) that the engine reads to pick lighting and fog. Reference palette sampled from the owner's winter alpenglow photo on the style board.
- **Stealth and spying.** Eavesdropping (music as cover, partial information) and heists (case, enter, solve the room, exit). Uncertain stakes as a design pillar: the player rarely knows whether a job is worth it while doing it. Some jobs can be refused; for the Major's cabinet, Lucy goes herself and is seen.
- **Survival.** Cold, light, calories, frostbite; seasons change the map (flood, freeze, dark, breakup). Lucy's crash night; Wade's ski search (water-skier's balance on downhills, hopeless at kick-and-glide).
- **Broken arm.** From Act 3 on: one-handed actions, no guitar, Joan writes his letter.
- **Crafting.** Munitions skills: flares, noisemakers, small charges, lock tools, engine thawing. Same tools serve help or harm.
- **Music.** Guitar as social stealth (the hotel bar, gigs to lie low).
- **Combat.** Rare and grounded. The barfight is the showcase.
- **Lucy.** Companion in town and playable at Owen's camp and the crash. Her land-office records work runs through the Tanana Chiefs thread.

Engine direction: the 3D game talks to the narrative core only through typed story actions, so every plot permutation stays machine-checkable as mechanics grow (issue #4).

## Tech Notes

- Engine-only PlayCanvas with TypeScript so agents can work entirely in the repo.
- Dense downtown hub plus discrete levels (Eielson, the northern crash site).
- Steam: Electron for consistent Chromium.
- `text-game/` is the plot source of truth: playable from the CLI by humans and agents, with an exhaustive path explorer, a decision matrix, and differential tests (see its README).

## Open Questions

- Real names for placeholders: the Native officer, Major Dekker, Dottie, Hank.
- Eli's own goal and a scene where he acts without Wade; a speaking role for the officer.
- Lucy's playable scope beyond the camp and crash (records work via the Tanana Chiefs thread).
- Smoking mechanics: which hooks to keep.
- Getting caught at high heat (drunk tank, interrogation, lost evidence): in the narrative core or engine-only?
- Whether small choices that currently only change text (aerial photos, the cache spot, survival and ski choices, the barfight move) should affect anything.
- Act 4 action sequences: outcomes of the wire and the ice jam (issue #5).
- Story action granularity (issue #4).
- Broken arm extent and duration.

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

## Process Notes

When continuing design in Claude Code: interview the owner about open questions one or two at a time with concrete options, flag history that affects decisions, update this file and the text build together, and keep the text build's checks green.
