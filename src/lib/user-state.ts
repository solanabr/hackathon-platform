import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "./supabase/server";
import type { User } from "@/types/db";

export type AuthenticatedState = {
  userId: string;
  email: string;
  profile: User | null;
  redirectPath: string;
};

export async function resolveAuthenticatedUserState(): Promise<AuthenticatedState | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const typed = profile as User | null;
  const needsProfile = !typed?.full_name;

  return {
    userId: user.id,
    email: user.email!,
    profile: typed,
    redirectPath: needsProfile ? "/account" : "/",
  };
}

export async function requireUser() {
  const state = await resolveAuthenticatedUserState();
  if (!state) redirect("/auth");
  return state;
}
