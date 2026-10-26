"use client";

import { useEffect, useState } from "react";
import { Anchor, Bomb, Volume2, VolumeX } from "lucide-react";
import { useStore } from "@/lib/store";
import { HOOK_PRESS_EVENT } from "./GameCanvas";

/**
 * In-game HUD: money / target, timer, level, current item value,
 * dynamite button, mute toggle. Also shows the toast line and a
 * big mobile-friendly HOOK button.
 */
export default function HUD() {
  const money = useStore((s) => s.money);
  const target = useStore((s) => s.target);
  const timeSec = useStore((s) => s.timeSec);
  const level = useStore((s) => s.level);
  const carry = useStore((s) => s.carry);
  const blasts = useStore((s) => s.blasts);
  const muted = useStore((s) => s.muted);
  const phase = useStore((s) => s.phase);
  const toast = useStore((s) => s.toast);
  const toggleMuted = useStore((s) => s.toggleMuted);
  const requestBlast = useStore((s) => s.requestBlast);

  const [toastVisible, setToastVisible] = useState(false);
  useEffect(() => {
    if (!toast) return;
    setToastVisible(true);
    const t = setTimeout(() => setToastVisible(false), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  if (phase !== "playing") return null;

  const progress = Math.min(1, money / target);
  const lowTime = timeSec <= 10;

  return (
    <div className="pointer-events-none flex flex-col gap-2 border-b border-line bg-white p-3 sm:p-4">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <Stat label="Level" value={String(level)} />
        <div className="relative min-w-[150px] flex-1">
          <div className="flex items-baseline justify-between text-sm font-semibold">
            <span className="text-ink">
              💰 {money} marks
            </span>
            <span className="text-gray-500">target {target}</span>
          </div>
          <div className="mt-1 h-2.5 overflow-hidden rounded-full border border-line bg-page">
            <div
              className="h-full rounded-full bg-ok transition-[width] duration-300"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
        <Stat
          label="Time"
          value={formatTime(timeSec)}
          className={lowTime ? "border-red-300 bg-red-50 text-red-700" : undefined}
        />
        <div className="ml-auto flex items-center gap-2">
          {blasts > 0 && (
            <button
              onClick={requestBlast}
              className="btn-primary pointer-events-auto flex min-h-[44px] cursor-pointer items-center gap-1.5"
              title="Vaporise the heaviest rock (B)"
            >
              <Bomb className="h-4 w-4" aria-hidden />
              Dynamite ×{blasts}
            </button>
          )}
          <button
            onClick={toggleMuted}
            className="btn-secondary pointer-events-auto flex min-h-[44px] cursor-pointer items-center"
            title={muted ? "Unmute" : "Mute"}
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? (
              <VolumeX className="h-5 w-5" aria-hidden />
            ) : (
              <Volume2 className="h-5 w-5" aria-hidden />
            )}
          </button>
        </div>
      </div>

      {/* Current item + toast */}
      <div className="flex min-h-[28px] items-center justify-between gap-2">
        <div className="text-sm font-semibold">
          {carry ? (
            <span className={carry.good ? "text-ok-dark" : "text-polyu"}>
              Hooked: {carry.label}
              {carry.value !== 0 && (
                <span className="ml-2 rounded border border-line bg-page px-1.5 py-0.5 text-xs">
                  {carry.value > 0 ? `+${carry.value}` : carry.value}
                </span>
              )}
            </span>
          ) : toastVisible && toast ? (
            <span className={toast.good ? "text-ok-dark" : "text-polyu"}>
              {toast.text}
            </span>
          ) : (
            <span className="text-gray-500">Aim and hook — Space / tap</span>
          )}
        </div>
        <button
          onClick={() => window.dispatchEvent(new Event(HOOK_PRESS_EVENT))}
          className="btn-primary pointer-events-auto flex min-h-[44px] cursor-pointer items-center gap-1.5 sm:hidden"
        >
          <Anchor className="h-4 w-4" aria-hidden />
          HOOK!
        </button>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-md border border-line bg-white px-3 py-1.5 text-sm font-semibold text-ink ${
        className ?? ""
      }`}
    >
      <span className="font-medium text-gray-500">{label} </span>
      {value}
    </div>
  );
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
