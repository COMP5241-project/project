# AGENTS.md

Guidance for AI agents (and humans) working in this folder.

## What this is

A single-file animated SVG scene: `whip_pelican.html`.

- A riderless bicycle (with a smug little face on the frame) **rides on top of a man** who pumps his arms and legs to lurch forward on the ground.
- A pelican chases from behind and cracks a whip. Each strike lands on the man's lower back (under the rear wheel) and triggers a full hit-reaction on him (and a shudder on the bike riding him).
- Scrolling background (clouds, hills, road dashes, roadside props) sells the forward motion.

## Hard rules

- Everything must stay in **one self-contained HTML file**: no external assets, CDNs, frameworks, or build step. It must work by double-clicking the file.
- No new runtime dependencies. Vanilla JS + SVG only, `"use strict"`, no ES modules.
- Keep user-facing text in **Traditional Chinese**.
- Do not restructure into multiple files unless explicitly asked.
- Page chrome (everything around the SVG scene) must follow the **EduGenAI / PolyU design system** (README.md §1): primary `#A21942` (hover `#801333`), ink `#262626`, background `#F8F9FA`, borders `#E5E7EB`, success `#10B981`; font `Inter, system-ui, sans-serif` (+ CJK fallbacks); content `max-width:1280px` centered (`max-w-7xl`) with `16px` side padding (`px-4`); cards `bg-white rounded-lg(8px) border-gray-200 shadow-sm p-6(24px)`; primary buttons `bg #A21942 text-white hover #801333 transition-colors rounded-md(6px) px-4 py-2 font-medium`. Implement the tokens in **plain CSS** — the single-file rule forbids the Tailwind CDN the README suggests.

## Architecture (whip_pelican.html)

One `<script>` at the bottom of the file. Build order:

```
buildBackground → buildPelican → buildMan → buildBike → buildFX → buildWhip → wire() → requestAnimationFrame(frame)
```

- Each `build*` function stores its updatable element refs on a `._` object (e.g. `g._={...}`).
- `wire()` copies those onto the `svg` global: `svg._clouds`, `svg._pelican`, `svg._man`, `svg._bike`, `svg._fx`, `svg._whip`. The animation loop reads these.
- **UI layer (PolyU chrome):** a pause/resume primary button (`#toggleBtn`) + a running/paused status badge (`#badge`, green `#10B981` dot when running). Pausing freezes the loop (`frame()` returns early) and resume shifts `t0` by the paused duration so the timeline stays continuous. The SVG **scene artwork keeps its own palette** — the design system applies to page chrome only.
- Key state objects:
  - `WHIP` — `cycle` (1.4 s), `hitPhase` (0.70 s into cycle = the moment the tip lands), `tipKF` keyframes, `bendKF`.
  - `lastHitTime(t)` derives hit times **analytically from `t`** (no mutable state) — keep it that way.
  - `MAN`, `B` — anchor points for IK and geometry.
- Hit reaction: `flinch = 1 - ease((t - lastHit) / flinchDur)`; drives the man's lurch + squash + face swap, the bike's shake/slide, and the FX star/ring/text at `WHIP._lastTip`.
- Limbs use 2-bone IK: `ikKnee(hip, foot, L1, L2, bendSign)`. The man's **legs** use a fixed `bendSign = -1` (knee always leads forward, toward the bike) — do **not** use `ikUp` here, it flips the knee side mid-stride. The man's **arms** use `ikDown` (elbows go down). `ikUp`/`ikDown` pick a bend side by height and are only safe when the desired side is consistent with "higher/lower".
- Scrolling background: tiled `<g>` groups translated by `-(t * speed) % period`; world speed 230 px/s, hills ×0.2, clouds ×0.35 (per-element modulo wrap).

## Tuning knobs

