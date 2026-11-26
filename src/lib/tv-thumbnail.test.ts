import { describe, expect, it } from "vitest";
import { upgradeTvThumbnailUrl } from "./tv-thumbnail";

describe("upgradeTvThumbnailUrl", () => {
  it("upgrades an i.ytimg.com mqdefault thumbnail to sddefault", () => {
    expect(upgradeTvThumbnailUrl("https://i.ytimg.com/vi/abc123/mqdefault.jpg")).toBe(
      "https://i.ytimg.com/vi/abc123/sddefault.jpg"
    );
  });

  it("leaves non-mqdefault and missing thumbnails unchanged", () => {
    expect(upgradeTvThumbnailUrl("https://i.ytimg.com/vi/abc123/hqdefault.jpg")).toBe(
      "https://i.ytimg.com/vi/abc123/hqdefault.jpg"
    );
    expect(upgradeTvThumbnailUrl(null)).toBeNull();
    expect(upgradeTvThumbnailUrl(undefined)).toBeUndefined();
  });
});
