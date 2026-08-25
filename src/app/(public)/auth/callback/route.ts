import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveAuthenticatedUserState } from "@/lib/user-state";
import { sanitizeRedirect } from "@/lib/security";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  // `next` is the deep link threaded by requireUser and the middleware;
  // `redirect` is kept as a legacy alias for links that still carry it.
  const nextParam = url.searchParams.get("next");
  const redirectParam = url.searchParams.get("redirect");

  if (code) {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  const state = await resolveAuthenticatedUserState();
  if (!state) {
    return NextResponse.redirect(new URL("/auth?error=auth_failed", url.origin));
  }

  const dest = sanitizeRedirect(nextParam) ?? sanitizeRedirect(redirectParam) ?? state.redirectPath;
  return NextResponse.redirect(new URL(dest, url.origin));
}
