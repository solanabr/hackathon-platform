import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cookie-free anon client for viewer-independent public reads that go through
 * unstable_cache — a shared cache entry must never be built from a
 * cookie-scoped client, or one viewer's session could shape data served to
 * everyone. RLS still applies, as the anon role.
 */
let client: SupabaseClient | null = null;

export function createAnonClient(): SupabaseClient {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return client;
}
