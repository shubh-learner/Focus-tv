"use client";

import { useEffect, useRef, useState } from "react";
import { safePlay } from "@/lib/safe-play";
import type { Video } from "@/lib/types";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

let apiLoadPromise: Promise<void> | null = null;

function loadYouTubeIframeAPI(): Promise<void> {
  if (apiLoadPromise) return apiLoadPromise;
  apiLoadPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve();
      return;
    }
    const prevCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prevCallback?.();
      resolve();
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return apiLoadPromise;
}

export default function TvVideoModal({ video }: { video: Video }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);
  const playButtonRef = useRef<HTMLButtonElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    playButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    let cancelled = false;

    loadYouTubeIframeAPI().then(() => {
      if (cancelled || !containerRef.current) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: video.video_id,
        playerVars: {
          autoplay: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
        },
        events: {
          onReady: (event: any) => {
            const player = event.target;
            safePlay(() => player.playVideo?.());
            setIsPlaying(player.getPlayerState?.() === 1);
          },
          onStateChange: (event: any) => setIsPlaying(event.data === 1),
          onError: () => setError(true),
        },
      });
    });

    return () => {
      cancelled = true;
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
    // The modal is keyed by the opening video; the player is loaded once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function togglePlay() {
    const player = playerRef.current;
    if (!player?.getPlayerState) return;
    if (player.getPlayerState() === 1) player.pauseVideo();
    else safePlay(() => player.playVideo());
  }

  function seekBy(delta: number) {
    const player = playerRef.current;
    if (!player?.getCurrentTime) return;
    const currentTime = player.getCurrentTime() ?? 0;
    player.seekTo(Math.max(0, currentTime + delta), true);
  }

  return (
    <div
      data-focus-scope
      role="dialog"
      aria-modal="true"
      aria-label="Video player"
      className="fixed inset-0 z-50 bg-black"
    >
      {/* YouTube serves 720p here; keep the CSS surface modest for the TV WebView. */}
      <div className="flex h-full w-full items-center justify-center">
        <div className="relative aspect-video w-full max-w-[720px] bg-black">
          <div ref={containerRef} className="h-full w-full [&>iframe]:pointer-events-none" />
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-3 flex justify-center">
        <div className="flex items-center gap-2 rounded-2xl bg-black px-3 py-1.5">
          <button
            data-focusable
            onClick={() => seekBy(-20)}
            aria-label="Back 20 seconds"
            className="h-8 w-8 shrink-0 rounded-full border border-white/15 bg-white/10 text-xs font-medium text-white transition duration-[220ms] focus:scale-[1.06] focus:outline-none focus:ring-2 focus:ring-white/80"
          >
            −20s
          </button>
          <button
            ref={playButtonRef}
            data-focusable
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition duration-[220ms] focus:scale-[1.06] focus:outline-none focus:ring-2 focus:ring-white/80"
          >
            {isPlaying ? (
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <button
            data-focusable
            onClick={() => seekBy(20)}
            aria-label="Forward 20 seconds"
            className="h-8 w-8 shrink-0 rounded-full border border-white/15 bg-white/10 text-xs font-medium text-white transition duration-[220ms] focus:scale-[1.06] focus:outline-none focus:ring-2 focus:ring-white/80"
          >
            +20s
          </button>
        </div>
      </div>
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-sm text-white/70">
          This video can&apos;t play here.
        </div>
      )}
    </div>
  );
}
