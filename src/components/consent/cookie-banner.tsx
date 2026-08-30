"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import posthog from "posthog-js";

export const CONSENT_KEY = "stbr-consent";

function subscribe() {
  return () => {};
}

function readConsent(): string | null {
  try {
    return localStorage.getItem(CONSENT_KEY);
  } catch {
    // Storage blocked: no way to remember a choice, so don't nag.
    return "blocked";
  }
}

/**
 * LGPD consent for analytics. PostHog boots opted-out (see
 * instrumentation-client.ts); "Aceitar" opts it in, "Só o essencial" keeps it
 * out. Auth/session cookies are essential and don't gate on this.
 */
export function CookieBanner() {
  // Server snapshot "server" keeps the banner out of SSR/hydration; the
  // client snapshot decides on first client render without an effect.
  const stored = useSyncExternalStore(subscribe, readConsent, () => "server");
  const [dismissed, setDismissed] = useState(false);

  function choose(value: "all" | "essential") {
    try {
      localStorage.setItem(CONSENT_KEY, value);
    } catch {
      // Choice won't persist, but still applies to this session.
    }
    if (posthog.__loaded) {
      if (value === "all") posthog.opt_in_capturing();
      else posthog.opt_out_capturing();
    }
    setDismissed(true);
  }

  if (dismissed || stored !== null) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 sm:inset-x-auto sm:right-6 sm:max-w-sm">
      <div className="rounded-2xl border-2 border-green-dark bg-surface p-4 shadow-sticker">
        <p className="text-sm leading-relaxed text-ink">
          Usamos cookies essenciais para o login e, se você permitir, análise de
          uso para melhorar a plataforma.{" "}
          <Link href="/privacidade" className="font-semibold underline">
            Saiba mais
          </Link>
          .
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => choose("all")}
            className="rounded-full bg-yellow px-4 py-2 text-sm font-bold text-green-dark transition-transform duration-150 hover:-translate-y-0.5"
          >
            Aceitar
          </button>
          <button
            type="button"
            onClick={() => choose("essential")}
            className="rounded-full border-2 border-green-dark px-4 py-2 text-sm font-bold text-ink"
          >
            Só o essencial
          </button>
        </div>
      </div>
    </div>
  );
}
