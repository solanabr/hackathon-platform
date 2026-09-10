import type { ReactNode } from "react";
import { ColosseumScene } from "@/components/home/colosseum";
import { ColosseumBackdrop } from "@/components/home/colosseum-backdrop";
import { PAGE_SHELL } from "@/components/layout/container";
import { ColosseumWhole } from "./colosseum-whole";
import type { LabHeroProps } from "./catalog";
import {
  HeroCtas,
  HeroHat,
  HeroHeadline,
  HeroLede,
  HeroTicket,
  HeroWarrior,
  LabMobileHero,
  LabStage,
} from "./pieces";

function BleedMonument({
  className,
  mirror = false,
  fade = "none",
}: {
  className: string;
  mirror?: boolean;
  fade?: "none" | "left";
}) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute overflow-hidden ${className}`}
      style={
        fade === "left"
          ? {
              maskImage:
                "linear-gradient(to right, transparent 0%, black 22%)",
              WebkitMaskImage:
                "linear-gradient(to right, transparent 0%, black 22%)",
            }
          : undefined
      }
    >
      <div className={`h-full w-full ${mirror ? "[transform:scaleX(-1)]" : ""}`}>
        <ColosseumScene backdrop={<ColosseumBackdrop className="h-full w-full" />} />
      </div>
    </div>
  );
}

function WholeMonument({
  className,
  mirror = false,
  fadeTop = false,
}: {
  className: string;
  mirror?: boolean;
  fadeTop?: boolean;
}) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute ${className}`}
      style={
        fadeTop
          ? {
              maskImage:
                "linear-gradient(to bottom, transparent 0%, black 22%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, transparent 0%, black 22%)",
            }
          : undefined
      }
    >
      <div className={`h-full w-full ${mirror ? "[transform:scaleX(-1)]" : ""}`}>
        <ColosseumWhole />
      </div>
    </div>
  );
}

function Desktop({ children }: { children: ReactNode }) {
  return <div className="hidden lg:block">{children}</div>;
}

export function VariantAtual(props: LabHeroProps) {
  return (
    <LabStage>
      <LabMobileHero {...props} />
      <Desktop>
        <div className="relative flex min-h-[calc(100dvh-4rem)] flex-col justify-start overflow-hidden">
          <BleedMonument className="bottom-[-12%] left-[-10%] h-[70%] w-[72%]" />
          <HeroWarrior className="bottom-0 right-[-5%] h-[88%] w-[32%]" />
          <div
            className={`relative z-10 ${PAGE_SHELL} flex min-h-[calc(100dvh-4rem)] flex-col [--hero-pb:2.5rem] [--hero-pt:9vh] pb-[var(--hero-pb)] pt-[var(--hero-pt)] [@media(max-height:860px)]:[--hero-pb:1.5rem] [@media(max-height:860px)]:[--hero-pt:3vh]`}
          >
            <div className="mx-auto my-auto w-full max-w-4xl text-center">
              <div className="hero-print mb-5 flex justify-center">
                <HeroHat />
              </div>
              <HeroHeadline className="text-[clamp(3rem,4.6vw,4.8rem)]" />
              <HeroLede className="hero-after mx-auto mt-6 max-w-2xl text-base sm:text-lg" />
              <HeroCtas
                cadastroHref={props.cadastroHref}
                ctaLabel={props.ctaLabel}
                location="hero_lab_atual"
                layout="row"
                className="hero-after mt-8 justify-center"
              />
            </div>
            <div className="mt-6 flex w-full max-w-[min(44vw,44rem)] flex-col self-end [margin-bottom:calc((var(--hero-pb)+2rem)*-1)] [margin-right:calc(50%-50vw-1.75rem)] [@media(max-height:780px)]:origin-bottom-right [@media(max-height:780px)]:scale-90">
              <HeroTicket />
            </div>
          </div>
        </div>
      </Desktop>
    </LabStage>
  );
}

export function VariantEditorial(props: LabHeroProps) {
  return (
    <LabStage>
      <LabMobileHero {...props} />
      <Desktop>
        <div className="relative min-h-[calc(100dvh-4rem)] overflow-hidden">
          <WholeMonument
            fadeTop
            className="bottom-[-14%] left-[-10%] h-[52%] w-[50%]"
          />
          <HeroWarrior
            mirror
            className="bottom-0 right-0 h-[94%] w-[min(44vw,36rem)]"
          />
          <div
            className={`relative z-10 ${PAGE_SHELL} grid min-h-[calc(100dvh-4rem)] grid-cols-[minmax(0,38rem)_1fr] pb-6 pt-[6vh]`}
          >
            <div className="flex flex-col justify-between gap-10">
              <div>
                <div className="hero-print mb-5">
                  <HeroHat />
                </div>
                <HeroHeadline className="text-[clamp(2.5rem,3.6vw,4.1rem)]" />
                <HeroLede className="hero-after mt-6 max-w-md text-base sm:text-lg" />
                <HeroCtas
                  cadastroHref={props.cadastroHref}
                  ctaLabel={props.ctaLabel}
                  location="hero_lab_editorial"
                  layout="row"
                  className="hero-after mt-8"
                />
              </div>
              <div className="w-[min(100%,32rem)]">
                <HeroTicket />
              </div>
            </div>
            <div />
          </div>
        </div>
      </Desktop>
    </LabStage>
  );
}

