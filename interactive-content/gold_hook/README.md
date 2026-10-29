# ⛏️ Gold Rush Hook

A **Gold Miner–style browser game about the Software Development Lifecycle**, built with
Next.js 15 (App Router) + TypeScript + Tailwind CSS + HTML5 Canvas 2D + Zustand.

The twist: **the DO’s of the SDLC are the gold** — hook one and you **earn marks** —
while **the DON’Ts of the SDLC are the rocks** — hook one and you **lose marks**.
Every object carries its lesson as a label (e.g. `Run unit tests ✓`, `Skip testing ✗`),
distilled from the *Software Development Lifecycle* course deck.

> “Hook the DO’s, dodge the DON’Ts. That’s the whole SDLC.”

---

## Gameplay

- A hook swings from a winch at the top centre. **Click / tap / `Space`** to drop it.
- The hook grabs the first object it touches and reels it in. **Heavier objects reel in slower.**
- Object types (all canvas-drawn, no external sprites):

  | Object          | What it is                                        | Marks        | Weight |
  | --------------- | ------------------------------------------------- | ------------ | ------ |
  | Small gold      | a light DO (unit tests, code reviews, MoSCoW…)    | +25          | light  |
  | Medium gold     | a solid DO (stakeholder interviews, CI, flags…)   | +60          | medium |
  | Large gold      | a heavy DO (system testing, canary rollout…)      | +120         | heavy  |
  | 💎 Diamond      | rare, light, big win (blue-green release, …)      | +250         | light  |
  | 🎒 Mystery bag  | random DO or DON’T when caught                    | −40 … +100   | light  |
  | 🧳 Heavy chest | guaranteed big DO, very slow to reel in           | +300         | very heavy |
  | 🪨 Rock         | a DON’T (skipped tests, hardcoded keys, …)        | −35 … −90    | heavy  |
  | 🧨 TNT          | deducts marks **and blows away nearby objects**   | −40 + blast  | light  |

- Each level has a **marks target** and a **time limit**. Hit the target and the level
  clears (with a small time bonus); run out of time short and the run ends.
- Between levels, the **camp shop** sells upgrades:
  - 🔧 **Hook Motor** — +15 % hook speed per level (up to 3)
  - 🧨 **Dynamite** — blast charges per level; press `B` (or the HUD button) to
    vaporise the heaviest rock for free (up to 2)
  - 🍀 **Lucky Clover** — extra diamonds & mystery bags, luckier bags (up to 2)
  - ⏱️ **Time Bonus** — +10 s at the start of every level (up to 3)
- Runs are **saved to `localStorage`** at the shop, so a refresh resumes at the shop.
  Best score / furthest level are kept permanently.
- All SFX are **synthesised with the Web Audio API** (no audio files needed).
- 100 % client-side; no server APIs, no database, no game engine.

## Controls

| Action                | Desktop          | Mobile              |
| --------------------- | ---------------- | ------------------- |
| Drop the hook         | `Space`, click   | tap the canvas / **⚓ HOOK!** button |
| Dynamite blast        | `B` or HUD button| 🧨 HUD button        |
| Mute / unmute         | 🔊 HUD button    | 🔊 HUD button       |

---

## 1. File tree

```
gold-rush-hook/
├── app/
│   ├── layout.tsx            # Root layout, metadata, viewport (mobile-safe)
│   ├── page.tsx              # Renders <GameShell/>
│   └── globals.css           # Tailwind v4 @theme design tokens, arcade helpers, keyframes
├── components/
│   ├── GameShell.tsx         # Layout: HUD + canvas + overlay screens
│   ├── GameCanvas.tsx        # ★ Game loop, input, ALL canvas rendering
│   ├── HUD.tsx               # Money/target/timer/level/carry/blast/mute + toast
│   ├── ShopModal.tsx         # Between-level shop (upgrades)
│   ├── StartScreen.tsx       # Menu: how to play, start / continue, best score
│   └── EndScreen.tsx         # Game over + victory screens
├── lib/
│   ├── store.ts              # ★ Zustand store: phases, scoring, saves, upgrades
│   └── game/
│       ├── types.ts          # Shared types (objects, phases, upgrades, events)
│       ├── catalog.ts        # ★ ALL game content: DO’s / DON’Ts, mystery rolls
│       ├── levels.ts         # 3 level defs, seeded object-field generation
│       ├── hook.ts           # Hook state machine (swing → out → back), TNT fuse
│       ├── upgrades.ts       # Shop upgrade definitions + costs
│       ├── audio.ts          # Web Audio SFX engine (replace with real audio here)
│       └── storage.ts        # localStorage save/load (run, best, mute)
├── public/                   # (empty — add sfx/ here if you replace the synth)
├── .gitignore
├── next.config.mjs
├── package.json
├── postcss.config.mjs        # @tailwindcss/postcss (Tailwind v4)
├── tsconfig.json
└── vercel.json               # (optional; Vercel auto-detects Next.js)
```

