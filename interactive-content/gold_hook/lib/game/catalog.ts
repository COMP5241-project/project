import type { GameObject, MysteryOutcome, ObjectKind, ObjectPolarity } from "./types";

/**
 * THE CATALOG — all game content lives here.
 *
 * DO's of the SDLC  →  gold / diamond / mystery / chest  (earn marks)
 * DON'Ts of the SDLC → rocks / TNT                     (lose marks)
 *
 * Every label is distilled from the course deck
 * "Software Development Lifecycle". Swap or add entries freely —
 * the renderer and scoring only care about the fields below.
 */

export interface CatalogDef {
  kind: ObjectKind;
  polarity: ObjectPolarity;
  name: string;
  baseValue: number; // +/- marks (mystery resolves at catch)
  minWeight: number;
  maxWeight: number;
  minR: number;
  maxR: number;
  /** Labels for this kind. Good = ✓ do's, Bad = ✗ don'ts. */
  labels: string[];
}

export const CATALOG: Record<ObjectKind, CatalogDef> = {
  "gold-s": {
    kind: "gold-s",
    polarity: "good",
    name: "Small Gold",
    baseValue: 25,
    minWeight: 0.8,
    maxWeight: 1.3,
    minR: 14,
    maxR: 17,
    labels: [
      "Write requirements doc ✓",
      "Do code reviews ✓",
      "Run unit tests ✓",
      "Use Git version control ✓",
      "Write documentation ✓",
      "Define acceptance criteria ✓",
      "Prioritise with MoSCoW ✓",
      "Ask the 5 Whys ✓",
    ],
  },
  "gold-m": {
    kind: "gold-m",
    polarity: "good",
    name: "Medium Gold",
    baseValue: 60,
    minWeight: 2.2,
    maxWeight: 3.2,
    minR: 19,
    maxR: 23,
    labels: [
      "Interview stakeholders ✓",
      "Build a prototype / MVP ✓",
      "Do integration testing ✓",
      "Automate tests (CI) ✓",
      "Use feature flags ✓",
      "Verify vs. validate ✓",
      "Monitor in production ✓",
    ],
  },
  "gold-l": {
    kind: "gold-l",
    polarity: "good",
    name: "Large Gold",
    baseValue: 120,
    minWeight: 4.5,
    maxWeight: 6.5,
    minR: 26,
    maxR: 31,
    labels: [
      "Do system testing ✓",
      "Acceptance: alpha + beta ✓",
      "Plan a canary rollout ✓",
      "Maintain & patch software ✓",
      "Regression test after fixes ✓",
    ],
  },
  diamond: {
    kind: "diamond",
    polarity: "good",
    name: "Diamond",
    baseValue: 250,
    minWeight: 1.0,
    maxWeight: 1.4,
    minR: 14,
    maxR: 16,
    labels: [
      "Blue-Green zero-downtime release 💎",
      "Requirements management done right 💎",
      "The perfect SDLC, start to finish 💎",
    ],
  },
  mystery: {
    kind: "mystery",
    polarity: "good",
    name: "Mystery Bag",
    baseValue: 0, // resolved randomly on catch
    minWeight: 1.2,
    maxWeight: 1.8,
    minR: 16,
    maxR: 19,
    labels: [
      "AI-generated requirement? …",
      "Mystery requirement …",
      "Surprise feedback …",
    ],
  },
  chest: {
    kind: "chest",
    polarity: "good",
    name: "Heavy Chest",
    baseValue: 300,
    minWeight: 10,
    maxWeight: 14,
    minR: 30,
    maxR: 36,
    labels: [
      "The complete SDLC treasure chest",
      "Full lifecycle, properly documented",
    ],
  },
  rock: {
    kind: "rock",
    polarity: "bad",
    name: "Rock",
    baseValue: -45, // scaled by size at generation
    minWeight: 4,
    maxWeight: 9,
    minR: 20,
    maxR: 30,
    labels: [
      "Skip testing ✗",
      "Hardcode API keys ✗",
      "Push .env to GitHub ✗",
      "Scope creep ✗",
      "No documentation ✗",
      "Ignore non-functional reqs ✗",
      "No code reviews ✗",
      "Vibe-code to 100% ✗",
      "No monitoring or alerts ✗",
      "Ignore maintenance ✗",
    ],
  },
  tnt: {
    kind: "tnt",
    polarity: "bad",
    name: "TNT",
    baseValue: -40,
    minWeight: 1.5,
    maxWeight: 2.2,
    minR: 16,
    maxR: 19,
    labels: [
      "Big Bang deployment — KABOOM ✗",
      "YOLO deploy to production ✗",
    ],
  },
};

/** Mystery bag resolution. Clover shifts the odds toward good outcomes. */
const MYSTERY_OUTCOMES: MysteryOutcome[] = [
  { delta: 100, note: "Jackpot DO: zero-downtime release! 💎" },
  { delta: 60, note: "A neat little DO: proper code review ✓" },
  { delta: 40, note: "Nice DO: good documentation ✓" },
  { delta: 15, note: "Eh… a minor DO: a comment here and there ✓" },
  { delta: -30, note: "Surprise DON'T: hidden scope creep ✗" },
  { delta: -40, note: "A nasty DON'T: a production outage ✗" },
];

/** Weighted pick of a mystery outcome; `lucky` 0..2 tilts toward positives. */
export function rollMystery(lucky: number, rand: () => number = Math.random): MysteryOutcome {
  const weights = MYSTERY_OUTCOMES.map((o, i) => {
    if (o.delta > 0) return 1 + lucky * 0.9 + (i === 0 ? lucky * 0.4 : 0);
    return Math.max(0.15, 1 - lucky * 0.35);
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = rand() * total;
  for (let i = 0; i < MYSTERY_OUTCOMES.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return MYSTERY_OUTCOMES[i];
  }
  return MYSTERY_OUTCOMES[0];
}

/** Build one concrete object from a catalog entry. */
export function buildObject(
  id: number,
  kind: ObjectKind,
  x: number,
  y: number,
  rand: () => number,
): GameObject {
  const def = CATALOG[kind];
  const lerp = (a: number, b: number) => a + (b - a) * rand();
  const r = lerp(def.minR, def.maxR);
  const weight = lerp(def.minWeight, def.maxWeight);
  // Rocks scale their penalty with their size (bigger rock, bigger mistake).
  const sizeFrac = (r - def.minR) / Math.max(0.001, def.maxR - def.minR);
  let value = def.baseValue;
  if (kind === "rock") value = Math.round((35 + 55 * sizeFrac) * -1);
  const label = def.labels[Math.floor(rand() * def.labels.length)] ?? def.labels[0];
  return {
    id,
    kind,
    polarity: def.polarity,
    label,
    x,
    y,
    r,
    weight,
    value,
    seed: rand() * 1000,
  };
}