export function VariantPaisagem(props: LabHeroProps) {
  return (
    <LabStage>
      <LabMobileHero {...props} />
      <Desktop>
        <div className="relative min-h-[calc(100dvh-4rem)] overflow-hidden">
          <WholeMonument fadeTop className="inset-x-0 bottom-[-10%] h-[62%]" />
          <HeroWarrior className="bottom-0 left-[38%] h-[58%] w-[min(18vw,15rem)]" />
          <div
            className={`relative z-10 ${PAGE_SHELL} flex min-h-[calc(100dvh-4rem)] flex-col pb-8 pt-[5.5vh]`}
          >
            <div className="max-w-[44rem]">
              <div className="hero-print mb-4">
                <HeroHat />
              </div>
              <HeroHeadline className="text-[clamp(3rem,4.8vw,5.2rem)]" />
              <HeroLede className="hero-after mt-5 max-w-xl text-base sm:text-lg" />
              <HeroCtas
                cadastroHref={props.cadastroHref}
                ctaLabel={props.ctaLabel}
                location="hero_lab_paisagem"
                layout="row"
                className="hero-after mt-7"
              />
            </div>
            <div className="relative mt-auto flex justify-end pb-[1vh]">
              <div className="w-[min(40vw,38rem)]">
                <HeroTicket />
              </div>
            </div>
          </div>
        </div>
      </Desktop>
    </LabStage>
  );
}

export function VariantCartaz(props: LabHeroProps) {
  return (
    <LabStage>
      <LabMobileHero {...props} />
      <Desktop>
        <div className="relative min-h-[calc(100dvh-4rem)] overflow-hidden">
          <BleedMonument
            fade="left"
            className="bottom-[-8%] right-0 h-[96%] w-[66%]"
          />
          <HeroWarrior className="bottom-0 left-[44%] h-[86%] w-[min(22vw,18rem)]" />
          <div
            className={`relative z-10 ${PAGE_SHELL} grid min-h-[calc(100dvh-4rem)] grid-cols-[minmax(24rem,36%)_1fr] pb-8 pt-[6vh]`}
          >
            <div className="flex flex-col">
              <div className="hero-print mb-5">
                <HeroHat />
              </div>
              <HeroHeadline className="text-[clamp(2.4rem,3.4vw,3.9rem)]" />
              <HeroLede className="hero-after mt-5 max-w-md text-base sm:text-lg" />
              <HeroCtas
                cadastroHref={props.cadastroHref}
                ctaLabel={props.ctaLabel}
                location="hero_lab_cartaz"
                layout="row"
                className="hero-after mt-8"
              />
              <div className="mt-auto w-[min(100%,34rem)] pt-10">
                <HeroTicket />
              </div>
            </div>
            <div />
          </div>
        </div>
      </Desktop>
    </LabStage>
  );
}

export function VariantFriso(props: LabHeroProps) {
  return (
    <LabStage>
      <LabMobileHero {...props} />
      <Desktop>
        <div className="relative min-h-[calc(100dvh-4rem)] overflow-hidden">
          <WholeMonument fadeTop className="inset-x-0 bottom-[-12%] h-[50%]" />
          <HeroWarrior
            mirror
            className="bottom-0 right-0 h-[90%] w-[min(32vw,24rem)]"
          />
          <div
            className={`relative z-10 ${PAGE_SHELL} flex min-h-[calc(100dvh-4rem)] flex-col pb-8 pt-[5vh]`}
          >
            <div className="hero-print mb-4">
              <HeroHat />
            </div>
            <HeroHeadline className="text-[clamp(3rem,4.5vw,5rem)]" />
            <HeroLede className="hero-after mt-5 max-w-2xl text-base sm:text-lg" />
            <div className="hero-after mt-8 flex max-w-[46rem] items-center gap-4">
              <HeroCtas
                cadastroHref={props.cadastroHref}
                ctaLabel={props.ctaLabel}
                location="hero_lab_friso"
                layout="row"
                className="shrink-0"
              />
              <span
                aria-hidden
                className="h-px min-w-12 flex-1 border-t border-dashed border-green-dark/40"
              />
            </div>
            <div className="relative mt-auto w-[min(36vw,34rem)] self-center pb-[1vh]">
              <HeroTicket />
            </div>
          </div>
        </div>
      </Desktop>
    </LabStage>
  );
}

