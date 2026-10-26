import type { UpgradeKey, Upgrades } from "./types";

export interface UpgradeDef {
  key: UpgradeKey;
  name: string;
  emoji: string;
  maxLevel: number;
  /** Cost for reaching level 1, 2, 3… (index = target level - 1). */
  cost: number[];
  short: string;
  /** Effect description for level `n` (1-based). */
  describe: (n: number) => string;
}

export const UPGRADES: UpgradeDef[] = [
  {
    key: "strength",
    name: "Hook Motor",
    emoji: "🔧",
    maxLevel: 3,
    cost: [150, 300, 500],
    short: "Faster hook & reeling",
    describe: (n) => `+${n * 15}% hook speed (out and back)`,
  },
  {
    key: "dynamite",
    name: "Dynamite",
    emoji: "🧨",
    maxLevel: 2,
    cost: [200, 400],
    short: "Blast charges per level",
    describe: (n) => `${n} charge${n > 1 ? "s" : ""} per level — press B to vaporise the heaviest rock (no penalty)`,
  },
  {
    key: "clover",
    name: "Lucky Clover",
    emoji: "🍀",
    maxLevel: 2,
    cost: [150, 300],
    short: "More diamonds & bags",
    describe: (n) => `+${n} diamond & +${n} mystery bag per level, and mystery bags skew lucky`,
  },
  {
    key: "time",
    name: "Time Bonus",
    emoji: "⏱️",
    maxLevel: 3,
    cost: [120, 240, 400],
    short: "+10s every level",
    describe: (n) => `+${n * 10}s at the start of every level`,
  },
];

export const ZERO_UPGRADES: Upgrades = {
  strength: 0,
  dynamite: 0,
  clover: 0,
  time: 0,
};

export function upgradeCost(def: UpgradeDef, currentLevel: number): number | null {
  if (currentLevel >= def.maxLevel) return null;
  return def.cost[currentLevel] ?? null;
}
