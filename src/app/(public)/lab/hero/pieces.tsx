import type { CSSProperties, ReactNode } from "react";
import { WHATSAPP_COMMUNITY_URL } from "../../pre-registro/constants";
import { TrackedCta } from "@/components/ui/tracked-cta";
import { EventTicket } from "@/components/campaign/event-ticket";
import { MobileSteps } from "@/components/campaign/mobile-steps";
import { HalftoneImage } from "@/components/home/halftone-image";
import { PAGE_SHELL } from "@/components/layout/container";
import type { LabHeroProps } from "./catalog";

export function HeroHat({ className = "" }: { className?: string }) {
  return (
    <p
      className={`flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-ink/75 ${className}`}
    >
      <span
        aria-hidden
        className="h-[7px] w-[18px] shrink-0 rounded-[2px] bg-emerald"
      />
      Hackathon Colosseum
    </p>
  );
}

export function HeroHeadline({
  className = "",
  nowrap = true,
}: {
  className?: string;
  nowrap?: boolean;
}) {
  return (
    <h1
      className={`hero-print font-heading font-black uppercase leading-[1.02] tracking-tight text-ink [font-stretch:108%] ${nowrap ? "lg:whitespace-nowrap" : ""} ${className}`}
    >
      <span className="block" style={{ "--hero-i": 1 } as CSSProperties}>
        O próximo time
      </span>
      <span className="mt-1 block" style={{ "--hero-i": 2 } as CSSProperties}>
        a captar{" "}
        <span className="hero-marca inline-block px-3 text-green-dark">
          milhões
        </span>
      </span>
      <span className="mt-1 block" style={{ "--hero-i": 3 } as CSSProperties}>
        pode ser o seu.
      </span>
    </h1>
  );
}

export function HeroLede({ className = "" }: { className?: string }) {
  return (
    <p className={`text-pretty leading-relaxed text-ink/70 ${className}`}>
      Um hackathon online para tirar sua ideia do papel, construir um produto e
      disputar prêmios e oportunidades de investimento.
    </p>
  );
}

const PRIMARY =
  "btn-cut inline-flex items-center whitespace-nowrap bg-emerald-deep px-8 py-3.5 text-sm font-semibold text-surface transition-colors duration-(--dur-instant) ease-entrada hover:bg-green-dark sm:px-10 sm:text-base";

const SECONDARY =
  "btn-cut btn-cut-outline btn-cut-quiet inline-flex items-center px-8 py-3.5 text-sm font-semibold text-ink sm:px-9 sm:text-base sm:whitespace-nowrap";

const QUIET =
  "text-sm font-semibold text-ink/75 underline decoration-green-dark/35 underline-offset-4 transition-colors duration-(--dur-instant) ease-entrada hover:text-ink hover:decoration-green-dark";

export function HeroCtas({
  cadastroHref,
  ctaLabel,
  location,
  layout = "row",
  className = "",
}: {
  cadastroHref: string;
  ctaLabel: string;
  location: string;
  layout?: "row" | "stack" | "quiet";
  className?: string;
}) {
  const primary = (
    <TrackedCta
      href={cadastroHref}
      event="cta_clicked"
      properties={{ cta: "cadastro", location }}
      className={PRIMARY}
    >
      <span>{ctaLabel}</span>
    </TrackedCta>
  );

  if (layout === "quiet") {
    return (
      <div className={`flex flex-wrap items-center gap-x-5 gap-y-3 ${className}`}>
        {primary}
        <TrackedCta
          href={WHATSAPP_COMMUNITY_URL}
          event="campaign_link_clicked"
          properties={{ target: "whatsapp", location }}
          className={QUIET}
        >
          Entrar no grupo do WhatsApp
        </TrackedCta>
      </div>
    );
  }

  const secondary = (
    <TrackedCta
      href={WHATSAPP_COMMUNITY_URL}
      event="campaign_link_clicked"
      properties={{ target: "whatsapp", location }}
      className={SECONDARY}
    >
      <span>Entrar no grupo do WhatsApp</span>
    </TrackedCta>
  );

  return (
    <div
      className={`${
        layout === "stack"
          ? "flex flex-col items-start gap-3"
          : "flex flex-nowrap items-center gap-3"
      } ${className}`}
    >
      {primary}
      {secondary}
    </div>
  );
}

export function HeroTicket({ className = "" }: { className?: string }) {
  return (
    <div className={`hero-ticket ${className}`}>
      <EventTicket />
    </div>
  );
}

export function LabMobileHero({
  cadastroHref,
  ctaLabel,
  colosseumUrl,
}: LabHeroProps) {
  return (
    <div className={`relative ${PAGE_SHELL} py-10 lg:hidden`}>
      <div className="hero-print mb-5 flex">
        <HeroHat />
      </div>
      <HeroHeadline className="text-[clamp(1.7rem,7.7vw,3.2rem)]" nowrap={false} />
      <p className="hero-after mt-5 max-w-[19rem] text-pretty text-base leading-relaxed text-ink/70 sm:max-w-2xl sm:text-lg">
        Tire sua ideia do papel, construa um produto e dispute prêmios e
        oportunidades de investimento.
      </p>
      <HeroCtas
        cadastroHref={cadastroHref}
        ctaLabel={ctaLabel}
        location="hero_lab_mobile"
        layout="stack"
        className="hero-after mt-8"
      />
      <HeroTicket className="mt-2" />
      <MobileSteps
        whatsappUrl={WHATSAPP_COMMUNITY_URL}
        colosseumUrl={colosseumUrl}
        registered={false}
      />
    </div>
  );
}

export function HeroWarrior({
  className = "",
  mirror = false,
}: {
  className?: string;
  mirror?: boolean;
}) {
  /* A chapa olha para a direita. No lado direito do palco ela precisa virar,
     senão o olhar sai da folha. */
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute z-[1] ${className}`}
    >
      <div className={`h-full w-full ${mirror ? "[transform:scaleX(-1)]" : ""}`}>
        <HalftoneImage src="/home/legionario.webp" minWidth={1024} />
      </div>
    </div>
  );
}

export function LabStage({ children }: { children: ReactNode }) {
  return (
    <section
      data-lab-hero
      className="relative bg-surface text-ink"
    >
      {children}
    </section>
  );
}
