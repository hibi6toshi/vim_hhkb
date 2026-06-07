export type VimMode = "normal" | "insert" | "visual" | "command";

type Snapshot = {
  lines: string[];
  cursor: { row: number; col: number };
};

export type VimState = {
  lines: string[];
  cursor: { row: number; col: number };
  mode: VimMode;
  pending: string;
  count: string;
  register: { text: string; linewise: boolean };
  visualStart: { row: number; col: number } | null;
  message: string;
  // Keys that produced the last buffer change. Replayed by `.`
  lastChange: string[] | null;
  // Keys currently being recorded for a change-in-progress
  recording: string[] | null;
  // Undo / redo (snapshot-based)
  undoStack: Snapshot[];
  redoStack: Snapshot[];
  // Macros
  macros: Record<string, string[]>;
  macroRegister: string | null;
  macroKeys: string[];
  lastMacro: string | null;
  // Command line (used by `/` and `?` for search)
  commandPrefix: "/" | "?" | "";
  commandBuffer: string;
  lastSearch: { pattern: string; backward: boolean } | null;
  // Virtual viewport (for Ctrl-d/u/f/b, H/M/L, zz/zt/zb)
  viewportTop: number;
  viewportHeight: number;
};

export function createInitialState(
  lines: string[],
  cursor: { row: number; col: number },
): VimState {
  const base: VimState = {
    lines: [...lines],
    cursor: { ...cursor },
    mode: "normal",
    pending: "",
    count: "",
    register: { text: "", linewise: false },
    visualStart: null,
    message: "",
    lastChange: null,
    recording: null,
    undoStack: [],
    redoStack: [],
    macros: {},
    macroRegister: null,
    macroKeys: [],
    lastMacro: null,
    commandPrefix: "",
    commandBuffer: "",
    lastSearch: null,
    viewportTop: 0,
    viewportHeight: 10,
  };
  return ensureCursorVisible(base);
}

function ensureCursorVisible(s: VimState): VimState {
  const h = s.viewportHeight;
  if (h <= 0) return s;
  let top = s.viewportTop;
  if (s.cursor.row < top) top = s.cursor.row;
  if (s.cursor.row >= top + h) top = s.cursor.row - h + 1;
  const maxTop = Math.max(0, s.lines.length - h);
  top = Math.max(0, Math.min(top, maxTop));
  return { ...s, viewportTop: top };
}

function snapshot(state: VimState): Snapshot {
  return { lines: [...state.lines], cursor: { ...state.cursor } };
}

const WORD_RE = /[A-Za-z0-9_]/;

function clampCursor(state: VimState): VimState {
  const row = Math.max(0, Math.min(state.cursor.row, state.lines.length - 1));
  const line = state.lines[row] ?? "";
  const maxCol =
    state.mode === "insert" ? line.length : Math.max(0, line.length - 1);
  const col = Math.max(0, Math.min(state.cursor.col, maxCol));
  return { ...state, cursor: { row, col } };
}

function setLine(state: VimState, row: number, value: string): VimState {
  const lines = [...state.lines];
  lines[row] = value;
  return { ...state, lines };
}

function getCount(s: VimState): number {
  return Math.max(1, parseInt(s.count || "1", 10));
}

function clearMeta<T extends VimState>(s: T): T {
  return { ...s, pending: "", count: "" };
}

// === Motions ===

function moveLeft(s: VimState, n = 1): VimState {
  return clampCursor({
    ...s,
    cursor: { row: s.cursor.row, col: Math.max(0, s.cursor.col - n) },
  });
}
function moveRight(s: VimState, n = 1): VimState {
  return clampCursor({
    ...s,
    cursor: { row: s.cursor.row, col: s.cursor.col + n },
  });
}
function moveUp(s: VimState, n = 1): VimState {
  return clampCursor({
    ...s,
    cursor: { row: Math.max(0, s.cursor.row - n), col: s.cursor.col },
  });
}
function moveDown(s: VimState, n = 1): VimState {
  return clampCursor({
    ...s,
    cursor: { row: s.cursor.row + n, col: s.cursor.col },
  });
}

function wordStart(line: string, col: number, forward: boolean): number {
  if (forward) {
    let i = col;
    const wasWord = WORD_RE.test(line[i] ?? "");
    while (
      i < line.length &&
      WORD_RE.test(line[i] ?? "") === wasWord &&
      line[i] !== " "
    )
      i++;
    while (i < line.length && line[i] === " ") i++;
    return Math.min(i, Math.max(0, line.length - 1));
  } else {
    let i = col - 1;
    while (i > 0 && line[i] === " ") i--;
    const wasWord = WORD_RE.test(line[i] ?? "");
    while (
      i > 0 &&
      WORD_RE.test(line[i - 1] ?? "") === wasWord &&
      line[i - 1] !== " "
    )
      i--;
    return Math.max(0, i);
  }
}

function wordEnd(line: string, col: number): number {
  let i = col;
  if (line[i] === " ") {
    while (i < line.length && line[i] === " ") i++;
  } else if (
    i + 1 < line.length &&
    (line[i + 1] === " " ||
      WORD_RE.test(line[i] ?? "") !== WORD_RE.test(line[i + 1] ?? ""))
  ) {
    i++;
    while (i < line.length && line[i] === " ") i++;
  }
  const wasWord = WORD_RE.test(line[i] ?? "");
  while (
    i + 1 < line.length &&
    WORD_RE.test(line[i + 1] ?? "") === wasWord &&
    line[i + 1] !== " "
  )
    i++;
  return Math.min(i, Math.max(0, line.length - 1));
}

function findWordRange(
  line: string,
  col: number,
): { start: number; end: number } {
  let s = col;
  let e = col;
  const isWord = WORD_RE.test(line[col] ?? "");
  while (
    s > 0 &&
    WORD_RE.test(line[s - 1] ?? "") === isWord &&
    line[s - 1] !== " "
  )
    s--;
  while (
    e < line.length - 1 &&
    WORD_RE.test(line[e + 1] ?? "") === isWord &&
    line[e + 1] !== " "
  )
    e++;
  return { start: s, end: e };
}

function findPairRange(
  line: string,
  col: number,
  open: string,
  close: string,
): { start: number; end: number } | null {
  let openIdx = -1;
  for (let i = col; i >= 0; i--) {
    if (line[i] === open) {
      openIdx = i;
      break;
    }
  }
  if (openIdx < 0) {
    for (let i = col + 1; i < line.length; i++) {
      if (line[i] === open) {
        openIdx = i;
        break;
      }
    }
  }
  if (openIdx < 0) return null;
  const closeIdx = line.indexOf(close, openIdx + 1);
  if (closeIdx < 0) return null;
  return { start: openIdx + 1, end: closeIdx - 1 };
}

// === Step dispatch ===

const CHANGE_STARTERS = new Set([
  "i", "I", "a", "A", "o", "O",
  "x", "X", "s", "S",
  "c", "C", "d", "D",
  "p", "P", "r", "J", "~",
  ">", "<",
]);

