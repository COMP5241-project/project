"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Play, RotateCcw, XCircle } from "lucide-react";
import { useStore } from "@/lib/store";

/** Title / how-to-play screen (PolyU EduGenAI house style). */
export default function StartScreen() {
  const bestScore = useStore((s) => s.bestScore);
  const bestLevel = useStore((s) => s.bestLevel);
  const savedRun = useStore((s) => s.savedRun);
  const startNew = useStore((s) => s.startNew);
  const continueRun = useStore((s) => s.continueRun);

  // `savedRun` / `bestScore` come from localStorage (client-only), so the
  // server render never has them. Gate the conditional UI behind a mount flag
  // so the first client render matches the server HTML (no hydration error).
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-[2px]">
      <div className="edu-card max-h-full w-full max-w-xl overflow-y-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-polyu sm:text-3xl">
            Gold Rush Hook
          </h1>
          <p className="mt-1.5 text-sm font-medium text-gray-600 sm:text-base">
            The SDLC hook ’em up —{" "}
            <span className="font-semibold text-ok-dark">DO’s are gold</span>,{" "}
            <span className="font-semibold text-polyu">DON’Ts are rocks</span>.
          </p>
        </div>

        <div className="mt-4 space-y-2 text-sm leading-relaxed text-gray-700">
          <Rule
            icon={<CheckCircle2 className="h-4 w-4 text-ok" aria-hidden />}
            text="Hook the green-labelled DO’s (requirements, code reviews, testing…) to earn marks."
          />
          <Rule
            icon={<XCircle className="h-4 w-4 text-polyu" aria-hidden />}
            text="Avoid the red-labelled DON’Ts (skipped tests, hardcoded keys…) — they cost marks and reel in slowly."
          />
          <Rule
            icon={<span aria-hidden>💎</span>}
            text="Diamonds and the heavy chest are rare big wins. Mystery bags can go either way."
          />
          <Rule
            icon={<span aria-hidden>🧨</span>}
            text="TNT deducts marks and blows nearby objects away. If you own Dynamite, press B to blast the heaviest rock for free."
          />
          <Rule
            icon={<span aria-hidden>🏆</span>}
            text="Hit each level’s target before the clock runs out, then spend marks in the camp shop."
          />
          <div className="rounded-md border border-line bg-page px-3 py-2 text-xs text-gray-600">
            Controls: <b className="text-ink">Space</b> / tap / click to drop the
            hook · <b className="text-ink">B</b> for dynamite · heavier objects
            reel in slower.
          </div>
        </div>

        <div className="mt-5 flex flex-col items-center gap-2.5">
          <button
            onClick={startNew}
            className="btn-primary flex min-h-[44px] w-full max-w-xs cursor-pointer items-center justify-center gap-2"
          >
            <Play className="h-4 w-4" aria-hidden />
            Start a new run
          </button>
          {mounted && savedRun && (
            <button
              onClick={continueRun}
              className="btn-secondary flex min-h-[44px] w-full max-w-xs cursor-pointer items-center justify-center gap-2"
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              Continue run (level {savedRun.level}, 💰 {savedRun.money})
            </button>
          )}
          {mounted && (bestScore > 0 || bestLevel > 0) && (
            <p className="mt-1 text-xs text-gray-500">
              Best: 💰 {bestScore} marks · reached level {bestLevel}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Rule({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-md border border-line bg-white px-3 py-2">
      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center text-sm">
        {icon}
      </span>
      <span>{text}</span>
    </div>
  );
}
