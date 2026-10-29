import type { Upgrades } from "./types";

/**
 * localStorage persistence.
 * - `run`  — the in-progress run (level, marks, upgrades), saved at each
 *            shop visit and at the end of a run, so a refresh resumes it.
 * - `best` — all-time best score / furthest level.
 * - `muted` — sound preference.
 */

const KEY = "gold-rush-hook:v1";

export interface SavedRun {
  level: number; // the level the player is about to play (saved at the shop)
  money: number;
  upgrades: Upgrades;
  seed: number; // deterministic object field for that level
}

export interface SavedMeta {
  bestScore: number;
  bestLevel: number;
}

interface SaveFile {
  run: SavedRun | null;
  best: SavedMeta;
  muted: boolean;
}

function safeParse(raw: string | null): SaveFile | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Partial<SaveFile>;
    return {
      run: data.run ?? null,
      best: {
        bestScore: data.best?.bestScore ?? 0,
        bestLevel: data.best?.bestLevel ?? 0,
      },
      muted: data.muted ?? false,
    };
  } catch {
    return null;
  }
}

export function loadSave(): SaveFile | null {
  if (typeof window === "undefined") return null;
  return safeParse(window.localStorage.getItem(KEY));
}

export function writeSave(file: SaveFile) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(file));
  } catch {
    /* storage full / private mode — ignore */
  }
}

export function saveRun(run: SavedRun) {
  const cur = loadSave();
  writeSave({ run, best: cur?.best ?? { bestScore: 0, bestLevel: 0 }, muted: cur?.muted ?? false });
}

export function clearRun() {
  const cur = loadSave();
  writeSave({ run: null, best: cur?.best ?? { bestScore: 0, bestLevel: 0 }, muted: cur?.muted ?? false });
}

export function saveBest(score: number, level: number) {
  const cur = loadSave();
  const best = cur?.best ?? { bestScore: 0, bestLevel: 0 };
  writeSave({
    run: cur?.run ?? null,
    best: {
      bestScore: Math.max(best.bestScore, score),
      bestLevel: Math.max(best.bestLevel, level),
    },
    muted: cur?.muted ?? false,
  });
}

export function saveMuted(muted: boolean) {
  const cur = loadSave();
  writeSave({ run: cur?.run ?? null, best: cur?.best ?? { bestScore: 0, bestLevel: 0 }, muted });
}
