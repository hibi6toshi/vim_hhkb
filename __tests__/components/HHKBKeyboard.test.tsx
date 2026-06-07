import { render, screen } from "@testing-library/react";
import { HHKBKeyboard, expandActiveKeys } from "@/app/components/HHKBKeyboard";

describe("HHKBKeyboard", () => {
  it("renders alphabet keys", () => {
    render(<HHKBKeyboard activeKeys={new Set()} />);
    for (const letter of ["Q", "W", "E", "R", "T", "Y"]) {
      expect(screen.getByText(letter)).toBeInTheDocument();
    }
    expect(screen.getByText("Control")).toBeInTheDocument();
    expect(screen.getByText("Return")).toBeInTheDocument();
  });

  it("highlights the matched key when present in activeKeys", () => {
    render(<HHKBKeyboard activeKeys={new Set(["j"])} />);
    const j = screen.getByText("J").parentElement!;
    expect(j.className).toMatch(/bg-amber-300/);

    const k = screen.getByText("K").parentElement!;
    expect(k.className).not.toMatch(/bg-amber-300/);
  });

  it("hides Fn labels when showFnLabels is false", () => {
    const { rerender } = render(
      <HHKBKeyboard activeKeys={new Set()} showFnLabels={true} />,
    );
    expect(screen.getAllByText("F1").length).toBeGreaterThan(0);

    rerender(<HHKBKeyboard activeKeys={new Set()} showFnLabels={false} />);
    expect(screen.queryByText("F1")).toBeNull();
  });
});

describe("expandActiveKeys", () => {
  it("adds the base key and fn when a function key is held", () => {
    const out = expandActiveKeys(new Set(["f1"]));
    expect(out.has("f1")).toBe(true);
    expect(out.has("1")).toBe(true);
    expect(out.has("fn")).toBe(true);
  });

  it("expands arrow keys to their HHKB base positions", () => {
    expect(expandActiveKeys(new Set(["arrowup"])).has("[")).toBe(true);
    expect(expandActiveKeys(new Set(["arrowdown"])).has("/")).toBe(true);
    expect(expandActiveKeys(new Set(["arrowleft"])).has(",")).toBe(true);
    expect(expandActiveKeys(new Set(["arrowright"])).has(";")).toBe(true);
  });

  it("leaves a plain alphabetic set unchanged in content", () => {
    const out = expandActiveKeys(new Set(["j"]));
    expect(out.has("j")).toBe(true);
    expect(out.has("fn")).toBe(false);
  });
});
