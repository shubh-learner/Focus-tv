"use client";

import Image from "next/image";
import type { Channel, SectionFeed, Video } from "@/lib/types";
import { formatDuration } from "@/components/VideoCard";

export default function TvGrid({
  channels,
  videos,
  onPlay,
}: {
  channels: SectionFeed["channels"];
  videos: { video: Video; channel: Channel }[];
  onPlay: (video: Video) => void;
}) {
  if (channels.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-white/15 p-12 text-center text-white/50">
        No channels in this section yet.
      </div>
    );
  }

  return (
    <div>
      {videos.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/15 p-12 text-center text-white/50">
          No videos match your keyword filters.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-5">
          {videos.map(({ video }, index) => (
            <button
              key={video.video_id}
              data-focusable
              data-grid-card
              data-grid-first-column={index % 3 === 0 ? "true" : undefined}
              data-autofocus={index === 0 ? true : undefined}
              onClick={() => onPlay(video)}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 text-left backdrop-blur-2xl transition duration-[220ms] focus:z-10 focus:scale-[1.06] focus:border-white/30 focus:bg-white/10 focus:outline-none focus:shadow-[0_0_40px_rgba(255,255,255,0.18)] focus:ring-2 focus:ring-white/70"
            >
              <div className="relative aspect-video bg-black/40">
                {video.thumbnail_url && (
                  <Image
                    src={video.thumbnail_url}
                    alt=""
                    fill
                    priority={index === 0}
                    sizes="(max-width: 1280px) 33vw, 600px"
                    className="object-cover"
                  />
                )}
                {video.duration_seconds != null && (
                  <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-xs tabular-nums text-white/90">
                    {formatDuration(video.duration_seconds)}
                  </span>
                )}
              </div>
              <div className="px-3 pb-3 pt-2">
                <p className="line-clamp-2 text-sm leading-snug text-white">{video.title}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
