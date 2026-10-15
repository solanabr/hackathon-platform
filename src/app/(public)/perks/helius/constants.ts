export const HELIUS_PERK_PATH = "/perks/helius";
export const PERK = "helius" as const;

// Draft copy from the perk brief: the owner rewrites it here, nowhere else.
export const HERO = {
  kicker: "Perk Superteam × Helius",
  title: "Infra da Helius para o seu",
  highlight: "projeto na Solana",
  lead: "RPC, APIs e webhooks da Helius, a principal plataforma de desenvolvimento da Solana, sem custo para builders da comunidade Superteam Brasil.",
  cta: "Entrar para aplicar →",
} as const;

export const TIERS = [
  {
    name: "Developer",
    offer: "1 ano grátis",
    detail: "Para quem está construindo: limites maiores de RPC e as APIs avançadas da Helius.",
  },
  {
    name: "Business",
    offer: "3 meses grátis",
    detail: "Para startups em produção que precisam de mais volume e suporte de infraestrutura.",
  },
] as const;

export const HOW_IT_WORKS = [
  "Você conta sobre o projeto e como usaria a Helius.",
  "O time da Superteam Brasil analisa cada aplicação e define o plano.",
  "Quem for aprovado recebe um código de ativação para usar no painel da Helius.",
] as const;
