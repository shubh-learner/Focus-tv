# Focus TV — Design

Date: 2026-11-22
Status: awaiting approval
Owner: personal use, one Mi TV

## Intent

Watch the existing Focus feed on a Xiaomi Mi TV (Android TV 11) from the couch,
with a D-pad remote, in an Apple TV–style glass interface. Same data and same
functionality as the web app: sections, channel subscriptions, keyword filters,
cached feed, channel search, manual refresh, and video playback.

Why: the web app already removes YouTube's homepage, recommendations, and
autoplay rabbit holes. The TV is where the user actually watches, and a browser
on a TV is awkward with a remote.

## Goals

- Installable app in the Android TV launcher, opens fullscreen — no browser chrome.
- Section tabs, channel avatars, video grid, keyword filtering, subscribe /
  unsubscribe, channel search, refresh, and playback, all usable with only a
  D-pad (up/down/left/right/enter/back).
- Apple TV glass feel: ambient blurred background, translucent frosted panels,
  soft borders, focus scaling/glow, smooth 200–300 ms transitions.
- 10-foot readability at 1080p: large type, large hit targets, no hover reliance.
- Playback through the official YouTube IFrame Player API inside a WebView
  (stays within YouTube's terms).
- Reuse the existing Next.js API routes, Supabase data, and YouTube cache.
- Keep the existing desktop UI unchanged.

## Non-goals

- Play Store distribution, multiple TV profiles, multi-user support.
- Offline mode, background refresh service, native ExoPlayer / stream extraction.
- Mobile/tablet layouts.
- A new backend or data model.
- Apple TV hardware support (the look is the target, not the platform).

## Anti-goals

- Feeling like a web page in a browser frame.
- Tiny text, mouse hover interactions, or D-pad focus traps.
- Playing YouTube video outside the official player.
- Bypassing auth or RLS to simplify the TV client.

## Constraints

- TV: Android TV 11 (SDK 30), 1080p, WebView 142 (modern Chromium),
  no touchscreen, `leanback` feature present. ADB reachable at
  `192.168.1.3:5555`.
- Google OAuth is blocked inside Android WebViews. TV login must use
  email/password (Supabase password grant).
- No JDK or Android SDK is installed on the laptop. A portable JDK and Android
  command-line tools will be installed under `/tmp/opencode` (not system-wide).
- The server runs on the laptop over the LAN for v1. The TV depends on the
  laptop being awake. The wrapper's server URL is configurable, so switching to
  a deployed URL later does not require a rebuild.
- Backend bugs found in the audit must be fixed first: missing
  `subscriptions.keywords` and `videos.duration_seconds`, missing subscription
  update RLS policy, admin-client subscription inserts, and the RLS-bypassing
  `user_feed` view.

## Approaches considered

1. **TV web page in the existing TV browser.** Cheapest, but no app icon,
   browser chrome, and awkward remote behaviour. Rejected.
2. **TV-mode web UI + minimal Android WebView wrapper APK.** One UI codebase,
   best glass fidelity (CSS `backdrop-filter`), installable app, official
   player. **Chosen.**
3. **Fully native Kotlin / Compose for TV.** Best native feel, but playback
   still needs a YouTube WebView, real blur needs Android 12+ (this TV is 11),
   and all screens would be rebuilt for one viewer. Rejected as too much work
   for less visual fidelity.

## Design

### Web: TV route

- Add `/tv` (authenticated) and `/tv/login` (public) in the existing Next.js
  app. Desktop `/` is untouched.
- `/tv` is a server component: authenticate, load the feed with
  `getUserFeed(createServerSupabase())`, and render a client `TvDashboard` with
  initial data. No loading flash.
- New component tree under `src/components/tv/`:
  `TvDashboard`, `TvTopBar`, `TvChannelRow`, `TvVideoGrid`, `TvVideoModal`,
  `TvSearchOverlay`, `TvKeywordDialog`, `TvLoginForm`, plus a small
  `useSpatialNav` hook.
- Reuse existing APIs: `GET /api/videos`, `POST/PATCH/DELETE /api/subscriptions`,
  `GET/POST /api/sections`, `PATCH/DELETE /api/sections/[id]`,
  `GET /api/youtube/search`, `GET/POST /api/videos/refresh`.
- Middleware: keep `/tv` protected; allow `/tv/login` while logged out; send a
  logged-in user on `/tv/login` to `/tv`.

### Visual language (Apple TV glass)

- Full-bleed ambient background: 3–4 large blurred radial gradients in muted
  warm tones, very slow drift, no images.
- Panels: `bg-white/10`, `backdrop-blur-2xl`, `border-white/15`,
  rounded-2xl/3xl, soft inner highlight and drop shadow.
- Text: white / white-70 on dark ambient, sans-serif for the TV surface.
- Focus: 1.06 scale, white ring + outer glow, 220 ms ease-out; the focused card
  lifts above its neighbours.
- Layout: top bar with wordmark, section pills, refresh and sign-out; below it a
  channel avatar row; then a 4-column video grid. The focused video's metadata
  is readable, not hover-dependent.
- Video modal: centred 16:9 glass player, title, close action, and a horizontal
  "from your subscriptions" shelf. Back closes it.
- All interactive elements are real `<button>`/`<input>` elements for native
  focus and accessibility.

### Navigation

- Hand-rolled spatial navigation (~100 lines): elements marked `data-focusable`
  are indexed by bounding box; arrow keys pick the nearest candidate in that
  direction with the smallest weighted distance; Enter activates; Back closes
  the topmost overlay or returns focus to the previous element.
- Focus is restored per section and after closing overlays.
- No new navigation dependency.

### Login

- Add email/password sign-in to the TV route using
  `supabase.auth.signInWithPassword`.
- The existing Google button stays on the desktop login page.
- One-time setup: a one-off script using the service-role key sets a password on
  the existing account. The password is read from a local file the user creates
  (mode 600), never printed or passed in chat; the file is deleted afterwards.
  Existing sections and subscriptions are preserved; no separate TV account.
- Email/password provider must be enabled in Supabase Auth.
- Session persists in WebView local storage.

### Sections and playback scope

- Sections on TV are **read-only tabs** for v1. Add/rename/delete/reorder stays
  on the web app. The TV uses `GET /api/videos` and section switching only.
- Player controls are a minimal glass bar: play/pause, −10 s, +10 s, Back to
  close. YouTube's built-in iframe controls cannot be reached reliably with a
  D-pad, so these are driven through the IFrame Player API.
- Before building the full UI, run a spike that proves the YouTube iframe plays
  in this TV's WebView. If it is blocked, stop and decide whether handing off to
  the official YouTube TV app is acceptable.

### Android wrapper

- New `android-tv/` project, single Java `Activity` with a `WebView`. No
  AndroidX/Compose, no Kotlin plugin.
- Fullscreen, keep screen on, JavaScript + DOM storage enabled,
  `mediaPlaybackRequiresUserGesture(false)` for the YouTube player,
  WebView debugging enabled in debug builds.
- Server URL stored in `SharedPreferences`; first launch shows a small native
  URL dialog prefilled with `http://192.168.1.28:3000/tv`. Long-press the
  remote's Back key reopens the dialog.
- Back key: injects a JS `focusTvBack` event so overlays/player close first;
  if the page does not handle it, WebView goes back or the app exits.
- Manifest: `LAUNCHER` + `LEANBACK_LAUNCHER` intent filters, TV banner,
  `touchscreen required=false`, `leanback required=false`, INTERNET permission,
  cleartext traffic allowed for the LAN URL, fullscreen theme.
- Build a debug-signed APK with a portable JDK 17 + Android SDK
  (platform 34, build-tools 34) under `/tmp/opencode`, then install via ADB.

### Data and backend fixes (prerequisite)

The user applies DDL manually in the Supabase SQL editor. The exact block:

```sql
alter table public.subscriptions
  add column if not exists keywords text[] not null default '{}';

alter table public.videos
  add column if not exists duration_seconds int;

drop policy if exists "subs_update_own" on public.subscriptions;
create policy "subs_update_own" on public.subscriptions
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Unused and bypasses RLS on Postgres < 15 defaults.
drop view if exists public.user_feed;
```

- Update `supabase/schema.sql` so the committed schema matches the live DB.
- `src/app/api/subscriptions/route.ts`: insert subscriptions with the user
  client (not the service role), verify the section belongs to the user, and
  only cache a channel after `getChannelDetails` succeeds.
- Check/return errors from video upserts instead of swallowing them.

### Verification

- `npx tsc --noEmit` and `npm run build`.
- Run `npm start` on the LAN; open `/tv` in a desktop browser for layout and
  keyboard navigation.
- Install the APK on the Mi TV, then walk the D-pad path: sign in, switch
  sections, focus and play a video, close the player with Back, subscribe and
  unsubscribe a channel, set a keyword filter, refresh, open search and submit
  a query.
- Capture `adb exec-out screencap` screenshots of the grid, focus state, and
  player.
- Confirm the YouTube iframe plays with sound and Back does not dead-end.

## Decisions left to the builder

- Exact gradient colours, blur radii, and focus glow.
- Grid row/column count at 1080p and spacing.
- Whether channel avatars scroll horizontally or wrap.
- Banner artwork and app label.
- Whether to add a Vercel deployment now (not required for v1).
