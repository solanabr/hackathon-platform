"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "@phosphor-icons/react/dist/ssr";
import { trackClient } from "@/lib/analytics-browser";

export function CopyButton({ text, label, event, className }: {
  text: string; label: string;
  event?: { name: string; properties?: Record<string, unknown> };
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (event) trackClient(event.name, event.properties);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the text is selectable right beside the button.
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Copiado" : label}
      className={className ?? "btn-cut btn-cut-outline inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-ink transition-colors duration-(--dur-instant) ease-entrada hover:text-surface [--btn-cut-fill:var(--color-surface-raised)]"}
    >
      {copied ? <CheckIcon size={16} weight="bold" aria-hidden /> : <CopyIcon size={16} weight="bold" aria-hidden />}
      <span>{copied ? "Copiado" : label}</span>
    </button>
  );
}
