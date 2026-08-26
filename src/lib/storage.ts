/**
 * Public storage URLs are pure string construction — building them through a
 * cookie-bound Supabase client made otherwise-cacheable pages dynamic for
 * nothing. Paths already served from /public pass through unchanged.
 */
export function publicStorageUrl(bucket: string, path: string): string {
  if (path.startsWith("/")) return path;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}
