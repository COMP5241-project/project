# AGENTS.md — Gold Rush Hook (PolyU EduGenAI prototype)

> **⚠ This copy is the PolyU EduGenAI house-style prototype** (see
> `EDUGENAI-README.md` in this folder for the brand spec it follows).
> The original game — neon arcade styling — lives in the sibling
> `gold-rush-hook/` folder and remains the upstream source. Keep game
> logic identical to upstream; only the presentation layer differs.

Guidance for AI agents (and humans) working in this repository.

## What this is

**Gold Rush Hook** is a Gold Miner–style browser game about the Software
Development Lifecycle (SDLC). Aim the hook with the mouse, drop it with
**Space** / tap / click, reel in SDLC "DO's" for marks, and dodge the
DON'Ts. Three levels, a between-level shop with 4 upgrades, localStorage
saves, and fully synthesised Web Audio SFX.

- Framework: **Next.js 15 (App Router) + TypeScript + Tailwind CSS v4**
- Rendering: **Canvas 2D** (all game art is canvas-drawn; emoji used in UI)
- State: **Zustand** (single client-side store, localStorage persistence)
- No game engine (no Phaser), all logic client-side and lightweight.

## Core invariant (do not break)

> **SDLC DO's = gold (earn marks) · SDLC DON'Ts = rocks (deduct marks).**

Content is distilled from the course deck *"Software Development Lifecycle"*.
Every object label lives in `lib/game/catalog.ts` (`labels: [...]`), where
`polarity: "good"` entries are ✓ DO's and `polarity: "bad"` are ✗ DON'Ts.
If you change labels or objects, keep the polarity and the ✓/✗ convention.

## Commands

```bash
npm install
npm run dev        # dev server (http://localhost:3000)
npm run build      # production build
npm run start      # serve the production build (add -p <port> to change port)
npm run typecheck  # tsc --noEmit
```

There is no unit/E2E test suite committed; verify changes by running the
build, exercising the game in a browser, and (optionally) Playwright
scripts kept in the sibling `sdlc-hook/` project.

## Architecture map

```
app/
  layout.tsx      Root layout + metadata; Tailwind default sans (system-ui)
  page.tsx        Renders <GameShell />
  globals.css     Tailwind v4 entry; @theme PolyU tokens, .edu-card /
                  .btn-primary / .btn-secondary / .btn-success helpers
components/
  GameShell.tsx   EduGenAI "app card": branded brick-red header bar + HUD +
                  canvas + overlays. Sets window.__GRH__ debug handle to the
                  Zustand store.
  GameCanvas.tsx  Game loop (requestAnimationFrame), input, all canvas art
                  (drawSky / drawGround / per-kind object drawers),
                  HOOK_PRESS_EVENT custom event for the mobile hook button.
  HUD.tsx         In-game HUD: money/target bar, timer, dynamite, mute, HOOK!
  StartScreen.tsx Title + rules (phase "menu")
  ShopModal.tsx   Between-level shop (phase "shop")
  EndScreen.tsx   Game over / victory (phases "gameover" | "victory")
lib/
  store.ts        Zustand store: phases, scoring, upgrades, saves.
                  initFromStorage() is SSR-guarded — keep new client-only
                  code similarly guarded.
  game/
    types.ts      Shared types (ObjectKind, phases, Upgrades, …)
    catalog.ts    ALL game content: DO/DON'T labels, values, weights, radii
    levels.ts     3 level definitions (target, time, object counts),
                  seeded level generation, canvas size constants
    hook.ts       Hook physics (out, reel, grab)
    upgrades.ts   4 shop upgrades: strength / dynamite / clover / time
    audio.ts      Synthesised SFX (Web Audio), mute toggle
    storage.ts    localStorage save/load helpers
```

### Tuning knobs (balance changes live here)

- **Object values / labels / weights:** `lib/game/catalog.ts`
- **Level targets, time limits, spawn counts, canvas size, ground line
  (`GROUND_Y`):** `lib/game/levels.ts`
- **Upgrade costs / effects:** `lib/game/upgrades.ts`
- **Hook speed / physics / reach (`MAX_LEN`, `MAX_ANGLE`, `PIVOT`):**
  `lib/game/hook.ts`

### Phases

