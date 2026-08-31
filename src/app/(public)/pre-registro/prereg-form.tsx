"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { preRegister } from "./actions";
import type { User } from "@/types/db";

export function PreregForm({ profile }: { profile: User | null }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    async (prev: { ok: true } | { ok: false; error: string }, formData: FormData) => {
      const result = await preRegister(prev, formData);
      if (result.ok) router.refresh();
      return result;
    },
    { ok: false, error: "" },
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="full_name">Nome completo</Label>
        <Input id="full_name" name="full_name" required defaultValue={profile?.full_name ?? ""} />
      </div>
      <div>
        <Label htmlFor="whatsapp">WhatsApp</Label>
        <Input
          id="whatsapp"
          name="whatsapp"
          type="tel"
          required
          placeholder="+55 (11) 91234-5678"
          defaultValue={profile?.whatsapp ?? ""}
        />
      </div>

      <label className="flex items-start gap-3 text-sm leading-relaxed text-muted">
        <input
          type="checkbox"
          name="terms_accepted"
          required
          className="mt-1 h-4 w-4 rounded border-green-dark/30 text-emerald focus:ring-emerald/30"
        />
        <span>
          Li e aceito os{" "}
          <a href="/termos" target="_blank" className="font-semibold text-ink underline underline-offset-4">
            Termos de Uso
          </a>{" "}
          e a{" "}
          <a href="/privacidade" target="_blank" className="font-semibold text-ink underline underline-offset-4">
            Política de Privacidade
          </a>
          .
        </span>
      </label>

      {!state.ok && state.error && (
        <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-700">
          {state.error}
        </p>
      )}

      <Button type="submit" fullWidth disabled={pending}>
        {pending ? "Enviando..." : "Concluir pré-cadastro"}
      </Button>
    </form>
  );
}
