# Act 2 mission specs

How Act 2's three spy missions play in the engine build, and the one note each sends the story
([`story-api.md`](../story-api.md), Rules 1 to 4). Issue #96. The scene text is in
[`text-game/src/scenes/act2.ts`](../../text-game/src/scenes/act2.ts) and the menus in
[`missions.ts`](../../text-game/src/missions.ts). Where this file and [`design.md`](../../design.md) disagree, the
design wins.

**Status: draft.** The owner approves the specs in review.

**Ground rules for all three.** The ones in [`act1-missions.md`](act1-missions.md) hold, plus:

- **Seen is not busted.** *Busted* is the mission's fail: someone catches Wade at it, a fade, and the last checkpoint.
  The story never hears about it, and nothing about getting caught is state (Rule 4, #86). *Seen* is an ending the
  player accepts instead of retrying: someone noticed something and Wade got away. It reaches the story only as heat,
  and only where a section below says so.
- **Uncertain stakes.** Nothing inside a mission tells the player whether it was worth it. The scenes after it do,
  sometimes much later.
- **Refusing is a deliberate prompt,** asked before the mission starts, never read off the player walking away.

## 1. The photo lab

From the decision at `a2_photos` until Wade hands Lucy the photographs (or doesn't), at `a2_hotel`.

- **Way in.** The prompt at `a2_photos` is *During the clerk's lunch*, *After lockup with a borrowed key*, or
  *Refuse*. Lunch is daylight: the lab is open, a clerk may come back early, and the photo lab's airmen walk past the
  records room door. After lockup is dark and empty, but the key has to go back on its hook before morning.
- **Objective.** Find the aerial photographs of the river north of town, and get out with them.
- **Verbs.** *Read*: the index card, a drawer label, a frame number. *Pull*: a drawer, a print. *Lay out*: a print on
  the light table next to the map grid, which shows the frame's corner coordinates.
- **The drawers.** The index card names three drawers. *Cross-check* is reading frame numbers against the grid and
  pulling only the prints that match: slow, and leaves the drawers as they were. *Pull everything* is emptying the
  three drawers into a box: fast, and leaves gaps somebody notices.
- **Seen and busted.** Busted is the clerk or the duty sergeant walking in while Wade is in the drawers: retry. There
  is no seen ending; the drawer choice carries the trace instead.
- **Checkpoints.** Inside the records room door; the drawers open, before the first print is pulled.
- **The note.**

  > The photo lab. Way in: lunch / key. Drawers: cross-checked / pulled all; or refused

  Each way in and drawer pair is a note, `lunch.crossChecked` and so on, applying `lunch` or `afterLockup`, then
  `crossCheck` or `pullAll`. All four give the `aerialPhotos` evidence. *Refused* applies `refuse` (-1 Eli trust). The
  menu is `thePhotoLab`; every note lands on `a2_hotel`.
- **What shades heat or trust.**

  | Detail | Effect |
  | --- | --- |
  | Drawers: cross-checked | +1 heat |
  | Drawers: pulled all | +2 heat |
  | Way in: key | +1 heat later, at `a2_flight`, when the sergeant misses the key |

- **New state.** `photoLab` (`lunch` or `key`, unset on refusal), the photo-lab method the design adopts. Its reader is
  `keyMissed` in `logic.ts`: at `a2_flight` the sergeant has Wade's name, and leaving the scene adds the heat. The
  liveness rules drop it after `a2_flight`.

## 2. The hotel bar

From the decision at `a2_hotel` until Wade packs up his guitar, at `a2_chiefs`. October, downtown.

- **Way in.** The prompt at `a2_hotel` is *Bring your guitar* or *Skip it* (`guitar`, `skip`). Skipping is -1 heat:
  one less night of a uniform being seen in town.
- **Objective.** Play the evening in the hotel bar and listen to Tolliver's back booth.
- **Verbs.** *Play*: a short rhythm game over a set of songs; *Lean*: Wade's attention on the booth, which the
  subtitles show as fragments; *Move*: between songs, Wade can take another stool. Music is cover: while he plays well
  nobody looks at him, and the closer he sits and the cleaner he plays, the more of the booth's talk gets through. A
  missed chord or a dead stop makes the room look up, and the booth goes quiet for a while.
- **Partial information.** Even the best evening is half a conversation: Tolliver loud and angry, the other man
  quiet, his back to the room, never named. The player hears words, not what they mean.
- **Seen and busted.** Busted is stopping dead next to the booth, or leaning in without playing, until Tolliver or the
  other man turns and stares: retry from the last song. There is no seen ending; playing badly costs only what Wade
  hears.
- **Checkpoints.** Each song is one.
- **The note.**

  > The hotel bar. Heard: most / pieces; or skipped

  *Most* applies `guitar`, `sitClose` (the `hotelTalk` evidence) and `tellLucy`; the text build asks where Wade sits,
  in `a2_hotel_set`. *Pieces* applies `guitar`, `sitFar` and `tellLucy` (`a2_hotel_pieces`): Tolliver's voice and
  nothing from the quiet man, so no evidence. *Skipped* applies `skip`. The menu is `theHotelBar`; every note lands on
  `a2_chiefs`. At heat 0 *pieces* and *skipped* land on the same state, since the skip's heat has nothing to take off.
  Above it, *pieces* is worse than skipping: a night of being seen for nothing. That is intended; in the engine only
  playing badly gets there, and in the text build the far stool is the uncertain bet that doesn't pay.
- **What shades heat or trust.** Only the skip (-1 heat): going at all forgoes it. How well Wade plays shades what
  he hears (Rule 3), and the `hotelTalk` evidence is read later: Lucy repeats the quiet man's words before the
  Major's cabinet, Wade remembers Tolliver in Act 3, and he knows the voice at Ashby's lunch in Act 4.
- **New state.** None.

## 3. The Major's cabinet

From Lucy's ask at `a2_co_ask` until the files are photographed and back in the drawer, at `a2_curly`. Night, the
squadron building on base.

- **Way in.** The prompt at `a2_co_ask` is *Search the cabinet tonight* or *Refuse* (`search`, `refuse`). A visit to
  the café first (`gossip`) is Dottie's read on the heat, not part of the note.
- **Objective.** Open the Major's locked cabinet, photograph what is in it with Lucy's camera, put everything back.
- **Verbs.** *Look*: the desk (the boat photo, the Florida brochure, the calendar with a date two years out circled
  in red and marked RETIRE). *Dial*: the combination lock, three numbers. *Pry*: a screwdriver in the cabinet's
  drawer seam, loud, and it leaves marks. *Photograph*: a page at a time under the flashlight. *Listen*: the duty
  airman's rounds, a door and footsteps on a loop.
- **Got in.** *Code* is dialing the circled date (month, day, year). The calendar is the only hint; a wrong
  combination costs time, not a fail. *Forced* is prying it, any time the player gives up on the dial.
- **Seen and busted.** Busted is the duty airman's flashlight on Wade in the office: retry from the hall. *Seen* is the
  getaway: leaving while the airman is still on his rounds means crossing the end of his hall, and he sees a shape go
  by but never a face. Waiting in the dark for the rounds to finish is unseen.
- **Checkpoints.** The hall outside the office; the cabinet open, before the first page.
- **The note.**

  > The Major's cabinet. Got in: code / forced. Seen: yes / no; or refused (Lucy goes herself)

  Each pair is a note, `code.seen` and so on, applying `search`, `combo` or `forced`, then `goNow` (and the duty desk
  beat, `a2_co_seen`) or `getOut`. All four set `coJob` to `wade` and give the `coFiles` evidence. *Refused* applies
  `refuse` and the beat after it (`a2_co_lucy`): Lucy goes in herself on her cousin's janitorial crew, gets the files
  and is seen (`coJob` `lucy`, `coFiles`, +2 `lucyHeat`, which #101 gates). The menu is `theMajorsCabinet`; every note
  lands on `a2_curly`. `code.seen` and `forced.unseen` land on the same state: both are +2 heat. The duty log in
  `a2_co_seen` and the pry marks are colour; no later scene reads them, so neither is state.
- **What shades heat or trust.**

  | Detail | Effect |
  | --- | --- |
  | Got in: code | +1 heat |
  | Got in: forced | +2 heat |
  | Seen: yes | +1 heat |
  | Refused | +2 Lucy's heat, none on Wade |

- **New state.** None.
