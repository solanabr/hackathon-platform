"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

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
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(currentUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  }

  return (
    <div className="flex items-center gap-4">
      <input type="hidden" name="avatar_url" value={url ?? ""} />
      <Avatar src={url} name={name} size="lg" />
      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = "";
          }}
          className="hidden"
        />
        <Button
          type="button"
          variant="secondary"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="px-5 py-2 text-sm"
        >
          {uploading ? "Enviando..." : url ? "Trocar foto" : "Adicionar foto"}
        </Button>
        <p className="mt-2 text-xs text-muted">JPG, PNG ou WEBP, até 2 MB.</p>
        {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      </div>
    </div>
  );
}
