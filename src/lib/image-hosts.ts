/**
 * The one list of remote hosts next/image may load. next/image throws at
 * render time on a host outside next.config.ts remotePatterns, so anything
 * user-influenced has to pass here first and degrade gracefully otherwise.
 */
export const ALLOWED_IMAGE_HOSTS = [
  "lh3.googleusercontent.com",
  "avatars.githubusercontent.com",
  "i.ytimg.com",
] as const;

export function isAllowedImageHost(src: string | null | undefined): src is string {
  if (!src) return false;
  try {
    const { hostname } = new URL(src);
    return (
      hostname.endsWith(".supabase.co") ||
      (ALLOWED_IMAGE_HOSTS as readonly string[]).includes(hostname)
    );
  } catch {
    return false;
  }
}
