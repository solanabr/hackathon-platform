"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { uploadEditionCover } from "@/app/(app)/admin/h/[slug]/actions";

export function CoverUpload({ hackathonId, slug }: { hackathonId: string; slug: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onPick(file: File) {
    setError(null);
    const formData = new FormData();
    formData.set("cover", file);
    startTransition(async () => {
      const result = await uploadEditionCover(hackathonId, slug, formData);
      if (result.ok) router.refresh();
      else setError(result.error);
    });
  }

  return (
    <div>
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
        {pending ? "Enviando..." : "Trocar imagem"}
      </Button>
      <p className="mt-2 text-xs text-muted">JPG, PNG ou WebP, até 10 MB.</p>
      {error && <p className="mt-2 text-sm font-semibold text-red-700">{error}</p>}
    </div>
  );
}
