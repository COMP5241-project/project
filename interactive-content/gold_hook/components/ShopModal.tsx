"use client";

import { Play, Store } from "lucide-react";
import { useStore } from "@/lib/store";
import { UPGRADES, upgradeCost } from "@/lib/game/upgrades";
import { levelDef, LEVEL_COUNT } from "@/lib/game/levels";

/**
 * Between-level shop. Marks are your currency; upgrades persist for
 * the rest of the run (and are saved, so a refresh resumes them).
 */
export default function ShopModal() {
  const level = useStore((s) => s.level);
  const money = useStore((s) => s.money);
  const upgrades = useStore((s) => s.upgrades);
  const buyUpgrade = useStore((s) => s.buyUpgrade);
  const beginLevel = useStore((s) => s.beginLevel);
  const next = levelDef(level);

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-ink/40 p-3 backdrop-blur-[2px]">
      <div className="edu-card max-h-full w-full max-w-2xl overflow-y-auto">
        <header className="border-b border-line bg-polyu/5 px-5 py-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-polyu sm:text-xl">
            <Store className="h-5 w-5" aria-hidden />
            Camp Shop
            {level > 1 ? ` — Level ${level - 1} cleared!` : ""}
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            You have <span className="font-bold text-ink">💰 {money}</span> marks.
            Spend them before heading to{" "}
            <span className="font-semibold text-ink">{next.name}</span> (target{" "}
            {next.target}).
          </p>
        </header>

        <div className="grid gap-3 p-4 sm:grid-cols-2">
          {UPGRADES.map((def) => {
            const current = upgrades[def.key];
            const cost = upgradeCost(def, current);
            const maxed = cost === null;
            const affordable = !maxed && money >= (cost as number);
            return (
              <div
                key={def.key}
                className="flex flex-col rounded-lg border border-line bg-white p-3 transition-colors duration-200 hover:border-polyu/50"
              >
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold text-ink">
                    {def.emoji} {def.name}
                  </span>
                  <span className="text-xs font-medium text-gray-500">
                    Lv {current}/{def.maxLevel}
                  </span>
                </div>
                <div className="mt-1.5 flex gap-1">
                  {Array.from({ length: def.maxLevel }, (_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 flex-1 rounded-full ${
                        i < current ? "bg-ok" : "bg-gray-200"
                      }`}
                    />
                  ))}
                </div>
                <p className="mt-2 min-h-[2.4rem] text-xs leading-relaxed text-gray-600">
                  {def.describe(current + (maxed ? 0 : 1))}
                </p>
                <button
                  onClick={() => buyUpgrade(def.key)}
                  disabled={!affordable}
                  className={`mt-2 min-h-[44px] rounded-md px-3 py-2 text-sm font-semibold transition-colors duration-200 ${
                    maxed
                      ? "cursor-default border border-line bg-page text-gray-400"
                      : affordable
                        ? "btn-primary cursor-pointer"
                        : "cursor-not-allowed border border-line bg-page text-gray-400"
                  }`}
                >
                  {maxed ? "Maxed" : `Buy — 💰 ${cost}`}
                </button>
              </div>
            );
          })}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-line px-5 py-4">
          <span className="text-xs text-gray-500">
            {level >= LEVEL_COUNT ? "" : "Upgrades carry over for the rest of your run."}
          </span>
          <button
            onClick={() => beginLevel(level)}
            className="btn-success flex min-h-[44px] cursor-pointer items-center gap-2"
          >
            <Play className="h-4 w-4" aria-hidden />
            Start Level {level} — {next.name}
          </button>
        </footer>
      </div>
    </div>
  );
}
