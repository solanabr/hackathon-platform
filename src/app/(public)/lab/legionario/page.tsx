import type { CSSProperties, ReactNode } from "react";
import {
  COLOSSEUM_SLUG,
  WHATSAPP_COMMUNITY_URL,
} from "../../pre-registro/constants";
import { getHackathonBySlug } from "@/lib/hackathon";
import { resolveAuthenticatedUserState } from "@/lib/user-state";
import { TrackedCta } from "@/components/ui/tracked-cta";
import { ColosseumScene } from "@/components/home/colosseum";
import { ColosseumBackdrop } from "@/components/home/colosseum-backdrop";
import { HalftoneImage } from "@/components/home/halftone-image";
import { MobileSteps } from "@/components/campaign/mobile-steps";
import { EventTicket } from "@/components/campaign/event-ticket";
import { PAGE_SHELL } from "@/components/layout/container";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Legionário (preview)",
  robots: { index: false, follow: false },
};

function SectionHat({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-ink/75">
      <span
        aria-hidden
        className="h-[7px] w-[18px] shrink-0 rounded-[2px] bg-emerald"
      />
      {children}
    </p>
  );
}

export default async function LegionaryPreview() {
  const [colosseum, state] = await Promise.all([
    getHackathonBySlug(COLOSSEUM_SLUG).catch(() => null),
    resolveAuthenticatedUserState().catch(() => null),
  ]);

  const cadastroHref = state ? "/pre-registro" : "/auth?next=/pre-registro";
  const ctaLabel = state ? "Continuar meu cadastro" : "Criar conta";

  return (
    <div className="bg-surface text-ink">
      {/* Laboratório: o hero da LP intacto — Coliseu no canto inferior
          esquerdo, sangrando pela margem — e o legionário entrando pela
          direita, atrás do ticket. Duas peças da mesma prensa: mesma célula de
          meio-tom, mesma tinta, mesmo vaivém de câmera. */}
      <section className="relative flex min-h-[calc(100dvh-4rem)] flex-col justify-center overflow-hidden lg:justify-start">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 lg:bottom-auto lg:h-[calc(100dvh-4rem)]"
        >
          <div className="absolute inset-x-0 bottom-0 h-[48%] sm:h-[62%] lg:right-auto lg:bottom-[-12%] lg:left-[-10%] lg:h-[70%] lg:w-[72%]">
            <ColosseumScene backdrop={<ColosseumBackdrop className="h-full w-full" />} />
          </div>

          <div className="absolute right-[1%] bottom-0 hidden h-[88%] w-[32%] lg:block">
            <HalftoneImage src="/home/legionario.webp" />
          </div>
        </div>

        <div
          className={`relative ${PAGE_SHELL} py-10 lg:flex lg:min-h-[calc(100dvh-4rem)] lg:flex-col lg:[--hero-pt:9vh] lg:[--hero-pb:2.5rem] lg:pb-[var(--hero-pb)] lg:pt-[var(--hero-pt)] lg:[@media(max-height:860px)]:[--hero-pt:3vh] lg:[@media(max-height:860px)]:[--hero-pb:1.5rem]`}
        >
          <div className="lg:mx-auto lg:my-auto lg:w-full lg:max-w-4xl lg:text-center">
            <div className="hero-print mb-5 flex lg:justify-center">
              <SectionHat>Hackathon Colosseum</SectionHat>
            </div>

            <h1 className="hero-print font-heading text-[clamp(1.7rem,7.7vw,3.2rem)] font-black uppercase leading-[1.02] tracking-tight text-ink [font-stretch:108%] lg:whitespace-nowrap lg:text-[clamp(3rem,4.6vw,4.8rem)]">
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

            <p className="hero-after mt-5 max-w-[19rem] text-pretty text-base leading-relaxed text-ink/70 sm:max-w-2xl sm:text-lg lg:hidden">
              Tire sua ideia do papel, construa um produto e dispute prêmios e
              oportunidades de investimento.
            </p>
            <p className="hero-after mt-6 hidden max-w-xl text-pretty text-base leading-relaxed text-ink/70 sm:text-lg lg:mx-auto lg:block lg:max-w-2xl">
              Um hackathon online para tirar sua ideia do papel, construir um
              produto e disputar prêmios e oportunidades de investimento.
            </p>

            <div
              id="hero-cta"
              className="hero-after mt-8 flex flex-wrap items-center gap-3 lg:justify-center"
              style={{ "--hero-i": 1 } as CSSProperties}
            >
              <TrackedCta
                href={cadastroHref}
                event="cta_clicked"
                properties={{ cta: "cadastro", location: "lab_legionario" }}
                className="btn-cut inline-flex items-center whitespace-nowrap bg-emerald-deep px-8 py-3.5 text-sm font-semibold text-surface transition-colors duration-(--dur-instant) ease-entrada hover:bg-green-dark sm:px-10 sm:text-base"
              >
                <span>{ctaLabel}</span>
              </TrackedCta>
              <TrackedCta
                href={WHATSAPP_COMMUNITY_URL}
                event="campaign_link_clicked"
                properties={{ target: "whatsapp", location: "lab_legionario" }}
                className="btn-cut btn-cut-outline btn-cut-quiet inline-flex items-center px-8 py-3.5 text-sm font-semibold text-ink sm:px-9 sm:text-base sm:whitespace-nowrap"
              >
                <span>Entrar no grupo do WhatsApp</span>
              </TrackedCta>
            </div>
          </div>

          <div className="lg:mt-6 lg:flex lg:w-full lg:max-w-[min(44vw,44rem)] lg:flex-col lg:self-end lg:[margin-bottom:calc((var(--hero-pb)+2rem)*-1)] lg:[margin-right:calc(50%-50vw-1.75rem)] lg:[@media(max-height:780px)]:origin-bottom-right lg:[@media(max-height:780px)]:scale-90">
            <div id="hero-ticket" className="hero-ticket">
              <EventTicket />
            </div>
          </div>

          <MobileSteps
            whatsappUrl={WHATSAPP_COMMUNITY_URL}
            colosseumUrl={colosseum?.external_url ?? null}
            registered={false}
          />
        </div>
      </section>

      {/* Prova da chapa: a mesma peça sem ticket por cima e sem o Coliseu ao
          lado, e a régua de tom em volta. É aqui que se julga a impressão —
          quanto de tinta a armadura pede — antes de julgar a composição. */}
      <section className={`${PAGE_SHELL} border-t-2 border-green-dark/20 py-16`}>
        <SectionHat>A chapa sozinha · régua de tom</SectionHat>
        <div className="mt-8 grid grid-cols-3 gap-8">
          {[
            { label: "piso .18 · ganho .74", toneFloor: 0.18, toneGain: 0.74, gamma: 1 },
            { label: "piso .22 · ganho .80 (hero)", toneFloor: 0.22, toneGain: 0.8, gamma: 1 },
            { label: "piso .26 · ganho .86", toneFloor: 0.26, toneGain: 0.86, gamma: 1 },
          ].map((step) => (
            <figure key={step.label}>
              <div className="h-[62vh]">
                <HalftoneImage
                  src="/home/legionario.webp"
                  toneFloor={step.toneFloor}
                  toneGain={step.toneGain}
                  gamma={step.gamma}
                />
              </div>
              <figcaption className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ink/60">
                {step.label}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
    </div>
  );
}