function isChangeStarter(state: VimState, key: string): boolean {
  if (state.mode !== "normal") return false;
  if (state.pending !== "") return false;
  return CHANGE_STARTERS.has(key);
}

export function step(state: VimState, key: string): VimState {
  // End macro recording: a bare `q` while recording stops it (the `q` itself is NOT recorded)
  if (
    state.macroRegister !== null &&
    state.mode === "normal" &&
    state.pending === "" &&
    key === "q"
  ) {
    const reg = state.macroRegister;
    return {
      ...state,
      macros: { ...state.macros, [reg]: state.macroKeys },
      macroRegister: null,
      macroKeys: [],
      lastMacro: reg,
    };
  }

  // Dot: replay the previous change
  if (
    state.mode === "normal" &&
    state.pending === "" &&
    key === "." &&
    state.lastChange
  ) {
    const n = getCount(state);
    let s: VimState = { ...state, recording: null, count: "", pending: "" };
    for (let i = 0; i < n; i++) {
      for (const k of state.lastChange) {
        s = stepInternal(s, k);
      }
    }
    return ensureCursorVisible(s);
  }

  let next = stepInternal(state, key);

  // While recording a macro, append the key (unless we just started recording, see handleNormal's `q<reg>`)
  if (state.macroRegister !== null) {
    next = { ...next, macroKeys: [...state.macroKeys, key] };
  }

  return ensureCursorVisible(next);
}

function stepInternal(state: VimState, key: string): VimState {
  let s = state;
  if (s.recording === null && isChangeStarter(s, key)) {
    // About to start a change: snapshot for undo
    s = {
      ...s,
      undoStack: [...s.undoStack, snapshot(s)],
      redoStack: [],
      recording: [key],
    };
  } else if (s.recording !== null) {
    s = { ...s, recording: [...s.recording, key] };
  }

  let next: VimState;
  if (s.mode === "insert") next = handleInsert(s, key);
  else if (s.mode === "visual") next = handleVisual(s, key);
  else if (s.mode === "command") next = handleCommand(s, key);
  else next = handleNormal(s, key);

  if (s.recording !== null) {
    const completed =
      (s.mode === "insert" && next.mode === "normal") ||
      (s.mode === "normal" && next.mode === "normal" && next.pending === "");
    if (completed) {
      next = { ...next, lastChange: s.recording, recording: null };
    }
  }

  return next;
}

// === Insert mode ===

function handleInsert(state: VimState, key: string): VimState {
  if (key === "Escape") {
    const next = { ...state, mode: "normal" as VimMode, pending: "" };
    const moved = {
      ...next,
      cursor: { row: next.cursor.row, col: Math.max(0, next.cursor.col - 1) },
    };
    return clampCursor(moved);
  }
  const line = state.lines[state.cursor.row] ?? "";
  if (key === "Backspace") {
    if (state.cursor.col > 0) {
      const newLine =
        line.slice(0, state.cursor.col - 1) + line.slice(state.cursor.col);
      const s = setLine(state, state.cursor.row, newLine);
      return {
        ...s,
        cursor: { row: s.cursor.row, col: s.cursor.col - 1 },
      };
    } else if (state.cursor.row > 0) {
      const prev = state.lines[state.cursor.row - 1];
      const lines = [...state.lines];
      lines.splice(state.cursor.row, 1);
      lines[state.cursor.row - 1] = prev + line;
      return {
        ...state,
        lines,
        cursor: { row: state.cursor.row - 1, col: prev.length },
      };
    }
    return state;
  }
  if (key === "Enter") {
    const before = line.slice(0, state.cursor.col);
    const after = line.slice(state.cursor.col);
    const lines = [...state.lines];
    lines.splice(state.cursor.row, 1, before, after);
    return {
      ...state,
      lines,
      cursor: { row: state.cursor.row + 1, col: 0 },
    };
  }
  if (key.length === 1) {
    const newLine =
      line.slice(0, state.cursor.col) + key + line.slice(state.cursor.col);
    const s = setLine(state, state.cursor.row, newLine);
    return {
      ...s,
      cursor: { row: s.cursor.row, col: s.cursor.col + 1 },
    };
  }
  return state;
}

// === Visual mode ===

function getVisualRange(state: VimState): {
  start: { row: number; col: number };
  end: { row: number; col: number };
} {
  const a = state.visualStart!;
  const b = state.cursor;
  if (a.row < b.row || (a.row === b.row && a.col <= b.col)) {
    return { start: a, end: b };
  }
  return { start: b, end: a };
}

function deleteSelection(state: VimState): VimState {
  const { start, end } = getVisualRange(state);
  if (start.row === end.row) {
    const line = state.lines[start.row];
    const text = line.slice(start.col, end.col + 1);
    const newLine = line.slice(0, start.col) + line.slice(end.col + 1);
    const s = setLine(state, start.row, newLine);
    return clampCursor({
      ...s,
      cursor: { ...start },
      mode: "normal",
      visualStart: null,
      register: { text, linewise: false },
      pending: "",
      count: "",
    });
  }
  const lines = [...state.lines];
  const firstLine = lines[start.row];
  const lastLine = lines[end.row];
  const head = firstLine.slice(0, start.col);
  const tail = lastLine.slice(end.col + 1);
  const middle = lines.slice(start.row + 1, end.row);
  const deletedText = [
    firstLine.slice(start.col),
    ...middle,
    lastLine.slice(0, end.col + 1),
  ].join("\n");
  lines.splice(start.row, end.row - start.row + 1, head + tail);
  return clampCursor({
    ...state,
    lines,
    cursor: { ...start },
    mode: "normal",
    visualStart: null,
    register: { text: deletedText, linewise: false },
    pending: "",
    count: "",
  });
}

function yankSelection(state: VimState): VimState {
  const { start, end } = getVisualRange(state);
  let text: string;
  if (start.row === end.row) {
    text = state.lines[start.row].slice(start.col, end.col + 1);
  } else {
    const firstLine = state.lines[start.row];
    const lastLine = state.lines[end.row];
    const middle = state.lines.slice(start.row + 1, end.row);
    text = [
      firstLine.slice(start.col),
      ...middle,
      lastLine.slice(0, end.col + 1),
    ].join("\n");
  }
  return clampCursor({
    ...state,
    cursor: { ...start },
    mode: "normal",
    visualStart: null,
    register: { text, linewise: false },
    pending: "",
    count: "",
  });
}

