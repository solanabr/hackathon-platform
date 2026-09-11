"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";
import { updateGtmConsent } from "@/components/analytics/google-tag-manager";
import { CONSENT_KEY, parseConsent, writeConsentCookie, type ConsentValue } from "@/lib/consent";

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
 * denied; "Aceitar" opts both in, "Só o essencial" keeps them out. The
 * choice is mirrored into a cookie so server-side capture can honour it.
 * Auth/session cookies are essential and don't gate on this.
 */
export function CookieBanner() {
  // Server snapshot "server" keeps the banner out of SSR/hydration; the
  // client snapshot decides on first client render without an effect.
  const stored = useSyncExternalStore(subscribe, readConsent, () => "server");
  const [dismissed, setDismissed] = useState(false);
  const pathname = usePathname();

  // Choices made before the cookie existed live only in localStorage; mirror
  // them so server-side capture honours them without asking again.
  useEffect(() => {
    const value = parseConsent(stored);
    if (value) writeConsentCookie(value);
  }, [stored]);

  function choose(value: ConsentValue) {
    try {
      localStorage.setItem(CONSENT_KEY, value);
    } catch {
      // Choice won't persist, but still applies to this session.
    }
    writeConsentCookie(value);
    if (posthog.__loaded) {
      if (value === "all") posthog.opt_in_capturing();
      else posthog.opt_out_capturing();
    }
    updateGtmConsent(value === "all" ? "granted" : "denied");
    setDismissed(true);
  }

  if (dismissed || stored !== null) return null;

  // On phones the banner docks at the bottom so it never covers the hero
  // headline; /auth is the exception because that's where its e-mail field
  // and button sit, and on / it clears the sound toggle in the corner.
  const placement = pathname?.startsWith("/auth")
    ? "top-[5.75rem]"
    : pathname === "/"
      ? "bottom-[4.25rem]"
      : "bottom-3";
  return (
    <div className={`fixed inset-x-3 z-50 sm:inset-x-auto sm:bottom-[4.75rem] sm:left-5 sm:top-auto sm:max-w-sm ${placement}`}>
      <div className="rounded-2xl border-2 border-green-dark bg-surface-raised p-3 shadow-sticker sm:p-4">
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
            className="btn-cut inline-flex min-h-11 flex-1 items-center justify-center bg-emerald px-4 py-2 text-sm font-semibold text-surface transition-colors duration-(--dur-instant) ease-entrada hover:bg-emerald-deep sm:flex-none sm:px-6"
          >
            <span>Aceitar</span>
          </button>
          <button
            type="button"
            onClick={() => choose("essential")}
            className="btn-cut btn-cut-outline inline-flex min-h-11 flex-1 items-center justify-center px-4 py-2 text-sm font-semibold text-ink transition-colors duration-(--dur-instant) ease-entrada hover:text-surface sm:flex-none sm:px-6 [--btn-cut-fill:var(--color-surface-raised)]"
          >
            <span>Só o essencial</span>
          </button>
        </div>
      </div>
    </div>
  );
}
