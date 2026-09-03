import type { Hackathon } from "@/types/db";

export type FieldKind = "text" | "textarea" | "datetime" | "number" | "url" | "select";

export type EditionField = {
  key: keyof Hackathon;
  label: string;
  kind: FieldKind;
  help?: string;
  options?: Array<{ value: string; label: string }>;
  group: string;
};

export const EDITION_GROUPS = ["Identidade", "Datas", "Submissão", "Times", "Local e links", "Prêmios"] as const;

export const EDITION_FIELDS: EditionField[] = [
  { key: "name", label: "Nome", kind: "text", group: "Identidade" },
  { key: "slug", label: "Slug", kind: "text", group: "Identidade", help: "Muda a URL pública da edição." },
  { key: "tagline", label: "Chamada", kind: "text", group: "Identidade" },
  {
    key: "description",
    label: "Descrição",
    kind: "textarea",
    group: "Identidade",
    help: "Aparece no Google e no card ao compartilhar o link da edição.",
  },
  {
    key: "status",
    label: "Status",
    kind: "select",
    group: "Identidade",
    help: "Rascunho não aparece em lugar nenhum.",
    options: [
      { value: "draft", label: "Rascunho" },
      { value: "published", label: "Publicado" },
      { value: "submissions_open", label: "Submissões abertas" },
      { value: "judging", label: "Em julgamento" },
      { value: "closed", label: "Encerrado" },
    ],
  },

  // The platform's date model ends at the announcement plus an optional end
  // (docs/EDITION-DATES.md). The retired columns (development_starts_at,
  // presential_at, voting_*) still exist and are read by code until the
  // post-event cutover — they just can't be edited anymore.
  { key: "starts_at", label: "Início", kind: "datetime", group: "Datas" },
  { key: "registration_closes_at", label: "Fim das inscrições", kind: "datetime", group: "Datas" },
  {
    key: "submission_deadline_at",
    label: "Prazo de submissão",
    kind: "datetime",
    group: "Datas",
    help: "Depois disso o cron tranca os times.",
  },
  { key: "finalists_announced_at", label: "Anúncio dos finalistas", kind: "datetime", group: "Datas" },
  {
    key: "finalists_count",
    label: "Número de finalistas",
    kind: "number",
    group: "Datas",
    help: "Em branco enquanto a organização não fecha o número.",
  },
  {
    key: "ends_at",
    label: "Encerramento",
    kind: "datetime",
    group: "Datas",
    help: "Opcional. Sem ele, a edição termina no anúncio dos finalistas.",
  },

  {
    key: "submission_mode",
    label: "Onde o projeto é enviado",
    kind: "select",
    group: "Submissão",
    help: "Externa: a inscrição fica aqui, times e submissão ficam desligados e o painel aponta para a URL abaixo.",
    options: [
      { value: "platform", label: "Na plataforma (times e submissão aqui)" },
      { value: "external", label: "Externa (Superteam Earn ou outro site)" },
    ],
  },
  {
    key: "external_submission_url",
    label: "URL de submissão externa",
    kind: "url",
    group: "Submissão",
    help: "Só usada no modo externo. Ex.: o listing no Superteam Earn.",
  },

  {
    key: "team_size_min",
    label: "Mínimo de integrantes",
    kind: "number",
    group: "Times",
  },
  {
    key: "team_size_max",
    label: "Máximo de integrantes",
    kind: "number",
    group: "Times",
    help: "Vale para times criados na plataforma; o Colosseum e outras edições externas ignoram.",
  },

  { key: "location_name", label: "Local", kind: "text", group: "Local e links" },
  { key: "location_city", label: "Cidade", kind: "text", group: "Local e links" },
  { key: "luma_url", label: "Luma", kind: "url", group: "Local e links" },
  { key: "community_url", label: "Comunidade", kind: "url", group: "Local e links" },
  { key: "rules_url", label: "Regulamento", kind: "url", group: "Local e links" },
  {
    key: "external_url",
    label: "URL externa (edição fora da plataforma; cards levam para lá)",
    kind: "url",
    group: "Local e links",
  },
  {
    key: "judge_github_handle",
    label: "GitHub dos jurados",
    kind: "text",
    group: "Local e links",
    help: "Usuário que os times adicionam como colaborador em repositório privado, sem @.",
  },
  {
    key: "prize_summary",
    label: "Prêmios (resumo)",
    kind: "text",
    group: "Local e links",
    help: "Texto curto do topo da página pública, ex.: US$ 3.000 em prêmios.",
  },

];

const OFFSET = "-03:00";

/** timestamptz -> value for <input type="datetime-local"> in São Paulo time. */
export function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  return parts.replace(" ", "T");
}

/** <input type="datetime-local"> value -> timestamptz, read as São Paulo time. */
export function fromLocalInput(value: string): string | null {
  if (!value) return null;
  return `${value}:00${OFFSET}`;
}
