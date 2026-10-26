"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import {
  BLAST_RADIUS,
  createSim,
  PIVOT,
  pressHook,
  resetSim,
  stepSim,
  type Sim,
} from "@/lib/game/hook";
import { CANVAS_H, CANVAS_W, GROUND_Y, levelTime, makeSeededRng } from "@/lib/game/levels";
import { rollMystery } from "@/lib/game/catalog";
import { sfx } from "@/lib/game/audio";
import type { GameObject } from "@/lib/game/types";

const W = CANVAS_W;
const H = CANVAS_H;

/** Custom event so DOM buttons (HUD, mobile bar) can press the hook. */
export const HOOK_PRESS_EVENT = "grh:hook-press";

interface Floater {
  x: number;
  y: number;
  text: string;
  color: string;
  t: number;
}

interface Blast {
  x: number;
  y: number;
  t: number;
  sparks: { a: number; sp: number }[];
}

interface Fx {
  floaters: Floater[];
  blasts: Blast[];
}

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<Sim>(createSim());
  const fxRef = useRef<Fx>({ floaters: [], blasts: [] });
  const seenLevelRef = useRef(0);
  const seenBlastRef = useRef(0);
  const reelTickRef = useRef(0);

  // ── main loop ───────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const store = useStore.getState();
      const sim = simRef.current;
      const fx = fxRef.current;

      // New level? Reset the hook.
      if (store.levelSeed !== seenLevelRef.current) {
        seenLevelRef.current = store.levelSeed;
        resetSim(sim);
        fx.floaters = [];
        fx.blasts = [];
      }

      // Dynamite blast from the HUD button.
      if (store.blastFx && store.blastFx.nonce !== seenBlastRef.current) {
        seenBlastRef.current = store.blastFx.nonce;
        spawnBlast(fx, store.blastFx.x, store.blastFx.y);
      }

      if (store.phase === "playing") {
        store.tickTimer(dt);

        const events = stepSim(sim, dt, useStore.getState().objects, useStore.getState().upgrades);
        for (const ev of events) handleEvent(ev, fx, sim);

        // Ratchet sound while reeling something in.
        if (sim.state === "back" && sim.grabbed) {
          reelTickRef.current -= dt;
          if (reelTickRef.current <= 0) {
            reelTickRef.current = 0.09;
            sfx.reel();
          }
        }
      }

      // FX decay.
      fx.floaters = fx.floaters.filter((f) => (f.t += dt) < 1.4);
      fx.blasts = fx.blasts.filter((b) => (b.t += dt) < 0.6);

      draw(ctx, dpr, sim, fx, now / 1000);
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── input: pointer + keyboard ───────────────────────────────────────
  useEffect(() => {
    const press = () => {
      const store = useStore.getState();
      if (store.phase !== "playing") return;
      sfx.unlock();
      sfx.whoosh();
      pressHook(simRef.current);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        press();
      } else if (e.key === "b" || e.key === "B") {
        useStore.getState().requestBlast();
      }
    };

    const onDomHook = () => press();
    window.addEventListener("keydown", onKey);
    window.addEventListener(HOOK_PRESS_EVENT, onDomHook);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(HOOK_PRESS_EVENT, onDomHook);
    };
  }, []);

  const onPointerDown = () => {
    const store = useStore.getState();
    if (store.phase !== "playing") return;
    sfx.unlock();
    sfx.whoosh();
    pressHook(simRef.current);
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={onPointerDown}
      className="block h-auto w-full touch-none select-none rounded-b-2xl"
      style={{ aspectRatio: `${W} / ${H}` }}
      aria-label="Gold Rush Hook game canvas. Tap or press Space to drop the hook."
    />
  );
}

// ══════════════════════════════════════════════════════════════════════
// Event handling (simulation → store + FX + audio)
// ══════════════════════════════════════════════════════════════════════

