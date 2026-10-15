import Link from "next/link";
import { Card } from "@/components/ui/card";
import { TrackedCta } from "@/components/ui/tracked-cta";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { unwrap } from "@/lib/supabase/unwrap";
import { resolveAuthenticatedUserState } from "@/lib/user-state";
import { DAY_MONTH, stripPeriods } from "@/lib/dates";
import { WHATSAPP_COMMUNITY_URL } from "../../pre-registro/constants";
import { TrackedLink } from "../../pre-registro/tracked-link";
import { PerkForm } from "./perk-form";
import { HELIUS_PERK_PATH, HERO, HOW_IT_WORKS, PERK, TIERS } from "./constants";
import type { PerkApplication } from "@/types/db";

export const metadata = {
  title: "Perk Helius | Superteam Brasil",
  description: HERO.lead,
};

export const dynamic = "force-dynamic";

const FORM_ID = "aplicacao";

const CTA_CLASS =
  "mt-8 inline-block whitespace-nowrap rounded-full bg-yellow px-6 py-2.5 text-sm font-bold text-green-dark transition-transform duration-(--dur-instant) ease-mola hover:-translate-y-0.5";

async function loadApplication(userId: string) {
  const supabase = await createServerSupabaseClient();
  const result = await supabase
    .from("perk_applications")
    .select("*")
    .eq("perk", PERK)
    .eq("user_id", userId)
    .maybeSingle();
  return unwrap(result, "perks.helius.loadApplication") as PerkApplication | null;
}

function Hero({ cta }: { cta: "auth" | "form" | null }) {
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

      <ul className="mt-8 grid gap-3 text-left sm:grid-cols-2">
        {TIERS.map((tier) => (
          <li key={tier.name} className="rounded-xl border-2 border-green-dark/15 bg-surface-raised p-4">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-muted">Plano {tier.name}</p>
            <p className="mt-1 font-heading text-xl font-black uppercase tracking-tight text-ink">{tier.offer}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{tier.detail}</p>
          </li>
        ))}
      </ul>

      <ol className="mt-8 space-y-3 text-left">
        {HOW_IT_WORKS.map((step, i) => (
          <li key={step} className="flex gap-3 text-sm leading-relaxed text-ink">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-green-dark bg-yellow text-xs font-bold text-green-dark">
              {i + 1}
            </span>
            <span className="pt-0.5">{step}</span>
          </li>
        ))}
      </ol>

      {cta === "auth" && (
        <TrackedCta
          href={`/auth?next=${HELIUS_PERK_PATH}`}
          event="cta_clicked"
          properties={{ cta: "perk_helius", location: "hero" }}
          className={CTA_CLASS}
        >
          {HERO.cta}
        </TrackedCta>
      )}
      {cta === "form" && (
        <Link href={`#${FORM_ID}`} className={CTA_CLASS}>
          Aplicar agora ↓
        </Link>
      )}
    </Card>
  );
}

function Received({ application, sent }: { application: PerkApplication; sent: boolean }) {
  const day = stripPeriods(DAY_MONTH.format(new Date(application.created_at)));
  return (
    <Card sticker className="p-8 sm:p-10">
      <div className="flex flex-wrap items-center gap-2">
        <p className="inline-flex items-center gap-2 rounded-full bg-emerald/10 px-4 py-1.5 text-sm font-bold text-emerald">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald text-xs text-surface">✓</span>
          Aplicação recebida
        </p>
        {sent && (
          <p className="inline-flex items-center rounded-full bg-yellow/40 px-3 py-1 text-xs font-bold text-green-dark">
            Salvo
          </p>
        )}
      </div>
      <h2 className="mt-4 font-heading text-2xl font-black uppercase tracking-tight text-ink [overflow-wrap:anywhere]">
        {application.project_name}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Recebemos sua aplicação em {day}. O time da Superteam Brasil analisa cada pedido e, se for aprovado, fala com
        você pelo e-mail ou WhatsApp que você informou, com o código de ativação da Helius.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
        <Link
          href={`${HELIUS_PERK_PATH}?editar=1#${FORM_ID}`}
          className="inline-block whitespace-nowrap rounded-full bg-green-dark px-6 py-2.5 text-sm font-bold text-surface transition-transform duration-(--dur-instant) ease-mola hover:-translate-y-0.5"
        >
          Editar respostas
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

export default async function HeliusPerkPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [state, params] = await Promise.all([resolveAuthenticatedUserState(), searchParams]);
  const application = state ? await loadApplication(state.userId) : null;
  const editing = params.editar === "1";
  const showForm = Boolean(state) && (!application || editing);

  return (
    <main className="relative bg-surface">
      <div className="relative z-10 mx-auto flex max-w-xl flex-col gap-8 px-4 pb-16 pt-8 sm:px-6 sm:pb-20 sm:pt-10">
        {/* The confirmation comes first so it is on screen after sending. */}
        {state && application && !editing && <Received application={application} sent={params.enviado === "1"} />}

        <Hero cta={!state ? "auth" : showForm && !application ? "form" : null} />

        {state && showForm && (
          <div id={FORM_ID} className="scroll-mt-24">
            <Card sticker className="p-8 sm:p-10">
              <h2 className="font-heading text-2xl font-black uppercase tracking-tight text-ink">
                {application ? "Editar aplicação" : "Aplicação"}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">Leva uns dois minutos. Todos os campos são obrigatórios.</p>
              <div className="mt-6">
                <PerkForm profile={state.profile} email={state.email} application={application} />
              </div>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