| Effect | Where |
| --- | --- |
| Whip rate / hit timing | `WHIP.cycle`, `WHIP.hitPhase` |
| Hit-reaction duration | `flinchDur` in `frame()` (0.5) |
| Man's limb pump speed | `stride = t*7` |
| World scroll speed | `speed = 230` |
| Bike wheel spin | `deg = (t*240) % 360` |
| Bike self-pedaling | `crank = t*5` |
| Pelican hop rate | `t*4.2` |

## Testing (no browser required)

1. **Syntax**: extract the `<script>` block and run `node --check` on it.
2. **Runtime smoke**: stub `document.createElementNS` / `document.getElementById` (attribute bags that register dynamic ids), `performance.now`, `requestAnimationFrame` (no-op); `eval` the script, then call `frame(ts)` at several timestamps including hit moments (e.g. 700 ms, 2100 ms — `hitPhase + n*cycle`).

## Pitfalls (learned the hard way)

- Elements created dynamically are looked up via `$("id")` — keep their `id` attributes if later code resolves them.
- Per-frame animated groups are driven by the **`transform` attribute only**; don't mix CSS transforms.
- SVG scales around the origin: anchored scaling must be `translate(c) scale(s) translate(-c)` (see pelican pouch, man squash).
- New limb segments must keep `L1 + L2 >= max(hip→foot distance)`, otherwise the IK clamp visibly stretches limbs.
- Any new group that `frame()` reads must be registered in `wire()` **before** the first `frame()` call.
- Keep the z-order: `man` → `bike` → `fx` → `whip` (whip must visibly cross the man on impact; bike must sit above the man's back).
- **Inside the man group, the hip circle must be drawn *before* the torso line** (SVG paints in document order). The hip is a skin-tone circle at the hip joint; if it's added after the torso line it sits *on top of the shirt* and looks like a blob over the clothes. Keep it first in `#torsoG` so the orange torso covers it.

## Changelog

### 2026-10-14 — Fixed man's knee flip + hip-over-clothes z-order

- **Knee flip:** `setManLeg()` used `ikUp(...)` (picks the higher knee solution), which made the knee **flip sides** mid-stride (forward when the foot was ahead, behind the hip when it swung back) — a jerky, broken look. Replaced with a fixed `ikKnee(MAN.hip, foot, 48, 50, -1)` so the knee always leads **forward** (toward the bike), a natural pumping pose.
- **Hip over clothes:** the hip circle was added *after* the torso line in `#torsoG`, so it painted on top of the shirt. Moved it *before* the torso line so the orange torso covers it (see Pitfalls).

### 2026-10-11 — Restyled to EduGenAI / PolyU design system (per README.md §1)

Copied from `pelican-whip/`; the scene logic is unchanged. Page chrome changes only:

- Page background → `#F8F9FA` light grey; body text → `#262626` charcoal (was dark navy theme).
- Title accent (`× 鵜鶘甩鞭`) → PolyU brick red `#A21942` (was yellow `#ffcf4d`).
- Font stack → `Inter, system-ui, sans-serif` with CJK fallbacks.
- Content wrapper → `max-width:1280px` centered, `16px` side padding (Tailwind `max-w-7xl mx-auto px-4` semantics).
- Scene container → **card**: `bg-white`, `border:1px solid #E5E7EB`, `border-radius:8px` (rounded-lg), `shadow-sm`, `padding:24px` (p-6); SVG now sits on a rounded `#cdeeff` inset.
- New **primary button** (暫停 / 繼續 = pause/resume the animation) styled exactly per spec: `bg #A21942`, white text, `hover #801333`, `transition-colors`, `rounded-md`, `px-4 py-2`, `font-medium`, plus a `:focus-visible` outline.
- New **status badge** using success green `#10B981` (running) / grey (paused).
- JS: added pause/resume handler; `frame()` early-returns while paused, resume shifts `t0` to keep the timeline continuous.
- Note: README suggests Tailwind CDN, but the single-file/no-CDN rule wins — tokens are implemented in plain CSS with the exact same values.
