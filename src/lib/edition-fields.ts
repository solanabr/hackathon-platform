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

export const EDITION_GROUPS = ["Identidade", "Datas", "Local e links", "Prêmios"] as const;

export const EDITION_FIELDS: EditionField[] = [
  { key: "name", label: "Nome", kind: "text", group: "Identidade" },
  { key: "slug", label: "Slug", kind: "text", group: "Identidade", help: "Muda a URL pública da edição." },
  { key: "tagline", label: "Chamada", kind: "text", group: "Identidade" },
  { key: "description", label: "Descrição", kind: "textarea", group: "Identidade" },
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

  { key: "starts_at", label: "Início", kind: "datetime", group: "Datas" },
  { key: "registration_closes_at", label: "Fim das inscrições", kind: "datetime", group: "Datas" },
  {
    key: "development_starts_at",
    label: "Início do desenvolvimento",
    kind: "datetime",
    group: "Datas",
    help: "Separa a capacitação da fase de construção na linha do tempo.",
  },
  {
    key: "submission_deadline_at",
    label: "Prazo de submissão",
    kind: "datetime",
    group: "Datas",
    help: "Depois disso o cron tranca os times.",
  },
  { key: "finalists_announced_at", label: "Anúncio dos finalistas", kind: "datetime", group: "Datas" },
  { key: "presential_at", label: "Fase presencial", kind: "datetime", group: "Datas" },
  { key: "voting_opens_at", label: "Abertura da votação", kind: "datetime", group: "Datas" },
  { key: "voting_closes_at", label: "Fim da votação", kind: "datetime", group: "Datas" },

  { key: "location_name", label: "Local", kind: "text", group: "Local e links" },
  { key: "location_city", label: "Cidade", kind: "text", group: "Local e links" },
  { key: "luma_url", label: "Luma", kind: "url", group: "Local e links" },
  { key: "community_url", label: "Comunidade", kind: "url", group: "Local e links" },
  { key: "rules_url", label: "Regulamento", kind: "url", group: "Local e links" },

  { key: "prize_summary", label: "Premiação", kind: "textarea", group: "Prêmios", help: "Separe os itens com ·" },
  {
    key: "finalists_count",
    label: "Número de finalistas",
    kind: "number",
    group: "Prêmios",
    help: "Em branco enquanto a organização não fecha o número.",
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
