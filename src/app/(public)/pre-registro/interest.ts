import { sanitizeText, sanitizeUrl } from "@/lib/security";

export const HAS_PROJECT_OPTIONS = [
  { value: "yes", label: "Sim" },
  { value: "idea_no_team", label: "Tenho ideia mas sem time" },
  { value: "no_want_team", label: "Não, quero entrar num time" },
] as const;
export type HasProject = (typeof HAS_PROJECT_OPTIONS)[number]["value"];

export const STAGE_OPTIONS = [
  { value: "idea", label: "Ideia" },
  { value: "prototype", label: "Protótipo" },
  { value: "mvp", label: "MVP" },
  { value: "users", label: "Com usuários" },
] as const;
export type ProjectStage = (typeof STAGE_OPTIONS)[number]["value"];

export type InterestIntent = "complete" | "later";

export type InterestField =
  | "has_project"
  | "looking_for_team"
  | "project_name"
  | "one_liner"
  | "stage"
  | "team_size"
  | "project_url"
  | "server";

export type InterestValues = {
  has_project: HasProject | null;
  looking_for_team: boolean | null;
  project_name: string | null;
  one_liner: string | null;
  stage: ProjectStage | null;
  team_size: number | null;
  project_url: string | null;
  project_socials: string | null;
  notes: string | null;
};

export type InterestFields = {
  has_project?: string | null;
  looking_for_team?: string | null;
  project_name?: string | null;
  one_liner?: string | null;
  stage?: string | null;
  team_size?: string | null;
  project_url?: string | null;
  project_socials?: string | null;
  notes?: string | null;
};

export type InterestValidation =
  | { ok: true; values: InterestValues }
  | { ok: false; error: string; field: InterestField };

export function isHasProject(value: string | null | undefined): value is HasProject {
  return HAS_PROJECT_OPTIONS.some((o) => o.value === value);
}
export function isProjectStage(value: string | null | undefined): value is ProjectStage {
  return STAGE_OPTIONS.some((o) => o.value === value);
}

function parseTeamSize(raw: string | null | undefined): number | null | undefined {
  const text = sanitizeText(raw);
  if (!text) return null;
  const n = Number(text);
  if (!Number.isInteger(n) || n < 1 || n > 20) return undefined;
  return n;
}

function parseBoolean(raw: string | null | undefined): boolean | null {
  if (raw === "yes") return true;
  if (raw === "no") return false;
  return null;
}

/**
 * `complete` enforces the questions the campaign needs; `later` keeps whatever
 * is filled, only refusing values the table itself would refuse (an unusable
 * link is dropped, not refused). Project
 * fields are dropped unless the person said they have a project, so a
 * changed answer never leaves stale project data behind.
 */
export function validateInterest(fields: InterestFields, intent: InterestIntent): InterestValidation {
  const hasProject = isHasProject(fields.has_project) ? fields.has_project : null;
  if (fields.has_project && !hasProject) {
    return { ok: false, error: "Escolha uma opção válida.", field: "has_project" };
  }
  const lookingForTeam = parseBoolean(fields.looking_for_team);
  const stage = isProjectStage(fields.stage) ? fields.stage : null;
  if (fields.stage && !stage) {
    return { ok: false, error: "Escolha um estágio válido.", field: "stage" };
  }
  const teamSize = parseTeamSize(fields.team_size);
  if (teamSize === undefined) {
    return { ok: false, error: "Informe um tamanho de time entre 1 e 20.", field: "team_size" };
  }
  const rawUrl = sanitizeText(fields.project_url, 500);
  const projectUrl = sanitizeUrl(rawUrl);
  // A half-written link must not block parking the form; it only has to be a
  // real URL by the time the person says they are done.
  if (rawUrl && !projectUrl && intent === "complete") {
    return { ok: false, error: "Informe um link válido (site ou repositório).", field: "project_url" };
  }

  const projectName = sanitizeText(fields.project_name, 120);
  const oneLiner = sanitizeText(fields.one_liner, 280);

  if (intent === "complete") {
    if (!hasProject) {
      return { ok: false, error: "Conte se você já tem projeto para esse hackathon.", field: "has_project" };
    }
    if (lookingForTeam === null) {
      return { ok: false, error: "Conte se você está procurando time ou membros.", field: "looking_for_team" };
    }
    if (hasProject === "yes") {
      if (!projectName) return { ok: false, error: "Informe o nome do projeto.", field: "project_name" };
      if (!oneLiner) return { ok: false, error: "Descreva o projeto em uma frase.", field: "one_liner" };
    }
  }

  const withProject = hasProject === "yes";
  return {
    ok: true,
    values: {
      has_project: hasProject,
      looking_for_team: lookingForTeam,
      project_name: withProject ? projectName : null,
      one_liner: withProject ? oneLiner : null,
      stage: withProject ? stage : null,
      team_size: withProject ? teamSize : null,
      project_url: withProject ? projectUrl : null,
      project_socials: withProject ? sanitizeText(fields.project_socials, 500) : null,
      notes: sanitizeText(fields.notes, 2000),
    },
  };
}