## 2. Setup commands

```bash
cd gold-rush-hook
npm install

# develop
npm run dev          # → http://localhost:3000

# verify
npm run typecheck    # strict TS, no emit

# production
npm run build
npm start
```

Requirements: **Node ≥ 18.18** (developed on Node 20). No environment variables needed.

## 3. Run & deploy on Vercel

**Local**

```bash
npm run dev    # dev server with HMR at :3000
# or
npm run build && npm start
```

**Vercel (3 options — all identical in practice)**

1. **CLI (fastest):**
   ```bash
   npm i -g vercel
   vercel            # first deploy → prints your *.vercel.app URL
   vercel --prod     # production deploy
   ```
2. **GitHub:** push the folder to a repo → go to [vercel.com/new](https://vercel.com/new) →
   import the repo. Vercel auto-detects Next.js; no env vars, no settings to change.
   Every push redeploys automatically.
3. **Vercel Dashboard:** “Add New → Project” → import the repo → Deploy.

Why it deploys cleanly: everything is client-side React + Canvas. Next.js still runs a
tiny Node server, but there are no API routes, no database, no build-time env needs —
the default serverless function configuration is all you get, and it’s plenty.

## 4. Replacing the placeholder art & audio

**Art** — every object is drawn procedurally in `components/GameCanvas.tsx`:

- `drawNugget`, `drawDiamond`, `drawBag`, `drawChest`, `drawRock`, `drawTnt`
  (per-object shapes) and `drawSky` / `drawGround` (backdrop).
- To use real images: put files in `public/sprites/`, then in each draw function
  replace the path commands with `ctx.drawImage(img, -r, -r, r*2, r*2)`, loading the
  images once via `new Image()` / `next/image` and keeping them in a ref map.
  The `GameObject` shape (position/radius/label) is unchanged, so collision still works.
- The lesson **labels** themselves live in `lib/game/catalog.ts` — swap text there and
  both the canvas and the HUD pick it up.

**UI / design system** — the site uses a *pixel-arcade* look (neon on dark):

- Palette & type tokens live in `app/globals.css` under Tailwind v4 `@theme`
  (`--color-arcade-*`, `--font-arcade` / `--font-pixel`). Helper classes:
  `.arcade-panel`, `.arcade-title` (Press Start 2P), `.neon-text-green/amber/red/blue`.
- Fonts are loaded with `next/font/google` in `app/layout.tsx`. **VT323 (body) must
  stay ≥ 18px; Press Start 2P is for short titles/labels only.**
- Accessibility baseline in `globals.css`: global `:focus-visible` ring and a
  `prefers-reduced-motion` kill-switch. Buttons keep ≥ 44 px targets and 150–300 ms
  hover transitions. Emoji in the UI are intentional (user-sanctioned art style).

**Audio** — `lib/game/audio.ts` is a single `AudioEngine` class with named methods
(`whoosh`, `grab`, `coin`, `boom`, `win`, …). To use real samples:

1. Drop files in `public/sfx/` (e.g. `coin.mp3`).
2. In each method, replace the oscillator/noise code with a decoded
   `AudioBuffer` playback (a comment block at the top of the file shows the pattern).
3. Keep the method names — `GameCanvas.tsx`, `store.ts` and the HUD call
   `sfx.<name>()` and nothing else changes.

## 5. Tuning knobs

| What                          | Where                                   |
| ----------------------------- | --------------------------------------- |
| Object values / weights / labels | `lib/game/catalog.ts`                 |
| Level targets, times, counts  | `lib/game/levels.ts` (`LEVELS`)         |
| Hook speed, retraction curve  | `lib/game/hook.ts` (`EXTEND_SPEED`, `RETRACT_BASE`, `retractSpeed`) |
| Shop costs & effects          | `lib/game/upgrades.ts` (`UPGRADES`)     |
| Mystery bag odds              | `lib/game/catalog.ts` (`rollMystery`)   |
| Save key                      | `lib/game/storage.ts` (`KEY`)           |

## 6. Architecture notes

- **Two clocks, one truth.** The canvas `requestAnimationFrame` loop is the only place
  time advances; it steps the pure `stepSim()` (in `lib/game/hook.ts`) and calls
  `store.tickTimer(dt)`. The Zustand store is the single source of truth for
  money/target/timer/objects/phase — React components never mutate game state directly.
- **Pure core.** `catalog`, `levels`, `hook` and `upgrades` are dependency-free TS
  (only `types.ts` shared), so they are trivially unit-testable if you add a test
  runner later (Vitest works out of the box with this layout).
- **Deterministic fields.** Each level’s objects come from a seeded PRNG (`mulberry32`)
  so the layout is stable and reproducible per level seed.
- **Performance.** One canvas, one rAF loop, DPR-capped at 2×. The store accumulates
  fractional time every frame but only bumps the HUD-visible `timeSec` on second
  boundaries, so React re-renders ~once per second instead of 60×/s.
