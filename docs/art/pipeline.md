# Character pipeline

How a character goes from a concept sheet to a rigged, animated model in `game/`. Decided in #33; the cast is #40.

## Decision

Characters are image-to-3D, generated from our own concept sheets, auto-rigged on one shared humanoid skeleton,
and animated with a shared clip library retargeted per character. Buildings, furniture and terrain are not decided
here; they follow the town and rendering tickets (#39, #41).

We tried this route on one character (Curly) before committing to the rest. It produced a textured, PBR,
rigged model whose face and clothes read clearly at gameplay distance, in about 15 minutes of generation.

## Steps

1. **Reference.** From the concept sheet in `docs/art/concepts/`, generate one clean front view: full body,
   symmetrical A-pose, arms about 45° out, hands clear of the hips, plain light grey background, no props in the
   hands or on the shoulders (props fuse into the mesh). Season-correct clothes: in July, Wade wears fatigues, not
   his parka. Model: `gpt_image_2_6` with the sheet as an image reference.
2. **Model.** Higgsfield `image_to_3d` (Meshy) with texturing, PBR maps, auto-rigging, `pose_mode: a-pose`, the
   character's height, 30k triangles. Output: one skinned mesh, one material (base color, metal-roughness,
   normal), a 24-joint humanoid skeleton (`Hips` … `RightToeBase`).
3. **Clips.** Higgsfield `3d_rigging` with `enable_animation`, run once per clip on one source character (Curly).
   Each output carries his mesh plus one clip; only the animation is kept.
4. **Process.** `make generate/characters` runs `game/tools/characters.ts`, which reads `game/assets/characters.json`
   and writes `game/public/characters/`:
   - downloads each source once into `game/.cache/characters/` (ignored by git);
   - characters: drops the emissive map and the bind-pose clip, resizes base color to 2048 px and the other maps to
     1024 px as WebP, quantizes geometry (`KHR_mesh_quantization`);
   - clips: drops the mesh, keeps rotations plus the `Hips` translation (other bones' translations encode the
     source's bone lengths and would stretch everyone to Curly's proportions), pins root motion in place for clips
     that walk forward, then retargets to each character (below).
5. **Retarget.** Rigs share joint names but not rest orientations (Wade's head bone rests about 90° off the
   others'). For every joint, the clip's rotation is re-expressed against the target's rest pose:
   `q_target = q_clip × inverse(q_sourceRest) × q_targetRest`. Hip translation is offset from the target's rest
   position and scaled by height (`heightMeters / sourceHeightMeters`).

## Numbers

| | Raw | Processed |
| --- | --- | --- |
| One character | 13.8 MB | 1.9–2.3 MB |
| Nine clips, one character | 9 × 13.8 MB | about 650 KB |
| Whole cast (4 characters × 9 clips) | | about 11 MB on disk |

Cost on the Higgsfield Starter plan (about 270 credits a month): reference image 0.25, character 35, clip 8.
The core cast and the first nine clips cost about 215 credits.

## Known limits

- One texture set per character at 2k base color. Close-up dialogue gets a sharper head set later (#40).
- Textures are WebP, which shrinks the download but not GPU memory. KTX2/Basis comes with #39.
- No mesh LODs yet (#40). No props in hands yet: drinking clips need a glass on the hand bone.
- Clips are generic library motion. Character-specific gestures (Curly's bowline, Wade's guitar) need new clips.
- The run clip is a sprint; a jog clip is wanted for town.

## Licensing

Every source is logged in [`assets.md`](assets.md) with its generator, job ID and prompt.
