import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isPublicRoute } from "@/lib/routes";

/**
 * Tags the incoming request with its own URL so server components and
 * actions can reconstruct the page the user was on — used by `requireUser`
 * to send logged-out users back to their deep link after the auth round trip.
 */
function withPathHeaders(request: NextRequest, headers: Headers): Headers {
  headers.set("x-pathname", request.nextUrl.pathname);
  headers.set("x-search", request.nextUrl.search);
  return headers;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: { headers: withPathHeaders(request, new Headers(request.headers)) },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          // `request.cookies.set` writes back to the request headers, so a
          // fresh clone picks up the refreshed session alongside the path tags.
          supabaseResponse = NextResponse.next({
            request: { headers: withPathHeaders(request, new Headers(request.headers)) },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getClaims verifies the JWT locally against the project's cached JWKS
  // (asymmetric keys) — no Auth API round-trip per navigation like getUser.
  // It still refreshes an expired session through the cookie handlers above.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims ?? null;

  const path = request.nextUrl.pathname;

  if (!claims && !isPublicRoute(path)) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    url.search = "";
    url.searchParams.set("next", path + request.nextUrl.search);
    return createRedirectWithCookies(url, supabaseResponse);
  }

  return supabaseResponse;
}

function createRedirectWithCookies(url: URL, supabaseResponse: NextResponse) {
  const redirect = NextResponse.redirect(url);
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    redirect.cookies.set(cookie.name, cookie.value);
  });
  return redirect;
}
