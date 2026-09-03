"use client";

import { useEffect, useState } from "react";
import { TrackedCta } from "@/components/ui/tracked-cta";

/** Phone-only bar that slides in once the hero's own buttons scroll away, so
 * the cadastro is one tap from anywhere on the page. */
export function MobileCtaBar({ watchId }: { watchId: string }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const target = document.getElementById(watchId);
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => setShown(!entry.isIntersecting), {
      rootMargin: "-80px 0px 0px 0px",
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [watchId]);

  return (
    <div
      inert={!shown}
      className={`fixed inset-x-3 bottom-3 z-40 transition-[transform,opacity] duration-300 lg:hidden ${
        shown ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0"
      }`}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center gap-2 rounded-2xl border-2 border-green-dark bg-green-dark p-2 shadow-sticker">
        <TrackedCta
          href="/pre-registro"
          event="cta_clicked"
          properties={{ cta: "cadastro", location: "sticky" }}
          className="flex min-h-11 flex-1 items-center justify-center rounded-xl bg-yellow px-4 text-sm font-bold text-green-dark"
        >
          Fazer cadastro
        </TrackedCta>
        <a
          href="#jornada"
          className="flex min-h-11 items-center justify-center rounded-xl border-2 border-surface/30 px-4 text-sm font-bold text-surface"
        >
          Como funciona
        </a>
      </div>
    </div>
  );
}
