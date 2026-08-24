"use client";

import { Input, Label } from "@/components/ui/input";
import { CONTENT_FIELDS, type ContentDraft } from "@/lib/content-fields";

/** The same field set drives creating a new item and editing an existing one. */
export function ContentFieldsForm({
  draft,
  onChange,
  idPrefix,
}: {
  draft: ContentDraft;
  onChange: (next: ContentDraft) => void;
  idPrefix: string;
}) {
  const set = (key: keyof ContentDraft, value: string) => onChange({ ...draft, [key]: value });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {CONTENT_FIELDS.map((field) => {
        const id = `${idPrefix}-${String(field.key)}`;
        const value = draft[field.key as keyof ContentDraft] ?? "";
        const wide = field.kind === "textarea";

        return (
          <div key={id} className={wide ? "sm:col-span-2" : undefined}>
            <Label htmlFor={id}>{field.label}</Label>

            {field.kind === "select" ? (
              <select
                id={id}
                value={value}
                onChange={(e) => set(field.key as keyof ContentDraft, e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-green/25 bg-surface-raised px-4 py-3 text-sm outline-none transition-colors focus:border-emerald focus-visible:ring-2 focus-visible:ring-emerald/30"
              >
                {field.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : field.kind === "textarea" ? (
              <textarea
                id={id}
                rows={3}
                maxLength={2000}
                value={value}
                onChange={(e) => set(field.key as keyof ContentDraft, e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-green/25 bg-surface-raised px-4 py-3 text-sm leading-relaxed outline-none transition-colors placeholder:text-muted/60 focus:border-emerald focus-visible:ring-2 focus-visible:ring-emerald/30"
              />
            ) : (
              <Input
                id={id}
                type={
                  field.kind === "datetime" ? "datetime-local" : field.kind === "number" ? "number" : "text"
                }
                placeholder={field.placeholder}
                value={value}
                onChange={(e) => set(field.key as keyof ContentDraft, e.target.value)}
              />
            )}

            {field.help && <p className="mt-1 text-xs text-muted">{field.help}</p>}
          </div>
        );
      })}
    </div>
  );
}
