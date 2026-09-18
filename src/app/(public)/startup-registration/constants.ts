import type {
  StartupHiring,
  StartupStage,
  StartupTargetCustomers,
  StartupTechTeam,
  StartupTokenLaunch,
  StartupVertical,
  WorkType,
} from "@/types/db";

export const STARTUP_PATH = "/startup-registration";

// Draft copy: the owner rewrites it here, nowhere else.
export const HERO = {
  kicker: "Startups da Superteam Brasil",
  title: "Construa o futuro da",
  highlight: "Solana no Brasil",
  lead: "Cadastre sua startup para receber apresentações a investidores, grants, prêmios de hackathon, talentos e divulgação, e entrar na comunidade de fundadores da Superteam Brasil.",
  note: "Conte sobre sua startup em poucos minutos.",
  cta: "Começar cadastro da startup →",
  ctaEdit: "Editar cadastro",
} as const;

export const STEPS = [
  { n: 1, label: "Seus dados" },
  { n: 2, label: "Sua startup" },
  { n: 3, label: "Mais detalhes" },
] as const;
export type StartupStep = (typeof STEPS)[number]["n"];

type Option<T extends string> = { value: T; label: string };

export const WORK_TYPE_OPTIONS: readonly Option<WorkType>[] = [
  { value: "engineer", label: "Engenharia" },
  { value: "creator", label: "Criador(a) de conteúdo" },
  { value: "business", label: "Negócios" },
  { value: "investor", label: "Investidor(a)" },
  { value: "policy_law_tax", label: "Políticas/Jurídico/Tributário" },
  { value: "not_provided", label: "Prefiro não dizer" },
];

export const VERTICAL_OPTIONS: readonly Option<StartupVertical>[] = [
  { value: "stablecoins", label: "Stablecoins" },
  { value: "payments", label: "Pagamentos" },
  { value: "rwa", label: "Tokenização de RWA" },
  { value: "institutional", label: "Institucional" },
  { value: "ai", label: "IA" },
  { value: "gaming", label: "Games" },
  { value: "infra", label: "Infra" },
  { value: "dev_tooling", label: "Dev tooling" },
  { value: "depin", label: "DePIN" },
  { value: "wallets", label: "Carteiras" },
  { value: "consumer", label: "Consumer" },
  { value: "defi", label: "DeFi" },
  { value: "desci", label: "DeSci" },
  { value: "daos", label: "DAOs e network states" },
  { value: "socialfi", label: "SocialFi" },
  { value: "security", label: "Segurança" },
  { value: "creators", label: "Creators" },
  { value: "quantum", label: "Quântica" },
  { value: "biotech", label: "Biotech e saúde" },
  { value: "robotics", label: "Robótica e manufatura" },
  { value: "climate", label: "Clima e energia" },
  { value: "space", label: "Espaço" },
  { value: "hardware", label: "Hardware e IoT" },
  { value: "fintech", label: "Fintech" },
  { value: "crypto", label: "Cripto e Web3" },
  { value: "other", label: "Outro" },
];

export const STAGE_OPTIONS: readonly Option<StartupStage>[] = [
  { value: "early", label: "Desenvolvimento inicial" },
  { value: "bootstrapped", label: "Não está captando (bootstrapped)" },
  { value: "raising_preseed", label: "Captando pre-seed" },
  { value: "preseed_closed", label: "Pre-seed fechado" },
  { value: "raising_seed", label: "Captando seed" },
  { value: "seed_closed", label: "Seed fechado" },
  { value: "raising_a", label: "Captando série A" },
  { value: "a_closed", label: "Série A fechada" },
  { value: "exited", label: "Exit" },
  { value: "wound_down", label: "Encerrada" },
];

export const HIRING_OPTIONS: readonly Option<StartupHiring>[] = [
  { value: "yes", label: "Sim" },
  { value: "no", label: "Não" },
  { value: "not_sure", label: "Ainda não sei" },
];

export const TARGET_CUSTOMERS_OPTIONS: readonly Option<StartupTargetCustomers>[] = [
  { value: "b2c", label: "Pessoas (B2C)" },
  { value: "b2b", label: "Empresas (B2B)" },
  { value: "institutions", label: "Instituições" },
  { value: "government", label: "Governo" },
  { value: "other", label: "Outro" },
];

export const TOKEN_LAUNCH_OPTIONS: readonly Option<StartupTokenLaunch>[] = [
  { value: "live", label: "Já lançamos" },
  { value: "future", label: "Vamos lançar" },
  { value: "no", label: "Não vamos lançar" },
  { value: "not_sure", label: "Ainda não sei" },
];

export const TECH_TEAM_OPTIONS: readonly Option<StartupTechTeam>[] = [
  { value: "in_house", label: "Time interno" },
  { value: "out_house", label: "Terceirizado" },
  { value: "mixed_with_cto", label: "Misto, com CTO" },
  { value: "mixed_without_cto", label: "Misto, sem CTO" },
  { value: "none", label: "Ainda não temos" },
];

export function labelOf<T extends string>(options: readonly Option<T>[], value: string | null | undefined): string | null {
  return options.find((o) => o.value === value)?.label ?? null;
}
