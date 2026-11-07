# Stills

One image per scene. The web build shows `stills/<sceneId>.<ext>` for a scene when the file exists, and a placeholder panel in the act's season palette when it does not.

## Naming

- The file name is the scene ID exactly as it appears in `text-game/src/sceneIds.ts`, for example `p_bar.webp`, `a1_flood.webp`, `a3_crash.webp`, `end.webp`.
- Allowed extensions: `.webp` (preferred), `.jpg`, `.jpeg`, `.png`. If several exist for one scene, webp wins, then jpg, then png.
- Lowercase only. Files that do not match a scene ID are ignored.

## Size

- 1600x900 (16:9), webp at quality 80 or so. Aim for under 300 KB each.
- Other aspect ratios are letterboxed, not cropped. Real stills are shown as they are, with no title overlay.

## Adding one

1. Drop the file in this folder.
2. `npm run dev` picks it up and reloads the page; a production build picks it up at build time.
3. Commit the image. Pushing to `main` redeploys the site.

The list of available stills is read from this folder when the site is built, so there is no manifest to edit.
