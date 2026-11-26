import { describe, expect, it } from "vitest";
import { isTvCallback } from "./tv-auth";

const tvUa =
  "Mozilla/5.0 (Linux; Android 11; MiTV-AXSO2 Build/RTT0.211201.001; wv) " +
  "AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/142.0.7444.174 Mobile Safari/537.36";

describe("isTvCallback", () => {
  it("detects the TV WebView even without the marker cookie", () => {
    expect(isTvCallback(tvUa, undefined)).toBe(true);
  });

  it("keeps desktop and Android browser logins on the web app", () => {
    expect(isTvCallback("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/142.0", undefined)).toBe(false);
    expect(isTvCallback("Mozilla/5.0 (Linux; Android 11) Chrome/142.0 Mobile Safari/537.36", undefined)).toBe(false);
  });

  it("still honours the marker cookie", () => {
    expect(isTvCallback(undefined, "1")).toBe(true);
  });
});
