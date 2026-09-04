export const COLOSSEUM_SLUG = "colosseum-2026";
export const WHATSAPP_COMMUNITY_URL = "https://chat.whatsapp.com/BVXYPlcB9R853QnvgzpCRT?mode=gi_t";

export const ROLE_OPTIONS = [
  "Entusiasta Web3",
  "Desenvolvedor",
  "Designer",
  "Fundador",
  "Marketing e crescimento",
  "Estudante",
  "Outro",
] as const;
export type RoleOption = (typeof ROLE_OPTIONS)[number];
export function isRoleOption(value: string): value is RoleOption {
  return (ROLE_OPTIONS as readonly string[]).includes(value);
}
