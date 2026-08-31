import { Suspense } from "react";
import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { Card } from "@/components/ui/card";
import { getHackathonBySlug } from "@/lib/hackathon";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { unwrap } from "@/lib/supabase/unwrap";
import { resolveAuthenticatedUserState } from "@/lib/user-state";
import { PreregForm } from "./prereg-form";

export const metadata = {
  title: "Pré-cadastro Colosseum",
  description: "Garanta sua vaga na campanha brasileira para o Colosseum Global Hackathon 2026.",
  openGraph: { images: [{ url: "/brand/og-colosseum.png", width: 1200, height: 630 }] },
};

export const dynamic = "force-dynamic";

const COLOSSEUM_SLUG = "colosseum-2026";

const STEPS = [
  { n: 1, label: "Conta" },
  { n: 2, label: "Perfil" },
  { n: 3, label: "Jornada" },
] as const;

function StepIndicator({ active }: { active: 1 | 2 | 3 }) {
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
          <span className={step.n === active ? "text-ink" : ""}>{step.label}</span>
          {i < STEPS.length - 1 && <span className="mx-1 h-px w-4 bg-green-dark/20" />}
        </span>
      ))}
    </div>
  );
}

export default async function PreRegistroPage() {
  const state = await resolveAuthenticatedUserState();
  const hackathon = await getHackathonBySlug(COLOSSEUM_SLUG);

  let registered = false;
  if (state && hackathon) {
    const supabase = await createServerSupabaseClient();
    const result = await supabase
      .from("hackathon_registrations")
      .select("hackathon_id")
      .eq("hackathon_id", hackathon.id)
      .eq("user_id", state.userId)
      .maybeSingle();
    registered = Boolean(unwrap(result, "preRegistro.checkRegistration"));
  }

  const activeStep: 1 | 2 | 3 = !state ? 1 : registered ? 3 : 2;

  return (
    <main className="relative bg-surface">
      <div className="relative z-10 mx-auto flex max-w-xl flex-col px-4 pb-16 pt-24 sm:px-6 sm:pb-20 sm:pt-28">
        <StepIndicator active={activeStep} />

        {activeStep === 1 && (
          <div className="flex justify-center">
            <div className="w-full max-w-md">
              <h1 className="sr-only">Faça seu pré-cadastro</h1>
              <Suspense fallback={null}>
                <AuthForm defaultNext="/pre-registro" />
              </Suspense>
            </div>
          </div>
        )}

        {activeStep === 2 && (
          <Card sticker className="p-8 sm:p-10">
            <h1 className="font-heading text-2xl font-black uppercase tracking-tight text-ink">
              Complete seu pré-cadastro
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Falta pouco: confirme seus dados para garantir sua vaga no Colosseum Global Hackathon.
            </p>
            <div className="mt-6">
              <PreregForm profile={state!.profile} />
            </div>
          </Card>
        )}

        {activeStep === 3 && (
          <>
            <div className="text-center">
              <p className="inline-flex items-center gap-2 rounded-full bg-emerald/10 px-4 py-1.5 text-sm font-bold text-emerald">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald text-xs text-surface">✓</span>
                Você está dentro
              </p>
              <h1 className="mt-4 font-heading text-3xl font-black uppercase tracking-tight text-ink sm:text-4xl">
                Sua jornada até a arena
              </h1>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
                Seu lugar na campanha está garantido. Avisamos cada abertura por e-mail e WhatsApp.
              </p>
            </div>

            <ol className="relative mt-10 space-y-4 before:absolute before:bottom-8 before:left-[1.35rem] before:top-8 before:w-0.5 before:bg-green-dark/15">
              <li className="relative flex items-start gap-4">
                <span className="z-10 mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-emerald bg-emerald font-heading text-lg font-black text-surface">
                  ✓
                </span>
                <div className="flex-1 rounded-2xl border-2 border-emerald/40 bg-emerald/5 p-5">
                  <p className="font-heading text-base font-bold uppercase text-emerald">Pré-cadastro feito</p>
                  <p className="mt-1 text-sm text-muted">Sua vaga na campanha brasileira está garantida.</p>
                </div>
              </li>

              <li className="relative flex items-start gap-4">
                <span className="z-10 mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-green-dark bg-yellow font-heading text-lg font-black text-green-dark">
                  2
                </span>
                <div className="flex-1 rounded-2xl border-2 border-green-dark bg-surface-raised p-5 shadow-sticker">
                  <p className="font-heading text-base font-bold uppercase text-ink">Entre na comunidade</p>
                  <p className="mt-1 text-sm text-muted">
                    Updates, mentorias e formação de times acontecem no grupo.
                  </p>
                  <a
                    href="https://chat.whatsapp.com/HPIu1YV3mri5QOGf0gUMTO"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-block whitespace-nowrap rounded-full bg-green-dark px-6 py-2.5 text-sm font-bold text-surface transition-transform duration-200 hover:-translate-y-0.5"
                  >
                    Entrar no WhatsApp
                  </a>
                </div>
              </li>

              <li className="relative flex items-start gap-4">
                <span className="z-10 mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-green-dark bg-yellow font-heading text-lg font-black text-green-dark">
                  3
                </span>
                <div className="flex-1 rounded-2xl border-2 border-green-dark bg-surface-raised p-5 shadow-sticker">
                  <p className="font-heading text-base font-bold uppercase text-ink">Lets Build</p>
                  <p className="mt-1 text-sm text-muted">
                    Incubação de 30 dias com imersão presencial em São Paulo e US$50 mil em jogo.
                  </p>
                  <a
                    href="https://stoxs.club/en/lets-build"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-block whitespace-nowrap rounded-full border-2 border-green-dark px-6 py-2 text-sm font-bold text-ink transition-colors duration-200 hover:bg-green-dark hover:text-surface"
                  >
                    Aplicar no Lets Build
                  </a>
                </div>
              </li>

              <li className="relative flex items-start gap-4">
                <span className="z-10 mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-green-dark/30 bg-surface font-heading text-lg font-black text-muted">
                  4
                </span>
                <div className="flex-1 rounded-2xl border-2 border-dashed border-green-dark/30 bg-surface p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-heading text-base font-bold uppercase text-ink">Colosseum</p>
                    {!hackathon?.external_url && (
                      <span className="rounded-full bg-yellow px-2.5 py-0.5 text-xs font-bold uppercase text-green-dark">
                        Em breve
                      </span>
                    )}
                  </div>
                  {hackathon?.external_url ? (
                    <>
                      <p className="mt-1 text-sm text-muted">Inscrições abertas. Garanta seu lugar na arena.</p>
                      <a
                        href={hackathon.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-block whitespace-nowrap rounded-full bg-yellow px-6 py-2.5 text-sm font-bold text-green-dark transition-transform duration-200 hover:-translate-y-0.5"
                      >
                        Inscrever no Colosseum
                      </a>
                    </>
                  ) : (
                    <p className="mt-1 text-sm text-muted">
                      Quando as inscrições abrirem, você fica sabendo primeiro.
                    </p>
                  )}
                </div>
              </li>
            </ol>

          </>
        )}
      </div>
    </main>
  );
}
