import Link from "next/link";
import { Card } from "@/components/ui/card";
import { TrackedCta } from "@/components/ui/tracked-cta";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { unwrap } from "@/lib/supabase/unwrap";
import { resolveAuthenticatedUserState } from "@/lib/user-state";
import { WHATSAPP_COMMUNITY_URL } from "../pre-registro/constants";
import { TrackedLink } from "../pre-registro/tracked-link";
import { StartupForm } from "./startup-form";
import { HERO, STARTUP_PATH, STEPS, type StartupStep } from "./constants";
import type { Startup } from "@/types/db";

export const metadata = {
  title: "Cadastro de startup | Superteam Brasil",
  description: HERO.lead,
};

export const dynamic = "force-dynamic";

const FORM_ID = "cadastro";

async function loadStartup(userId: string) {
  const supabase = await createServerSupabaseClient();
  const result = await supabase.from("startups").select("*").eq("user_id", userId).maybeSingle();
  return unwrap(result, "startupRegistration.loadStartup") as Startup | null;
}

function StepIndicator({ active }: { active: StartupStep }) {
  return (
    <div className="mb-8 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
      {STEPS.map((step, i) => (
        <span key={step.n} className="flex items-center gap-2">
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
              step.n === active
                ? "border-green-dark bg-green-dark text-yellow"
                : step.n < active
                  ? "border-emerald bg-emerald/10 text-emerald"
                  : "border-green-dark/20 text-muted"
            }`}
          >
            {step.n}
          </span>
          <span className={step.n === active ? "text-ink" : "hidden sm:inline"}>{step.label}</span>
          {i < STEPS.length - 1 && <span className="mx-1 h-px w-4 bg-green-dark/20" />}
        </span>
      ))}
    </div>
  );
}

const CTA_CLASS =
  "mt-6 inline-block whitespace-nowrap rounded-full bg-yellow px-6 py-2.5 text-sm font-bold text-green-dark transition-transform duration-(--dur-instant) ease-mola hover:-translate-y-0.5";

function Hero({ signedIn, completed }: { signedIn: boolean; completed: boolean }) {
  return (
    <Card sticker className="p-8 text-center sm:p-10">
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-emerald">{HERO.kicker}</p>
      <h1 className="mt-3 text-balance font-heading text-3xl font-black uppercase leading-[1.05] tracking-tight text-ink sm:text-4xl">
        {HERO.title}{" "}
        <span className="inline-block -rotate-1 border-2 border-green-dark bg-yellow px-3 text-green-dark shadow-sticker">
          {HERO.highlight}
        </span>
      </h1>
      <p className="mx-auto mt-4 max-w-md text-pretty text-sm leading-relaxed text-muted sm:text-base">{HERO.lead}</p>
      <p className="mt-3 font-mono text-xs font-bold uppercase tracking-widest text-muted">{HERO.note}</p>
      {signedIn ? (
        <Link href={`${STARTUP_PATH}?step=1#${FORM_ID}`} className={CTA_CLASS}>
          {completed ? HERO.ctaEdit : HERO.cta}
        </Link>
      ) : (
        <TrackedCta
          href={`/auth?next=${STARTUP_PATH}`}
          event="cta_clicked"
          properties={{ cta: "startup", location: "hero" }}
          className={CTA_CLASS}
        >
          {HERO.cta}
        </TrackedCta>
      )}
    </Card>
  );
}

export default async function StartupRegistrationPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string; saved?: string }>;
}) {
  const [state, { step, saved }] = await Promise.all([resolveAuthenticatedUserState(), searchParams]);
  const startup = state ? await loadStartup(state.userId) : null;
  const completed = Boolean(startup?.completed_at);

  const done = step === "done" && completed;
  const activeStep: StartupStep = step === "2" ? 2 : step === "3" ? 3 : 1;

  return (
    <main className="relative bg-surface">
      <div className="relative z-10 mx-auto flex max-w-xl flex-col gap-8 px-4 pb-16 pt-8 sm:px-6 sm:pb-20 sm:pt-10">
        <Hero signedIn={Boolean(state)} completed={completed} />

        {state && done && (
          <Card sticker className="p-8 sm:p-10">
            <p className="inline-flex items-center gap-2 rounded-full bg-emerald/10 px-4 py-1.5 text-sm font-bold text-emerald">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald text-xs text-surface">✓</span>
              Startup cadastrada
            </p>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Vamos entrar em contato pelo WhatsApp/Telegram quando houver algo para você.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <TrackedLink
                href={WHATSAPP_COMMUNITY_URL}
                target="whatsapp"
                className="inline-block whitespace-nowrap rounded-full bg-green-dark px-6 py-2.5 text-sm font-bold text-surface transition-transform duration-(--dur-instant) ease-mola hover:-translate-y-0.5"
              >
                Entrar no grupo do WhatsApp
              </TrackedLink>
              <Link href={`${STARTUP_PATH}?step=1`} className="text-sm font-semibold text-ink underline underline-offset-4">
                {HERO.ctaEdit}
              </Link>
            </div>
          </Card>
        )}

        {state && !done && (
          <div id={FORM_ID} className="scroll-mt-24">
            <StepIndicator active={activeStep} />
            <Card sticker className="p-8 sm:p-10">
              {saved === "1" && (
                <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald/10 px-3 py-1 text-xs font-bold text-emerald">
                  Salvo. Volte quando quiser.
                </p>
              )}
              <h2 className="font-heading text-2xl font-black uppercase tracking-tight text-ink">
                {STEPS[activeStep - 1].label}
              </h2>
              <div className="mt-6">
                <StartupForm step={activeStep} profile={state.profile} email={state.email} startup={startup} />
              </div>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
