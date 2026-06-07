"use client";

import { useEffect, useState } from "react";

type Key = {
  // display label
  label: string;
  shiftLabel?: string;
  // Fn-layer secondary label (e.g., "F1", "↑")
  fnLabel?: string;
  // visual width relative to a 1u key
  w?: number;
  // logical name(s) of the physical key being pressed (lowercase, no shift)
  match?: string[];
  // accent color tag
  accent?: "mod" | "control" | "space" | "diamond";
};

// HHKB Professional US layout (60% – 60 keys, no function row, no arrow cluster)
const rows: Key[][] = [
  [
    { label: "`", shiftLabel: "~", match: ["`", "~"] },
    { label: "1", shiftLabel: "!", fnLabel: "F1", match: ["1", "!"] },
    { label: "2", shiftLabel: "@", fnLabel: "F2", match: ["2", "@"] },
    { label: "3", shiftLabel: "#", fnLabel: "F3", match: ["3", "#"] },
    { label: "4", shiftLabel: "$", fnLabel: "F4", match: ["4", "$"] },
    { label: "5", shiftLabel: "%", fnLabel: "F5", match: ["5", "%"] },
    { label: "6", shiftLabel: "^", fnLabel: "F6", match: ["6", "^"] },
    { label: "7", shiftLabel: "&", fnLabel: "F7", match: ["7", "&"] },
    { label: "8", shiftLabel: "*", fnLabel: "F8", match: ["8", "*"] },
    { label: "9", shiftLabel: "(", fnLabel: "F9", match: ["9", "("] },
    { label: "0", shiftLabel: ")", fnLabel: "F10", match: ["0", ")"] },
    { label: "-", shiftLabel: "_", fnLabel: "F11", match: ["-", "_"] },
    { label: "=", shiftLabel: "+", fnLabel: "F12", match: ["=", "+"] },
    { label: "\\", shiftLabel: "|", fnLabel: "Ins", match: ["\\", "|"] },
    { label: "`", shiftLabel: "~", fnLabel: "`", match: ["delete-extra"] },
  ],
  [
    { label: "Tab", w: 1.5, fnLabel: "Caps", match: ["tab"], accent: "mod" },
    { label: "Q", match: ["q"] },
    { label: "W", match: ["w"] },
    { label: "E", match: ["e"] },
    { label: "R", match: ["r"] },
    { label: "T", match: ["t"] },
    { label: "Y", match: ["y"] },
    { label: "U", match: ["u"] },
    { label: "I", fnLabel: "PSc", match: ["i"] },
    { label: "O", fnLabel: "ScL", match: ["o"] },
    { label: "P", fnLabel: "Brk", match: ["p"] },
    { label: "[", shiftLabel: "{", fnLabel: "↑", match: ["[", "{"] },
    { label: "]", shiftLabel: "}", match: ["]", "}"] },
    { label: "Delete", w: 1.5, match: ["backspace", "delete"], accent: "mod" },
  ],
  [
    { label: "Control", w: 1.75, match: ["control"], accent: "control" },
    { label: "A", match: ["a"] },
    { label: "S", match: ["s"] },
    { label: "D", match: ["d"] },
    { label: "F", match: ["f"] },
    { label: "G", match: ["g"] },
    { label: "H", match: ["h"] },
    { label: "J", match: ["j"] },
    { label: "K", match: ["k"] },
    { label: "L", match: ["l"] },
    { label: ";", shiftLabel: ":", fnLabel: "→", match: [";", ":"] },
    { label: "'", shiftLabel: '"', match: ["'", '"'] },
    { label: "Return", w: 2.25, match: ["enter"], accent: "mod" },
  ],
  [
    { label: "Shift", w: 2.25, match: ["shift"], accent: "mod" },
    { label: "Z", match: ["z"] },
    { label: "X", match: ["x"] },
    { label: "C", match: ["c"] },
    { label: "V", match: ["v"] },
    { label: "B", match: ["b"] },
    { label: "N", match: ["n"] },
    { label: "M", match: ["m"] },
    { label: ",", shiftLabel: "<", fnLabel: "←", match: [",", "<"] },
    { label: ".", shiftLabel: ">", match: [".", ">"] },
    { label: "/", shiftLabel: "?", fnLabel: "↓", match: ["/", "?"] },
    { label: "Shift", w: 1.75, match: ["shift"], accent: "mod" },
    { label: "Fn", match: ["fn"], accent: "mod" },
  ],
  [
    {
      label: "◇",
      w: 1.5,
      match: ["meta-l", "meta", "alt-l", "alt"],
      accent: "diamond",
    },
    {
      label: "◇",
      w: 1.5,
      match: ["alt-l", "alt", "meta-l", "meta"],
      accent: "diamond",
    },
    { label: "", w: 6, match: [" ", "space"], accent: "space" },
    {
      label: "◇",
      w: 1.5,
      match: ["alt-r", "alt", "meta-r", "meta"],
      accent: "diamond",
    },
    {
      label: "◇",
      w: 1.5,
      match: ["meta-r", "meta", "alt-r", "alt"],
      accent: "diamond",
    },
  ],
];

