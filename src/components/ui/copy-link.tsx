"use client";

import { useState } from "react";

/**
 * The public URL of a submitted project with a one-tap copy button.
 * "copiado!" confirms the write; the absolute URL is what gets copied so a
 * recipient anywhere can open it.
 */
export function CopyLink({ href }: { href: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(new URL(href, window.location.origin).toString());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (non-secure context, denied); nothing to do.
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="truncate text-sm font-medium text-emerald underline underline-offset-2"
      >
        {href}
      </a>
      <button
        type="button"
        onClick={copy}
        className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
          copied
            ? "bg-emerald text-surface"
            : "border border-green/25 text-muted hover:text-ink"
        }`}
      >
        {copied ? "copiado!" : "copiar"}
      </button>
    </div>
  );
}
