# Origin Whip 🦩🚲

A self-contained HTML animation: a pelican chases a cyclist down a road, whipping him with a bullwhip. Every hit triggers rider flinch feedback (face swap, sweat drop, head jolt) plus FX (star burst, ring, "OUCH!" text).

## Run

No build step, no dependencies, no external resources. Open `origin whip.html` directly in a browser (double-click or drag into a tab). The animation starts immediately via `requestAnimationFrame`.

## Structure

Everything lives in one file: `origin whip.html`

- **HTML** — a single `<svg id="scene" viewBox="0 0 1200 600">` canvas. Groups (`<g>`) are empty placeholders that JS fills in. Layer order (back → front): sky/sun → clouds → hills → road/stripes/roadside → shadows → pelican → bike → rider → fx.
- **CSS** (in `<style>`) — page chrome only (dark radial background, card/stage styling). Scene styling lives in SVG attributes.
- **JS** (in one `<script>` block), organized as:
  1. Helpers — `el()` (SVG element factory), `lerp`/`clamp`/`ease`, `sampleKF`/`sampleKF2` (keyframe samplers), `wrapX` (looping scroll), `ikKnee` (2-bone inverse kinematics).
  2. Builders — `buildBackground`, `buildPelican`, `buildBike`, `buildRider`, `buildFX`, `buildWhip`. Each populates its `<g>` and stashes a refs object on the element (e.g. `P._ = {body, legA, ...}`).
  3. Config — `B` (bike geometry: wheel centers, bottom bracket, crank radius), `R` (rider joints), `WHIP` (whip animation: `cycle` duration, `hitPhase` fraction of cycle at which the tip strikes, `tipKF` keyframes, `bendKF` bow amount).
  4. Animation — `frame(now)` runs every rAF tick: scrolls the background, animates the pelican (hop + leg IK), swings the whip (`setWhip`), detects hits (`lastHitTime`), drives rider flinch + pedaling (crank/spokes/legs), and renders FX.

## Conventions

- **No frameworks, no imports, no network.** Keep it that way — the file must stay open-and-run.
- **UI text is zh-Hant** (Traditional Chinese). Match it for any new labels.
- **Positions are absolute SVG coordinates** in the 1200×600 viewBox. Joint positions, keyframe values, and rotation pivots all hardcode these — if you move something, update its references (e.g. wheel rotation pivots are hardcoded in `frame()` as `rotate(deg, 735, 447)` / `rotate(deg, 905, 447)`).
- **Whip hand position** is computed from `HAND_BASE` + pelican hop offset each frame, so the whip stays attached to the bird.
- **Hit timing** derives from `t % WHIP.cycle` and `hitPhase` — change either and the flinch window (`flinchDur = 0.45s`) and FX (`0.5s` window) still key off `lastHitTime(t)`.
- **IK legs** use `ikKnee(hip, foot, L1, L2, bendSign)`; `bendSign` picks which side of the hip→foot line the knee lands on. The cyclist faces right (+x), so the rider's legs use **`bendSign = -1`** (knee bends *forward*, toward the front wheel) in `setLeg()`. The pelican's legs use `+1` (its stride bends the other way). Don't "normalize" these signs — they are character-specific.
- `wire()` binds all private `._` refs onto `svg` at startup — call it before `frame()` if you add new refs.

## Gotchas

- `buildRider` inserts the far leg *before* the bike group (`$("bike").before(far)`) so it renders behind the frame. Don't reorder the builders.
- **Rider leg bend direction:** `setLeg()` must call `ikKnee(..., -1)`. Using `+1` puts the knee *behind* the hip (chicken-leg pose) — the legs look broken. The sign is easy to flip by accident; if the rider's legs suddenly bend backward, this is the culprit.
- The `id:null` attr on the spokes group is a harmless no-op; leave it.
- FX text cycles through `["OUCH!","痛!!","啪!","喂喂!","好痛"]` indexed by hit count.
