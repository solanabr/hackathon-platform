"use client";

import { useEffect, useRef } from "react";
import { TrackedCta } from "@/components/ui/tracked-cta";
import { trackClient } from "@/lib/analytics-browser";

type Step = {
  title: string;
  body: string;
  // Step 1 carries no link: the hero's own CTA sits right above this list and
  // goes to the same place.
  cta?: { label: string; href: string; event: string; properties: Record<string, unknown> };
};

/** Phone-only digest of the jornada, placed right under the hero CTA so the
 * three steps land on the first screen instead of below the cheque. Hidden
 * from lg up (display:none keeps the observer silent on desktop). */
export function MobileSteps({
  whatsappUrl,
  colosseumUrl,
  registered,
}: {
  whatsappUrl: string;
  colosseumUrl: string | null;
  registered: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        trackClient("section_viewed", { section: "mobile_steps" });
        observer.disconnect();
      },
      { threshold: 0.5 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const steps: Step[] = [
    {
      title: "Crie sua conta",
      body: "Leva dois minutos. Depois mostramos como concluir a inscrição oficial na Colosseum.",
    },
    {
      title: "Conclua a inscrição oficial",
      body: "Faça sua inscrição na Colosseum. Não precisa ter ideia nem time ainda.",
      cta: {
        label: registered && colosseumUrl ? "Abrir Colosseum" : "Libera depois de criar a conta",
        href: registered && colosseumUrl ? colosseumUrl : "/pre-registro",
        event: registered && colosseumUrl ? "campaign_link_clicked" : "cta_clicked",
        properties:
          registered && colosseumUrl
            ? { target: "colosseum", location: "hero_steps" }
            : { cta: "cadastro", location: "hero_steps_colosseum" },
      },
    },
    {
      title: "Construa com a comunidade",
      body: "Workshops, mentores e suporte no WhatsApp até o envio, de 14 set a 12 out.",
      cta: {
        label: "Entrar no grupo do WhatsApp",
        href: whatsappUrl,
        event: "campaign_link_clicked",
        properties: { target: "whatsapp", location: "hero_steps" },
      },
    },
  ];

  return (
    <div ref={ref} className="mt-7 w-full max-w-md text-left lg:hidden" aria-label="Como funciona em 3 passos">
      <ol className="divide-y-2 divide-green-dark/15 rounded-2xl border-2 border-green-dark bg-surface-raised shadow-sticker">
        {steps.map((step, i) => (
          <li key={step.title} className="flex items-start gap-3 px-4 py-3.5">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-dark font-heading text-xs font-black text-yellow">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-heading text-base font-bold leading-tight text-ink">{step.title}</h3>
              <p className="mt-1 text-pretty text-[13px] leading-snug text-green-dark/70">{step.body}</p>
              {step.cta && (
                <TrackedCta
                  href={step.cta.href}
                  event={step.cta.event}
                  properties={step.cta.properties}
                  className="mt-1 inline-flex min-h-11 items-center font-mono text-[11px] font-bold uppercase tracking-widest text-emerald-deep underline decoration-2 underline-offset-4"
                >
                  {step.cta.label} →
                </TrackedCta>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
