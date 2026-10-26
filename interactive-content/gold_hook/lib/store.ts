"use client";

import { create } from "zustand";
import { generateLevel, LEVEL_COUNT, levelDef, levelTime } from "@/lib/game/levels";
import { UPGRADES, upgradeCost, ZERO_UPGRADES } from "@/lib/game/upgrades";
import { clearRun, loadSave, saveBest, saveMuted, saveRun, type SavedRun } from "@/lib/game/storage";
import { sfx } from "@/lib/game/audio";
import type { GameObject, Phase, UpgradeKey, Upgrades } from "@/lib/game/types";

export interface Carry {
  label: string;
  value: number; // shown value (0 for mystery until resolved)
  good: boolean;
}

export interface Toast {
  text: string;
  good: boolean;
  nonce: number;
}

export interface BlastFx {
  x: number;
  y: number;
  nonce: number;
}

interface StoreState {
  phase: Phase;
  level: number; // current / next level (1-based)
  money: number;
  target: number;
  timeLeft: number; // fractional seconds (internal)
  timeSec: number; // whole seconds (HUD)
  objects: GameObject[];
  levelSeed: number;
  upgrades: Upgrades;
  blasts: number;
  blastFx: BlastFx | null;
  carry: Carry | null;
  toast: Toast | null;
  muted: boolean;
  bestScore: number;
  bestLevel: number;
  savedRun: SavedRun | null;
  /** Why the run ended, for the end screens. */
  endReason: "time" | "victory" | "quit" | null;

  // ── actions ─────────────────────────────────────────────────────────
  startNew: () => void;
  continueRun: () => void;
  beginLevel: (level: number) => void;
  applyScore: (delta: number) => void;
  setCarry: (carry: Carry | null) => void;
  removeObjects: (ids: number[]) => void;
  showToast: (text: string, good: boolean) => void;
  buyUpgrade: (key: UpgradeKey) => boolean;
  requestBlast: () => void;
  tickTimer: (dt: number) => void;
  toggleMuted: () => void;
  backToMenu: () => void;
}

let nonce = 1;
const freshNonce = () => nonce++;

function initFromStorage() {
  const file = typeof window === "undefined" ? null : loadSave();
  return {
    muted: file?.muted ?? false,
    bestScore: file?.best.bestScore ?? 0,
    bestLevel: file?.best.bestLevel ?? 0,
    savedRun: file?.run ?? null,
  };
}

function startLevelFields(level: number, upgrades: Upgrades, seed: number) {
  return {
    target: levelDef(level).target,
    timeLeft: levelTime(level, upgrades),
    timeSec: levelTime(level, upgrades),
    objects: generateLevel(level, upgrades, seed),
    levelSeed: seed,
    blasts: upgrades.dynamite,
  };
}

type Get = () => StoreState;
type Set = (partial: Partial<StoreState>) => void;

/** Advance to the shop (or victory) once a level is cleared. */
function clearLevel(get: Get, set: Set) {
  const s = get();
  // Small reward for the clock still running.
  const money = s.money + Math.round(s.timeLeft) * 2;
  if (s.level >= LEVEL_COUNT) {
    saveBest(money, s.level);
    clearRun();
    set({
      phase: "victory",
      endReason: "victory",
      money,
      bestScore: Math.max(s.bestScore, money),
      bestLevel: Math.max(s.bestLevel, s.level),
    });
  } else {
    const next = s.level + 1;
    saveRun({ level: next, money, upgrades: { ...s.upgrades }, seed: 0 });
    set({ phase: "shop", level: next, money, target: levelDef(next).target });
  }
  sfx.win();
}

function failRun(get: Get, set: Set, reason: "time" | "quit") {
  const s = get();
  saveBest(s.money, s.level);
  clearRun();
  set({
    phase: "gameover",
    endReason: reason,
    bestScore: Math.max(s.bestScore, s.money),
    bestLevel: Math.max(s.bestLevel, s.level),
  });
  sfx.lose();
}

