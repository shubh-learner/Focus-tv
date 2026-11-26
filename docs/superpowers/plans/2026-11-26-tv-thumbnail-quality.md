# TV Thumbnail Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade TV card thumbnails from 320x180 `mqdefault.jpg` to 640x480 `sddefault.jpg` without changing the web app, API, or database.

**Architecture:** Add a pure URL upgrade helper and use it only in `TvGrid`. Keep existing `next/image` lazy loading and `unoptimized: true`. Add an `onError` fallback to the original thumbnail URL.

**Tech Stack:** Next.js 14, TypeScript, Vitest, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-11-26-tv-thumbnail-quality-design.md`

## Global Constraints

- Keep the `<img>` inside the card `<button>`; the wrapper's click hook depends on that structure.
- Do not change API routes, cooldown logic, subscriptions, keyword filtering, localStorage, or remote key handling.
- No new dependencies.
- Web components and database writes stay unchanged.

## Review Focus

- Missing or non-YouTube thumbnail URL: helper must leave it unchanged; pinned by unit test.
- Failed `sddefault` request: card must show the original thumbnail; verified on TV and by code review of `onError`.
- First card remains `priority`; other cards remain lazy; verified by code review.
- Click and D-pad focus behavior stays intact; verified on TV.
- Web app thumbnails stay unchanged; verified by file scope and grep.

---

### Task 1: Thumbnail URL helper

**Files:**
- Create: `src/lib/tv-thumbnail.ts`
- Test: `src/lib/tv-thumbnail.test.ts`

**Interfaces:**
- Produces: `upgradeTvThumbnailUrl(url: string | null | undefined): string | null | undefined`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { upgradeTvThumbnailUrl } from "./tv-thumbnail";

describe("upgradeTvThumbnailUrl", () => {
  it("upgrades an i.ytimg.com mqdefault thumbnail to sddefault", () => {
    expect(
      upgradeTvThumbnailUrl("https://i.ytimg.com/vi/abc123/mqdefault.jpg")
    ).toBe("https://i.ytimg.com/vi/abc123/sddefault.jpg");
  });

  it("leaves non-mqdefault and missing thumbnails unchanged", () => {
    expect(upgradeTvThumbnailUrl("https://i.ytimg.com/vi/abc123/hqdefault.jpg")).toBe(
      "https://i.ytimg.com/vi/abc123/hqdefault.jpg"
    );
    expect(upgradeTvThumbnailUrl(null)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/tv-thumbnail.test.ts`
Expected: FAIL with module not found.

- [ ] **Step 3: Implement the helper**

Create `src/lib/tv-thumbnail.ts` exporting `upgradeTvThumbnailUrl`. Replace the final path segment only for `https://i.ytimg.com/vi/<id>/mqdefault.jpg`; otherwise return the input unchanged.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/tv-thumbnail.test.ts`
Expected: PASS.

### Task 2: TV card wiring and verification

**Files:**
- Modify: `src/components/tv/TvGrid.tsx`
- Design: `docs/superpowers/specs/2026-11-26-tv-thumbnail-quality-design.md`
- Plan: `docs/superpowers/plans/2026-11-26-tv-thumbnail-quality.md`

**Interfaces:**
- Consumes: `upgradeTvThumbnailUrl(url: string | null | undefined): string | null | undefined`

- [ ] **Step 1: Use the upgraded URL in `TvGrid`**

Import the helper. Render `upgradeTvThumbnailUrl(video.thumbnail_url)` as the `Image` src. Add an `onError` handler that sets `img.currentTarget.src` back to `video.thumbnail_url` once if the upgraded URL fails. Do not change button structure, key, focus attributes, priority, sizes, or title markup.

- [ ] **Step 2: Run checks**

Run: `npm test && npx tsc --noEmit && git diff --check`
Expected: all pass.

- [ ] **Step 3: Verify on the deployed TV app**

Commit and push, wait for Vercel, reload `https://focus-tv.vercel.app/tv`, then confirm via CDP that card images request `sddefault.jpg`, natural size is 640x480, title/card layout is unchanged, and clicking a card still opens and plays a video.

- [ ] **Step 4: Commit**

```bash
git add src/lib/tv-thumbnail.ts src/lib/tv-thumbnail.test.ts src/components/tv/TvGrid.tsx docs/superpowers/specs/2026-11-26-tv-thumbnail-quality-design.md docs/superpowers/plans/2026-11-26-tv-thumbnail-quality.md
git commit -m "feat(tv): use higher quality thumbnails"
```
