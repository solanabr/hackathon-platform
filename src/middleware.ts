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