export const useStore = create<StoreState>()((set, get) => ({
  phase: "menu",
  level: 1,
  money: 0,
  target: levelDef(1).target,
  timeLeft: 0,
  timeSec: 0,
  objects: [],
  levelSeed: 1,
  upgrades: { ...ZERO_UPGRADES },
  blasts: 0,
  blastFx: null,
  carry: null,
  toast: null,
  endReason: null,
  ...initFromStorage(),

  startNew: () => {
    const seed = Math.floor(Math.random() * 1_000_000) + 1;
    clearRun();
    sfx.unlock();
    set({
      phase: "playing",
      level: 1,
      money: 0,
      upgrades: { ...ZERO_UPGRADES },
      carry: null,
      toast: null,
      endReason: null,
      ...startLevelFields(1, ZERO_UPGRADES, seed),
    });
  },

  continueRun: () => {
    const run = get().savedRun;
    if (!run) return;
    sfx.unlock();
    // Resume at the shop for the saved (next) level.
    set({
      phase: "shop",
      level: run.level,
      money: run.money,
      upgrades: { ...run.upgrades },
      blasts: run.upgrades.dynamite,
      target: levelDef(run.level).target,
      carry: null,
      toast: null,
      endReason: null,
    });
  },

  beginLevel: (level) => {
    const s = get();
    const seed = Math.floor(Math.random() * 1_000_000) + 1;
    set({
      phase: "playing",
      level,
      carry: null,
      toast: null,
      endReason: null,
      ...startLevelFields(level, s.upgrades, seed),
    });
    saveRun({ level, money: s.money, upgrades: { ...s.upgrades }, seed });
  },

  applyScore: (delta) => {
    const s = get();
    if (s.phase !== "playing") return;
    const money = Math.max(0, s.money + delta);
    set({ money, carry: null });

    // Level cleared? (only positive deliveries can trigger this)
    if (delta > 0 && money >= s.target) {
      clearLevel(get, set);
    }
  },

  setCarry: (carry) => set({ carry }),

  removeObjects: (ids) => {
    const gone = new Set(ids);
    set({ objects: get().objects.filter((o) => !gone.has(o.id)) });
  },

  showToast: (text, good) => set({ toast: { text, good, nonce: freshNonce() } }),

  buyUpgrade: (key) => {
    const s = get();
    const def = UPGRADES.find((u) => u.key === key);
    if (!def) return false;
    const cost = upgradeCost(def, s.upgrades[key]);
    if (cost === null || s.money < cost) {
      sfx.bad();
      return false;
    }
    const upgrades = { ...s.upgrades, [key]: s.upgrades[key] + 1 };
    const money = s.money - cost;
    set({ money, upgrades, blasts: upgrades.dynamite });
    sfx.buy();
    // The shop is the save point — refresh the run snapshot.
    saveRun({ level: s.level, money, upgrades, seed: 0 });
    return true;
  },

  requestBlast: () => {
    const s = get();
    if (s.blasts <= 0 || s.phase !== "playing") return;
    const bad = s.objects.filter((o) => o.polarity === "bad");
    if (bad.length === 0) return; // keep the charge if there's nothing to blast
    const target = bad.reduce((a, b) => (a.weight >= b.weight ? a : b));
    set({
      blasts: s.blasts - 1,
      objects: s.objects.filter((o) => o.id !== target.id),
      blastFx: { x: target.x, y: target.y, nonce: freshNonce() },
    });
    sfx.boom();
  },

  tickTimer: (dt) => {
    const s = get();
    if (s.phase !== "playing") return;
    const t = Math.max(0, s.timeLeft - dt);
    const newSec = Math.ceil(t);
    // Always accumulate the fractional time; only bump timeSec on the
    // second boundary so the HUD re-renders ~once per second, not per frame.
    if (newSec !== s.timeSec) {
      set({ timeLeft: t, timeSec: newSec });
      if (newSec === 1) sfx.tick();
    } else {
      set({ timeLeft: t });
    }

    if (t <= 0) {
      if (s.money >= s.target) clearLevel(get, set);
      else failRun(get, set, "time");
    }
  },

  toggleMuted: () => {
    const muted = !get().muted;
    set({ muted });
    sfx.setMuted(muted);
    saveMuted(muted);
  },

  backToMenu: () => {
    // Keep the saved run (if any) so the player can continue from the menu.
    set({ phase: "menu", carry: null, toast: null, endReason: null });
  },
}));
