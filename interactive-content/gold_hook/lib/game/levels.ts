import { buildObject } from "./catalog";
import type { GameObject, LevelDef, ObjectKind, Upgrades } from "./types";

/**
 * Levels. All logic is pure and deterministic given a seed,
 * so levels can be regenerated identically after a page refresh.
 */

export const LEVELS: LevelDef[] = [
  {
    id: 1,
    name: "Requirements Valley",
    target: 450,
    time: 90,
    counts: {
      "gold-s": 4, "gold-m": 3, "gold-l": 1,
      diamond: 1, mystery: 2, chest: 1,
      rock: 5, tnt: 1,
    },
  },
  {
    id: 2,
    name: "Code & Test Canyon",
    target: 1000,
    time: 85,
    counts: {
      "gold-s": 4, "gold-m": 4, "gold-l": 2,
      diamond: 2, mystery: 3, chest: 1,
      rock: 6, tnt: 2,
    },
  },
  {
    id: 3,
    name: "Production Peak",
    target: 1600,
    time: 80,
    counts: {
      "gold-s": 4, "gold-m": 4, "gold-l": 3,
      diamond: 3, mystery: 3, chest: 2,
      rock: 7, tnt: 3,
    },
  },
];

export const LEVEL_COUNT = LEVELS.length;

/** Canvas logical size shared by simulation + renderer. */
export const CANVAS_W = 800;
export const CANVAS_H = 560;
/** Ground surface line (shared by simulation + renderer). */
export const GROUND_Y = Math.round(CANVAS_H * 0.58);

export function levelDef(level: number): LevelDef {
  return LEVELS[Math.min(Math.max(level - 1, 0), LEVELS.length - 1)];
}

/** Time for a level after the Time Bonus upgrade. */
export function levelTime(level: number, upgrades: Upgrades): number {
  return levelDef(level).time + upgrades.time * 10;
}

/**
 * Generate the object field for a level.
 * Objects spawn below the ground surface without heavy overlap.
 */
export function generateLevel(level: number, upgrades: Upgrades, seed: number): GameObject[] {
  const mulberry = makeSeededRng(seed);
  const def = levelDef(level);

  // Clover adds extra diamonds & mystery bags.
  const counts: Partial<Record<ObjectKind, number>> = { ...def.counts };
  counts.diamond = (counts.diamond ?? 0) + upgrades.clover;
  counts.mystery = (counts.mystery ?? 0) + upgrades.clover;

  const kinds: ObjectKind[] = [];
  (Object.keys(counts) as ObjectKind[]).forEach((k) => {
    for (let i = 0; i < (counts[k] ?? 0); i++) kinds.push(k);
  });
  // Shuffle so kinds are scattered.
  for (let i = kinds.length - 1; i > 0; i--) {
    const j = Math.floor(mulberry() * (i + 1));
    [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
  }

  const objects: GameObject[] = [];
  const minX = 50;
  const maxX = CANVAS_W - 50;
  // Keep object centers below the ground surface so nothing floats in the air.
  const minY = GROUND_Y + 24;
  const maxY = CANVAS_H - 46;

  kinds.forEach((kind, idx) => {
    let x = 0;
    let y = 0;
    let ok = false;
    for (let attempt = 0; attempt < 14 && !ok; attempt++) {
      const rGuess = 34; // worst-case radius for spacing checks
      x = minX + mulberry() * (maxX - minX);
      y = minY + mulberry() * (maxY - minY);
      ok = objects.every((o) => Math.hypot(o.x - x, o.y - y) > o.r + rGuess * 0.8);
    }
    objects.push(buildObject(idx + 1, kind, x, y, mulberry));
  });

  return objects;
}

/** Small deterministic PRNG (mulberry32). */
export function makeSeededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
