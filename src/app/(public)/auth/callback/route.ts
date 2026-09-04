import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { defaultAuthRedirect, resolveAuthenticatedUserState } from "@/lib/user-state";
import { AUTH_NEXT_COOKIE, pickAuthNext } from "@/lib/auth-next";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  // `next` is the deep link threaded by requireUser and the middleware;
  // `redirect` is kept as a legacy alias for links that still carry it. The
  // cookie is what the auth form left behind in case Supabase dropped the
  // query string on its way back (allowlist miss → Site URL).
  const dest = pickAuthNext(
    url.searchParams.get("next"),
    url.searchParams.get("redirect"),
    request.cookies.get(AUTH_NEXT_COOKIE)?.value,
  );

  const redirectTo = (target: URL) => {
    const res = NextResponse.redirect(target);
    res.cookies.set(AUTH_NEXT_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  };

  const fail = (reason: string) => {
    const target = new URL("/auth", url.origin);
    target.searchParams.set("error", reason);
    if (dest) target.searchParams.set("next", dest);
    return redirectTo(target);
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

  return redirectTo(new URL(dest ?? (await defaultAuthRedirect(state)), url.origin));
}
