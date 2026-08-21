import { createServerSupabaseClient } from "./supabase/server";
import type { HackathonContent } from "@/types/db";

const ID = /^[A-Za-z0-9_-]{11}$/;

export function extractYouTubeId(input: string | null): string | null {
  if (!input) return null;
  const value = input.trim();
  if (ID.test(value)) return value;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "");

  if (host === "youtu.be") {
    const id = url.pathname.slice(1);
    return ID.test(id) ? id : null;
  }

  if (host === "youtube.com" || host === "m.youtube.com") {
    const param = url.searchParams.get("v");
    if (param && ID.test(param)) return param;
    const match = url.pathname.match(/^\/(?:embed|live|shorts)\/([A-Za-z0-9_-]{11})/);
    if (match) return match[1];
  }

  return null;
}

export async function listContents(hackathonId: string): Promise<HackathonContent[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("hackathon_contents")
    .select("*")
    .eq("hackathon_id", hackathonId)
    .order("position", { ascending: true });
  return (data as HackathonContent[] | null) ?? [];
}

export async function getContent(
  id: string,
  hackathonId: string,
): Promise<HackathonContent | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("hackathon_contents")
    .select("*")
    .eq("id", id)
    .eq("hackathon_id", hackathonId)
    .maybeSingle();
  return data as HackathonContent | null;
}