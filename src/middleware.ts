import { updateSession } from "@/lib/supabase/middleware";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // sentry-tunnel must stay excluded: under Turbopack the SDK does not skip
    // the tunnel route by itself, and auth middleware would eat the POSTs.
    "/((?!_next/static|_next/image|favicon.ico|brand/|sentry-tunnel|opengraph-image|twitter-image|icon|apple-icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