function handleEvent(
  ev: ReturnType<typeof stepSim>[number],
  fx: Fx,
  sim: Sim,
) {
  const store = useStore.getState();

  if (ev.type === "grab") {
    sfx.grab();
    const { obj } = ev;
    store.setCarry({
      label: obj.label,
      value: obj.kind === "mystery" ? 0 : obj.value,
      good: obj.polarity === "good",
    });
    if (obj.kind === "tnt") sfx.mystery();
    return;
  }

  if (ev.type === "explode") {
    spawnBlast(fx, ev.x, ev.y);
    sfx.boom();
    store.removeObjects(ev.cleared.map((o) => o.id));
    return;
  }

  if (ev.type === "deliver") {
    const { obj } = ev;
    let delta = obj.value;
    let note: string | null = null;

    if (obj.kind === "mystery") {
      const outcome = rollMystery(store.upgrades.clover);
      delta = outcome.delta;
      note = outcome.note;
      sfx.mystery();
    }

    const tip = { x: sim.tipX, y: sim.tipY };
    store.applyScore(delta);
    store.removeObjects([obj.id]);
    store.showToast(
      delta >= 0 ? `+${delta} — ${obj.label}` : `${delta} — ${obj.label}`,
      delta >= 0,
    );
    fx.floaters.push({
      x: tip.x,
      y: tip.y - 26,
      text: delta >= 0 ? `+${delta}` : `${delta}`,
      color: delta >= 0 ? "#ffd54a" : "#ff6b6b",
      t: 0,
    });

    if (delta >= 0) {
      if (obj.kind === "diamond" || obj.kind === "chest") sfx.bigCoin();
      else sfx.coin();
    } else {
      sfx.bad();
    }
    return;
  }
}

function spawnBlast(fx: Fx, x: number, y: number) {
  const rand = makeSeededRng(Math.floor(Math.random() * 1e9));
  fx.blasts.push({
    x,
    y,
    t: 0,
    sparks: Array.from({ length: 16 }, () => ({ a: rand() * Math.PI * 2, sp: 60 + rand() * 160 })),
  });
}

// ══════════════════════════════════════════════════════════════════════
// Rendering
// ══════════════════════════════════════════════════════════════════════

// Static scenery, generated once with a fixed seed.
const scenery = (() => {
  const rand = makeSeededRng(20261002);
  return {
    pebbles: Array.from({ length: 46 }, () => ({
      x: rand() * W,
      y: GROUND_Y + 14 + rand() * (H - GROUND_Y - 24),
      r: 2 + rand() * 5,
      s: rand(),
    })),
    clouds: Array.from({ length: 4 }, (_, i) => ({
      x: (i / 4) * W + rand() * 60,
      y: 40 + rand() * 70,
      s: 0.7 + rand() * 0.8,
      sp: 4 + rand() * 6,
    })),
  };
})();

function draw(ctx: CanvasRenderingContext2D, dpr: number, sim: Sim, fx: Fx, time: number) {
  ctx.save();
  ctx.scale(dpr, dpr);

  const store = useStore.getState();
  // Day progress: 0 = round start (dawn) → 0.5 (noon) → 1 = round end (sunset).
  // Outside of play (menu / shop / end screens) show the dawn "ready" sky.
  const total = levelTime(store.level, store.upgrades);
  const p =
    store.phase === "playing" && total > 0
      ? Math.min(1, Math.max(0, 1 - store.timeLeft / total))
      : 0;

  drawSky(ctx, time, p);
  drawGround(ctx);

  // Objects (depth-sorted), grabbed object drawn at the hook tip.
  const objects = [...store.objects].sort((a, b) => a.y - b.y);
  for (const o of objects) {
    if (o.id === sim.grabbed?.id) continue;
    drawObject(ctx, o, o.x, o.y, time);
  }
  if (sim.grabbed) drawObject(ctx, sim.grabbed, sim.tipX, sim.tipY, time);

  drawRopeAndHook(ctx, sim, time);
  drawFx(ctx, fx);
  ctx.restore();
}