`menu → playing → shop → playing → … → gameover | victory` (driven by
`lib/store.ts`). The canvas keeps rendering behind overlays but stops
simulating unless `phase === "playing"`.

## Design system (PolyU EduGenAI house style — per `EDUGENAI-README.md` §1)

- **Palette (tokens in `globals.css` `@theme`):**
  - `--color-polyu` `#A21942` (PolyU Brick Red, primary) · hover `#801333`
  - `--color-ink` `#262626` (charcoal text)
  - `--color-page` `#F8F9FA` (page background) · `--color-line` `#E5E7EB`
    (card borders / dividers)
  - `--color-ok` `#10B981` (success / progress — fills only) ·
    `--color-ok-dark` `#047857` (**green TEXT on white** — `#10B981` fails
    4.5:1 on white, so use `text-ok-dark` for text, `bg-ok` for bars/fills)
- **Type:** Tailwind default sans (system-ui) per the README — no web fonts.
- **Components:** `.edu-card` (white / rounded-lg / gray-200 border /
  shadow-sm), `.btn-primary` (`#A21942` → hover `#801333`), `.btn-secondary`
  (white + gray border), `.btn-success` (`#10B981`).
- **Layout:** `max-w-7xl mx-auto px-4` in `GameShell.tsx`.
- **Icons:** `lucide-react` for interface actions (per README UI stack);
  emoji remain for game *content* (💰/💎/🧨 labels, object art) — user
  sanctioned.
- **Canvas:** dynamic sky that shifts dawn → noon → sunset with the round's
  remaining time (see `drawSky` in `GameCanvas.tsx`) + warm ground (light
  theme); the neon sunset from the original was intentionally replaced.
- **A11y baseline:** global `:focus-visible` ring (brick red),
  `prefers-reduced-motion` kill-switch, ≥44px touch targets, 200ms
  transitions, decorative icons `aria-hidden`.
- Tokens live in `app/globals.css` under `@theme` (**Tailwind v4** — no
  `tailwind.config.js`); component classes in `@layer components`.

## Agent rules — do

- Keep all game logic client-side and engine-free.
- Guard any browser-only code (store hydration, `window.__GRH__`, audio)
  against SSR.
- Preserve the DO=gold / DON'T=rock invariant and ✓/✗ label convention.
- Respect `prefers-reduced-motion` (global kill-switch in `globals.css`).
- Keep interactive elements ≥ 44px, visible focus rings (global
  `:focus-visible`), and hover transitions ~150–300ms.
- Use the design tokens from `globals.css` (e.g. `bg-polyu`, `text-ink`,
  `border-line`, `bg-ok`/`text-ok-dark`) instead of hard-coding new ad-hoc
  palettes.
- `window.__GRH__.getState()` / `.setState(...)` is an intentional debug
  handle — useful for E2E assertions (e.g. pumping marks to test the shop).

## Agent rules — don't

- Don't add a game engine, new state libraries, or server-side game logic.
- Don't introduce a `tailwind.config.js` for theming; extend `@theme` instead.
- Don't bring back arcade fonts / neon classes — the house style is the
  requirement for this prototype (README §1 wins over skill suggestions).
- Don't use `#10B981` (`text-ok`) for text on white — use `text-ok-dark`.
- Don't delete `window.__GRH__`, the SSR guards, or the seeded level
  generation (refresh-resume depends on it).
- Don't change the phase machine in `store.ts` without updating all five
  phase-consuming components.

## Notes for future agents

- Prior phase found & fixed: `tickTimer` only persisting `timeLeft` on
  second boundaries (countdown deadlock) and `bestScore` not updating in
  store at run end — regressions there reappear as a frozen clock or a
  best-score that never grows.
- Canvas logical size is 800×560 (`CANVAS_W/H` in `lib/game/levels.ts`);
  DPR scaling handled in `GameCanvas.tsx`.