export function VariantDock(props: LabHeroProps) {
  return (
    <LabStage>
      <LabMobileHero {...props} />
      <Desktop>
        <div className="relative min-h-[calc(100dvh-4rem)] overflow-hidden">
          <WholeMonument fadeTop className="inset-x-[4%] bottom-[-8%] h-[54%]" />
          <HeroWarrior
            mirror
            className="bottom-0 right-0 h-[82%] w-[min(30vw,22rem)]"
          />
          <div
            className={`relative z-10 ${PAGE_SHELL} flex min-h-[calc(100dvh-4rem)] flex-col pb-6 pt-[5vh]`}
          >
            <div className="grid items-end gap-10 pb-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.8fr)]">
              <div>
                <div className="hero-print mb-4">
                  <HeroHat />
                </div>
                <HeroHeadline className="text-[clamp(2.6rem,3.8vw,4.4rem)]" />
                <HeroLede className="hero-after mt-5 max-w-xl text-base sm:text-lg" />
              </div>
              <HeroCtas
                cadastroHref={props.cadastroHref}
                ctaLabel={props.ctaLabel}
                location="hero_lab_dock"
                layout="stack"
                className="hero-after justify-self-end"
              />
            </div>
            <div className="relative mt-auto w-[min(42vw,38rem)] self-end">
              <HeroTicket />
            </div>
          </div>
        </div>
      </Desktop>
    </LabStage>
  );
}

export function VariantTrilho(props: LabHeroProps) {
  return (
    <LabStage>
      <LabMobileHero {...props} />
      <Desktop>
        <div className="relative min-h-[calc(100dvh-4rem)] overflow-hidden">
          <BleedMonument className="bottom-[-8%] left-[-8%] right-[32%] h-[70%]" />
          <HeroWarrior
            mirror
            className="bottom-0 right-[28%] h-[90%] w-[min(26vw,20rem)]"
          />
          <div
            className={`relative z-10 ${PAGE_SHELL} grid min-h-[calc(100dvh-4rem)] grid-cols-[minmax(0,1fr)_minmax(22rem,28%)] gap-10 pb-8 pt-[6vh]`}
          >
            <div className="flex flex-col">
              <div className="hero-print mb-5">
                <HeroHat />
              </div>
              <HeroHeadline className="text-[clamp(2.5rem,3.5vw,4rem)]" />
              <HeroLede className="hero-after mt-5 max-w-md text-base sm:text-lg" />
            </div>
            <div className="relative flex flex-col justify-end gap-5 pb-2">
              <div className="relative">
                <HeroTicket />
              </div>
              <HeroCtas
                cadastroHref={props.cadastroHref}
                ctaLabel={props.ctaLabel}
                location="hero_lab_trilho"
                layout="stack"
                className="relative"
              />
            </div>
          </div>
        </div>
      </Desktop>
    </LabStage>
  );
}

export function VariantObjeto(props: LabHeroProps) {
  return (
    <LabStage>
      <LabMobileHero {...props} />
      <Desktop>
        <div className="relative min-h-[calc(100dvh-4rem)] overflow-hidden">
          <WholeMonument fadeTop className="inset-x-0 bottom-[-16%] h-[44%]" />
          <HeroWarrior
            mirror
            className="bottom-0 right-0 h-[98%] w-[min(48vw,40rem)]"
          />
          <div
            className={`relative z-10 ${PAGE_SHELL} grid min-h-[calc(100dvh-4rem)] grid-cols-[minmax(0,1fr)_minmax(24rem,40%)] items-center gap-12 pb-8 pt-[5vh]`}
          >
            <div>
              <div className="hero-print mb-5">
                <HeroHat />
              </div>
              <HeroHeadline className="text-[clamp(2.5rem,3.6vw,4.1rem)]" />
              <HeroLede className="hero-after mt-6 max-w-md text-base sm:text-lg" />
              <HeroCtas
                cadastroHref={props.cadastroHref}
                ctaLabel={props.ctaLabel}
                location="hero_lab_objeto"
                layout="quiet"
                className="hero-after mt-8"
              />
            </div>
            <div className="relative self-end pb-[2vh]">
              <HeroTicket />
            </div>
          </div>
        </div>
      </Desktop>
    </LabStage>
  );
}

const LIVE = {
  atual: VariantAtual,
  editorial: VariantEditorial,
  paisagem: VariantPaisagem,
  cartaz: VariantCartaz,
  friso: VariantFriso,
  dock: VariantDock,
  trilho: VariantTrilho,
  objeto: VariantObjeto,
} as const;

export function renderLabHero(id: string, props: LabHeroProps) {
  const Cmp = LIVE[id as keyof typeof LIVE] ?? VariantPaisagem;
  return <Cmp {...props} />;
}
