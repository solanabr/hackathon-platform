"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { updateProfile } from "@/app/(app)/conta/actions";
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