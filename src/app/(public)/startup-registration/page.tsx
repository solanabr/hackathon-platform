import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { TrackedCta } from "@/components/ui/tracked-cta";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { unwrap } from "@/lib/supabase/unwrap";
import { resolveAuthenticatedUserState } from "@/lib/user-state";
import { WHATSAPP_COMMUNITY_URL } from "../pre-registro/constants";
import { TrackedLink } from "../pre-registro/tracked-link";
import { StartupForm } from "./startup-form";
import { SubmissionNotice } from "./submission-notice";
import {
  HERO,
  STARTUP_PATH,
  STEPS,
  SUBMISSION_ITEM_COUNT,
  SUBMISSION_STATUS_OPTIONS,
  SUBMISSION_STEP,
  labelOf,
  submissionItemsFilled,
  type StartupStep,
} from "./constants";
import { DAY_MONTH, stripPeriods } from "@/lib/dates";
import type { Startup, User } from "@/types/db";

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

function StepIndicator({ active, linked }: { active: StartupStep; linked: boolean }) {
  return (
    <div className="mb-8 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
      {STEPS.map((step, i) => {
        const dot = (
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
              step.n === active
                ? "border-green-dark bg-green-dark text-yellow"
                : step.n < active || linked
                  ? "border-emerald bg-emerald/10 text-emerald"
                  : "border-green-dark/20 text-muted"
            }`}
          >
            {step.n}
          </span>
        );
        const label = <span className={step.n === active ? "text-ink" : "hidden sm:inline"}>{step.label}</span>;
        return (
          <span key={step.n} className="flex items-center gap-2">
            {linked && step.n !== active ? (
              <Link href={`${STARTUP_PATH}?step=${step.n}`} aria-label={`Ir para ${step.label}`} className="flex items-center gap-2 hover:text-ink">
                {dot}
                {label}
              </Link>
            ) : (
              <>
                {dot}
                {label}
              </>
            )}
            {i < STEPS.length - 1 && <span className="mx-1 h-px w-4 bg-green-dark/20" />}
          </span>
        );
      })}
    </div>
  );
}

const DETAIL_FIELDS = ["hiring", "target_customers", "token_launch", "tech_team", "heard_from", "help_needed"] as const;

function OverviewRow({ step, title, summary }: { step: StartupStep; title: string; summary: string }) {
  return (
    <li className="flex items-center justify-between gap-4 py-4">
      <div className="min-w-0">
        <p className="font-heading text-base font-bold text-ink">{title}</p>
        <p className="mt-0.5 text-sm leading-relaxed text-muted [overflow-wrap:anywhere]">{summary}</p>
      </div>
      <Link
        href={`${STARTUP_PATH}?step=${step}`}
        aria-label={`Editar ${title}`}
        className="shrink-0 text-sm font-semibold text-ink underline underline-offset-4"
      >
        Editar
      </Link>
    </li>
  );
}

function Overview({ startup, profile, saved }: { startup: Startup; profile: User | null; saved: boolean }) {
  const completed = Boolean(startup.completed_at);
  const contactDone = Boolean(profile?.full_name && profile.whatsapp && profile.location);
  const details = DETAIL_FIELDS.filter((f) => startup[f]).length;
  const filled = submissionItemsFilled(startup);
  const status = labelOf(SUBMISSION_STATUS_OPTIONS, startup.submission_status);
  const updated = startup.submission_updated_at
    ? `atualizada em ${stripPeriods(DAY_MONTH.format(new Date(startup.submission_updated_at)))}`
    : null;
  const submission = [status, `${filled} de ${SUBMISSION_ITEM_COUNT} itens`, updated].filter(Boolean).join(" · ");

  return (
    <Card sticker className="p-8 sm:p-10">
      <div className="flex flex-wrap items-center gap-2">
        <p className="inline-flex items-center gap-2 rounded-full bg-emerald/10 px-4 py-1.5 text-sm font-bold text-emerald">
          {completed && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald text-xs text-surface">✓</span>
          )}
          {completed ? "Startup cadastrada" : "Cadastro em andamento"}
        </p>
        {saved && (
          <p className="inline-flex items-center rounded-full bg-yellow/40 px-3 py-1 text-xs font-bold text-green-dark">
            Salvo
          </p>
        )}
      </div>
      <h1 className="mt-4 font-heading text-2xl font-black uppercase tracking-tight text-ink [overflow-wrap:anywhere]">
        {startup.name ?? "Sua startup"}
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Mantenha estes dados em dia. É por eles que o time da Superteam Brasil acompanha sua submissão no Colosseum e
        manda feedback por e-mail.
      </p>

      <ul className="mt-6 divide-y-2 divide-green-dark/10 border-y-2 border-green-dark/10">
        <OverviewRow step={SUBMISSION_STEP} title="Submissão no Colosseum" summary={submission} />
        <OverviewRow step={1} title="Seus dados" summary={contactDone ? "Contato completo" : "Faltam dados de contato"} />
        <OverviewRow step={2} title="Sua startup" summary={startup.one_liner ?? "Sem resumo ainda"} />
        <OverviewRow step={3} title="Mais detalhes" summary={`${details} de ${DETAIL_FIELDS.length} respostas`} />
      </ul>

      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
        <Link
          href={`${STARTUP_PATH}?step=${SUBMISSION_STEP}`}
          className="inline-block whitespace-nowrap rounded-full bg-green-dark px-6 py-2.5 text-sm font-bold text-surface transition-transform duration-(--dur-instant) ease-mola hover:-translate-y-0.5"
        >
          Atualizar submissão
        </Link>
        <TrackedLink
          href={WHATSAPP_COMMUNITY_URL}
          target="whatsapp"
          className="text-sm font-semibold text-ink underline underline-offset-4"
        >
          Entrar no grupo do WhatsApp
        </TrackedLink>
      </div>
    </Card>
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

  const requested = STEPS.find((s) => String(s.n) === step)?.n ?? null;
  // A link straight to a step (the dashboard, an e-mail) must not strand a
  // signed-out visitor on a page with nothing to show: log in, then come back.
  if (!state && requested) {
    redirect(`/auth?next=${encodeURIComponent(`${STARTUP_PATH}?step=${requested}`)}`);
  }
  // Anyone who finished the registration or already told us about a submission
  // lands on the overview; a first-time or half-way founder lands on the form.
  const overview = !requested && startup && (completed || startup.submission_updated_at) ? startup : null;
  const activeStep: StartupStep = requested ?? 1;

  return (
    <main className="relative bg-surface">
      <div className="relative z-10 mx-auto flex max-w-xl flex-col gap-8 px-4 pb-16 pt-8 sm:px-6 sm:pb-20 sm:pt-10">
        {!startup && activeStep === 1 && <Hero signedIn={Boolean(state)} completed={completed} />}

        {state && overview && <Overview startup={overview} profile={state.profile} saved={saved === "1"} />}

        {state && !overview && (
          <div id={FORM_ID} className="scroll-mt-24">
            <StepIndicator active={activeStep} linked={completed} />
            <Card sticker className="p-8 sm:p-10">
              {saved === "1" && (
                <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald/10 px-3 py-1 text-xs font-bold text-emerald">
                  Salvo. Volte quando quiser.
                </p>
              )}
              <h2 className="font-heading text-2xl font-black uppercase tracking-tight text-ink">
                {activeStep === SUBMISSION_STEP ? "Submissão no Colosseum" : STEPS[activeStep - 1].label}
              </h2>
              {activeStep === SUBMISSION_STEP && (
                <div className="mt-5">
                  <SubmissionNotice location="startup_form" />
                </div>
              )}
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
