import {
  createInitialState,
  linesEqual,
  step,
  type VimState,
} from "@/app/lib/vim";

function feed(state: VimState, keys: string[]): VimState {
  return keys.reduce((s, k) => step(s, k), state);
}

function init(lines: string[], cursor = { row: 0, col: 0 }): VimState {
  return createInitialState(lines, cursor);
}

describe("createInitialState", () => {
  it("starts in normal mode with the given cursor", () => {
    const s = init(["hello"], { row: 0, col: 2 });
    expect(s.mode).toBe("normal");
    expect(s.cursor).toEqual({ row: 0, col: 2 });
    expect(s.lines).toEqual(["hello"]);
  });
});

describe("motions", () => {
  it("hjkl moves the cursor", () => {
    let s = init(["abcd", "efgh", "ijkl"], { row: 1, col: 1 });
    s = step(s, "l");
    expect(s.cursor).toEqual({ row: 1, col: 2 });
    s = step(s, "h");
    expect(s.cursor).toEqual({ row: 1, col: 1 });
    s = step(s, "j");
    expect(s.cursor).toEqual({ row: 2, col: 1 });
    s = step(s, "k");
    expect(s.cursor).toEqual({ row: 1, col: 1 });
  });

  it("count prefix repeats motions (3l)", () => {
    const s = feed(init(["abcdef"]), ["3", "l"]);
    expect(s.cursor).toEqual({ row: 0, col: 3 });
    expect(s.count).toBe("");
  });

  it("$ goes to end of line, 0 to start, ^ to first non-blank", () => {
    let s = feed(init(["  hello"]), ["$"]);
    expect(s.cursor.col).toBe(6);
    s = step(s, "0");
    expect(s.cursor.col).toBe(0);
    s = step(s, "^");
    expect(s.cursor.col).toBe(2);
  });

  it("gg jumps to the first line and G to the last", () => {
    let s = init(["a", "b", "c", "d"], { row: 2, col: 0 });
    s = feed(s, ["g", "g"]);
    expect(s.cursor.row).toBe(0);
    s = step(s, "G");
    expect(s.cursor.row).toBe(3);
  });

  it("w moves forward by word, b backward", () => {
    let s = init(["foo bar baz"]);
    s = step(s, "w");
    expect(s.cursor.col).toBe(4);
    s = step(s, "w");
    expect(s.cursor.col).toBe(8);
    s = step(s, "b");
    expect(s.cursor.col).toBe(4);
  });
});

describe("insert mode", () => {
  it("i enters insert and Escape returns to normal, cursor steps back", () => {
    let s = init(["abc"], { row: 0, col: 1 });
    s = step(s, "i");
    expect(s.mode).toBe("insert");
    s = step(s, "X");
    expect(s.lines[0]).toBe("aXbc");
    s = step(s, "Escape");
    expect(s.mode).toBe("normal");
    expect(s.cursor.col).toBe(1);
  });

  it("a appends after the cursor", () => {
    let s = init(["abc"], { row: 0, col: 0 });
    s = feed(s, ["a", "Z", "Escape"]);
    expect(s.lines[0]).toBe("aZbc");
  });

  it("o opens a new line below in insert mode", () => {
    let s = init(["one", "two"], { row: 0, col: 0 });
    s = feed(s, ["o", "x", "Escape"]);
    expect(s.lines).toEqual(["one", "x", "two"]);
  });
});

describe("editing operators", () => {
  it("x deletes the character under the cursor", () => {
    const s = feed(init(["abcd"], { row: 0, col: 1 }), ["x"]);
    expect(s.lines[0]).toBe("acd");
  });

  it("dd deletes the current line into the register (linewise)", () => {
    const s = feed(init(["one", "two", "three"], { row: 1, col: 0 }), [
      "d",
      "d",
    ]);
    expect(s.lines).toEqual(["one", "three"]);
    expect(s.register.linewise).toBe(true);
    expect(s.register.text).toBe("two\n");
  });

  it("dw deletes a word", () => {
    const s = feed(init(["foo bar baz"]), ["d", "w"]);
    expect(s.lines[0]).toBe("bar baz");
    expect(s.register.text).toBe("foo ");
  });

  it("yy then p pastes the line below", () => {
    const s = feed(init(["one", "two"], { row: 0, col: 0 }), ["y", "y", "p"]);
    expect(s.lines).toEqual(["one", "one", "two"]);
  });

  it("ciw replaces the inner word and enters insert", () => {
    const s = feed(init(["foo bar"], { row: 0, col: 1 }), ["c", "i", "w"]);
    expect(s.mode).toBe("insert");
    expect(s.lines[0]).toBe(" bar");
  });
});

describe("undo / redo", () => {
  it("u undoes a change, Ctrl-r redoes it", () => {
    let s = init(["abc"], { row: 0, col: 0 });
    s = feed(s, ["x"]);
    expect(s.lines[0]).toBe("bc");
    s = step(s, "u");
    expect(s.lines[0]).toBe("abc");
    s = step(s, "Ctrl-r");
    expect(s.lines[0]).toBe("bc");
  });
});

describe("search", () => {
  it("/pattern<Enter> jumps to the next match, n repeats", () => {
    let s = init(["foo bar foo baz foo"], { row: 0, col: 1 });
    s = feed(s, ["/", "f", "o", "o", "Enter"]);
    expect(s.cursor.col).toBe(8);
    s = step(s, "n");
    expect(s.cursor.col).toBe(16);
  });
});

describe("linesEqual", () => {
  it("compares line arrays element-wise", () => {
    expect(linesEqual(["a", "b"], ["a", "b"])).toBe(true);
    expect(linesEqual(["a"], ["a", "b"])).toBe(false);
    expect(linesEqual(["a", "b"], ["a", "c"])).toBe(false);
  });
});