// When the OS reports e.g. "F1" or "ArrowUp", we know the HHKB user pressed Fn + the underlying base key.
// Expanding the active set lets the visualization light up both keys, teaching the muscle memory.
const FN_TO_BASE: Record<string, string> = {
  f1: "1",
  f2: "2",
  f3: "3",
  f4: "4",
  f5: "5",
  f6: "6",
  f7: "7",
  f8: "8",
  f9: "9",
  f10: "0",
  f11: "-",
  f12: "=",
  arrowup: "[",
  arrowright: ";",
  arrowdown: "/",
  arrowleft: ",",
  insert: "\\",
  capslock: "tab",
};

export function expandActiveKeys(active: Set<string>): Set<string> {
  const next = new Set<string>(active);
  for (const k of active) {
    const base = FN_TO_BASE[k];
    if (base !== undefined) {
      next.add(base);
      next.add("fn");
    }
  }
  return next;
}

function isMatched(k: Key, activeKeys: Set<string>): boolean {
  if (!k.match) return false;
  return k.match.some((m) => activeKeys.has(m.toLowerCase()));
}

export type HHKBKeyboardProps = {
  activeKeys: Set<string>;
  showFnLabels?: boolean;
};

export function HHKBKeyboard({
  activeKeys,
  showFnLabels = true,
}: HHKBKeyboardProps) {
  const expanded = expandActiveKeys(activeKeys);
  // unit width in px
  const U = 36;
  return (
    <div className="inline-block rounded-2xl border border-zinc-700 bg-zinc-900 p-4 shadow-xl">
      <div className="flex flex-col gap-1.5">
        {rows.map((row, ri) => (
          <div key={ri} className="flex justify-center gap-1.5">
            {row.map((k, ki) => {
              const w = (k.w ?? 1) * U;
              const matched = isMatched(k, expanded);
              const accent = k.accent;
              return (
                <div
                  key={ki}
                  style={{ width: w, height: U }}
                  className={[
                    "relative flex items-center justify-center rounded-md border font-mono text-[10px] transition-all duration-100 select-none",
                    matched
                      ? "scale-95 border-amber-200 bg-amber-300 text-zinc-900 shadow-[0_0_10px_rgba(251,191,36,0.7)]"
                      : accent === "control"
                        ? "border-zinc-700 bg-zinc-800 text-zinc-100"
                        : accent === "mod"
                          ? "border-zinc-700 bg-zinc-800 text-zinc-200"
                          : accent === "diamond"
                            ? "border-zinc-600 bg-zinc-700 text-zinc-300"
                            : accent === "space"
                              ? "border-zinc-300 bg-zinc-100 text-zinc-900"
                              : "border-zinc-300 bg-zinc-100 text-zinc-900",
                  ].join(" ")}
                >
                  {k.shiftLabel && (
                    <span className="absolute top-0.5 left-1 text-[8px] opacity-70">
                      {k.shiftLabel}
                    </span>
                  )}
                  {showFnLabels && k.fnLabel && (
                    <span
                      className={[
                        "absolute right-1 bottom-0.5 text-[8px]",
                        matched ? "text-sky-700" : "text-sky-500",
                      ].join(" ")}
                    >
                      {k.fnLabel}
                    </span>
                  )}
                  <span
                    className={k.shiftLabel ? "absolute bottom-0.5 left-1" : ""}
                  >
                    {k.label}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper: derive the "active key" set from a browser KeyboardEvent
export function eventToKey(e: KeyboardEvent): string {
  const k = e.key;
  if (k === " ") return "space";
  if (k === "Enter") return "enter";
  if (k === "Backspace") return "backspace";
  if (k === "Escape") return "escape";
  if (k === "Tab") return "tab";
  if (k === "Shift") return "shift";
  if (k === "Control") return "control";
  if (k === "Alt") return "alt";
  if (k === "Meta") return "meta";
  if (k === "ArrowUp") return "arrowup";
  if (k === "ArrowDown") return "arrowdown";
  if (k === "ArrowLeft") return "arrowleft";
  if (k === "ArrowRight") return "arrowright";
  if (k === "Insert") return "insert";
  if (k === "CapsLock") return "capslock";
  if (/^F\d{1,2}$/.test(k)) return k.toLowerCase();
  return k.toLowerCase();
}

// Hook: listen for keys pressed globally; returns set of currently-held key codes
export function useActiveKeys(): Set<string> {
  const [keys, setKeys] = useState<Set<string>>(new Set());
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = eventToKey(e);
      setKeys((prev) => {
        const next = new Set(prev);
        next.add(k);
        return next;
      });
    };
    const up = (e: KeyboardEvent) => {
      const k = eventToKey(e);
      setKeys((prev) => {
        const next = new Set(prev);
        next.delete(k);
        return next;
      });
    };
    const blur = () => setKeys(new Set());
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);
  return keys;
}
