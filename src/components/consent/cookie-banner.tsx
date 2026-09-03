"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import posthog from "posthog-js";
import { updateGtmConsent } from "@/components/analytics/google-tag-manager";

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
 * instrumentation-client.ts) and Google Tag Manager boots with consent
 * denied; "Aceitar" opts both in, "Só o essencial" keeps them out.
 * Auth/session cookies are essential and don't gate on this.
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
    updateGtmConsent(value === "all" ? "granted" : "denied");
    setDismissed(true);
  }

  if (dismissed || stored !== null) return null;

  // On phones the bottom of the viewport is where the auth form's e-mail
  // field and button sit, so the banner docks under the header instead.
  return (
    <div className="fixed inset-x-3 top-[5.75rem] z-50 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:top-auto sm:max-w-sm">
      <div className="rounded-2xl border-2 border-green-dark bg-surface p-3 shadow-sticker sm:p-4">
        <p className="text-[13px] leading-snug text-ink sm:text-sm sm:leading-relaxed">
          Cookies essenciais pro login e, se você permitir, análise de uso.{" "}
          <Link href="/privacidade" className="font-semibold underline">
            Saiba mais
          </Link>
          .
        </p>
        <div className="mt-2.5 flex gap-2 sm:mt-3">
          <button
            type="button"
            onClick={() => choose("all")}
            className="min-h-11 flex-1 rounded-full bg-yellow px-4 py-2 text-sm font-bold text-green-dark transition-transform duration-150 hover:-translate-y-0.5 sm:flex-none"
          >
            Aceitar
          </button>
          <button
            type="button"
            onClick={() => choose("essential")}
            className="min-h-11 flex-1 rounded-full border-2 border-green-dark px-4 py-2 text-sm font-bold text-ink sm:flex-none"
          >
            Só o essencial
          </button>
        </div>
      </div>
    </div>
  );
}
