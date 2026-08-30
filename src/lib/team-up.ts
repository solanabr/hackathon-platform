import { createServerSupabaseClient } from "./supabase/server";
import { unwrap } from "./supabase/unwrap";
import type { User } from "@/types/db";

export const TEAM_UP_ROLES = [
  { key: "frontend", label: "Frontend" },
  { key: "backend", label: "Backend" },
  { key: "fullstack", label: "Fullstack" },
  { key: "contracts", label: "Smart Contracts / Solana" },
  { key: "design", label: "Design" },
  { key: "product", label: "Produto / Negócios" },
  { key: "pitch", label: "Pitch / Vídeo" },
  { key: "data", label: "Dados / IA" },
] as const;

export type TeamUpRoleKey = (typeof TEAM_UP_ROLES)[number]["key"];

const ROLE_KEYS = new Set<string>(TEAM_UP_ROLES.map((r) => r.key));
const LABELS = new Map<string, string>(TEAM_UP_ROLES.map((r) => [r.key, r.label]));

export function roleLabel(key: string): string {
  return LABELS.get(key) ?? key;
}

export function sanitizeRoles(input: unknown): TeamUpRoleKey[] | null {
  if (!Array.isArray(input)) return null;
  const unique = [...new Set(input)];
  if (unique.length < 1 || unique.length > 6) return null;
  if (!unique.every((r) => typeof r === "string" && ROLE_KEYS.has(r))) return null;
  return unique as TeamUpRoleKey[];
}

/**
 * Going "available" publishes the profile to every registered participant, so
 * the card must have a name, a line of context, and a way to reach the person.
 */
export function isProfileCompleteForTeamUp(
  profile: Pick<User, "full_name" | "headline" | "telegram_handle"> | null,
): boolean {
  return Boolean(
    profile?.full_name?.trim() &&
      profile.headline?.trim() &&
      profile.telegram_handle?.trim(),
  );
}

export type BoardTeam = {
  team_id: string;
  name: string;
  description: string | null;
  roles: string[];
  note: string | null;
  accepted_count: number;
  leader_id: string;
  leader_name: string | null;
  leader_avatar_url: string | null;
};

export type BoardSeeker = {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  headline: string | null;
  roles: string[];
  note: string | null;
  github_url: string | null;
  twitter_url: string | null;
  linkedin_url: string | null;
  telegram_handle: string | null;
};

export type TeamUpBoard = { teams: BoardTeam[]; seekers: BoardSeeker[] };

export async function getTeamUpBoard(hackathonId: string): Promise<TeamUpBoard> {
  const supabase = await createServerSupabaseClient();
  const data = unwrap(
    await supabase.rpc("team_up_board", { p_hackathon_id: hackathonId }),
    "teamUp.board",
  );
  const board = data as TeamUpBoard | null;
  return { teams: board?.teams ?? [], seekers: board?.seekers ?? [] };
}
