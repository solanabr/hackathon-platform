"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type Props = {
  teamId: string;
  currentPath: string | null;
  currentUrl: string | null;
  disabled: boolean;
  onUploaded: (path: string, url: string) => void;
};

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

export function ImageUpload({ teamId, currentPath, currentUrl, disabled, onUploaded }: Props) {
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl);

  async function handleFile(file: File) {
    setError(null);
    if (!ALLOWED.includes(file.type)) {
      setError("Use JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Imagem muito grande (máx. 5 MB).");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const filename = `${Date.now()}.${ext}`;
    const path = `${teamId}/${filename}`;

    const { error: upError } = await supabase.storage
      .from("project-images")
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (upError) {
      setUploading(false);
      setError("Falha no upload. Tente novamente.");
      return;
    }

    // Don't delete the previous image here - if the user closes the tab before
    // saving, the DB would point at a deleted file. Orphans can be GC'd later.

    const { data } = supabase.storage.from("project-images").getPublicUrl(path);
    setPreviewUrl(data.publicUrl);
    setUploading(false);
    onUploaded(path, data.publicUrl);
  }

  return (
    <div className="space-y-3">
      {previewUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt="Capa do projeto"
          className="h-40 w-40 rounded-xl border border-green/15 object-cover"
        />
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={disabled || uploading}
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
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? "Enviando..." : previewUrl ? "Trocar imagem" : "Selecionar imagem"}
      </Button>
      {error && <p className="text-sm text-red-300">{error}</p>}
    </div>
  );
}