function handleVisual(state: VimState, key: string): VimState {
  if (key === "Escape" || key === "v") {
    return {
      ...state,
      mode: "normal",
      visualStart: null,
      pending: "",
      count: "",
    };
  }
  if (key === "d" || key === "x") return deleteSelection(state);
  if (key === "y") return yankSelection(state);
  if (key === "c") {
    const s = deleteSelection(state);
    return { ...s, mode: "insert" };
  }
  if (/^[0-9]$/.test(key)) {
    if (key === "0" && state.count === "") {
      return clampCursor({
        ...state,
        cursor: { row: state.cursor.row, col: 0 },
      });
    }
    return { ...state, count: state.count + key };
  }
  const n = getCount(state);
  const next = (s: VimState) => clearMeta(s);
  switch (key) {
    case "h":
      return next(moveLeft(state, n));
    case "l":
      return next(moveRight(state, n));
    case "j":
      return next(moveDown(state, n));
    case "k":
      return next(moveUp(state, n));
    case "$": {
      const line = state.lines[state.cursor.row] ?? "";
      return next(
        clampCursor({
          ...state,
          cursor: { row: state.cursor.row, col: Math.max(0, line.length - 1) },
        }),
      );
    }
    case "0":
      return next(
        clampCursor({ ...state, cursor: { row: state.cursor.row, col: 0 } }),
      );
    case "^": {
      const line = state.lines[state.cursor.row] ?? "";
      const m = line.match(/\S/);
      return next(
        clampCursor({
          ...state,
          cursor: { row: state.cursor.row, col: m ? (m.index ?? 0) : 0 },
        }),
      );
    }
    case "w": {
      let s = state;
      for (let i = 0; i < n; i++) {
        const line = s.lines[s.cursor.row] ?? "";
        s = clampCursor({
          ...s,
          cursor: {
            row: s.cursor.row,
            col: wordStart(line, s.cursor.col, true),
          },
        });
      }
      return next(s);
    }
    case "b": {
      let s = state;
      for (let i = 0; i < n; i++) {
        const line = s.lines[s.cursor.row] ?? "";
        s = clampCursor({
          ...s,
          cursor: {
            row: s.cursor.row,
            col: wordStart(line, s.cursor.col, false),
          },
        });
      }
      return next(s);
    }
    case "e": {
      let s = state;
      for (let i = 0; i < n; i++) {
        const line = s.lines[s.cursor.row] ?? "";
        s = clampCursor({
          ...s,
          cursor: { row: s.cursor.row, col: wordEnd(line, s.cursor.col) },
        });
      }
      return next(s);
    }
  }
  return state;
}

// === Normal mode ===

