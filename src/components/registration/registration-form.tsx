"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { registerForHackathon } from "@/app/(app)/h/[slug]/register/actions";

export function RegistrationForm({
  hackathonId,
  slug,
  lumaUrl,
}: {
  hackathonId: string;
  slug: string;
  lumaUrl: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          const result = await registerForHackathon(hackathonId, slug, formData);
          if (result.error) setError(result.error);
          else router.push(`/h/${slug}/dashboard`);
        })
      }
      className="space-y-5"
    >
      <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-surface-raised p-4">
        <input type="checkbox" name="luma_confirmed" className="mt-0.5 h-4 w-4 accent-emerald" />
        <span className="text-sm text-ink">
          Confirmo que me inscrevi no evento pelo Luma
          {lumaUrl && (
            <>
              {" — "}
              <a
                href={lumaUrl}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-emerald underline-offset-2 hover:underline"
              >
                abrir o Luma
              </a>
            </>
          )}
          .
        </span>
      </label>

      <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-surface-raised p-4">
        <input type="checkbox" name="terms_accepted" className="mt-0.5 h-4 w-4 accent-emerald" />
        <span className="text-sm text-ink">Li e aceito as regras do hackathon.</span>
      </label>

      {error && <p className="text-sm font-medium text-red-300">{error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Confirmando..." : "Confirmar inscrição"}
      </Button>
    </form>
  );
}