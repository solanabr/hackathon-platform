export const COLOSSEUM_SLUG = "colosseum-2026";
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
