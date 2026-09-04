import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import { ALLOWED_IMAGE_HOSTS } from "./src/lib/image-hosts";

const config: NextConfig = {
  reactStrictMode: true,
  images: {
    // Edition covers carry small type; 75 smears it on retina cards.
    qualities: [75, 90],
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      ...ALLOWED_IMAGE_HOSTS.map((hostname) => ({ protocol: "https" as const, hostname })),
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
  },
  // vibe.superteam.com.br is a vanity entry point for the Vibeathon; every
  // path on it lands on the edition page.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "vibe.superteam.com.br" }],
        destination: "https://hackathon.superteam.com.br/h/vibeathon-superteam-replit",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/relay-hx9/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      { source: "/relay-hx9/:path*", destination: "https://us.i.posthog.com/:path*" },
    ];
  },
  // PostHog ingest endpoints end in a slash; the default 308 to the slashless
  // path would kill every event. Page URLs keep their canonical redirect via
  // the middleware instead.
  skipTrailingSlashRedirect: true,
};

export default withSentryConfig(config, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  // A fixed string, not `true`: under Turbopack the auto-generated route has
  // diverged between client and server builds.
  tunnelRoute: "/sentry-tunnel",
  disableLogger: true,
});
