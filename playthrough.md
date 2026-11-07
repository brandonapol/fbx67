# Second Rush — Agent Pre-Test Playthroughs

Pre-testing of the text-game core logic (November 2026). Goal: see if gamer-style agents can figure out the systems, whether the branching feels consequential, and what happens on deliberately messy or malicious paths. This is foundation work for the eventual full game.

The text build was run via the CLI (`node src/cli.ts --choices …` / `npx tsx`) against the current main. Logic gates, heat/trust counters, and ending conditions all behaved as designed.

## Playthrough 1: Chaotic / slightly malicious gamer

Personality: curious, willing to poke systems and take the shady option for fun just to see what sticks.

### Approach
- Helped Eli on the boat (not pure evil, but opportunistic).
- Said nothing about the cowboy bowline on Owen’s body ("maybe I can use this later").
- Asked Joan about the bruising.
- Later decisions leaned into leverage, leaking the flight date, confronting instead of warning, incomplete honesty with friends, and not fully sharing wreck evidence.

### Result
**ENDING: BAD**

Ashby wins. Eli serves time for something he only witnessed. Lucy loses the land-office job and keeps the case files in a trunk. Curly dies in prison of “pneumonia.” Joan marries a dentist. Mama’s letter lands hard because she knows the lies.

The combination of burned bridges + flight-date leak + incomplete double-agent conditions correctly produced the punitive outcome. Heat, trust, and the pure logic functions in `logic.ts` fired as expected. Felt fair, not arbitrary.

## Playthrough 2: Curious gamer testing edges

Tried to map the systems while still making a couple of non-optimal choices (barfight framing, offer handling, etc.).

### Observations
- Best ending requires a tight conjunction of conditions (from `isBest` / `missingForBest`):
  - curlyPlan = warn
  - eliTrespass = quiet
  - afterConfession = stay
  - offer = refuse or fake (with doubleAgentWorks)
  - testified = true
  - sharedWreck = true (councilman flips)
  - heat ≤ 3
  - leakedFlightDate = false
- Missing any one of these drops the run out of best. Good and middle endings still resolve cleanly.
- Golden routes and the matrix tooling make it easy to target specific decision combinations.

## Feedback for the full game

### What works well
- State is clean and consequential. Bounded counters (heat, eliTrust, joan, momHonesty) and pure functions in `logic.ts` are ready to port.
- Choices matter. A single leak or leverage decision visibly changes ending text and character fates.
- Prologue-as-Owen is a strong hook; the handoff to Wade after the murder lands.
- The text build is already agent-friendly (`--choices`, `--last`, `--state`, golden.json). Excellent for further automated testing.

### What to watch in the 3D / PlayCanvas version
- Mid-game decision density (CO job, rash plan, offer handling) is high. Diegetic feedback (dialogue tone, visual cues, Dottie heat tiers, Lucy/Eli reactions) will be important so players feel why a path closed without mandatory replays.
- Heat is powerful but relatively opaque in pure text. Make the rising heat readable through character behavior and environment.
- Best ending is quite specific. That’s appropriate for a mystery with a true route, but ensure good and middle endings still feel like complete, interesting stories rather than near-misses.
- Malicious / both-sides runs are fun and the consequences are sharp. Keep that. Players who sell people out or play both sides should get the bleak results they earned.

## Overall

The structure holds up. Agents can figure out the systems by probing them, the logic is consistent across random and golden paths, and the bad endings are satisfyingly punitive. The core from `logic.ts` + the scene graph is solid foundation for the full Second Rush game.

---

*Generated from agent pre-testing of the text build on main.*