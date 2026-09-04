"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { EDITION_FIELDS, EDITION_GROUPS, toLocalInput } from "@/lib/edition-fields";
import { updateEdition } from "@/app/(app)/admin/h/[slug]/actions";
import type { Hackathon } from "@/types/db";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-green/25 bg-surface-raised px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted/60 focus:border-emerald focus-visible:ring-2 focus-visible:ring-emerald/30";

export function EditionForm({ hackathon }: { hackathon: Hackathon }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    setFieldErrors({});
    setSaved(false);
    startTransition(async () => {
      const result = await updateEdition(hackathon.id, hackathon.slug, formData);
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fields ?? {});
        return;
      }
      setSaved(true);
      if (result.slug !== hackathon.slug) router.replace(`/admin/h/${result.slug}`);
      else router.refresh();
    });
  }

  return (
    <form action={onSubmit} className="space-y-6">
      {EDITION_GROUPS.map((group) => {
        // Status changes only through the lifecycle control on the overview.
        const fields = EDITION_FIELDS.filter((f) => f.group === group && f.key !== "status");
        if (fields.length === 0) return null;

        return (
          <Card sticker key={group} className="p-6 sm:p-7">
            <h2 className="font-heading text-lg font-bold">{group}</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              {fields.map((field) => {
                const value = hackathon[field.key];
                const id = `field-${String(field.key)}`;
                const wide = field.kind === "textarea";

                if (field.kind === "boolean") {
                  return (
                    <div key={String(field.key)} className="flex items-start gap-3 pt-1">
                      <input
                        id={id}
                        name={String(field.key)}
                        type="checkbox"
                        defaultChecked={Boolean(value)}
                        className="mt-1 h-4 w-4 accent-emerald"
                      />
                      <div>
                        <Label htmlFor={id}>{field.label}</Label>
                        {field.help && <p className="mt-1 text-xs text-muted">{field.help}</p>}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={String(field.key)} className={wide ? "sm:col-span-2" : ""}>
                    <Label htmlFor={id}>{field.label}</Label>

                    {field.kind === "textarea" ? (
                      <textarea
                        id={id}
                        name={String(field.key)}
                        rows={3}
                        defaultValue={(value as string | null) ?? ""}
                        className={inputClass}
                      />
                    ) : field.kind === "select" ? (
                      <select
                        id={id}
                        name={String(field.key)}
                        defaultValue={(value as string | null) ?? ""}
                        className={inputClass}
                      >
                        {field.options?.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    ) : field.kind === "datetime" ? (
                      <Input
                        id={id}
                        name={String(field.key)}
                        type="datetime-local"
                        defaultValue={toLocalInput(value as string | null)}
                      />
                    ) : (
                      <Input
                        id={id}
                        name={String(field.key)}
                        type={field.kind === "number" ? "number" : "text"}
                        inputMode={field.kind === "number" ? "numeric" : undefined}
                        spellCheck={field.kind === "url" ? false : undefined}
                        placeholder={field.kind === "url" ? "https://..." : undefined}
                        defaultValue={
                          value === null ||
                          value === undefined ||
                          (field.kind === "number" && value === 0)
                            ? ""
                            : String(value)
                        }
                      />
                    )}

                    {fieldErrors[String(field.key)] && (
                      <p className="mt-1 text-xs font-semibold text-red-700">
                        {fieldErrors[String(field.key)]}
                      </p>
                    )}
                    {field.help && <p className="mt-1 text-xs text-muted">{field.help}</p>}
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}

      {error && (
        <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
      {saved && !error && <p className="text-sm font-semibold text-emerald">Salvo.</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar edição"}
        </Button>
        <p className="text-xs text-muted">
          Datas em horário de Brasília.
        </p>
      </div>
    </form>
  );
}
