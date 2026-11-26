# TV thumbnail quality design

## Intent
Make TV video cards less blurry without slowing the app or changing the web app.

## Decisions
- Upgrade only the TV card thumbnail from YouTube's `mqdefault.jpg` (320x180) to `sddefault.jpg` (640x480). Cards render ~296 CSS px wide on a 1080p TV, so the current source is upscaled.
- Derive the URL from the existing thumbnail URL in the TV card only. No API routes, database writes, cooldown logic, subscriptions, keyword filters, or web components change.
- Keep `next/image` with `unoptimized: true` and existing lazy loading; the first card stays `priority`. No new dependencies.
- If the upgraded image fails to load, fall back to the original thumbnail URL to avoid a broken card.

## Approaches considered
1. `hqdefault` (480x360, ~20-25 KB): cheapest improvement, but still soft and letterboxed. Rejected because the user asked for clearer images.
2. `sddefault` (640x480, ~70-95 KB): chosen; clear improvement with lazy loading limiting initial downloads.
3. `hq720` (1280x720, ~70-250 KB): sharpest but 5-15x bytes and can be unavailable. Rejected for the efficiency requirement.

## Verification
- Unit test the URL upgrade helper for mqdefault, non-mqdefault, and null inputs.
- Run `npm test`, `npx tsc --noEmit`, `git diff --check`.
- On the TV, confirm rendered card thumbnails request `sddefault.jpg`, are visibly sharper, and the card click/focus/autoplay still work.