// ── dynamic sky (dawn → noon → sunset by round time) ─────────────────
type RGB = [number, number, number];

function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpRgb = (a: RGB, b: RGB, t: number): RGB => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
];
const rgbCss = (c: RGB, alpha = 1) =>
  `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${alpha})`;

interface SkyKey {
  top: RGB;
  mid: RGB;
  horizon: RGB;
  sun: RGB;
  glow: RGB;
  glowA: number;
  cloud: RGB;
}

// Three keyframes across the round: dawn (start) → noon (mid) → sunset (end).
const DAWN: SkyKey = {
  top: hexToRgb("#6f8fc9"),
  mid: hexToRgb("#f2a9c0"),
  horizon: hexToRgb("#ffd9a3"),
  sun: hexToRgb("#ffcf7a"),
  glow: hexToRgb("#ffbe78"),
  glowA: 0.35,
  cloud: hexToRgb("#ffd9e6"),
};
const NOON: SkyKey = {
  top: hexToRgb("#60a5fa"),
  mid: hexToRgb("#bae6fd"),
  horizon: hexToRgb("#fef9c3"),
  sun: hexToRgb("#fde047"),
  glow: hexToRgb("#fde047"),
  glowA: 0.25,
  cloud: hexToRgb("#ffffff"),
};
const SUNSET: SkyKey = {
  top: hexToRgb("#4b3a7a"),
  mid: hexToRgb("#e86a4a"),
  horizon: hexToRgb("#ffcf6b"),
  sun: hexToRgb("#ff7a3c"),
  glow: hexToRgb("#ff783c"),
  glowA: 0.4,
  cloud: hexToRgb("#ffc9a3"),
};

function mixKey(a: SkyKey, b: SkyKey, t: number): SkyKey {
  return {
    top: lerpRgb(a.top, b.top, t),
    mid: lerpRgb(a.mid, b.mid, t),
    horizon: lerpRgb(a.horizon, b.horizon, t),
    sun: lerpRgb(a.sun, b.sun, t),
    glow: lerpRgb(a.glow, b.glow, t),
    glowA: lerp(a.glowA, b.glowA, t),
    cloud: lerpRgb(a.cloud, b.cloud, t),
  };
}

/** Interpolated sky palette for day-progress `p` in [0, 1]. */
function skyAt(p: number): SkyKey {
  return p < 0.5 ? mixKey(DAWN, NOON, p / 0.5) : mixKey(NOON, SUNSET, (p - 0.5) / 0.5);
}

/** Sun travels an arc: low at dawn/sunset, high at noon. */
function sunPos(p: number) {
  const x = W * (0.12 + 0.76 * p);
  const y = GROUND_Y - 22 - 235 * Math.sin(p * Math.PI);
  return { x, y };
}

function drawSky(ctx: CanvasRenderingContext2D, time: number, p: number) {
  const sky = skyAt(p);
  // Sky gradient (top → horizon) for the current time of day.
  const g = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  g.addColorStop(0, rgbCss(sky.top));
  g.addColorStop(0.55, rgbCss(sky.mid));
  g.addColorStop(1, rgbCss(sky.horizon));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, GROUND_Y);

  // Sun (position + colour follow the day).
  const { x, y } = sunPos(p);
  ctx.fillStyle = rgbCss(sky.glow, sky.glowA);
  ctx.beginPath();
  ctx.arc(x, y, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgbCss(sky.sun);
  ctx.beginPath();
  ctx.arc(x, y, 30, 0, Math.PI * 2);
  ctx.fill();

  // Drifting clouds, tinted by the time of day.
  ctx.fillStyle = rgbCss(sky.cloud, 0.9);
  for (const c of scenery.clouds) {
    const cx = (c.x + time * c.sp) % (W + 160) - 80;
    cloud(ctx, cx, c.y, c.s);
  }
}

