"use client";

import { useEffect } from "react";
import { GraduationCap, Pickaxe } from "lucide-react";
import { useStore } from "@/lib/store";
import { sfx } from "@/lib/game/audio";
import GameCanvas from "./GameCanvas";
import HUD from "./HUD";
import StartScreen from "./StartScreen";
import ShopModal from "./ShopModal";
import EndScreen from "./EndScreen";

/**
 * Assembles the game: a PolyU EduGenAI-styled "app card" holding a
 * branded header + HUD + canvas, with menu / shop / end screens layered
 * on top (per EDUGENAI-README.md §1 house style).
 *
 * The canvas keeps rendering behind the overlays so the world is
 * visible through the blur — it just stops simulating when not "playing".
 */
export default function GameShell() {
  const phase = useStore((s) => s.phase);

  // Apply persisted mute preference once on mount.
  useEffect(() => {
    sfx.setMuted(useStore.getState().muted);
    // Debug / test handle: window.__GRH__.getState() / .setState(...).
    (window as unknown as Record<string, unknown>).__GRH__ = useStore;
  }, []);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col items-center justify-center px-4 py-6">
      <div className="w-full max-w-4xl">
        <div className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
          {/* Branded header bar */}
          <header className="flex items-center justify-between gap-3 bg-polyu px-5 py-3">
            <div className="flex items-center gap-3">
              <Pickaxe className="h-6 w-6 text-white" aria-hidden />
              <div>
                <h1 className="text-base font-semibold leading-tight text-white sm:text-lg">
                  Gold Rush Hook
                </h1>
                <p className="text-xs font-medium text-white/80">
                  SDLC Learning Game — hook the DO’s, dodge the DON’Ts
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 rounded-md bg-white/15 px-2.5 py-1">
              <GraduationCap className="h-4 w-4 text-white" aria-hidden />
              <span className="text-xs font-semibold tracking-wide text-white">
                EduGenAI
              </span>
            </div>
          </header>

          <HUD />
          <div className="relative">
            <GameCanvas />
            {phase === "menu" && <StartScreen />}
            {phase === "shop" && <ShopModal />}
            <EndScreen />
          </div>
        </div>
        <p className="mt-3 text-center text-sm text-gray-500">
          <span className="font-semibold text-ok-dark">DO’s ✓ = gold</span> ·{" "}
          <span className="font-semibold text-polyu">DON’Ts ✗ = rocks</span> · an
          EduGenAI prototype built for the PolyU SE platform
        </p>
      </div>
    </main>
  );
}