- **Spawn / reach geometry (keep in sync):** the ground surface is the
  single `GROUND_Y` constant in `lib/game/levels.ts` (imported by
  `GameCanvas.tsx` for rendering). Objects spawn with centers at
  `GROUND_Y + 24` or below — never above the surface. The hook's reach is
  `MAX_LEN` in `lib/game/hook.ts`; it must be ≥ the distance from `PIVOT`
  (400, 44) to the farthest bottom corner (≈ 653) so the corners stay
  reachable. The `"out"` state also clamps the rope at `boundaryLimit(angle)`
  (same file), which keeps the tip inside the 800×560 canvas for the current
  swing angle — so the hook retracts at the window boundary instead of
  extending through it. If you move `PIVOT`, change `CANVAS_W/H`, or raise
  `MAX_ANGLE`, re-check all three of these.
- **Dynamic sky (keep in sync):** `GameCanvas.tsx` `drawSky` interpolates the
  `DAWN` / `NOON` / `SUNSET` keyframes by day-progress
  `p = 1 - timeLeft / levelTime(level, upgrades)` (clamped 0..1; `p = 0`
  outside of play so menu / shop / end screens show the dawn "ready" sky).
  If you change level times or want a specific sky in a new phase, update the
  `p` computation in `draw()`.
- `README.md` documents the art/audio swap guide — update it if the visual
  language changes.
- `EDUGENAI-README.md` (this folder) is the PolyU brand spec this copy must
  keep matching; if the brand spec changes, re-derive `globals.css` tokens
  from it.

## Changelog

### 2026-10-14 — Hydration fix + hook boundary retract

- **Next.js "Recoverable Error" (hydration mismatch) fixed.** Root cause:
  `StartScreen.tsx` rendered the "Continue run" button and the "Best" line
  from `savedRun` / `bestScore`, which are populated from localStorage by
  `initFromStorage()` — a client-only source. The server render never had
  them, so the first client render (with a saved run present) produced
  different HTML than the server, tripping React's hydration check. Fix:
  added a `mounted` flag (`useState(false)` + `useEffect(() => setMounted(true))`)
  and gated both conditional blocks behind `mounted && …`. The first client
  render now matches the server HTML; the saved-run UI appears one tick
  later, after mount. Verified: clean reload with a saved run present shows
  no error overlay, and the "Continue run" / "Best" UI still appears.
- **Hook no longer extends through the game window — it retracts at the
  boundary.** Root cause: the `"out"` state only stopped the rope at
  `MAX_LEN` (680), which is longer than the distance from `PIVOT` (400, 44)
  to the bottom edge (516) and to the side edges at steep angles, so the tip
  sailed past the canvas. Fix: added `boundaryLimit(angle)` in
  `lib/game/hook.ts`, which computes the longest rope length that keeps the
  tip inside the 800×560 canvas for the current swing angle (clamping
  against the bottom edge `(CANVAS_H − PIVOT.y)/cos θ` and the nearer side
  edge `PIVOT.x/|sin θ|`, all capped by `MAX_LEN`). The `"out"` state now
  clamps `sim.length` to `boundaryLimit(sim.angle)` and transitions to
  `"back"` once it reaches that limit, so the hook retracts at the window
  boundary instead of extending through it. Verified: at θ = 0 the tip lands
  at (400, 560); at θ = ±1.05 it lands on the left/right edges (≈ 0.3 / 799.7,
  273.6) — always inside the canvas.
- **Verified:** `tsc --noEmit` ✓, no lint errors; both fixes confirmed in the
  browser (clean hydration + hook retracting at the boundary).

### 2026-10-14 — Dynamic sky (dawn → noon → sunset by round time)

- **The sky now changes with the round's remaining time.** Round start =
  dawn, mid-round = noon, round end = sunset. Implemented in
  `GameCanvas.tsx`: `draw()` computes day-progress
  `p = 1 - timeLeft / levelTime(level, upgrades)` (clamped 0..1; `p = 0`
  outside of play) and passes it to `drawSky(ctx, time, p)`. `drawSky`
  interpolates between three keyframe palettes (`DAWN` / `NOON` / `SUNSET`)
  for the sky gradient, sun colour, glow, and cloud tint, and moves the sun
  along an arc (`sunPos`) — low at dawn/sunset, high at noon.
- **Verified:** `tsc --noEmit` ✓; dawn (start), noon (mid), and sunset (end)
  all confirmed in the browser.

### 2026-10-14 — Spawn + hook-reach fixes