function handleNormal(state: VimState, key: string): VimState {
  if (key === "Escape") {
    return {
      ...state,
      mode: "normal",
      pending: "",
      count: "",
      visualStart: null,
    };
  }

  // Waiting for the char argument of f/F/t/T/r
  if (
    state.pending === "f" ||
    state.pending === "F" ||
    state.pending === "t" ||
    state.pending === "T"
  ) {
    if (key.length !== 1) return clearMeta(state);
    return findChar(state, state.pending as "f" | "F" | "t" | "T", key);
  }
  if (state.pending === "r") {
    if (key.length !== 1) return clearMeta(state);
    return replaceChar(state, key);
  }
  // Waiting for the char arg of df/dt/cf/ct/yf/yt etc.
  if (/^[dcy][fFtT]$/.test(state.pending)) {
    if (key.length !== 1) return clearMeta(state);
    const op = state.pending[0] as "d" | "c" | "y";
    const ft = state.pending[1] as "f" | "F" | "t" | "T";
    return operatorFindChar(state, op, ft, key);
  }

  // q<letter>: start recording a macro into <letter>
  if (state.pending === "q") {
    if (key.length === 1 && /^[a-zA-Z0-9]$/.test(key)) {
      return {
        ...state,
        pending: "",
        macroRegister: key.toLowerCase(),
        macroKeys: [],
      };
    }
    return clearMeta(state);
  }

  // @<letter>: play macro for <letter>; @@: replay last macro
  if (state.pending === "@") {
    let reg: string | null = null;
    if (key === "@") reg = state.lastMacro;
    else if (key.length === 1 && /^[a-zA-Z0-9]$/.test(key)) reg = key.toLowerCase();
    if (!reg) return clearMeta(state);
    const macro = state.macros[reg];
    if (!macro || macro.length === 0) return clearMeta(state);
    const n = getCount(state);
    let s: VimState = { ...clearMeta(state), lastMacro: reg };
    for (let i = 0; i < n; i++) {
      for (const k of macro) {
        s = stepInternal(s, k);
      }
    }
    return s;
  }

  // Digit -> append to count (except '0' with empty count -> BOL motion)
  if (state.pending === "" && /^[0-9]$/.test(key)) {
    if (key === "0" && state.count === "") {
      return clearMeta(
        clampCursor({
          ...state,
          cursor: { row: state.cursor.row, col: 0 },
        }),
      );
    }
    return { ...state, count: state.count + key };
  }

  // Single-key normal mode commands
  if (state.pending === "") {
    const n = getCount(state);
    const ret = (s: VimState) => clearMeta(s);
    switch (key) {
      case "h":
        return ret(moveLeft(state, n));
      case "l":
        return ret(moveRight(state, n));
      case "j":
        return ret(moveDown(state, n));
      case "k":
        return ret(moveUp(state, n));
      case "$": {
        const line = state.lines[state.cursor.row] ?? "";
        return ret(
          clampCursor({
            ...state,
            cursor: { row: state.cursor.row, col: Math.max(0, line.length - 1) },
          }),
        );
      }
      case "^": {
        const line = state.lines[state.cursor.row] ?? "";
        const m = line.match(/\S/);
        return ret(
          clampCursor({
            ...state,
            cursor: { row: state.cursor.row, col: m ? (m.index ?? 0) : 0 },
          }),
        );
      }
      case "w": {
        let s = state;
        for (let i = 0; i < n; i++) {
          const line = s.lines[s.cursor.row] ?? "";
          s = clampCursor({
            ...s,
            cursor: {
              row: s.cursor.row,
              col: wordStart(line, s.cursor.col, true),
            },
          });
        }
        return ret(s);
      }
      case "b": {
        let s = state;
        for (let i = 0; i < n; i++) {
          const line = s.lines[s.cursor.row] ?? "";
          s = clampCursor({
            ...s,
            cursor: {
              row: s.cursor.row,
              col: wordStart(line, s.cursor.col, false),
            },
          });
        }
        return ret(s);
      }
      case "e": {
        let s = state;
        for (let i = 0; i < n; i++) {
          const line = s.lines[s.cursor.row] ?? "";
          s = clampCursor({
            ...s,
            cursor: {
              row: s.cursor.row,
              col: wordEnd(line, s.cursor.col),
            },
          });
        }
        return ret(s);
      }
      case "x": {
        let s = state;
        for (let i = 0; i < n; i++) {
          const line = s.lines[s.cursor.row] ?? "";
          if (line.length === 0) break;
          const newLine =
            line.slice(0, s.cursor.col) + line.slice(s.cursor.col + 1);
          s = clampCursor(setLine(s, s.cursor.row, newLine));
        }
        return ret(s);
      }
      case "G": {
        const targetRow = state.count
          ? parseInt(state.count, 10) - 1
          : state.lines.length - 1;
        return ret(
          clampCursor({
            ...state,
            cursor: {
              row: Math.max(0, Math.min(targetRow, state.lines.length - 1)),
              col: 0,
            },
          }),
        );
      }
      case "J":
        return ret(joinLines(state, n));
      case "~":
        return ret(toggleCase(state, n));
      case "%":
        return ret(jumpMatching(state));
      case "i":
        return clearMeta({ ...state, mode: "insert" });
      case "a": {
        const s = clearMeta({ ...state, mode: "insert" as VimMode });
        return { ...s, cursor: { row: s.cursor.row, col: s.cursor.col + 1 } };
      }
      case "I": {
        const line = state.lines[state.cursor.row] ?? "";
        const m = line.match(/\S/);
        return clearMeta({
          ...state,
          mode: "insert",
          cursor: { row: state.cursor.row, col: m ? (m.index ?? 0) : 0 },
        });
      }
      case "A": {
        const line = state.lines[state.cursor.row] ?? "";
        return clearMeta({
          ...state,
          mode: "insert",
          cursor: { row: state.cursor.row, col: line.length },
        });
      }
      case "o": {
        const lines = [...state.lines];
        lines.splice(state.cursor.row + 1, 0, "");
        return clearMeta({
          ...state,
          lines,
          mode: "insert",
          cursor: { row: state.cursor.row + 1, col: 0 },
        });
      }
      case "O": {
        const lines = [...state.lines];
        lines.splice(state.cursor.row, 0, "");
        return clearMeta({
          ...state,
          lines,
          mode: "insert",
          cursor: { row: state.cursor.row, col: 0 },
        });
      }
      case "p":
        return ret(paste(state, true));
      case "P":
        return ret(paste(state, false));
      case "v":
        return clearMeta({
          ...state,
          mode: "visual",
          visualStart: { ...state.cursor },
        });
      case "D": {
        const line = state.lines[state.cursor.row] ?? "";
        return clearMeta(
          inlineRangeOp(state, "d", state.cursor.col, line.length - 1),
        );
      }
      case "C": {
        const line = state.lines[state.cursor.row] ?? "";
        const newLine = line.slice(0, state.cursor.col);
        const s = setLine(state, state.cursor.row, newLine);
        return {
          ...clearMeta(s),
          mode: "insert" as VimMode,
          register: { text: line.slice(state.cursor.col), linewise: false },
        };
      }
      case "Y":
        return yankLine(state, n);
      case "u":
        return ret(undoState(state, n));
      case "Ctrl-r":
        return ret(redoState(state, n));
      case "Ctrl-a":
        return ret(incrementNumber(state, n, +1));
      case "Ctrl-x":
        return ret(incrementNumber(state, n, -1));
      case "/":
        return clearMeta({
          ...state,
          mode: "command",
          commandPrefix: "/",
          commandBuffer: "",
        });
      case "?":
        return clearMeta({
          ...state,
          mode: "command",
          commandPrefix: "?",
          commandBuffer: "",
        });
      case "n":
        return ret(jumpToNextSearch(state, n, false));
      case "N":
        return ret(jumpToNextSearch(state, n, true));
      case "*":
        return ret(searchWordUnderCursor(state, false));
      case "#":
        return ret(searchWordUnderCursor(state, true));
      case "Ctrl-d":
        return ret(scrollHalfPage(state, n, +1));
      case "Ctrl-u":
        return ret(scrollHalfPage(state, n, -1));
      case "Ctrl-f":
        return ret(scrollFullPage(state, n, +1));
      case "Ctrl-b":
        return ret(scrollFullPage(state, n, -1));
      case "H":
        return ret(
          clampCursor({
            ...state,
            cursor: { row: state.viewportTop, col: state.cursor.col },
          }),
        );
      case "M": {
        const mid = Math.min(
          state.lines.length - 1,
          state.viewportTop + Math.floor(state.viewportHeight / 2),
        );
        return ret(
          clampCursor({
            ...state,
            cursor: { row: mid, col: state.cursor.col },
          }),
        );
      }
      case "L": {
        const bot = Math.min(
          state.lines.length - 1,
          state.viewportTop + state.viewportHeight - 1,
        );
        return ret(
          clampCursor({
            ...state,
            cursor: { row: bot, col: state.cursor.col },
          }),
        );
      }
      case "z":
        return { ...state, pending: "z" };
      case "f":
      case "F":
      case "t":
      case "T":
      case "r":
      case "d":
      case "y":
      case "c":
      case "g":
      case ">":
      case "<":
      case "q":
      case "@":
        return { ...state, pending: key };
      default:
        return state;
    }
  }

  // Multi-key sequences
  const pending = state.pending + key;
  const n = getCount(state);
  switch (pending) {
    case "dd":
      return deleteLine(state, n);
    case "yy":
      return yankLine(state, n);
    case "gg": {
      const targetRow = state.count ? parseInt(state.count, 10) - 1 : 0;
      return clearMeta(
        clampCursor({
          ...state,
          cursor: {
            row: Math.max(0, Math.min(targetRow, state.lines.length - 1)),
            col: 0,
          },
        }),
      );
    }
    case "dw":
      return deleteWordOp(state, n);
    case "cw": {
      const s = deleteWordOp(state, n);
      return { ...s, mode: "insert" };
    }
    case "yw":
      return yankWord(state, n);
    case ">>":
      return indentLine(state, n, +1);
    case "<<":
      return indentLine(state, n, -1);
    case "d$": {
      const line = state.lines[state.cursor.row] ?? "";
      const newLine = line.slice(0, state.cursor.col);
      const s = setLine(state, state.cursor.row, newLine);
      return clearMeta(
        clampCursor({
          ...s,
          register: {
            text: line.slice(state.cursor.col),
            linewise: false,
          },
        }),
      );
    }
    case "dG":
      return deleteToFileEnd(state);
    case "dgg":
      return deleteToFileStart(state);
    case "cG": {
      const s = deleteToFileEnd(state);
      const lines = [...s.lines];
      lines.splice(s.cursor.row, 0, "");
      return { ...s, lines, mode: "insert", cursor: { row: s.cursor.row, col: 0 } };
    }
    case "c$": {
      const line = state.lines[state.cursor.row] ?? "";
      const newLine = line.slice(0, state.cursor.col);
      const s = setLine(state, state.cursor.row, newLine);
      return {
        ...clearMeta(s),
        mode: "insert" as VimMode,
        register: { text: line.slice(state.cursor.col), linewise: false },
      };
    }
    case "y$":
      return clearMeta({
        ...state,
        register: {
          text: (state.lines[state.cursor.row] ?? "").slice(state.cursor.col),
          linewise: false,
        },
      });
    case "dh":
    case "ch":
    case "yh": {
      const op = pending[0] as "d" | "c" | "y";
      const start = Math.max(0, state.cursor.col - n);
      return inlineRangeOp(state, op, start, state.cursor.col - 1);
    }
    case "dl":
    case "cl":
    case "yl": {
      const op = pending[0] as "d" | "c" | "y";
      const end = state.cursor.col + n - 1;
      return inlineRangeOp(state, op, state.cursor.col, end);
    }
    case "de":
    case "ce":
    case "ye": {
      const op = pending[0] as "d" | "c" | "y";
      let line = state.lines[state.cursor.row] ?? "";
      let endCol = state.cursor.col;
      for (let i = 0; i < n; i++) endCol = wordEnd(line, endCol);
      return inlineRangeOp(state, op, state.cursor.col, endCol);
    }
    case "db":
    case "cb":
    case "yb": {
      const op = pending[0] as "d" | "c" | "y";
      const line = state.lines[state.cursor.row] ?? "";
      let startCol = state.cursor.col;
      for (let i = 0; i < n; i++) startCol = wordStart(line, startCol, false);
      if (startCol >= state.cursor.col) return clearMeta(state);
      return inlineRangeOp(state, op, startCol, state.cursor.col - 1);
    }
    case "d0":
    case "c0":
    case "y0": {
      const op = pending[0] as "d" | "c" | "y";
      if (state.cursor.col === 0) return clearMeta(state);
      return inlineRangeOp(state, op, 0, state.cursor.col - 1);
    }
    case "d^":
    case "c^":
    case "y^": {
      const op = pending[0] as "d" | "c" | "y";
      const line = state.lines[state.cursor.row] ?? "";
      const m = line.match(/\S/);
      const idx = m ? (m.index ?? 0) : 0;
      if (idx >= state.cursor.col) return clearMeta(state);
      return inlineRangeOp(state, op, idx, state.cursor.col - 1);
    }
    case "dj":
      return deleteLine(state, 2);
    case "dk": {
      if (state.cursor.row === 0) return clearMeta(state);
      const s = { ...state, cursor: { row: state.cursor.row - 1, col: 0 } };
      return deleteLine(s, 2);
    }
    case "yj":
      return yankLine(state, 2);
    case "yk": {
      if (state.cursor.row === 0) return clearMeta(state);
      const s = { ...state, cursor: { row: state.cursor.row - 1, col: 0 } };
      return yankLine(s, 2);
    }
  }

  // di"  da"  ci"  ca"  ya"  yi"
  const pairMatch = /^([dcy])([ia])(["'`(){}\[\]<>])$/.exec(pending);
  if (pairMatch) {
    const [, op, ia, ch] = pairMatch;
    return pairOp(state, op as "d" | "c" | "y", ia as "i" | "a", ch);
  }
  // ciw / diw / yiw
  if (pending === "ciw" || pending === "diw" || pending === "yiw") {
    return wordObjectOp(state, pending[0] as "c" | "d" | "y");
  }

  // case operators: gU, gu, g~ followed by U/u/~ (line) or motion
  if (/^g[Uu~]$/.test(state.pending)) {
    const op = state.pending[1] as "U" | "u" | "~";
    // gUU / guu / g~~ : whole line
    if (
      (op === "U" && key === "U") ||
      (op === "u" && key === "u") ||
      (op === "~" && key === "~")
    ) {
      return caseOpLine(state, op, n);
    }
    return caseOpMotion(state, op, key);
  }
  if (state.pending === "g" && (key === "U" || key === "u" || key === "~")) {
    return { ...state, pending: "g" + key };
  }

  // operator + g (advance pending so we can wait for "n")
  if (
    (state.pending === "c" || state.pending === "d" || state.pending === "y") &&
    key === "g"
  ) {
    return { ...state, pending: state.pending + "g" };
  }

  // zz / zt / zb: scroll cursor to center / top / bottom of viewport
  if (state.pending === "z") {
    if (key === "z") {
      const top = Math.max(
        0,
        state.cursor.row - Math.floor(state.viewportHeight / 2),
      );
      return clearMeta({ ...state, viewportTop: top });
    }
    if (key === "t") {
      return clearMeta({ ...state, viewportTop: state.cursor.row });
    }
    if (key === "b") {
      const top = Math.max(0, state.cursor.row - state.viewportHeight + 1);
      return clearMeta({ ...state, viewportTop: top });
    }
    return clearMeta(state);
  }
  // cgn / dgn / ygn — operate on next search match
  if (state.pending === "cg" || state.pending === "dg" || state.pending === "yg") {
    if (key === "n") {
      const op = state.pending[0] as "c" | "d" | "y";
      return operatorOnNextMatch(state, op);
    }
    return clearMeta(state);
  }

  if (pending.length > 3) return clearMeta(state);
  return { ...state, pending };
}

// === Operators ===

function deleteLine(state: VimState, n: number): VimState {
  const lines = [...state.lines];
  const removed = lines.splice(state.cursor.row, n);
  if (lines.length === 0) lines.push("");
  const row = Math.min(state.cursor.row, lines.length - 1);
  return clearMeta(
    clampCursor({
      ...state,
      lines,
      register: { text: removed.join("\n") + "\n", linewise: true },
      cursor: { row, col: 0 },
    }),
  );
}

function yankLine(state: VimState, n: number): VimState {
  const end = Math.min(state.cursor.row + n, state.lines.length);
  const text =
    state.lines.slice(state.cursor.row, end).join("\n") + "\n";
  return clearMeta({ ...state, register: { text, linewise: true } });
}

function deleteWordOp(state: VimState, n: number): VimState {
  let s = state;
  let deleted = "";
  for (let k = 0; k < n; k++) {
    const line = s.lines[s.cursor.row] ?? "";
    const startCol = s.cursor.col;
    let i = startCol;
    const wasWord = WORD_RE.test(line[i] ?? "");
    while (
      i < line.length &&
      WORD_RE.test(line[i] ?? "") === wasWord &&
      line[i] !== " "
    )
      i++;
    while (i < line.length && line[i] === " ") i++;
    deleted += line.slice(startCol, i);
    const newLine = line.slice(0, startCol) + line.slice(i);
    s = setLine(s, s.cursor.row, newLine);
  }
  return clearMeta(
    clampCursor({
      ...s,
      register: { text: deleted, linewise: false },
    }),
  );
}

function yankWord(state: VimState, n: number): VimState {
  let line = state.lines[state.cursor.row] ?? "";
  let startCol = state.cursor.col;
  let i = startCol;
  for (let k = 0; k < n; k++) {
    const wasWord = WORD_RE.test(line[i] ?? "");
    while (
      i < line.length &&
      WORD_RE.test(line[i] ?? "") === wasWord &&
      line[i] !== " "
    )
      i++;
    while (i < line.length && line[i] === " ") i++;
  }
  return clearMeta({
    ...state,
    register: { text: line.slice(startCol, i), linewise: false },
  });
}

function wordObjectOp(state: VimState, op: "c" | "d" | "y"): VimState {
  const line = state.lines[state.cursor.row] ?? "";
  const { start, end } = findWordRange(line, state.cursor.col);
  const text = line.slice(start, end + 1);
  if (op === "y") {
    return clearMeta({ ...state, register: { text, linewise: false } });
  }
  const newLine = line.slice(0, start) + line.slice(end + 1);
  let s = setLine(state, state.cursor.row, newLine);
  s = clearMeta({
    ...s,
    cursor: { row: s.cursor.row, col: start },
    register: { text, linewise: false },
  });
  if (op === "c") return { ...s, mode: "insert" };
  return clampCursor(s);
}

function pairOp(
  state: VimState,
  op: "d" | "c" | "y",
  ia: "i" | "a",
  ch: string,
): VimState {
  const pairs: Record<string, [string, string]> = {
    '"': ['"', '"'],
    "'": ["'", "'"],
    "`": ["`", "`"],
    "(": ["(", ")"],
    ")": ["(", ")"],
    "{": ["{", "}"],
    "}": ["{", "}"],
    "[": ["[", "]"],
    "]": ["[", "]"],
    "<": ["<", ">"],
    ">": ["<", ">"],
  };
  const [open, close] = pairs[ch] ?? [ch, ch];
  const line = state.lines[state.cursor.row] ?? "";
  const inner = findPairRange(line, state.cursor.col, open, close);
  if (!inner) return clearMeta(state);
  const start = ia === "i" ? inner.start : inner.start - 1;
  const end = ia === "i" ? inner.end : inner.end + 1;
  const text = line.slice(start, end + 1);
  if (op === "y") {
    return clearMeta({ ...state, register: { text, linewise: false } });
  }
  const newLine = line.slice(0, start) + line.slice(end + 1);
  let s = setLine(state, state.cursor.row, newLine);
  s = clearMeta({
    ...s,
    cursor: { row: s.cursor.row, col: start },
    register: { text, linewise: false },
  });
  if (op === "c") return { ...s, mode: "insert" };
  return clampCursor(s);
}

function paste(state: VimState, after: boolean): VimState {
  const reg = state.register;
  if (!reg.text) return state;
  if (reg.linewise) {
    const text = reg.text.replace(/\n$/, "");
    const lines = [...state.lines];
    const insertAt = after ? state.cursor.row + 1 : state.cursor.row;
    lines.splice(insertAt, 0, ...text.split("\n"));
    return clampCursor({
      ...state,
      lines,
      cursor: { row: insertAt, col: 0 },
    });
  }
  const line = state.lines[state.cursor.row] ?? "";
  const at = after ? state.cursor.col + 1 : state.cursor.col;
  const newLine = line.slice(0, at) + reg.text + line.slice(at);
  const s = setLine(state, state.cursor.row, newLine);
  return clampCursor({
    ...s,
    cursor: { row: s.cursor.row, col: at + reg.text.length - 1 },
  });
}

// === Advanced features ===

function inlineRangeOp(
  state: VimState,
  op: "d" | "c" | "y",
  startCol: number,
  endCol: number,
): VimState {
  const line = state.lines[state.cursor.row] ?? "";
  const lo = Math.max(0, Math.min(startCol, line.length - 1));
  const hi = Math.max(0, Math.min(endCol, line.length - 1));
  if (hi < lo) return clearMeta(state);
  const text = line.slice(lo, hi + 1);
  if (op === "y") {
    return clearMeta({ ...state, register: { text, linewise: false } });
  }
  const newLine = line.slice(0, lo) + line.slice(hi + 1);
  let s = setLine(state, state.cursor.row, newLine);
  s = clearMeta({
    ...s,
    cursor: { row: s.cursor.row, col: lo },
    register: { text, linewise: false },
  });
  if (op === "c") return { ...s, mode: "insert" };
  return clampCursor(s);
}

function operatorFindChar(
  state: VimState,
  op: "d" | "c" | "y",
  ft: "f" | "F" | "t" | "T",
  ch: string,
): VimState {
  const line = state.lines[state.cursor.row] ?? "";
  const n = getCount(state);
  let foundCol = -1;
  let remaining = n;
  if (ft === "f" || ft === "t") {
    for (let i = state.cursor.col + 1; i < line.length; i++) {
      if (line[i] === ch) {
        remaining--;
        if (remaining === 0) {
          foundCol = i;
          break;
        }
      }
    }
  } else {
    for (let i = state.cursor.col - 1; i >= 0; i--) {
      if (line[i] === ch) {
        remaining--;
        if (remaining === 0) {
          foundCol = i;
          break;
        }
      }
    }
  }
  if (foundCol < 0) return clearMeta(state);
  let lo: number;
  let hi: number;
  if (ft === "f") {
    lo = state.cursor.col;
    hi = foundCol;
  } else if (ft === "t") {
    lo = state.cursor.col;
    hi = foundCol - 1;
  } else if (ft === "F") {
    lo = foundCol;
    hi = state.cursor.col;
  } else {
    lo = foundCol + 1;
    hi = state.cursor.col;
  }
  return inlineRangeOp(state, op, lo, hi);
}

function deleteToFileEnd(state: VimState): VimState {
  const lines = [...state.lines];
  const deleted = lines.splice(state.cursor.row).join("\n");
  if (lines.length === 0) lines.push("");
  return clearMeta(
    clampCursor({
      ...state,
      lines,
      cursor: { row: Math.max(0, state.cursor.row - 1), col: 0 },
      register: { text: deleted + "\n", linewise: true },
    }),
  );
}

function deleteToFileStart(state: VimState): VimState {
  const lines = [...state.lines];
  const deleted = lines.splice(0, state.cursor.row + 1).join("\n");
  if (lines.length === 0) lines.push("");
  return clearMeta(
    clampCursor({
      ...state,
      lines,
      cursor: { row: 0, col: 0 },
      register: { text: deleted + "\n", linewise: true },
    }),
  );
}

function findChar(
  state: VimState,
  op: "f" | "F" | "t" | "T",
  ch: string,
): VimState {
  const n = getCount(state);
  const line = state.lines[state.cursor.row] ?? "";
  let remaining = n;
  let foundCol = -1;
  if (op === "f" || op === "t") {
    let i = state.cursor.col + 1;
    while (i < line.length) {
      if (line[i] === ch) {
        remaining--;
        if (remaining === 0) {
          foundCol = i;
          break;
        }
      }
      i++;
    }
  } else {
    let i = state.cursor.col - 1;
    while (i >= 0) {
      if (line[i] === ch) {
        remaining--;
        if (remaining === 0) {
          foundCol = i;
          break;
        }
      }
      i--;
    }
  }
  if (foundCol < 0) return clearMeta(state);
  if (op === "t") foundCol = Math.max(0, foundCol - 1);
  if (op === "T") foundCol = Math.min(line.length - 1, foundCol + 1);
  return clearMeta(
    clampCursor({
      ...state,
      cursor: { row: state.cursor.row, col: foundCol },
    }),
  );
}

function replaceChar(state: VimState, ch: string): VimState {
  const n = getCount(state);
  const line = state.lines[state.cursor.row] ?? "";
  if (line.length === 0) return clearMeta(state);
  let newLine = line;
  let i = 0;
  for (; i < n && state.cursor.col + i < line.length; i++) {
    newLine =
      newLine.slice(0, state.cursor.col + i) +
      ch +
      newLine.slice(state.cursor.col + i + 1);
  }
  const s = setLine(state, state.cursor.row, newLine);
  return clearMeta(
    clampCursor({
      ...s,
      cursor: { row: s.cursor.row, col: s.cursor.col + Math.max(0, i - 1) },
    }),
  );
}

function joinLines(state: VimState, n: number): VimState {
  let s = state;
  // n=1 should still join one line, like vim
  const joins = Math.max(1, n);
  for (let i = 0; i < joins; i++) {
    if (s.cursor.row >= s.lines.length - 1) break;
    const cur = s.lines[s.cursor.row];
    const next = s.lines[s.cursor.row + 1];
    const lines = [...s.lines];
    const joinedAt = cur.length;
    const trimmed = next.replace(/^\s+/, "");
    const sep = cur.length > 0 && trimmed.length > 0 ? " " : "";
    lines.splice(s.cursor.row, 2, cur + sep + trimmed);
    s = { ...s, lines, cursor: { row: s.cursor.row, col: joinedAt } };
  }
  return clampCursor(s);
}

function toggleCase(state: VimState, n: number): VimState {
  const line = state.lines[state.cursor.row] ?? "";
  let newLine = line;
  const col = state.cursor.col;
  let last = col;
  for (let i = 0; i < n; i++) {
    if (col + i >= newLine.length) break;
    const c = newLine[col + i];
    const flipped =
      c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase();
    newLine =
      newLine.slice(0, col + i) + flipped + newLine.slice(col + i + 1);
    last = col + i + 1;
  }
  const s = setLine(state, state.cursor.row, newLine);
  return clampCursor({
    ...s,
    cursor: { row: s.cursor.row, col: Math.min(last, newLine.length - 1) },
  });
}

function jumpMatching(state: VimState): VimState {
  const lines = state.lines;
  const startC = lines[state.cursor.row]?.[state.cursor.col];
  const pairs: Record<string, { match: string; dir: 1 | -1 }> = {
    "(": { match: ")", dir: 1 },
    ")": { match: "(", dir: -1 },
    "{": { match: "}", dir: 1 },
    "}": { match: "{", dir: -1 },
    "[": { match: "]", dir: 1 },
    "]": { match: "[", dir: -1 },
  };
  const info = startC ? pairs[startC] : undefined;
  if (!startC || !info) return state;
  const { match, dir } = info;
  let depth = 1;
  let row = state.cursor.row;
  let col = state.cursor.col + dir;
  while (row >= 0 && row < lines.length) {
    const line = lines[row];
    while (col >= 0 && col < line.length) {
      if (line[col] === startC) depth++;
      else if (line[col] === match) {
        depth--;
        if (depth === 0) {
          return clampCursor({ ...state, cursor: { row, col } });
        }
      }
      col += dir;
    }
    row += dir;
    if (row >= 0 && row < lines.length) {
      col = dir === 1 ? 0 : lines[row].length - 1;
    }
  }
  return state;
}

function indentLine(state: VimState, n: number, dir: 1 | -1): VimState {
  const lines = [...state.lines];
  const width = 2;
  const indent = " ".repeat(width);
  for (let i = 0; i < n; i++) {
    const r = state.cursor.row + i;
    if (r >= lines.length) break;
    if (dir === 1) {
      lines[r] = indent + lines[r];
    } else {
      let removed = 0;
      let line = lines[r];
      while (removed < width && line.startsWith(" ")) {
        line = line.slice(1);
        removed++;
      }
      lines[r] = line;
    }
  }
  return clearMeta(clampCursor({ ...state, lines }));
}

export function linesEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

// === Undo / Redo ===

function undoState(state: VimState, n: number): VimState {
  let s = state;
  for (let i = 0; i < n; i++) {
    if (s.undoStack.length === 0) break;
    const top = s.undoStack[s.undoStack.length - 1];
    s = {
      ...s,
      lines: top.lines,
      cursor: top.cursor,
      undoStack: s.undoStack.slice(0, -1),
      redoStack: [...s.redoStack, snapshot(s)],
    };
  }
  return clampCursor(s);
}

function redoState(state: VimState, n: number): VimState {
  let s = state;
  for (let i = 0; i < n; i++) {
    if (s.redoStack.length === 0) break;
    const top = s.redoStack[s.redoStack.length - 1];
    s = {
      ...s,
      lines: top.lines,
      cursor: top.cursor,
      redoStack: s.redoStack.slice(0, -1),
      undoStack: [...s.undoStack, snapshot(s)],
    };
  }
  return clampCursor(s);
}

// === Case operators ===

function caseOpLine(
  state: VimState,
  op: "U" | "u" | "~",
  n: number,
): VimState {
  const lines = [...state.lines];
  for (let i = 0; i < n; i++) {
    const r = state.cursor.row + i;
    if (r >= lines.length) break;
    lines[r] = applyCase(lines[r], op);
  }
  return clearMeta({ ...state, lines });
}

function caseOpMotion(
  state: VimState,
  op: "U" | "u" | "~",
  motionKey: string,
): VimState {
  const n = getCount(state);
  const line = state.lines[state.cursor.row] ?? "";
  let lo: number;
  let hi: number;
  if (motionKey === "w") {
    let endCol = state.cursor.col;
    for (let i = 0; i < n; i++) endCol = wordEnd(line, endCol);
    lo = state.cursor.col;
    hi = endCol;
  } else if (motionKey === "e") {
    let endCol = state.cursor.col;
    for (let i = 0; i < n; i++) endCol = wordEnd(line, endCol);
    lo = state.cursor.col;
    hi = endCol;
  } else if (motionKey === "b") {
    let startCol = state.cursor.col;
    for (let i = 0; i < n; i++) startCol = wordStart(line, startCol, false);
    if (startCol >= state.cursor.col) return clearMeta(state);
    lo = startCol;
    hi = state.cursor.col - 1;
  } else if (motionKey === "$") {
    lo = state.cursor.col;
    hi = Math.max(0, line.length - 1);
  } else if (motionKey === "0") {
    lo = 0;
    hi = state.cursor.col;
  } else if (motionKey === "h") {
    lo = Math.max(0, state.cursor.col - n);
    hi = state.cursor.col;
  } else if (motionKey === "l") {
    lo = state.cursor.col;
    hi = Math.min(line.length - 1, state.cursor.col + n - 1);
  } else {
    return clearMeta(state);
  }
  lo = Math.max(0, Math.min(lo, line.length - 1));
  hi = Math.max(0, Math.min(hi, line.length - 1));
  if (hi < lo) return clearMeta(state);
  const before = line.slice(0, lo);
  const target = line.slice(lo, hi + 1);
  const after = line.slice(hi + 1);
  const newLine = before + applyCase(target, op) + after;
  return clearMeta(
    clampCursor(setLine({ ...state, cursor: { row: state.cursor.row, col: lo } }, state.cursor.row, newLine)),
  );
}

function applyCase(s: string, op: "U" | "u" | "~"): string {
  if (op === "U") return s.toUpperCase();
  if (op === "u") return s.toLowerCase();
  return s
    .split("")
    .map((c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()))
    .join("");
}

// === Ctrl-a / Ctrl-x ===

function incrementNumber(state: VimState, n: number, dir: 1 | -1): VimState {
  const line = state.lines[state.cursor.row] ?? "";
  let i = state.cursor.col;
  // Find a digit at or after cursor
  while (i < line.length && !/[0-9]/.test(line[i])) i++;
  if (i >= line.length) return state;
  // Find number bounds
  let start = i;
  while (start > 0 && /[0-9]/.test(line[start - 1])) start--;
  // Include leading minus if it's directly before the digits
  if (start > 0 && line[start - 1] === "-") start--;
  let end = i;
  while (end < line.length && /[0-9]/.test(line[end])) end++;
  const numStr = line.slice(start, end);
  const num = parseInt(numStr, 10);
  if (isNaN(num)) return state;
  const newNum = num + n * dir;
  const newStr = String(newNum);
  const newLine = line.slice(0, start) + newStr + line.slice(end);
  const s = setLine(state, state.cursor.row, newLine);
  return clampCursor({
    ...s,
    cursor: { row: s.cursor.row, col: start + newStr.length - 1 },
  });
}

// === Command-line mode (used for search) ===

function handleCommand(state: VimState, key: string): VimState {
  if (key === "Escape") {
    return {
      ...state,
      mode: "normal",
      commandBuffer: "",
      commandPrefix: "",
      pending: "",
      count: "",
    };
  }
  if (key === "Enter") {
    const pattern = state.commandBuffer;
    const backward = state.commandPrefix === "?";
    let s: VimState = {
      ...state,
      mode: "normal",
      commandBuffer: "",
      commandPrefix: "",
      pending: "",
      count: "",
    };
    if (pattern.length > 0) {
      s = { ...s, lastSearch: { pattern, backward } };
      s = jumpToSearch(s, pattern, backward, false);
    }
    return s;
  }
  if (key === "Backspace") {
    if (state.commandBuffer.length === 0) {
      return {
        ...state,
        mode: "normal",
        commandPrefix: "",
        pending: "",
        count: "",
      };
    }
    return { ...state, commandBuffer: state.commandBuffer.slice(0, -1) };
  }
  if (key.length === 1) {
    return { ...state, commandBuffer: state.commandBuffer + key };
  }
  return state;
}

// === Search helpers ===

function findMatch(
  lines: string[],
  pattern: string,
  fromRow: number,
  fromCol: number,
  backward: boolean,
): { row: number; col: number; end: number } | null {
  if (pattern.length === 0) return null;
  const len = pattern.length;
  if (!backward) {
    for (let row = fromRow; row < lines.length; row++) {
      const startCol = row === fromRow ? fromCol : 0;
      const idx = (lines[row] ?? "").indexOf(pattern, startCol);
      if (idx >= 0) return { row, col: idx, end: idx + len - 1 };
    }
    // wrap
    for (let row = 0; row <= fromRow; row++) {
      const idx = (lines[row] ?? "").indexOf(pattern);
      if (idx >= 0 && (row !== fromRow || idx < fromCol)) {
        return { row, col: idx, end: idx + len - 1 };
      }
    }
  } else {
    for (let row = fromRow; row >= 0; row--) {
      const endCol = row === fromRow ? fromCol - 1 : (lines[row]?.length ?? 0) - 1;
      const idx = (lines[row] ?? "").lastIndexOf(pattern, endCol);
      if (idx >= 0) return { row, col: idx, end: idx + len - 1 };
    }
    for (let row = lines.length - 1; row >= fromRow; row--) {
      const idx = (lines[row] ?? "").lastIndexOf(pattern);
      if (idx >= 0 && (row !== fromRow || idx > fromCol)) {
        return { row, col: idx, end: idx + len - 1 };
      }
    }
  }
  return null;
}

function jumpToSearch(
  state: VimState,
  pattern: string,
  backward: boolean,
  skipCursor: boolean,
): VimState {
  const fromCol = skipCursor
    ? state.cursor.col + (backward ? -1 : 1)
    : state.cursor.col;
  const m = findMatch(state.lines, pattern, state.cursor.row, fromCol, backward);
  if (!m) return state;
  return clampCursor({ ...state, cursor: { row: m.row, col: m.col } });
}

function jumpToNextSearch(
  state: VimState,
  n: number,
  reverseDir: boolean,
): VimState {
  if (!state.lastSearch) return state;
  let s = state;
  const dir = reverseDir ? !state.lastSearch.backward : state.lastSearch.backward;
  for (let i = 0; i < n; i++) {
    s = jumpToSearch(s, state.lastSearch.pattern, dir, true);
  }
  return s;
}

function searchWordUnderCursor(state: VimState, backward: boolean): VimState {
  const line = state.lines[state.cursor.row] ?? "";
  if (line.length === 0) return state;
  const { start, end } = findWordRange(line, state.cursor.col);
  const word = line.slice(start, end + 1);
  if (!word) return state;
  const s = { ...state, lastSearch: { pattern: word, backward } };
  return jumpToSearch(s, word, backward, true);
}

function scrollHalfPage(state: VimState, n: number, dir: 1 | -1): VimState {
  const half = Math.max(1, Math.floor(state.viewportHeight / 2));
  const delta = half * n * dir;
  const newRow = Math.max(
    0,
    Math.min(state.lines.length - 1, state.cursor.row + delta),
  );
  const maxTop = Math.max(0, state.lines.length - state.viewportHeight);
  const newTop = Math.max(0, Math.min(maxTop, state.viewportTop + delta));
  return clampCursor({
    ...state,
    cursor: { row: newRow, col: state.cursor.col },
    viewportTop: newTop,
  });
}

function scrollFullPage(state: VimState, n: number, dir: 1 | -1): VimState {
  const full = Math.max(1, state.viewportHeight - 2);
  const delta = full * n * dir;
  const newRow = Math.max(
    0,
    Math.min(state.lines.length - 1, state.cursor.row + delta),
  );
  const maxTop = Math.max(0, state.lines.length - state.viewportHeight);
  const newTop = Math.max(0, Math.min(maxTop, state.viewportTop + delta));
  return clampCursor({
    ...state,
    cursor: { row: newRow, col: state.cursor.col },
    viewportTop: newTop,
  });
}

function operatorOnNextMatch(
  state: VimState,
  op: "c" | "d" | "y",
): VimState {
  if (!state.lastSearch) return clearMeta(state);
  const { pattern } = state.lastSearch;
  const m = findMatch(
    state.lines,
    pattern,
    state.cursor.row,
    state.cursor.col,
    false,
  );
  if (!m) return clearMeta(state);
  if (m.row !== state.cursor.row) {
    // multi-line ranges not supported; jump only
    return clearMeta(
      clampCursor({ ...state, cursor: { row: m.row, col: m.col } }),
    );
  }
  const s = { ...state, cursor: { row: m.row, col: m.col } };
  return inlineRangeOp(s, op, m.col, m.end);
}
