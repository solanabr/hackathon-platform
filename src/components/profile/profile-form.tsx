"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { updateProfile } from "@/app/(app)/account/actions";
import type { User } from "@/types/db";

export function ProfileForm({ profile, next }: { profile: User | null; next?: string }) {
  const [state, formAction, pending] = useActionState(updateProfile, {});

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
          className="mt-1.5 w-full rounded-xl border border-white/10 bg-surface-raised px-4 py-3 text-sm leading-relaxed outline-none transition-colors placeholder:text-muted/60 focus:border-emerald focus-visible:ring-2 focus-visible:ring-emerald/30"
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

      {state.error && (
        <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Salvar"}
      </Button>
    </form>
  );
}