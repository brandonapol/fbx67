# Asset log

Every generated or third-party asset in the game, where it came from and under what terms. The machine-readable
source of truth for characters is [`game/assets/characters.json`](../../game/assets/characters.json).

## Characters

Generated with Higgsfield on the project owner's account from our own concept sheets (`docs/art/concepts/`).
Reference images: `gpt_image_2_6`. Models and rigs: `image_to_3d` (Meshy). Output belongs to the account holder
under Higgsfield's terms of service for paid plans.

| Id | Character | Source | Model job |
| --- | --- | --- | --- |
| `curly` | Curly Boone | image_to_3d from reference `7db03e5c-f796-4667-8a63-63b9179fb2ea` | `bc922d87-e0a2-40c7-8301-e6f796fdbc1e` |
| `owen` | Owen Marsh | image_to_3d from reference `3771fb58-c6d8-4252-8c9e-8cdf8ad03d73` | `3483ed5e-e7f9-416d-9fd6-af396ceacc51` |
| `wade` | Wade | image_to_3d from reference `f8c7e080-5262-4a2d-a32e-405017a08d05` | `b502c233-e9f8-4cee-8a49-3687c0b9b58e` |
| `hank` | Hank Lyle | image_to_3d from reference `abc304e0-fec0-4a76-9a74-1eb4b28b42c7` | `1d003f05-f141-4d03-9875-0078f048c190` |

Reference prompt pattern: "Character turnaround reference for 3D modeling, single figure, full body from head to
boots, straight-on front view, symmetrical A-pose with arms angled about 45 degrees away from the body, hands open
and clear of the hips … no props … realistic proportions, grounded painterly realism, soft even studio lighting,
plain light grey seamless background", followed by the character's description from `design.md`.

## Animation clips

Meshy's animation library through Higgsfield `3d_rigging`, applied to Curly's model, then retargeted per
character by `game/tools/characters.ts`.

| Id | Clip | Job |
| --- | --- | --- |
| `idle` | Idle (library #0) | `2500c02c-311b-4505-8cf7-38fdfe9cb8f6` |
| `walk` | Casual_Walk_inplace (library #613) | `c5826c9f-bbcf-424f-8874-27d92b5af4c6` |
| `run` | RunFast (library #16) | `f0111535-f8e5-4a85-a58a-a53fd2923a35` |
| `sneak` | Sneaky_Walk_inplace (library #671) | `0e4e12e6-9a04-4984-af6a-78b47ac679d1` |
| `sit` | Chair_Sit_Idle_M (library #33) | `139e958c-90ae-4c9b-8038-0f94dc6b2fd2` |
| `sitDrink` | Sit_and_Drink (library #343) | `638cbd6a-abb2-4004-af84-5c5d2d4f4e20` |
| `drink` | Stand_and_Drink (library #342) | `fa54a431-1e37-4c87-936c-286319bf1ff2` |
| `talk` | Talk_with_Right_Hand_Open (library #314) | `26dc774f-7904-4612-a6ed-df62f387b243` |
| `wave` | Big_Wave_Hello (library #28) | `ee5f7e1a-ec2a-4baf-9459-7569a475e626` |
