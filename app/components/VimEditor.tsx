"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createInitialState, linesEqual, step, type VimState } from "../lib/vim";

export type VimEditorProps = {
  initialLines: string[];
  initialCursor: { row: number; col: number };
  targetLines: string[];
  targetCursor?: { row: number; col: number };
  onSuccess?: () => void;
  onStateChange?: (state: VimState) => void;
};

export function VimEditor({
  initialLines,
  initialCursor,
  targetLines,
  targetCursor,
  onSuccess,
  onStateChange,
}: VimEditorProps) {
  const [state, setState] = useState<VimState>(() =>
    createInitialState(initialLines, initialCursor),
  );
  const [keystrokes, setKeystrokes] = useState<string[]>([]);
  const [solved, setSolved] = useState(false);

  useEffect(() => {
    setState(createInitialState(initialLines, initialCursor));
    setKeystrokes([]);
    setSolved(false);
  }, [initialLines, initialCursor]);

  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  useEffect(() => {
    if (solved) return;
    if (state.mode !== "normal") return;
    if (!linesEqual(state.lines, targetLines)) return;
    if (
      targetCursor &&
      (state.cursor.row !== targetCursor.row ||
        state.cursor.col !== targetCursor.col)
    )
      return;
    setSolved(true);
    onSuccess?.();
  }, [state, targetLines, targetCursor, solved, onSuccess]);

  const handleKey = useCallback((e: KeyboardEvent) => {
    let logical: string;
    // Selectively allow Ctrl-r/a/x (redo/inc/dec) and Ctrl-d/u/f/b (scroll)
    if (e.ctrlKey && !e.metaKey && !e.altKey) {
      if (["r", "a", "x", "d", "u", "f", "b"].includes(e.key)) {
        e.preventDefault();
        logical = "Ctrl-" + e.key;
        setKeystrokes((ks) => [...ks.slice(-30), logical]);
        setState((s) => step(s, logical));
        return;
      }
      return;
    }
    if (e.metaKey || e.altKey) return;

    if (e.key === "Escape") logical = "Escape";
    else if (e.key === "Enter") logical = "Enter";
    else if (e.key === "Backspace") logical = "Backspace";
    else if (e.key === "Tab") {
      e.preventDefault();
      logical = "Tab";
    } else if (e.key.length === 1) {
      logical = e.key;
    } else {
      return;
    }

    if (
      ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key) ||
      logical.length === 1 ||
      logical === "Escape" ||
      logical === "Enter" ||
      logical === "Backspace"
    ) {
      e.preventDefault();
    }

    setKeystrokes((ks) => [...ks.slice(-30), logical]);
    setState((s) => step(s, logical));
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  const reset = useCallback(() => {
    setState(createInitialState(initialLines, initialCursor));
    setKeystrokes([]);
    setSolved(false);
  }, [initialLines, initialCursor]);

  const renderedLines = useMemo(() => {
    const allLines = state.lines.length > 0 ? state.lines : [""];
    const top = state.viewportTop;
    const bot = Math.min(allLines.length, top + state.viewportHeight);
    const visibleRows: number[] = [];
    for (let i = top; i < bot; i++) visibleRows.push(i);
    return visibleRows.map((ri) => {
      const line = allLines[ri] ?? "";
      const isCursorRow = ri === state.cursor.row;
      const inVisual = state.mode === "visual" && state.visualStart !== null;
      let selStart = -1;
      let selEnd = -1;
      if (inVisual) {
        const a = state.visualStart!;
        const b = state.cursor;
        const startRow = Math.min(a.row, b.row);
        const endRow = Math.max(a.row, b.row);
        if (ri >= startRow && ri <= endRow) {
          if (a.row === b.row) {
            selStart = Math.min(a.col, b.col);
            selEnd = Math.max(a.col, b.col);
          } else if (ri === startRow) {
            const ref = a.row < b.row ? a.col : b.col;
            selStart = ref;
            selEnd = (allLines[ri] ?? "").length - 1;
          } else if (ri === endRow) {
            const ref = a.row < b.row ? b.col : a.col;
            selStart = 0;
            selEnd = ref;
          } else {
            selStart = 0;
            selEnd = Math.max(0, (allLines[ri] ?? "").length - 1);
          }
        }
      }
      const displayLine = line.length === 0 ? " " : line;
      const cells: React.ReactNode[] = [];
      for (let i = 0; i < displayLine.length; i++) {
        const isCursor = isCursorRow && i === state.cursor.col;
        const isSelected = i >= selStart && i <= selEnd;
        let cls = "";
        if (isCursor) cls = cursorClass(state.mode);
        else if (isSelected) cls = "bg-violet-500/50 text-white";
        cells.push(
          <span key={i} className={cls}>
            {displayLine[i] === " " ? " " : displayLine[i]}
          </span>,
        );
      }
      if (isCursorRow && state.cursor.col >= displayLine.length) {
        cells.push(
          <span key="eol" className={cursorClass(state.mode)}>
            {" "}
          </span>,
        );
      }
      return (
        <div key={ri} className="font-mono whitespace-pre">
          <span className="text-zinc-500 select-none pr-3">
            {String(ri + 1).padStart(2, " ")}
          </span>
          {cells}
        </div>
      );
    });
  }, [state]);

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-md border border-zinc-700 bg-zinc-950 p-4 text-zinc-100 min-h-[160px] relative">
        {state.viewportTop > 0 && (
          <div className="mb-1 text-center font-mono text-[10px] text-zinc-500">
            ↑ {state.viewportTop} more line{state.viewportTop > 1 ? "s" : ""} above
          </div>
        )}
        {renderedLines}
        {state.viewportTop + state.viewportHeight < state.lines.length && (
          <div className="mt-1 text-center font-mono text-[10px] text-zinc-500">
            ↓ {state.lines.length - state.viewportTop - state.viewportHeight} more line
            {state.lines.length - state.viewportTop - state.viewportHeight > 1 ? "s" : ""} below
          </div>
        )}
        {state.mode === "command" && (
          <div className="mt-2 font-mono text-amber-300">
            {state.commandPrefix}
            {state.commandBuffer}
            <span className="inline-block w-2 bg-amber-300 animate-pulse">
              {" "}
            </span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between text-xs text-zinc-400">
        <div className="flex items-center gap-3">
          <span className={modeBadgeClass(state.mode)}>
            {state.mode.toUpperCase()}
          </span>
          {state.count && (
            <span className="font-mono text-sky-400">
              count: {state.count}
            </span>
          )}
          {state.pending && (
            <span className="font-mono text-amber-400">
              pending: {state.pending}
            </span>
          )}
          {state.macroRegister && (
            <span className="font-mono text-rose-400 animate-pulse">
              ● recording @{state.macroRegister}
            </span>
          )}
          {state.lastSearch && (
            <span className="font-mono text-zinc-500">
              /{state.lastSearch.pattern}
            </span>
          )}
          <span className="font-mono text-zinc-500">
            ({state.cursor.row + 1}:{state.cursor.col + 1})
          </span>
          {solved && (
            <span className="font-semibold text-emerald-400">✓ Cleared!</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono">
            {keystrokes.slice(-15).join(" ")}
          </span>
          <button
            onClick={reset}
            className="rounded border border-zinc-600 px-2 py-0.5 hover:bg-zinc-800"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

function cursorClass(mode: string): string {
  if (mode === "insert") {
    return "border-l-2 border-amber-400 -ml-[1px] bg-transparent";
  }
  if (mode === "visual") {
    return "bg-violet-400 text-zinc-900";
  }
  return "bg-amber-300 text-zinc-900";
}

function modeBadgeClass(mode: string): string {
  const base = "rounded px-2 py-0.5 font-mono text-[10px]";
  if (mode === "insert")
    return `${base} bg-emerald-500/20 text-emerald-300 border border-emerald-500/40`;
  if (mode === "visual")
    return `${base} bg-violet-500/20 text-violet-300 border border-violet-500/40`;
  if (mode === "command")
    return `${base} bg-sky-500/20 text-sky-300 border border-sky-500/40`;
  return `${base} bg-amber-500/20 text-amber-300 border border-amber-500/40`;
}
