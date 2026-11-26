import { describe, expect, it } from "vitest";
import { pickNextFocus, type FocusCandidate } from "./spatial-nav";

const r = (left: number, top: number) => ({ left, top, right: left + 100, bottom: top + 100 });
const grid: FocusCandidate[] = [
  { id: "a", rect: r(0, 0) }, { id: "b", rect: r(200, 0) }, { id: "c", rect: r(400, 0) },
  { id: "d", rect: r(0, 200) }, { id: "e", rect: r(200, 200) }, { id: "f", rect: r(400, 200) },
];

describe("pickNextFocus", () => {
  it("moves right to the nearest card in the same row", () => {
    expect(pickNextFocus(grid[0].rect, grid, "right")).toBe("b");
  });
  it("moves down to the card below", () => {
    expect(pickNextFocus(grid[1].rect, grid, "down")).toBe("e");
  });
  it("returns null at the outer edge", () => {
    expect(pickNextFocus(grid[2].rect, grid, "right")).toBeNull();
  });
  it("prefers overlap on the secondary axis", () => {
    const current = { left: 0, top: 0, right: 100, bottom: 100 };
    expect(pickNextFocus(current, [
      { id: "far", rect: r(300, 400) },
      { id: "near", rect: r(150, 0) },
    ], "right")).toBe("near");
  });
});
