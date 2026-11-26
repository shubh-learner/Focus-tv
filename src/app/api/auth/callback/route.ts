import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (code) {
    const supabase = createServerSupabase();
    await supabase.auth.exchangeCodeForSession(code);
  }

  const isTv = request.cookies.get("tv_oauth")?.value === "1";
  const response = NextResponse.redirect(new URL(isTv ? "/tv" : "/", request.url));
  if (isTv) response.cookies.delete("tv_oauth");
  return response;
}
