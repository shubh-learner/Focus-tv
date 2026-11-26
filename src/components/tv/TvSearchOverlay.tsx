"use client";

import { useRef, useState } from "react";
import Image from "next/image";

type SearchResult = {
  channelId: string;
  title: string;
  thumbnailUrl: string;
  description: string;
};

export default function TvSearchOverlay({
  sectionId,
  subscribedChannelIds,
  onSubscribed,
  onUnsubscribed,
  onClose,
}: {
  sectionId: string;
  subscribedChannelIds: Set<string>;
  onSubscribed: () => void;
  onUnsubscribed: () => void;
  onClose: () => void;
}) {
  const scopeRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  async function runSearch(event: React.FormEvent) {
    event.preventDefault();
    if (loading || !query.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      setResults(data.results ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  async function toggleSubscribe(result: SearchResult) {
    if (pending) return;
    setPending(result.channelId);
    setError(null);
    const subscribed = subscribedChannelIds.has(result.channelId);

    try {
      const res = await fetch("/api/subscriptions", {
        method: subscribed ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId, channelId: result.channelId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Couldn't update subscription");
      if (subscribed) onUnsubscribed();
      else onSubscribed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update subscription");
    } finally {
      setPending(null);
    }
  }

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "ArrowDown") return;
    event.preventDefault();
    scopeRef.current?.querySelector<HTMLElement>("[data-search-action]")?.focus();
  }

  return (
    <div
      ref={scopeRef}
      data-focus-scope
      role="dialog"
      aria-modal="true"
      aria-label="Find channels"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-8 pt-24 backdrop-blur-md"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-2xl rounded-3xl border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-2xl"
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-medium tracking-tight">Find channels</h2>
          <button
            data-focusable
            onClick={onClose}
            aria-label="Close search"
            className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/70 transition duration-[220ms] focus:scale-[1.06] focus:outline-none focus:ring-2 focus:ring-white/80"
          >
            Close
          </button>
        </div>

        <form onSubmit={runSearch} className="mb-5 flex gap-3">
          <input
            autoFocus
            id="tv-channel-search"
            name="channel-search"
            autoComplete="off"
            data-focusable
            data-autofocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Search YouTube channels…"
            className="min-w-0 flex-1 rounded-2xl border border-white/15 bg-black/30 px-5 py-3 text-lg text-white outline-none placeholder:text-white/30 focus:border-white/40 focus:ring-2 focus:ring-white/30"
          />
          <button
            type="submit"
            data-focusable
            data-search-action
            aria-busy={loading}
            className="rounded-2xl bg-white/90 px-6 py-3 text-lg font-medium text-black transition duration-[220ms] focus:scale-[1.06] focus:outline-none focus:ring-2 focus:ring-white/70"
          >
            {loading ? "Searching…" : "Search"}
          </button>
        </form>

        {error && <p className="mb-4 text-sm text-red-300">{error}</p>}

        <div className="max-h-[46vh] space-y-2 overflow-y-auto">
          {results.map((result) => {
            const subscribed = subscribedChannelIds.has(result.channelId);
            const busy = pending === result.channelId;
            return (
              <div
                key={result.channelId}
                className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-3"
              >
                {result.thumbnailUrl && (
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full">
                    <Image src={result.thumbnailUrl} alt="" fill sizes="48px" className="object-cover" />
                  </div>
                )}
                <p className="line-clamp-1 flex-1 text-base text-white/80">{result.title}</p>
                <button
                  data-focusable
                  data-search-action
                  onClick={() => toggleSubscribe(result)}
                  aria-disabled={busy}
                  aria-busy={busy}
                  className={`shrink-0 rounded-full border px-5 py-2 text-sm transition duration-[220ms] focus:scale-[1.06] focus:outline-none focus:ring-2 focus:ring-white/80 ${
                    subscribed
                      ? "border-white/20 bg-white/10 text-white/60"
                      : "border-white/80 bg-white/90 text-black"
                  }`}
                >
                  {busy ? "…" : subscribed ? "Subscribed" : "Subscribe"}
                </button>
              </div>
            );
          })}

          {!loading && results.length === 0 && (
            <p className="py-8 text-center text-sm text-white/40">
              Search for a channel by name to get started.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
