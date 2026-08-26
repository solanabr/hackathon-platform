// Legacy rows carry a kind; new items are all "material" and the label only
// shows where old data still has one.
export const KIND_LABELS: Record<string, string> = {
  aula: "Aula",
  workshop: "Workshop",
  mentoria: "Mentoria",
  material: "Material",
  link: "Link",
  evento: "Evento",
};

export type AttachmentType = "video" | "file" | "link";

/** Uploaded files land in the hackathon-files bucket; anything else in
 *  external_url is a plain link the organizer pasted. */
export function isUploadedFileUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.hostname.endsWith(".supabase.co") && u.pathname.includes("/hackathon-files/");
  } catch {
    return false;
  }
}

export function attachmentTypeOf(row: {
  youtube_id?: string | null;
  youtubeId?: string | null;
  external_url?: string | null;
  fileUrl?: string | null;
}): AttachmentType | null {
  const youtube = row.youtube_id ?? row.youtubeId ?? null;
  const external = row.external_url ?? row.fileUrl ?? null;
  if (youtube) return "video";
  if (external) return isUploadedFileUrl(external) ? "file" : "link";
  return null;
}

export type ContentDraft = {
  title: string;
  description: string;
};

export function emptyDraft(): ContentDraft {
  return { title: "", description: "" };
}

export function draftFrom(item: { title: string; description: string | null }): ContentDraft {
  return { title: item.title, description: item.description ?? "" };
}
