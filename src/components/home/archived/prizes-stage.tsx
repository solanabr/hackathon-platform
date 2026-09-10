import type { ReactNode } from "react";
import { PAGE_SHELL } from "@/components/layout/container";
import { PrizesAtmosphere } from "@/components/home/prizes-atmosphere";
import { PrizePedestal } from "@/components/home/prize-pedestal";
import { StageRule } from "@/components/home/rails";
import { Reveal } from "@/components/ui/reveal";
import { TrackedCta } from "@/components/ui/tracked-cta";

/* Arquivado: a seção saiu da landing enquanto valores, categorias e critérios
   seguem sem divulgação oficial — um palco inteiro para dizer "a divulgar"
   custava mais atenção do que devolvia. O arquivo fica aqui inteiro (e é
   type-checked no build) para voltar sem reconstrução quando os números
   existirem: renderizar <ArchivedPrizesStage> em (public)/page.tsx no lugar
   antigo, entre "O hackathon" e "Como participar", e devolver
   { href: "#premiacoes", label: "Premiações" } ao NAV de lp-section-nav.tsx. */

function SectionHat({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center justify-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-ink/75">
      <span aria-hidden className="h-[7px] w-[18px] shrink-0 rounded-[2px] bg-emerald" />
      {children}
    </p>
  );
}

export function ArchivedPrizesStage({
  cadastroHref,
  ctaLabel,
}: {
  cadastroHref: string;
  ctaLabel: string;
}) {
  return (
    /* Prêmios: um palco só — a taça no meio do quadro, o texto na faixa de
       baixo e nada depois dela. */
    <section
      id="premiacoes"
      className="relative overflow-hidden bg-surface pt-24 pb-12 lg:flex lg:h-[100svh] lg:min-h-[42rem] lg:flex-col lg:pt-20 lg:pb-[6.5rem] lg:[@media(max-height:820px)]:pt-[4.75rem] lg:[@media(max-height:820px)]:pb-[5rem]"
      aria-label="Prêmios e oportunidades de investimento"
    >
      <PrizesAtmosphere />

      <div className={`${PAGE_SHELL} relative z-10 flex w-full min-h-0 flex-1 flex-col`}>
        <StageRule className="mb-7 hidden md:block" />
        <Reveal tone="texto" className="mb-11 lg:mb-14">
          <SectionHat>Prêmios e investimento</SectionHat>
        </Reveal>

        <PrizePedestal />

        <div className="mt-8 grid gap-9 lg:mt-14 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-start lg:gap-12 xl:gap-16 lg:[@media(max-height:820px)]:mt-5">
          <Reveal tone="texto">
            <h2 className="max-w-[21ch] text-balance font-heading text-[1.7rem] font-black leading-[1.06] tracking-tight text-ink [font-stretch:105%] sm:text-[1.9rem] xl:text-[2.1rem]">
              Seu projeto pode conquistar{" "}
              <span className="inline-block bg-yellow px-2.5 pb-[0.08em] text-green-dark [clip-path:polygon(0_5%,100%_0,100%_95%,0_100%)]">
                mais
              </span>{" "}
              do que os primeiros usuários.
            </h2>
            <p className="mt-3 max-w-[36ch] text-pretty text-sm leading-relaxed text-muted">
              O hackathon reúne oportunidades de premiação e investimento para
              projetos selecionados.
            </p>
          </Reveal>

          <Reveal
            index={1}
            tone="texto"
            className="order-last flex justify-center lg:order-none lg:pt-2"
          >
            <TrackedCta
              href={cadastroHref}
              event="cta_clicked"
              properties={{ cta: "cadastro", location: "premiacoes" }}
              className="btn-cut inline-flex items-center whitespace-nowrap bg-emerald-deep px-8 py-3.5 text-sm font-semibold text-surface transition-colors duration-(--dur-instant) ease-entrada hover:bg-green-dark sm:px-10 sm:text-base"
            >
              <span>{ctaLabel}</span>
            </TrackedCta>
          </Reveal>

          <Reveal index={2} tone="texto" className="lg:justify-self-end lg:text-right">
            <span className="inline-flex items-center rounded-full bg-yellow px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-green-dark">
              A divulgar
            </span>
            <p className="mt-3 font-heading text-lg font-black tracking-tight text-ink sm:text-xl">
              Valores e condições
            </p>
            <p className="mt-2 max-w-[36ch] text-pretty text-sm leading-relaxed text-muted lg:ml-auto">
              Prêmios, categorias e a avaliação para programas de aceleração
              aparecem aqui após a divulgação oficial.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
