# Second Rush: web build

A browser version of the text game in `../text-game/`. Read a scene, see its still, click a choice. It imports the story directly from `../text-game/src/` (engine, state, logic, scenes, names), so there is one source of truth: change a scene there and the site changes with it.

Vite and TypeScript, no UI framework. Requires Node 22.18+ (the version in `../text-game/.nvmrc`).

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (it ends in `/fbx67/`).

- Click a choice, or press 1 to 9.
- **Copy path** copies the comma-separated choice path, the same format as the CLI's `--choices`. Replay it in the CLI with `node src/cli.ts --choices 1,2,1` from `text-game/`.
- Links reproduce a run: `/fbx67/#path=1,2,1`. The address bar keeps the current path, so you can copy it at any point. If a linked path stops working (for example after a story change), the game plays as far as it can and says where it stopped.
- Progress is saved in `localStorage` and restored on reload. The game works without it (private windows, blocked storage).
- **Restart** and **Play again** clear the path.

## Build

```bash
npm run build
npm run preview
```

`build` typechecks (including the text-game modules it imports) and writes `dist/`. `preview` serves `dist/` at `/fbx67/`.

## Deploy

`../.github/workflows/web-pages.yml` builds `web/` and deploys it to GitHub Pages on pushes to `main` that touch `web/**` or `text-game/src/**`, and on demand from the Actions tab (`workflow_dispatch`).

One-time setup in the repository:

1. Settings → Pages → Build and deployment → Source: **GitHub Actions**. The workflow cannot turn Pages on with the default token, so the first run fails until this is set.
2. Pages on a private repository needs a paid GitHub plan (Pro, Team or Enterprise). On a free plan the repository must be public.

The site is served at `https://<owner>.github.io/fbx67/`. Vite's `base` is `/fbx67/` in `vite.config.ts`; change it if the repository is renamed.

## Stills

Put images in `public/stills/` named after the scene ID: `public/stills/<sceneId>.webp` (or `.jpg`, `.png`), 1600x900 recommended. Scene IDs are listed in `../text-game/src/sceneIds.ts`. See `public/stills/README.md`.

Scenes without a still show a placeholder in the act's season palette:

| Act | Palette |
| --- | --- |
| Prologue, Act 1: Flood | grey-green `#A9A99E` to `#5E6E62`, amber `#D9A441` |
| Act 2: Freeze-up | slate `#5C6670` to spruce `#2F4A3A`, gold `#C9A43B` |
| Act 3: Deep Winter | alpenglow `#8690B2` to `#9D86A3` over snow `#657697`, moon `#F4EEDA` |
| Act 4: Breakup, Epilogue | `#E8C98A` to `#4E7D7A` |

Moral weather (`weatherOf` in `src/stills.ts`) tints placeholders by Wade's standing:

- Clear: heat under 2 and Eli's trust at 0 or above. The season palette as listed.
- Dusk: heat at 2 or 3, or Eli's trust below zero. The same scene at blue hour.
- Night: heat over the best-ending limit (3), or Eli's trust at its floor (-3). Night and ice fog (`#18241F`, `#3A3F45`) under an amber lamp (`#E39A3B`).

## Layout

- `src/main.ts`: wiring (header buttons, keyboard, hash, storage).
- `src/session.ts`: choice paths, replay, URL hash and `localStorage`.
- `src/view.ts`: DOM for the still, scene text, choices and ending.
- `src/stills.ts`: scene-to-still lookup, season and weather for placeholders.
- `vite.config.ts`: `base`, file access to `../text-game/src/`, and the `virtual:stills` module that lists `public/stills/` at build time.
