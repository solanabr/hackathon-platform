"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/avatar";
import { updateAvatar } from "@/app/(app)/account/actions";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

export function AvatarUpload({
  userId,
  currentUrl,
  name,
}: {
  userId: string;
  currentUrl: string | null;
  name: string | null;
}) {
  const supabase = createClient();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(currentUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const busy = uploading || saving;

  async function handleFile(file: File) {
    setError(null);
    if (!ALLOWED.includes(file.type)) {
      setError("Use JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Imagem muito grande (máx. 2 MB).");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${userId}/${Date.now()}.${ext}`;

    const { error: upError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (upError) {
      setUploading(false);
      setError("Falha no upload. Tente novamente.");
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setUrl(data.publicUrl);
    setUploading(false);

    startSaving(async () => {
      const result = await updateAvatar(data.publicUrl);
      if (result.error) {
        setError(result.error);
        setUrl(currentUrl);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="shrink-0">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
        className="hidden"
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        aria-label={url ? "Trocar foto de perfil" : "Adicionar foto de perfil"}
        className="group relative block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      >
        <Avatar src={url} name={name} size="lg" />
        <span
          aria-hidden
          className="absolute inset-0 flex items-center justify-center rounded-2xl bg-green-dark/75 text-xs font-bold uppercase tracking-wide text-ink opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          {busy ? "..." : "Trocar"}
        </span>
      </button>
      {error && <p className="mt-2 max-w-[9rem] text-xs text-red-700">{error}</p>}
    </div>
  );
}
