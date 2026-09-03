"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "@phosphor-icons/react/dist/ssr";

export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the code is selectable text right beside the button.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Cupom copiado" : "Copiar cupom"}
      className="inline-flex items-center gap-2 rounded-xl border-2 border-green-dark bg-yellow px-4 py-2.5 font-heading text-lg font-black tracking-wide text-green-dark transition-transform duration-150 hover:-translate-y-0.5 sm:px-5 sm:text-2xl"
    >
      <span className="select-all">{code}</span>
      {copied ? <CheckIcon size={20} weight="bold" aria-hidden /> : <CopyIcon size={20} weight="bold" aria-hidden />}
    </button>
  );
}
