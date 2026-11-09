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
