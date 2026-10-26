"use client";

import { Home, RotateCcw, Timer, Trophy } from "lucide-react";
import { useStore } from "@/lib/store";
import { LEVEL_COUNT } from "@/lib/game/levels";

/** Game over (time ran out) and victory (all levels cleared) screens. */
export default function EndScreen() {
  const phase = useStore((s) => s.phase);
  const money = useStore((s) => s.money);
  const level = useStore((s) => s.level);
  const bestScore = useStore((s) => s.bestScore);
  const startNew = useStore((s) => s.startNew);
  const backToMenu = useStore((s) => s.backToMenu);

  if (phase !== "gameover" && phase !== "victory") return null;
  const victory = phase === "victory";

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-[2px]">
      <div className="edu-card w-full max-w-md p-6 text-center">
        <div
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${
            victory ? "bg-ok/15 text-ok" : "bg-polyu/10 text-polyu"
          }`}
        >
          {victory ? (
            <Trophy className="h-7 w-7" aria-hidden />
          ) : (
            <Timer className="h-7 w-7" aria-hidden />
          )}
        </div>
        <h2
          className={`mt-3 text-2xl font-bold ${
            victory ? "text-ok-dark" : "text-polyu"
          }`}
        >
          {victory ? "Production Released!" : "Out of Time!"}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-600">
          {victory ? (
            <>
              You cleared all {LEVEL_COUNT} levels and shipped a properly tested,
              documented, monitored product. The SDLC bows to you. 🎉
            </>
          ) : (
            <>
              The clock ran out before you hit the target on level {level}. Remember:
              hook the DO’s, dodge the DON’Ts, and mind the heavy rocks.
            </>
          )}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-md border border-line bg-page px-3 py-2">
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Final marks
            </div>
            <div className="mt-0.5 text-lg font-bold text-ink">💰 {money}</div>
          </div>
          <div className="rounded-md border border-line bg-page px-3 py-2">
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Best marks
            </div>
            <div className="mt-0.5 text-lg font-bold text-ink">
              🏅 {Math.max(bestScore, money)}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2.5">
          <button
            onClick={startNew}
            className="btn-primary flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            {victory ? "Play again" : "Try again"}
          </button>
          <button
            onClick={backToMenu}
            className="btn-secondary flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2"
          >
            <Home className="h-4 w-4" aria-hidden />
            Back to menu
          </button>
        </div>
      </div>
    </div>
  );
}