function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.beginPath();
  ctx.ellipse(x, y, 34 * s, 14 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 22 * s, y - 8 * s, 22 * s, 12 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x - 24 * s, y - 4 * s, 18 * s, 10 * s, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawGround(ctx: CanvasRenderingContext2D) {
  const g = ctx.createLinearGradient(0, GROUND_Y, 0, H);
  g.addColorStop(0, "#b45309");
  g.addColorStop(1, "#7c3a12");
  ctx.fillStyle = g;
  ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

  // Grass lip.
  ctx.fillStyle = "#84cc16";
  ctx.fillRect(0, GROUND_Y - 4, W, 8);

  // Pebbles.
  for (const p of scenery.pebbles) {
    ctx.fillStyle = p.s > 0.5 ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.r, p.r * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRopeAndHook(ctx: CanvasRenderingContext2D, sim: Sim, time: number) {
  // Winch cabin at the pivot.
  ctx.fillStyle = "#3b3f4a";
  ctx.fillRect(PIVOT.x - 34, 0, 68, 26);
  ctx.fillStyle = "#2c2f38";
  ctx.fillRect(PIVOT.x - 40, 24, 80, 8);
  ctx.fillStyle = "#f2b53c";
  ctx.beginPath();
  ctx.arc(PIVOT.x, PIVOT.y, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3b3f4a";
  ctx.beginPath();
  ctx.arc(PIVOT.x, PIVOT.y, 4, 0, Math.PI * 2);
  ctx.fill();

  // Rope.
  ctx.strokeStyle = "#d9b98a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(PIVOT.x, PIVOT.y);
  ctx.lineTo(sim.tipX, sim.tipY);
  ctx.stroke();

  // Hook (a little J).
  ctx.strokeStyle = "#c8ccd6";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(sim.tipX, sim.tipY + 4, 8, Math.PI * 0.15, Math.PI * 1.15, false);
  ctx.stroke();

  // TNT fuse sparks while reeling TNT.
  if (sim.grabbed?.kind === "tnt" && sim.fuse > 0) {
    const blink = Math.sin(time * 30) > 0;
    if (blink) {
      ctx.fillStyle = "#ffe08a";
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + time * 8;
        ctx.beginPath();
        ctx.arc(sim.tipX + Math.cos(a) * 16, sim.tipY + Math.sin(a) * 16, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawObject(ctx: CanvasRenderingContext2D, o: GameObject, x: number, y: number, time: number) {
  ctx.save();
  ctx.translate(x, y);

  // Soft shadow.
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.beginPath();
  ctx.ellipse(0, o.r * 0.82, o.r * 0.8, o.r * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  switch (o.kind) {
    case "gold-s":
    case "gold-m":
    case "gold-l":
      drawNugget(ctx, o, 1);
      break;
    case "diamond":
      drawDiamond(ctx, o, time);
      break;
    case "mystery":
      drawBag(ctx, o);
      break;
    case "chest":
      drawChest(ctx, o);
      break;
    case "rock":
      drawRock(ctx, o);
      break;
    case "tnt":
      drawTnt(ctx, o);
      break;
  }
  ctx.restore();

  drawLabel(ctx, o, x, y - o.r - 8);
}

/** Irregular gold nugget. */
function drawNugget(ctx: CanvasRenderingContext2D, o: GameObject, scale: number) {
  const r = o.r;
  const pts = 9;
  ctx.beginPath();
  for (let i = 0; i <= pts; i++) {
    const a = (i / pts) * Math.PI * 2;
    const wobble = 0.78 + 0.22 * Math.sin(o.seed + i * 2.7);
    const px = Math.cos(a) * r * wobble * scale;
    const py = Math.sin(a) * r * 0.86 * wobble * scale;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  const g = ctx.createLinearGradient(-r, -r, r, r);
  g.addColorStop(0, "#ffe98a");
  g.addColorStop(0.55, "#f2b53c");
  g.addColorStop(1, "#c98a1d");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = "#9c6712";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Facet highlights.
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-r * 0.4, -r * 0.25);
  ctx.lineTo(r * 0.1, -r * 0.42);
  ctx.moveTo(-r * 0.2, r * 0.15);
  ctx.lineTo(r * 0.3, r * 0.05);
  ctx.stroke();
}

function drawDiamond(ctx: CanvasRenderingContext2D, o: GameObject, time: number) {
  const r = o.r;
  const twinkle = 0.75 + 0.25 * Math.sin(time * 3 + o.seed);
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(r * 0.85, -r * 0.25);
  ctx.lineTo(0, r);
  ctx.lineTo(-r * 0.85, -r * 0.25);
  ctx.closePath();
  const g = ctx.createLinearGradient(-r, -r, r, r);
  g.addColorStop(0, `rgba(190, 240, 255, ${twinkle})`);
  g.addColorStop(1, "#59b7e8");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = "#2e86b8";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Facets.
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(0, r * 0.35);
  ctx.moveTo(-r * 0.85, -r * 0.25);
  ctx.lineTo(r * 0.85, -r * 0.25);
  ctx.stroke();
}

function drawBag(ctx: CanvasRenderingContext2D, o: GameObject) {
  const r = o.r;
  // Sack body.
  ctx.beginPath();
  ctx.moveTo(-r * 0.9, r * 0.75);
  ctx.quadraticCurveTo(-r * 1.15, -r * 0.2, -r * 0.45, -r * 0.62);
  ctx.quadraticCurveTo(0, -r * 0.85, r * 0.45, -r * 0.62);
  ctx.quadraticCurveTo(r * 1.15, -r * 0.2, r * 0.9, r * 0.75);
  ctx.closePath();
  ctx.fillStyle = "#b98a53";
  ctx.fill();
  ctx.strokeStyle = "#7d5528";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Neck + tie.
  ctx.fillStyle = "#a97b47";
  ctx.fillRect(-r * 0.3, -r * 0.95, r * 0.6, r * 0.36);
  ctx.strokeStyle = "#7d5528";
  ctx.strokeRect(-r * 0.3, -r * 0.95, r * 0.6, r * 0.36);
  // "?".
  ctx.fillStyle = "#3c2a12";
  ctx.font = `700 ${Math.round(r * 0.9)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("?", 0, r * 0.18);
}

function drawChest(ctx: CanvasRenderingContext2D, o: GameObject) {
  const r = o.r;
  const w = r * 1.9;
  const h = r * 1.5;
  // Body.
  ctx.fillStyle = "#7a4a21";
  roundRect(ctx, -w / 2, -h / 2, w, h, 6);
  ctx.fill();
  ctx.strokeStyle = "#4e2e10";
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // Lid line.
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h * 0.08);
  ctx.lineTo(w / 2, -h * 0.08);
  ctx.stroke();
  // Gold bands.
  ctx.fillStyle = "#f2b53c";
  ctx.fillRect(-w * 0.3, -h / 2, w * 0.09, h);
  ctx.fillRect(w * 0.21, -h / 2, w * 0.09, h);
  // Lock.
  ctx.fillStyle = "#ffd54a";
  ctx.beginPath();
  ctx.arc(0, -h * 0.02, r * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#9c6712";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = "#4e2e10";
  ctx.fillRect(-r * 0.05, -h * 0.02, r * 0.1, r * 0.16);
}

function drawRock(ctx: CanvasRenderingContext2D, o: GameObject) {
  const r = o.r;
  const pts = 8;
  ctx.beginPath();
  for (let i = 0; i <= pts; i++) {
    const a = (i / pts) * Math.PI * 2;
    const wobble = 0.8 + 0.2 * Math.cos(o.seed + i * 3.1);
    const px = Math.cos(a) * r * wobble;
    const py = Math.sin(a) * r * 0.82 * wobble;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  const g = ctx.createLinearGradient(-r, -r, r, r);
  g.addColorStop(0, "#9aa0a8");
  g.addColorStop(1, "#5c6167");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = "#3f4348";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Cracks.
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-r * 0.35, -r * 0.2);
  ctx.lineTo(-r * 0.05, 0.05 * r);
  ctx.lineTo(-r * 0.28, r * 0.35);
  ctx.moveTo(r * 0.3, -r * 0.3);
  ctx.lineTo(r * 0.12, -r * 0.05);
  ctx.stroke();
}

function drawTnt(ctx: CanvasRenderingContext2D, o: GameObject) {
  const r = o.r;
  const w = r * 1.3;
  const h = r * 1.7;
  // Barrel.
  ctx.fillStyle = "#c0392b";
  roundRect(ctx, -w / 2, -h / 2, w, h, 4);
  ctx.fill();
  ctx.strokeStyle = "#7e1f14";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Band + label.
  ctx.fillStyle = "#e8e2d4";
  ctx.fillRect(-w / 2, -h * 0.14, w, h * 0.3);
  ctx.fillStyle = "#7e1f14";
  ctx.font = `800 ${Math.round(r * 0.5)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("TNT", 0, h * 0.01);
  // Fuse.
  ctx.strokeStyle = "#6b4a26";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, -h / 2);
  ctx.quadraticCurveTo(r * 0.4, -h * 0.72, r * 0.15, -h * 0.85);
  ctx.stroke();
  ctx.fillStyle = "#ffd54a";
  ctx.beginPath();
  ctx.arc(r * 0.15, -h * 0.85, 2.6, 0, Math.PI * 2);
  ctx.fill();
}

/** SDLC lesson label pill above each object. */
function drawLabel(ctx: CanvasRenderingContext2D, o: GameObject, x: number, y: number) {
  ctx.save();
  ctx.font = "600 10.5px system-ui, sans-serif";
  const text = o.label;
  const w = ctx.measureText(text).width + 12;
  const h = 16;
  const bx = clamp(x - w / 2, 2, W - w - 2);
  ctx.fillStyle = o.polarity === "good" ? "rgba(18, 58, 28, 0.82)" : "rgba(74, 16, 16, 0.82)";
  roundRect(ctx, bx, y - h, w, h, 8);
  ctx.fill();
  ctx.fillStyle = o.polarity === "good" ? "#b9f6ca" : "#ffc9c9";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, bx + w / 2, y - h / 2 + 0.5);
  ctx.restore();
}

function drawFx(ctx: CanvasRenderingContext2D, fx: Fx) {
  // Score floaters.
  for (const f of fx.floaters) {
    const p = f.t / 1.4;
    ctx.globalAlpha = 1 - p;
    ctx.fillStyle = f.color;
    ctx.font = "800 18px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(f.text, f.x, f.y - p * 34);
  }
  ctx.globalAlpha = 1;

  // Explosions.
  for (const b of fx.blasts) {
    const p = b.t / 0.6;
    const radius = p * BLAST_RADIUS;
    // Flash.
    ctx.fillStyle = `rgba(255, 210, 90, ${0.5 * (1 - p)})`;
    ctx.beginPath();
    ctx.arc(b.x, b.y, radius * 0.8, 0, Math.PI * 2);
    ctx.fill();
    // Ring.
    ctx.strokeStyle = `rgba(255, 160, 60, ${0.9 * (1 - p)})`;
    ctx.lineWidth = 5 * (1 - p) + 1;
    ctx.beginPath();
    ctx.arc(b.x, b.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    // Sparks.
    ctx.fillStyle = `rgba(255, 220, 120, ${1 - p})`;
    for (const s of b.sparks) {
      const d = s.sp * b.t;
      ctx.beginPath();
      ctx.arc(b.x + Math.cos(s.a) * d, b.y + Math.sin(s.a) * d, 2.5 * (1 - p) + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ── helpers ────────────────────────────────────────────────────────────

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
