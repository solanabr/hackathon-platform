import Image from "next/image";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { getHackathonBySlug } from "@/lib/hackathon";
import { withPlatformUtm } from "@/lib/attribution";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { unwrap } from "@/lib/supabase/unwrap";
import { resolveAuthenticatedUserState } from "@/lib/user-state";
import { PreregForm } from "./prereg-form";
import { confirmColosseumRegistration } from "./actions";
import { COLOSSEUM_SLUG, WHATSAPP_COMMUNITY_URL } from "./constants";
import { TrackedLink } from "./tracked-link";

export const metadata = {
  title: "Cadastro Colosseum",
  description: "Garanta sua vaga na campanha brasileira para o Colosseum Crypto World's Fair 2026.",
  openGraph: { images: [{ url: "/brand/og-colosseum.png", width: 1200, height: 630 }] },
};

export const dynamic = "force-dynamic";


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
  // A transient failure on the edition lookup must not take down step 1 —
  // anonymous visitors only need the auth form.
  const [state, hackathon] = await Promise.all([
    resolveAuthenticatedUserState(),
    getHackathonBySlug(COLOSSEUM_SLUG).catch(() => null),
  ]);
  // Step 1 (Conta) lives on /auth so every entry point shares one login
  // funnel and comes back here through `next`.
  if (!state) redirect("/auth?next=/pre-registro");

  let registered = false;
  let colosseumConfirmed = false;
  if (state && hackathon) {
    const supabase = await createServerSupabaseClient();
    const result = await supabase
      .from("hackathon_registrations")
      .select("hackathon_id, luma_confirmed_at")
      .eq("hackathon_id", hackathon.id)
      .eq("user_id", state.userId)
      .maybeSingle();
    const reg = unwrap(result, "preRegistro.checkRegistration");
    registered = Boolean(reg);
    colosseumConfirmed = Boolean(reg?.luma_confirmed_at);
  }

  const activeStep: 2 | 3 = registered ? 3 : 2;

  return (
    <main className="relative bg-surface">
      <div className="relative z-10 mx-auto flex max-w-xl flex-col px-4 pb-16 pt-8 sm:px-6 sm:pb-20 sm:pt-10">
        <StepIndicator active={activeStep} />

        {activeStep === 2 && (
          <Card sticker className="p-8 sm:p-10">
            <h1 className="font-heading text-2xl font-black uppercase tracking-tight text-ink">
              Complete seu cadastro
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Falta pouco: confirme seus dados para garantir sua vaga no Colosseum Crypto World&apos;s Fair.
            </p>
            <div className="mt-6">
              <PreregForm profile={state.profile} />
            </div>
          </Card>
        )}

        {activeStep === 3 && (
          <>
            <div className="text-center">
              <p className="inline-flex items-center gap-2 rounded-full bg-emerald/10 px-4 py-1.5 text-sm font-bold text-emerald">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald text-xs text-surface">✓</span>
                Cadastro confirmado
              </p>
              <h1 className="mt-4 font-heading text-3xl font-black uppercase tracking-tight text-ink sm:text-4xl">
                Próximos passos
              </h1>
            </div>

            <ol className="relative mt-10 space-y-4 before:absolute before:bottom-8 before:left-[1.35rem] before:top-8 before:w-0.5 before:bg-green-dark/15">
              <li className="relative flex items-start gap-4">
                <span className="z-10 mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-emerald bg-emerald font-heading text-lg font-black text-surface">
                  ✓
                </span>
                <div className="flex-1 rounded-2xl border-2 border-emerald/40 bg-emerald/5 p-5">
                  <p className="font-heading text-base font-bold uppercase text-emerald">Cadastro feito</p>
                  <p className="mt-1 text-sm text-muted">Avisamos as novidades por e-mail e WhatsApp.</p>
                </div>
              </li>

              {colosseumConfirmed ? (
                <li className="relative flex items-start gap-4">
                  <span className="z-10 mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-emerald bg-emerald font-heading text-lg font-black text-surface">
                    ✓
                  </span>
                  <div className="flex-1 rounded-2xl border-2 border-emerald/40 bg-emerald/5 p-5">
                    <p className="font-heading text-base font-bold uppercase text-emerald">Registro no Colosseum feito</p>
                    <p className="mt-1 text-sm text-muted">A partir de 14 de setembro você cadastra o projeto e o time por lá. Submissão até 12 de outubro.</p>
                  </div>
                </li>
              ) : (
              <li className="relative flex items-start gap-4">
                <span className="z-10 mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-green-dark bg-yellow font-heading text-lg font-black text-green-dark">
                  2
                </span>
                <div className="flex-1 rounded-2xl border-2 border-green-dark bg-surface-raised p-5 shadow-sticker">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-heading text-base font-bold uppercase text-ink">Registre-se no Colosseum</p>
                    {!hackathon?.external_url && (
                      <span className="rounded-full bg-yellow px-2.5 py-0.5 text-xs font-bold uppercase text-green-dark">
                        Em breve
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    O Colosseum é a plataforma oficial do hackathon: é por lá que seu time entra na
                    competição e submete o projeto. O registro já está aberto e não precisa ter ideia
                    nem time ainda.
                  </p>
                  <ol className="mt-3 space-y-1.5 text-sm text-muted">
                    <li className="flex gap-2">
                      <span className="font-mono text-xs font-bold text-emerald">1.</span>
                      Crie sua conta no Colosseum e complete o perfil
                    </li>
                    <li className="flex gap-2">
                      <span className="font-mono text-xs font-bold text-emerald">2.</span>
                      Clique em &quot;Register now&quot;, escolha Brasil e sua cidade e marque Solana (print abaixo)
                    </li>
                    <li className="flex gap-2">
                      <span className="font-mono text-xs font-bold text-emerald">3.</span>
                      A partir de 14 de setembro, cadastre o projeto e adicione o time por lá. Dá para começar a construir antes.
                    </li>
                  </ol>
                  {hackathon?.external_url ? (
                    <>
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <TrackedLink
                          href={withPlatformUtm(hackathon.external_url, { content: "pre_registro_step3", campaign: "colosseum-2026" })}
                          target="colosseum"
                          className="inline-block whitespace-nowrap rounded-full bg-yellow px-6 py-2.5 text-sm font-bold text-green-dark transition-transform duration-200 hover:-translate-y-0.5"
                        >
                          Abrir Colosseum
                        </TrackedLink>
                        <form action={confirmColosseumRegistration}>
                          <button
                            type="submit"
                            className="whitespace-nowrap rounded-full border-2 border-green-dark px-5 py-2 text-sm font-bold text-ink transition-colors duration-200 hover:bg-green-dark hover:text-surface"
                          >
                            Já me registrei
                          </button>
                        </form>
                      </div>
                      <Image
                        src="/brand/colosseum-registro.png"
                        alt="Formulário de registro do Colosseum preenchido com Brasil, cidade e Solana"
                        width={928}
                        height={899}
                        className="mt-4 w-full rounded-xl border-2 border-green-dark/20"
                      />
                    </>
                  ) : (
                    <p className="mt-3 font-mono text-xs font-bold uppercase tracking-widest text-muted">
                      Abre em breve; avisamos você na hora
                    </p>
                  )}
                </div>
              </li>
              )}

              <li className="relative flex items-start gap-4">
                <span className="z-10 mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-green-dark bg-yellow font-heading text-lg font-black text-green-dark">
                  3
                </span>
                <div className="flex-1 rounded-2xl border-2 border-green-dark bg-surface-raised p-5 shadow-sticker">
                  <p className="font-heading text-base font-bold uppercase text-ink">Entre na comunidade</p>
                  <p className="mt-1 text-sm text-muted">
                    Updates, mentorias e formação de times acontecem no grupo.
                  </p>
                  <TrackedLink
                    href={WHATSAPP_COMMUNITY_URL}
                    target="whatsapp"
                    className="mt-4 inline-block whitespace-nowrap rounded-full bg-green-dark px-6 py-2.5 text-sm font-bold text-surface transition-transform duration-200 hover:-translate-y-0.5"
                  >
                    Entrar no WhatsApp
                  </TrackedLink>
                </div>
              </li>
            </ol>

          </>
        )}
      </div>
    </main>
  );
}
