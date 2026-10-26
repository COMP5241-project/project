/** Shared game types for Gold Rush Hook. */

export type ObjectKind =
  | "gold-s" // small gold  — a light, quick DO
  | "gold-m" // medium gold — a solid DO
  | "gold-l" // large gold  — a heavy, valuable DO
  | "diamond" // rare, light, very valuable DO
  | "mystery" // mystery bag — random outcome when caught
  | "chest" // heavy chest — very heavy, guaranteed big DO
  | "rock" // a DON'T — heavy, deducts marks
  | "tnt"; // TNT — deducts marks and blows away nearby objects

/** Positive objects (DO's of the SDLC) vs negative (DON'Ts). */
export type ObjectPolarity = "good" | "bad";

export interface GameObject {
  id: number;
  kind: ObjectKind;
  polarity: ObjectPolarity;
  /** The SDLC lesson shown on the object, e.g. "Code Reviews ✓". */
  label: string;
  x: number;
  y: number;
  r: number;
  /** Heavier = slower retraction. */
  weight: number;
  /** Marks awarded (good) or deducted (bad). Mystery bags resolve at catch. */
  value: number;
  /** Random per-object visual seed (shape jitter, sparkle phase). */
  seed: number;
}

export type Phase = "menu" | "playing" | "shop" | "gameover" | "victory";

export interface Upgrades {
  strength: number; // 0..3 — faster hook out + retraction
  dynamite: number; // 0..2 — blast charges per level
  clover: number; // 0..2 — extra diamonds & mystery bags
  time: number; // 0..3 — bonus seconds each level
}

export type UpgradeKey = keyof Upgrades;

/** Events emitted by the hook simulation, consumed by the renderer. */
export type SimEvent =
  | { type: "grab"; obj: GameObject }
  | { type: "deliver"; obj: GameObject; delta: number; note?: string }
  | { type: "explode"; x: number; y: number; cleared: GameObject[] }
  | { type: "mystery"; obj: GameObject; delta: number; note: string };

/** A resolved mystery-bag outcome. */
export interface MysteryOutcome {
  delta: number;
  note: string;
}

export interface LevelDef {
  id: number;
  name: string;
  target: number;
  time: number; // seconds before clover/time upgrades
  /** Base object counts before clover bonuses. */
  counts: Partial<Record<ObjectKind, number>>;
}
