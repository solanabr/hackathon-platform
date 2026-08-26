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
  const dest = sanitizeRedirect(nextParam) ?? sanitizeRedirect(redirectParam);

  const fail = (reason: string) => {
    const target = new URL("/auth", url.origin);
    target.searchParams.set("error", reason);
    if (dest) target.searchParams.set("next", dest);
    return NextResponse.redirect(target);
  };

  // Supabase reports provider/link failures as ?error=... on the callback —
  // e.g. a magic link opened in a different browser. Swallowing it leaves a
  // blank form with no explanation.
  const providerError = url.searchParams.get("error_description") ?? url.searchParams.get("error");
  if (providerError) {
    console.error("[auth.callback] provider error:", providerError);
    return fail("provider_error");
  }

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[auth.callback] exchangeCodeForSession failed:", error.message);
      return fail("link_invalid");
    }
  }

  const state = await resolveAuthenticatedUserState();
  if (!state) return fail("auth_failed");

  return NextResponse.redirect(new URL(dest ?? state.redirectPath, url.origin));
}