- **Items no longer spawn above the ground.** Root cause: `generateLevel`
  used `minY = CANVAS_H * 0.55` (308), which sat *above* the rendered ground
  line `GROUND_Y = 325`, so objects with centers in [308, 325] floated in the
  air. The two values were also defined independently and could drift. Fix:
  introduced a single shared `GROUND_Y` constant in `lib/game/levels.ts`
  (now imported by `GameCanvas.tsx` instead of its local copy) and set the
  spawn floor to `minY = GROUND_Y + 24`, guaranteeing every object center is
  below the surface.
- **Hook now reaches the bottom corners.** Root cause: `MAX_LEN` was 512,
  shorter than the distance from `PIVOT` (400, 44) to a bottom corner
  (0, 560) ≈ 653, so the corners (and objects near them) were unreachable.
  Fix: raised `MAX_LEN` to 680 in `lib/game/hook.ts`. Verified both corners
  (dist 653, angle ±37.9°) and the leftmost low object (50, 514, dist 586)
  now fall inside the reachable cone.
- **Verified:** `tsc --noEmit` ✓, no lint errors in the three touched files.

### 2026-10-10 — PolyU EduGenAI house-style rebrand (this copy)

Created as a copy of `gold-rush-hook/` (files only; `node_modules`/
`.next` excluded, then `npm install`) and restyled to match
`EDUGENAI-README.md` §1 (brand spec copied here as `EDUGENAI-README.md`).

**Design system (via ui-ux-pro-max skill; README brand rules take
precedence over the skill's generic "educational" suggestions):**

- `app/layout.tsx` — removed Press Start 2P / VT323 (`next/font`); now
  Tailwind default sans; metadata retitled "EduGenAI (PolyU) prototype";
  themeColor → `#F8F9FA`.
- `app/globals.css` — replaced arcade `@theme` tokens with PolyU tokens
  (`polyu`, `polyu-dark`, `ink`, `page`, `line`, `ok`, `ok-dark`);
  new helpers `.edu-card`, `.btn-primary`, `.btn-secondary`,
  `.btn-success`; light color-scheme; focus ring → brick red; removed
  blink/marquee keyframes and `.neon-text-*` / `.arcade-*` classes; kept
  `prefers-reduced-motion` kill-switch.
- `components/GameShell.tsx` — neon cabinet + marquee ticker replaced with
  a white EduGenAI card: brick-red branded header (title + EduGenAI
  badge), `max-w-7xl mx-auto px-4`, light page background, footer legend.
- `components/HUD.tsx` — white chips with `#E5E7EB` borders, emerald
  progress bar, brick-red Dynamite/`HOOK!` primary buttons, Lucide icons
  (`Anchor`, `Bomb`, `Volume2`/`VolumeX`), ≥44px targets.
- `components/StartScreen.tsx` — white card, brick-red title, Lucide
  `CheckCircle2`/`XCircle` rule markers (DO green / DON'T red semantics),
  `Play`/`RotateCcw` buttons.
- `components/ShopModal.tsx` — white cards, emerald level pips, `Store`
  header icon, brick-red Buy buttons, emerald `Start Level` CTA.
- `components/EndScreen.tsx` — `Trophy`/`Timer` status badges, emerald
  victory / brick-red defeat accents, Lucide `RotateCcw`/`Home` buttons.
- `components/GameCanvas.tsx` — `drawSky`: neon sunset → bright daytime
  gradient (`#60a5fa → #bae6fd → #fef9c3`), soft yellow sun, white clouds;
  `drawGround`: brighter earth + lime grass lip. Object art unchanged.
- `package.json` — renamed `gold-rush-hook-prototype`; added
  `lucide-react` (interface icons, per README UI stack).

**Review fixes applied:**

- `#10B981` text on white measured ~2.4:1 (fails 4.5:1) → added
  `--color-ok-dark #047857` and switched all green *text* to `text-ok-dark`
  (HUD carry/toast, StartScreen tagline, GameShell legend, victory title);
  `bg-ok` kept for progress bar / pips (non-text).

**Verified:** `tsc --noEmit` ✓, `next build` ✓, served on
`http://localhost:3112`; Playwright: timer ticks (89→86s), level-clear →
shop transition ✓, upgrade purchase ✓, screenshots at 1024 / 375 px ✓.
