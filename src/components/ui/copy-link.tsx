"use client";

import { useState } from "react";

export function CopyLink({ href, label = "Copiar link" }: { href: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      const absolute = href.startsWith("http") ? href : new URL(href, window.location.origin).toString();
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked; keep the button inert rather than throwing.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-2 rounded-full border border-emerald/40 bg-emerald/10 px-6 py-3 text-sm font-semibold text-emerald transition-colors hover:bg-emerald/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
    >
      {copied ? "Link copiado" : label}
    </button>
  );
}
