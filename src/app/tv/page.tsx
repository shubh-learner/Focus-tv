import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { getUserFeed } from "@/lib/feed";
import TvDashboard from "@/components/tv/TvDashboard";

export default async function TvPage() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/tv/login");

  const feed = await getUserFeed(supabase);
  return <TvDashboard email={user.email ?? ""} initialFeed={feed} />;
}
