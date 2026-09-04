import { updateSession } from "@/lib/supabase/middleware";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // skipTrailingSlashRedirect (needed by the PostHog relay) turns off Next's
  // canonical redirect globally — restore it here for page URLs.
  const { pathname } = request.nextUrl;
  if (pathname !== "/" && pathname.endsWith("/")) {
    // A plain URL, not nextUrl.clone(): NextURL re-applies the incoming
    // trailing slash on serialize, which turns this into a redirect loop.
    // The "/" fallback matters too — a pure-slash path ("//") strips to
    // nothing, and resolving "" against the request URL loops the same way.
    const stripped = pathname.replace(/\/+$/, "") || "/";
    const url = new URL(stripped + request.nextUrl.search, request.url);
    return NextResponse.redirect(url, 308);
  }
  // Supabase sends the PKCE code to the Site URL when it rejects our
  // redirectTo (allowlist miss). Nothing on "/" exchanges it, so the visitor
  // would land on the LP logged out; hand it to the callback instead, which
  // recovers the deep link from the cookie the auth form set.
  if (pathname === "/" && request.nextUrl.searchParams.has("code")) {
    return NextResponse.redirect(new URL("/auth/callback" + request.nextUrl.search, request.url));
  }
  return updateSession(request);
}

export const config = {
  matcher: [
    // sentry-tunnel and relay-hx9 must stay excluded: analytics traffic would
    // otherwise pay a Supabase session refresh per event, and under Turbopack
    // the Sentry SDK does not skip its tunnel route by itself.
    "/((?!_next/static|_next/image|favicon.ico|brand/|sentry-tunnel|relay-hx9|opengraph-image|twitter-image|icon|apple-icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
