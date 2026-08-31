"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { updateProfile } from "@/app/(app)/account/actions";
import type { User } from "@/types/db";

export function ProfileForm({
  profile,
  next,
  onSaved,
  onCancel,
}: {
  profile: User | null;
  next?: string;
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    async (prev: { error?: string }, formData: FormData) => {
      const result = await updateProfile(prev, formData);
      if (!result.error) onSaved?.();
      return result;
    },
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <div>
        <Label htmlFor="full_name">Nome completo</Label>
        <Input id="full_name" name="full_name" required defaultValue={profile?.full_name ?? ""} />
      </div>
      <div>
        <Label htmlFor="headline">Título</Label>
        <Input
          id="headline"
          name="headline"
          maxLength={80}
          placeholder="Ex.: Desenvolvedor backend, estudante de ADS"
          defaultValue={profile?.headline ?? ""}
        />
      </div>
      <div>
        <Label htmlFor="bio">Bio</Label>
        <textarea
          id="bio"
          name="bio"
          rows={3}
          maxLength={400}
          placeholder="Em uma ou duas frases: o que você faz e o que quer construir."
          defaultValue={profile?.bio ?? ""}
          className="mt-1.5 w-full rounded-xl border border-green-dark/15 bg-surface-raised px-4 py-3 text-sm leading-relaxed outline-none transition-colors placeholder:text-muted/60 focus:border-emerald focus-visible:ring-2 focus-visible:ring-emerald/30"
        />
      </div>
      <div>
        <Label htmlFor="github_url">GitHub</Label>
        <Input id="github_url" name="github_url" defaultValue={profile?.github_url ?? ""} />
      </div>
      <div>
        <Label htmlFor="twitter_url">X / Twitter</Label>
        <Input id="twitter_url" name="twitter_url" defaultValue={profile?.twitter_url ?? ""} />
      </div>
      <div>
        <Label htmlFor="linkedin_url">LinkedIn</Label>
        <Input id="linkedin_url" name="linkedin_url" defaultValue={profile?.linkedin_url ?? ""} />
      </div>
      <div>
        <Label htmlFor="telegram_handle">Telegram</Label>
        <Input id="telegram_handle" name="telegram_handle" defaultValue={profile?.telegram_handle ?? ""} />
      </div>
      <div>
        <Label htmlFor="whatsapp">WhatsApp</Label>
        <Input
          id="whatsapp"
          name="whatsapp"
          type="tel"
          placeholder="+55 (11) 91234-5678"
          defaultValue={profile?.whatsapp ?? ""}
        />
      </div>

      {state.error && (
        <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-700">
          {state.error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar"}
        </Button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-sm font-semibold text-muted underline-offset-4 hover:text-ink hover:underline"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
