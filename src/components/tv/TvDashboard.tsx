"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { shuffle } from "@/lib/shuffle";
import type { Channel, SectionFeed, Video } from "@/lib/types";
import { useSpatialNav } from "./useSpatialNav";
import TvGrid from "./TvGrid";
import TvSearchOverlay from "./TvSearchOverlay";
import TvKeywordDialog from "./TvKeywordDialog";
import TvVideoModal from "./TvVideoModal";

declare global {
  interface Window {
    __focusBack?: () => boolean;
  }
}

function shuffledVideoIds(feed: SectionFeed[]): Record<string, string[]> {
  return Object.fromEntries(
    feed.map((section) => {
      const ids = new Set<string>();
      for (const entry of section.channels) {
        for (const video of entry.videos) ids.add(video.video_id);
      }
      return [section.section.id, shuffle([...ids])];
    })
  );
}

export default function TvDashboard({
  email,
  initialFeed,
}: {
  email: string;
  initialFeed: SectionFeed[];
}) {
  const supabase = createClient();
  const router = useRouter();

  const [feed, setFeed] = useState<SectionFeed[]>(initialFeed);
  const [videoOrder, setVideoOrder] = useState<Record<string, string[]>>({});
  const [activeSectionId, setActiveSectionId] = useState<string | null>(
    initialFeed[0]?.section.id ?? null
  );
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [playing, setPlaying] = useState<Video | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [keywordChannelId, setKeywordChannelId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const dialogFocusRef = useRef<HTMLElement | null>(null);
  const sidebarFocusRef = useRef<HTMLElement | null>(null);
  const sidebarRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Shuffle after hydration so server and client render the same first frame.
    const timer = setTimeout(() => setVideoOrder(shuffledVideoIds(initialFeed)), 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function closeVideo() {
    setPlaying(null);
    requestAnimationFrame(() => returnFocusRef.current?.focus());
  }

  function closeDialogs() {
    setSearchOpen(false);
    setKeywordChannelId(null);
    requestAnimationFrame(() => dialogFocusRef.current?.focus());
  }

  function applyFeed(next: SectionFeed[]) {
    setFeed(next);
    setVideoOrder(shuffledVideoIds(next));
  }

  function openSidebar() {
    if (sidebarOpen || searchOpen || keywordChannelId || playing) return false;
    sidebarFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSidebarOpen(true);
    requestAnimationFrame(
      () => sidebarRef.current?.querySelector<HTMLElement>("[data-focusable]")?.focus()
    );
    return true;
  }

  function closeSidebar() {
    if (!sidebarOpen) return false;
    setSidebarOpen(false);
    requestAnimationFrame(() => {
      const target =
        sidebarFocusRef.current ??
        document.querySelector<HTMLElement>("[data-tv-root] [data-autofocus]");
      target?.focus();
    });
    return true;
  }

  function handleBack() {
    if (searchOpen || keywordChannelId) {
      closeDialogs();
      return true;
    }
    if (sidebarOpen) {
      closeSidebar();
      return true;
    }
    if (!playing) return false;
    closeVideo();
    return true;
  }

  useSpatialNav({ onBack: handleBack, onOpenSidebar: openSidebar, onCloseSidebar: closeSidebar });

  useEffect(() => {
    window.__focusBack = handleBack;
    return () => {
      delete window.__focusBack;
    };
  }, [searchOpen, keywordChannelId, sidebarOpen, playing]);

  async function loadFeed() {
    setRefreshing(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/videos");
      if (!res.ok) throw new Error("feed request failed");
      const data = await res.json();
      applyFeed(data.feed);
      setActiveSectionId((current) =>
        data.feed.some((section: SectionFeed) => section.section.id === current)
          ? current
          : data.feed[0]?.section.id ?? null
      );
    } catch {
      setError("Couldn't load your feed");
    } finally {
      setRefreshing(false);
    }
  }

  async function refreshFeed() {
    if (refreshing) return;
    setVideoOrder(shuffledVideoIds(feed));
    setRefreshing(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/videos/refresh", { method: "POST" });
      const data = await res.json().catch(() => ({}));

      if (res.status === 429) {
        const next = data.nextAllowedAt
          ? new Date(data.nextAllowedAt).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            })
          : null;
        setNotice(next ? `Refreshed recently — next refresh at ${next}` : "Refreshed recently");
        return;
      }

      if (!res.ok || !data.feed) throw new Error(data.error ?? "Refresh failed");
      applyFeed(data.feed);
      setActiveSectionId((current) =>
        data.feed.some((section: SectionFeed) => section.section.id === current)
          ? current
          : data.feed[0]?.section.id ?? null
      );
    } catch {
      setError("Couldn't refresh your feed");
    } finally {
      setRefreshing(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/tv/login");
    router.refresh();
  }

  const active = feed.find((section) => section.section.id === activeSectionId);
  const seenVideoIds = new Set<string>();
  const activeVideos: { video: Video; channel: Channel }[] = [];
  for (const entry of active?.channels ?? []) {
    for (const video of entry.videos) {
      if (seenVideoIds.has(video.video_id)) continue;
      seenVideoIds.add(video.video_id);
      activeVideos.push({ video, channel: entry.channel });
    }
  }
  const orderIndex = new Map(
    (videoOrder[activeSectionId ?? ""] ?? []).map((id, index) => [id, index])
  );
  activeVideos.sort(
    (a, b) =>
      (orderIndex.get(a.video.video_id) ?? Number.MAX_SAFE_INTEGER) -
      (orderIndex.get(b.video.video_id) ?? Number.MAX_SAFE_INTEGER)
  );

  function openVideo(video: Video) {
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setPlaying(video);
  }

  const keywordEntry = active?.channels.find(
    (entry) => entry.channel.channel_id === keywordChannelId
  );

  function openSearch() {
    dialogFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSearchOpen(true);
  }

  function openKeywords(channelId: string) {
    dialogFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setKeywordChannelId(channelId);
  }

  async function saveKeywords(keywords: string[]) {
    if (!active || !keywordChannelId) return;

    const res = await fetch("/api/subscriptions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionId: active.section.id, channelId: keywordChannelId, keywords }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "Couldn't save keywords");

    await loadFeed();
    closeDialogs();
  }

  return (
    <>
      <main
        data-tv-root
        className={`tv-ambient min-h-screen overflow-hidden px-10 py-8 font-sans text-white ${
          playing ? "hidden" : ""
        }`}
      >
      <header className="mb-8 flex items-center gap-6">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Focus</h1>
          <p className="text-xs text-white/40">{email}</p>
        </div>

        <button
          data-focusable
          data-autofocus={feed.length === 0 || !active ? true : undefined}
          onClick={refreshFeed}
          aria-busy={refreshing}
          className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm text-white/70 transition duration-[220ms] focus:scale-[1.06] focus:text-white focus:outline-none focus:ring-2 focus:ring-white/70"
        >
          {refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-8 flex items-center justify-between gap-6 rounded-2xl border border-red-300/20 bg-red-500/10 px-6 py-4 text-sm text-red-100 backdrop-blur-2xl"
        >
          <span>{error}</span>
          <button
            data-focusable
            onClick={loadFeed}
            className="rounded-full border border-white/20 px-4 py-1.5 transition focus:scale-[1.06] focus:outline-none focus:ring-2 focus:ring-white/70"
          >
            Retry
          </button>
        </div>
      )}

      {notice && (
        <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm text-white/70 backdrop-blur-2xl">
          {notice}
        </div>
      )}

      <section>
        {active ? (
          <TvGrid channels={active.channels} videos={activeVideos} onPlay={openVideo} />
        ) : (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-white/50">
            Add a section on the web app, then come back here to watch.
          </div>
        )}
      </section>

      </main>

      {playing && (
        <TvVideoModal
          key={playing.video_id}
          video={playing}
        />
      )}

      {searchOpen && active && (
        <TvSearchOverlay
          sectionId={active.section.id}
          subscribedChannelIds={new Set(active.channels.map((entry) => entry.channel.channel_id))}
          onSubscribed={() => {
            void loadFeed();
          }}
          onUnsubscribed={() => {
            void loadFeed();
          }}
          onClose={closeDialogs}
        />
      )}

      {keywordEntry && (
        <TvKeywordDialog
          channelTitle={keywordEntry.channel.title}
          initialKeywords={keywordEntry.keywords}
          onSave={saveKeywords}
          onClose={closeDialogs}
        />
      )}

      <div
        aria-hidden
        onClick={closeSidebar}
        className={`fixed inset-0 z-30 bg-black/70 transition-opacity duration-200 ${
          sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        ref={sidebarRef}
        data-sidebar
        data-focus-scope={sidebarOpen ? "" : undefined}
        aria-hidden={!sidebarOpen}
        className={`fixed inset-y-0 left-0 z-40 w-[360px] overflow-y-auto border-r border-white/10 bg-[#0b0a0f] p-6 transition-transform duration-200 ease-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <h2 className="text-xs uppercase tracking-widest text-white/40">Sections</h2>
        <nav className="mt-3 flex flex-col gap-2" aria-label="Sections">
          {feed.map((section) => {
            const current = section.section.id === activeSectionId;
            return (
              <button
                key={section.section.id}
                data-focusable
                tabIndex={sidebarOpen ? 0 : -1}
                onClick={() => setActiveSectionId(section.section.id)}
                aria-current={current ? "true" : undefined}
                className={`w-full rounded-xl px-4 py-3 text-left text-sm transition duration-[220ms] focus:outline-none focus:ring-2 focus:ring-white/80 ${
                  current ? "bg-white/15 text-white" : "text-white/60 hover:text-white focus:text-white"
                }`}
              >
                {section.section.name}
              </button>
            );
          })}
        </nav>

        {active && (
          <div className="mt-8">
            <h2 className="text-xs uppercase tracking-widest text-white/40">Channels</h2>
            <div className="mt-3 flex flex-wrap gap-3">
              {active.channels.map(({ channel, keywords }) => (
                <button
                  key={channel.channel_id}
                  data-focusable
                  tabIndex={sidebarOpen ? 0 : -1}
                  onClick={() => openKeywords(channel.channel_id)}
                  title={keywords.length ? `Filtering: ${keywords.join(", ")}` : channel.title}
                  aria-label={`${channel.title} keyword filters`}
                  className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 transition duration-[220ms] focus:outline-none focus:ring-2 focus:ring-white/80 ${
                    keywords.length ? "border-white/70" : "border-white/15"
                  }`}
                >
                  {channel.thumbnail_url ? (
                    <Image
                      src={channel.thumbnail_url}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center bg-white/10 text-lg text-white/70">
                      {channel.title.charAt(0).toUpperCase()}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <button
              data-focusable
              tabIndex={sidebarOpen ? 0 : -1}
              onClick={openSearch}
              className="mt-5 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-left text-sm text-white/70 transition duration-[220ms] focus:outline-none focus:ring-2 focus:ring-white/80 focus:text-white"
            >
              + Channel
            </button>
          </div>
        )}

        <button
          data-focusable
          tabIndex={sidebarOpen ? 0 : -1}
          onClick={signOut}
          className="mt-8 w-full rounded-xl px-4 py-3 text-left text-sm text-white/50 transition duration-[220ms] focus:outline-none focus:ring-2 focus:ring-white/80 focus:text-white"
        >
          Sign out
        </button>
      </aside>
    </>
  );
}
