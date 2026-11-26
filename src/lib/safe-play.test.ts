import { describe, expect, it } from "vitest";
import { safePlay } from "./safe-play";

describe("safePlay", () => {
  it("swallows a blocked-autoplay promise rejection", async () => {
    const rejected = Promise.reject(new Error("autoplay blocked"));

    expect(() => safePlay(() => rejected)).not.toThrow();
    await expect(rejected).rejects.toThrow("autoplay blocked");
  });

  it("swallows a synchronous play failure", () => {
    expect(() => safePlay(() => { throw new Error("blocked"); })).not.toThrow();
  });
});
