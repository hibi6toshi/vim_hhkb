"use client";

import { useCallback, useEffect, useState } from "react";
import { eventToKey } from "./HHKBKeyboard";

export type LayerTrainerProps = {
  sequence: string[];
  display: string[];
  onSuccess?: () => void;
};

export function LayerTrainer({
  sequence,
  display,
  onSuccess,
}: LayerTrainerProps) {
  const [progress, setProgress] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [lastKey, setLastKey] = useState<string>("");
  const [cleared, setCleared] = useState(false);

  // Reset when the lesson's sequence changes — adjust state during render
  // rather than in an effect (React 19 guidance).
  const [prevSequence, setPrevSequence] = useState(sequence);
  if (prevSequence !== sequence) {
    setPrevSequence(sequence);
    setProgress(0);
    setMistakes(0);
    setLastKey("");
    setCleared(false);
  }

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      // ignore pure modifier presses on their own
      if (["Shift", "Control", "Alt", "Meta"].includes(e.key)) return;
      const k = eventToKey(e);

      // prevent browser defaults for arrows, F-keys, etc.
      const shouldBlock =
        e.key.startsWith("Arrow") ||
        /^F\d{1,2}$/.test(e.key) ||
        e.key === "Tab" ||
        e.key === "Backspace" ||
        e.key === "Enter" ||
        e.key === "Insert";
      if (shouldBlock) e.preventDefault();

      if (cleared) return;
      setLastKey(k);
      const expected = sequence[progress];
      if (k === expected) {
        const next = progress + 1;
        setProgress(next);
        if (next >= sequence.length) {
          setCleared(true);
          onSuccess?.();
        }
      } else {
        setMistakes((m) => m + 1);
      }
    },
    [progress, sequence, cleared, onSuccess],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  const reset = () => {
    setProgress(0);
    setMistakes(0);
    setLastKey("");
    setCleared(false);
  };

  return (
    <div className="flex flex-col gap-4 rounded-md border border-zinc-700 bg-zinc-950 p-5">
      <div className="flex flex-wrap items-center gap-2">
        {sequence.map((_, i) => {
          const state =
            i < progress
              ? "done"
              : i === progress
                ? cleared
                  ? "done"
                  : "current"
                : "pending";
          return (
            <div
              key={i}
              className={[
                "flex h-12 min-w-[2.5rem] items-center justify-center rounded-md border px-3 font-mono text-lg transition",
                state === "done"
                  ? "border-emerald-400 bg-emerald-500/20 text-emerald-300"
                  : state === "current"
                    ? "animate-pulse border-amber-400 bg-amber-500/20 text-amber-200"
                    : "border-zinc-700 bg-zinc-900 text-zinc-500",
              ].join(" ")}
            >
              {display[i] ?? sequence[i]}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-400">
        <div className="flex items-center gap-3">
          <span className="font-mono">
            {progress} / {sequence.length}
          </span>
          <span className="font-mono text-rose-300">ミス: {mistakes}</span>
          {lastKey && (
            <span className="font-mono">
              last: <span className="text-zinc-200">{lastKey}</span>
            </span>
          )}
          {cleared && (
            <span className="font-semibold text-emerald-400">✓ Cleared!</span>
          )}
        </div>
        <button
          onClick={reset}
          className="rounded border border-zinc-600 px-2 py-0.5 hover:bg-zinc-800"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
