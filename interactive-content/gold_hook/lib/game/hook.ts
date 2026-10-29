import type { GameObject, SimEvent, Upgrades } from "./types";
import { CANVAS_H, CANVAS_W } from "./levels";

/**
 * Hook simulation — a pure state machine stepped by the render loop.
 *
 *   swing ──(hook!)──► out ──(grab / bottom)──► back ──(length 0)──► swing
 *
 * TNT: when the caught object is TNT a fuse counts down; at zero it
 * explodes, clearing objects within BLAST_RADIUS.
 */

export interface Sim {
  swing: number; // accumulated swing time
  angle: number; // current rope angle from vertical (rad)
  state: "swing" | "out" | "back";
  length: number; // rope length
  grabbed: GameObject | null;
  fuse: number; // TNT fuse time left (0 = no fuse)
  /** Hook tip position, updated every step. */
  tipX: number;
  tipY: number;
}

export const PIVOT = { x: 400, y: 44 };
export const MAX_ANGLE = 1.05; // ~60°
// Long enough to reach the bottom corners: dist(PIVOT → (0,560)) ≈ 653.
export const MAX_LEN = 680;
export const TIP_RADIUS = 7;
export const BLAST_RADIUS = 115;
export const TNT_FUSE = 1.3;

const EXTEND_SPEED = 520; // px/s
const RETRACT_BASE = 250; // px/s before weight
const SWING_RATE = 1.7; // rad-ish per second
const BASE_LEN = 30; // idle rope length while swinging

export function createSim(): Sim {
  return { swing: 0, angle: 0, state: "swing", length: 0, grabbed: null, fuse: 0, tipX: PIVOT.x, tipY: PIVOT.y };
}

export function resetSim(sim: Sim) {
  sim.swing = 0;
  sim.angle = 0;
  sim.state = "swing";
  sim.length = BASE_LEN;
  sim.grabbed = null;
  sim.fuse = 0;
  sim.tipX = PIVOT.x;
  sim.tipY = PIVOT.y;
}

/** Player pressed hook — only meaningful while swinging. */
export function pressHook(sim: Sim) {
  if (sim.state === "swing") {
    sim.state = "out";
    sim.grabbed = null;
    sim.fuse = 0;
  }
}

export function retractSpeed(weight: number, upgrades: Upgrades): number {
  const strength = 1 + 0.15 * upgrades.strength;
  return (RETRACT_BASE / (1 + weight * 0.32)) * strength;
}

export function extendSpeed(upgrades: Upgrades): number {
  return EXTEND_SPEED * (1 + 0.15 * upgrades.strength);
}

function tipPosition(sim: Sim) {
  sim.tipX = PIVOT.x + Math.sin(sim.angle) * sim.length;
  sim.tipY = PIVOT.y + Math.cos(sim.angle) * sim.length;
}

/**
 * Longest rope length that keeps the tip inside the canvas for a given
 * swing angle. The hook retracts once it reaches this limit, so it never
 * extends through the game window (bottom or side edges).
 */
function boundaryLimit(angle: number): number {
  const s = Math.sin(angle);
  const c = Math.cos(angle);
  let limit = MAX_LEN;
  if (c > 1e-4) limit = Math.min(limit, (CANVAS_H - PIVOT.y) / c); // bottom edge
  if (s > 1e-4) limit = Math.min(limit, (CANVAS_W - PIVOT.x) / s); // right edge
  if (s < -1e-4) limit = Math.min(limit, PIVOT.x / -s); // left edge
  return limit;
}

/**
 * Advance the simulation by dt seconds.
 * `objects` must contain only live (non-removed) objects.
 * Returns events for the renderer to react to (sound, store updates, FX).
 */
export function stepSim(
  sim: Sim,
  dt: number,
  objects: GameObject[],
  upgrades: Upgrades,
): SimEvent[] {
  const events: SimEvent[] = [];

  if (sim.state === "swing") {
    sim.swing += dt;
    sim.angle = MAX_ANGLE * Math.sin(sim.swing * SWING_RATE);
    sim.length = BASE_LEN;
    tipPosition(sim);
    return events;
  }

  if (sim.state === "out") {
    // Stop at the canvas boundary (or MAX_LEN), whichever is closer, so the
    // hook retracts instead of extending through the game window.
    const limit = boundaryLimit(sim.angle);
    sim.length = Math.min(sim.length + extendSpeed(upgrades) * dt, limit);

    // Grab the first object the tip touches.
    for (const obj of objects) {
      if (Math.hypot(obj.x - sim.tipX, obj.y - sim.tipY) < obj.r + TIP_RADIUS) {
        sim.grabbed = obj;
        if (obj.kind === "tnt") sim.fuse = TNT_FUSE;
        events.push({ type: "grab", obj });
        break;
      }
    }

    if (sim.length >= limit || sim.grabbed) {
      sim.length = Math.min(sim.length, limit);
      sim.state = "back";
    }
    tipPosition(sim);
    return events;
  }

  // state === "back"
  if (sim.grabbed?.kind === "tnt" && sim.fuse > 0) {
    sim.fuse -= dt;
    if (sim.fuse <= 0) {
      // KABOOM: TNT + everything within radius is blown away.
      const cleared = objects.filter((o) => Math.hypot(o.x - sim.tipX, o.y - sim.tipY) <= BLAST_RADIUS);
      events.push({ type: "explode", x: sim.tipX, y: sim.tipY, cleared });
      events.push({
        type: "deliver",
        obj: sim.grabbed,
        delta: sim.grabbed.value, // negative — TNT always hurts
      });
      sim.grabbed = null;
    }
  }

  if (sim.grabbed) {
    const speed = retractSpeed(sim.grabbed.weight, upgrades);
    sim.length -= speed * dt;
    if (sim.length <= BASE_LEN) {
      const obj = sim.grabbed;
      sim.grabbed = null;
      sim.length = BASE_LEN;
      sim.state = "swing";
      events.push({ type: "deliver", obj, delta: obj.value });
    }
  } else {
    // Nothing in hand (e.g. TNT just exploded) — reel home at base speed.
    sim.length -= RETRACT_BASE * dt;
    if (sim.length <= BASE_LEN) {
      sim.length = BASE_LEN;
      sim.state = "swing";
    }
  }

  tipPosition(sim);
  return events;
}
