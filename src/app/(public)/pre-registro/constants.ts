export const COLOSSEUM_SLUG = "colosseum-2026";
// The countdown on the landing page is the whole point of the closing CTA, so
// it must not vanish when the edition row fails to load. Same instant the copy
// already states: 12 Oct, 23:59 California.
export const COLOSSEUM_DEADLINE_FALLBACK = "2026-10-13T06:59:00.000Z";
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
