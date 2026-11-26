import { describe, expect, it } from "vitest";
import { shuffle } from "./shuffle";

describe("shuffle", () => {
  it("performs a Fisher-Yates shuffle without mutating the input", () => {
    const input = ["a", "b", "c", "d"];
    // Deterministic random: 0.75, 0.5, 0.5 -> swaps (0,3), (1,2), (2,3).
    const values = [0.75, 0.5, 0.5];
    const result = shuffle(input, () => values.shift() ?? 0);

    expect(result).toEqual(["a", "c", "b", "d"]);
    expect(input).toEqual(["a", "b", "c", "d"]);
  });
});
