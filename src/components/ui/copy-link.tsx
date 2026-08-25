"use client";

import { useState } from "react";

/**
 * The public URL of a submitted project with a one-tap copy button.
 * "copiado!" confirms the write; the absolute URL is what gets copied so a
 * recipient anywhere can open it. When the Clipboard API is unavailable — a
 * non-secure context such as the venue's plain-LAN origin — the copy falls
 * back to a hidden textarea + execCommand, and a visible error replaces the
 * button label if even that fails.
 */
export function CopyLink({ href }: { href: string }) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");

  function flash(next: "copied" | "error") {
    setState(next);
    window.setTimeout(() => setState("idle"), 2000);
  }

  function copyWithTextarea(text: string): boolean {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    textarea.remove();
    return ok;
  }

  async function copy() {
    const url = new URL(href, window.location.origin).toString();
    let ok = false;
    try {
      await navigator.clipboard.writeText(url);
      ok = true;
    } catch {
      // Clipboard API missing (non-secure context) or rejected; try the
      // legacy path while the click is still a user gesture.
      ok = copyWithTextarea(url);
    }
    flash(ok ? "copied" : "error");
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
          state === "copied"
            ? "bg-emerald text-surface"
            : state === "error"
              ? "border border-red-500/40 text-red-700"
              : "border border-green/25 text-muted hover:text-ink"
        }`}
      >
        {state === "copied"
          ? "copiado!"
          : state === "error"
            ? "Não foi possível copiar"
            : "copiar"}
      </button>
    </div>
  );
}
