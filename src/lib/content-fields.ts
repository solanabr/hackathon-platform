import type { HackathonContent } from "@/types/db";

export type ContentFieldKind = "text" | "textarea" | "datetime" | "number" | "select";

export type ContentField = {
  key: keyof HackathonContent;
  label: string;
  kind: ContentFieldKind;
  help?: string;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
};

export const CONTENT_KINDS = [
  { value: "aula", label: "Aula" },
  { value: "workshop", label: "Workshop" },
  { value: "mentoria", label: "Mentoria" },
  { value: "material", label: "Material" },
  { value: "link", label: "Link" },
  { value: "evento", label: "Evento" },
];

export const KIND_LABELS: Record<string, string> = Object.fromEntries(
  CONTENT_KINDS.map((k) => [k.value, k.label]),
);

export const CONTENT_FIELDS: ContentField[] = [
  { key: "kind", label: "Tipo", kind: "select", options: CONTENT_KINDS },
  { key: "title", label: "Título", kind: "text", placeholder: "Ex.: Abertura do hackathon" },
  { key: "speaker", label: "Quem apresenta", kind: "text", placeholder: "Ex.: Draau" },
  { key: "scheduled_at", label: "Data e hora", kind: "datetime" },
  { key: "duration_minutes", label: "Duração (min)", kind: "number" },
  { key: "location", label: "Local", kind: "text", placeholder: "Online, UPF Parque..." },
  { key: "description", label: "Descrição", kind: "textarea" },
];

export type ContentDraft = {
  kind: string;
  title: string;
  speaker: string;
  scheduled_at: string;
  duration_minutes: string;
  location: string;
  description: string;
};

export function emptyDraft(): ContentDraft {
  return {
    kind: "aula",
    title: "",
    speaker: "",
    scheduled_at: "",
    duration_minutes: "",
    location: "",
    description: "",
  };
}

export function draftFrom(item: {
  kind: string;
  title: string;
  speaker: string | null;
  scheduledAtLocal: string;
  duration_minutes: number | null;
  location: string | null;
  description: string | null;
}): ContentDraft {
  return {
    kind: item.kind,
    title: item.title,
    speaker: item.speaker ?? "",
    scheduled_at: item.scheduledAtLocal,
    duration_minutes: item.duration_minutes ? String(item.duration_minutes) : "",
    location: item.location ?? "",
    description: item.description ?? "",
  };
}
