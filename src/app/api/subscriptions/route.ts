import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, createAdminSupabase } from "@/lib/supabase/server"
import { getChannelDetails, getLatestUploads, getVideoDurations } from "@/lib/youtube";

// Subscribe: body = { sectionId, channelId }
// If this is the first time ANYONE has subscribed to this channel, we resolve
// and cache its details (1 unit) and fetch its first batch of videos (1 unit).
// If the channel is already cached, this costs 0 YouTube API units.
export async function POST(request: NextRequest) {
  const supabase = createServerSupabase();
  const admin = createAdminSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sectionId, channelId } = await request.json();
  if (!sectionId || !channelId) {
    return NextResponse.json({ error: "sectionId and channelId are required" }, { status: 400 });
  }

  // RLS also enforces this; the explicit check returns a useful 404.
  const { data: section } = await supabase
    .from("sections")
    .select("id")
    .eq("id", sectionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!section) {
    return NextResponse.json({ error: "Section not found" }, { status: 404 });
  }

  // Ensure the channel exists in the shared cache.
  const { data: existing } = await supabase
    .from("channels")
    .select("channel_id")
    .eq("channel_id", channelId)
    .maybeSingle();

  if (!existing) {
    const details = await getChannelDetails(channelId).catch((err) => {
      console.error("channel details failed", err);
      return null;
    });
    if (!details) {
      return NextResponse.json({ error: "Could not resolve channel" }, { status: 502 });
    }

    const { error: insertErr } = await admin.from("channels").insert({
      channel_id: details.channelId,
      title: details.title,
      thumbnail_url: details.thumbnailUrl,
      uploads_playlist_id: details.uploadsPlaylistId,
    });
    if (insertErr && insertErr.code !== "23505") {
      console.error("channel cache insert failed", insertErr);
      return NextResponse.json({ error: "Could not cache channel" }, { status: 502 });
    }

    // Best effort: the channel row exists, so subscribe can proceed and the
    // next refresh backfills videos.
    try {
      const uploads = await getLatestUploads(details.uploadsPlaylistId);
      if (uploads.length) {
        const durations = await getVideoDurations(uploads.map((v) => v.videoId));
        const { error: videosErr } = await admin.from("videos").upsert(
          uploads.map((v) => ({
            channel_id: details.channelId,
            video_id: v.videoId,
            title: v.title,
            thumbnail_url: v.thumbnailUrl,
            published_at: v.publishedAt,
            duration_seconds: durations.get(v.videoId) ?? null,
          })),
          { onConflict: "channel_id,video_id" }
        );
        if (videosErr) console.error("video cache upsert failed", videosErr);
      }

      const { error: fetchedErr } = await admin
        .from("channels")
        .update({ last_fetched_at: new Date().toISOString() })
        .eq("channel_id", channelId);
      if (fetchedErr) console.error("channel timestamp update failed", fetchedErr);
    } catch (err) {
      console.error("initial channel refresh failed", err);
    }
  }

  const { data, error } = await supabase
    .from("subscriptions")
    .insert({ user_id: user.id, section_id: sectionId, channel_id: channelId })
    .select()
    .single();

  if (error) {
    // Unique constraint = already subscribed; treat as success (idempotent)
    if (error.code === "23505") return NextResponse.json({ ok: true, already: true });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ subscription: data }, { status: 201 });
}

// Unsubscribe: body = { sectionId, channelId }
export async function DELETE(request: NextRequest) {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sectionId, channelId } = await request.json();
  if (!sectionId || !channelId) {
    return NextResponse.json({ error: "sectionId and channelId are required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("section_id", sectionId)
    .eq("channel_id", channelId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// Save/update the keyword filter for one user's subscription to a channel
// under a specific section. body = { sectionId, channelId, keywords: string[] }
export async function PATCH(request: NextRequest) {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sectionId, channelId, keywords } = await request.json();
  if (!sectionId || !channelId || !Array.isArray(keywords)) {
    return NextResponse.json(
      { error: "sectionId, channelId, and keywords[] are required" },
      { status: 400 }
    );
  }

  const cleaned = keywords.map((k: string) => k.trim()).filter(Boolean);

  const { data, error } = await supabase
    .from("subscriptions")
    .update({ keywords: cleaned })
    .eq("user_id", user.id)
    .eq("section_id", sectionId)
    .eq("channel_id", channelId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ subscription: data });
}
