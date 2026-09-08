export const COLOSSEUM_SLUG = "colosseum-2026";
// The hackathon registration inside Colosseum, past the account sign-up.
// Logged-out visitors get bounced to /signup without our referral, so it is
// the second link, for people who already have an account.
export const COLOSSEUM_ARENA_URL = "https://colosseum.com/arena/hackathon";
export const WHATSAPP_COMMUNITY_URL = "https://chat.whatsapp.com/BVXYPlcB9R853QnvgzpCRT?mode=gi_t";

export const ROLE_OPTIONS = [
  "Desenvolvedor(a)",
  "Designer",
  "Produto e negócios",
  "Marketing e growth",
  "Estudante",
  "Outro",
] as const;
export type RoleOption = (typeof ROLE_OPTIONS)[number];

// Headlines written by the first version of the form; they still need to
// preselect on a re-save and still pass validation from an old open tab.
export const LEGACY_ROLE_OPTIONS = ["Entusiasta Web3", "Desenvolvedor", "Fundador", "Marketing e crescimento"] as const;

export function isRoleOption(value: string): boolean {
  return (
    (ROLE_OPTIONS as readonly string[]).includes(value) ||
    (LEGACY_ROLE_OPTIONS as readonly string[]).includes(value)
  );
}
