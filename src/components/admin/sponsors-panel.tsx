"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  uploadSponsor,
  deleteSponsor,
  moveSponsor,
} from "@/app/(app)/admin/h/[slug]/sponsors/actions";
import type { SponsorLogo } from "@/lib/sponsors";
import type { SponsorTier } from "@/types/db";

export function SponsorTierPanel({
  slug,
  tier,
  title,
  hint,
  sponsors,
}: {
  slug: string;
  tier: SponsorTier;
  title: string;
  hint: string;
  sponsors: SponsorLogo[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }

  function onPick(file: File) {
    const formData = new FormData();
    formData.set("logo", file);
    formData.set("name", name);
    formData.set("url", url);
    run(() => uploadSponsor({ slug, tier, formData }));
    setName("");
    setUrl("");
  }

  return (
    <div>
      <h2 className="font-heading text-lg font-bold">{title}</h2>
      <p className="mt-1 text-sm text-muted">{hint}</p>

      {sponsors.length === 0 ? (
        <p className="mt-5 font-mono text-sm text-muted">Nenhum logo ainda.</p>
      ) : (
        <ul className="mt-5 space-y-2">
          {sponsors.map((s, i) => (
            <li
              key={s.id}
              className="flex items-center gap-4 rounded-xl border-2 border-green-dark/15 bg-surface-deep px-4 py-3"
            >
              <span className="flex h-12 w-32 shrink-0 items-center justify-center rounded-lg bg-green-dark px-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.src} alt={s.name ?? ""} className="max-h-8 w-auto max-w-full" />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {s.name || <span className="text-muted">Sem nome</span>}
              </span>
              <span className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  aria-label="Mover para cima"
                  disabled={pending || i === 0}
                  onClick={() =>
                    run(() => moveSponsor({ slug, sponsorId: s.id, direction: "up" }))
                  }
                  className="rounded-lg border border-green-dark/20 px-2 py-1 font-mono text-xs disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label="Mover para baixo"
                  disabled={pending || i === sponsors.length - 1}
                  onClick={() =>
                    run(() => moveSponsor({ slug, sponsorId: s.id, direction: "down" }))
                  }
                  className="rounded-lg border border-green-dark/20 px-2 py-1 font-mono text-xs disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (confirming === s.id) {
                      setConfirming(null);
                      run(() => deleteSponsor({ slug, sponsorId: s.id }));
                    } else {
                      setConfirming(s.id);
                    }
                  }}
                  className={`ml-1 rounded-lg border px-2.5 py-1 font-mono text-xs font-semibold ${
                    confirming === s.id
                      ? "border-red-700/40 bg-red-700/10 text-red-700"
                      : "border-green-dark/20 text-muted"
                  }`}
                >
                  {confirming === s.id ? "Confirmar?" : "Remover"}
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 flex flex-wrap items-end gap-3">
        <label className="flex-1 basis-40">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-muted">
            Nome
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Solana"
            className="mt-1 w-full rounded-xl border border-green-dark/15 bg-surface px-3 py-2 text-sm"
          />
        </label>
        <label className="flex-1 basis-52">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-widest text-muted">
            Link (opcional)
          </span>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="mt-1 w-full rounded-xl border border-green-dark/15 bg-surface px-3 py-2 text-sm"
          />
        </label>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onPick(file);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
          className="px-5 py-2 text-sm"
        >
          {pending ? "Enviando..." : "Adicionar logo"}
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted">
        PNG, JPG ou WebP até 5 MB. Prefira a versão clara do logo — o fundo é escuro.
      </p>
      {error && <p className="mt-2 text-sm font-semibold text-red-700">{error}</p>}
    </div>
  );
}
