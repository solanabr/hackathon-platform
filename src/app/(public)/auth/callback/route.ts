import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { resolveAuthenticatedUserState } from "@/lib/user-state";
import { sanitizeRedirect } from "@/lib/security";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const redirectParam = url.searchParams.get("redirect");

  if (code) {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  const state = await resolveAuthenticatedUserState();
  if (!state) {
    return NextResponse.redirect(new URL("/auth?error=auth_failed", url.origin));
  }

  const dest = sanitizeRedirect(redirectParam) ?? state.redirectPath;
  return NextResponse.redirect(new URL(dest, url.origin));
}
