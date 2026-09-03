import { notFound, redirect } from "next/navigation";
import { publicStorageUrl } from "@/lib/storage";
import Link from "next/link";
import Image from "next/image";
import {
  getHackathonBySlug,
  isRegistrationOpen,
  isFinalistsVisible,
  registrationClosesWithSubmission,
} from "@/lib/hackathon";
import { getRegistration, isRegistrationComplete } from "@/lib/registration";
import { resolveAuthenticatedUserState } from "@/lib/user-state";
import { resolveRoleState } from "@/lib/roles";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { logQueryError } from "@/lib/supabase/unwrap";
import { listSponsors, groupByTier } from "@/lib/sponsors";

import { EditionPageDoc } from "@/components/edition/page-doc";
import { EditionFacts } from "@/components/edition/edition-facts";
import { Countdown } from "@/components/ui/countdown";
import { BackLink } from "@/components/ui/back-link";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const hackathon = await getHackathonBySlug(slug);
  if (!hackathon || hackathon.status === "draft") return {};
  // External editions redirect out — their LP owns the preview card, not us.
  if (hackathon.external_url) return {};

  const description = hackathon.description ?? hackathon.tagline ?? undefined;
  return {
    title: hackathon.name,
    description,
    openGraph: {
      title: hackathon.name,
      description,
      ...(hackathon.cover_image_path
        ? {
            images: [
              publicStorageUrl("hackathon-covers", hackathon.cover_image_path),
            ],
          }
        : {}),
    },
  };
}


export default async function EditionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const hackathon = await getHackathonBySlug(slug);
  if (!hackathon || hackathon.status === "draft") notFound();
  // External editions live elsewhere — deep links forward to their LP.
  if (hackathon.external_url) redirect(hackathon.external_url);

  const open = isRegistrationOpen(hackathon);

  const viewer = await resolveAuthenticatedUserState();
  // Registration, roles and sponsors are mutually independent — one batch.
  const [viewerRegistration, roles, sponsorRows] = await Promise.all([
    viewer ? getRegistration(viewer.userId, hackathon.id) : Promise.resolve(null),
    viewer ? resolveRoleState() : Promise.resolve(null),
    // The band degrades to no logos on a read failure; the throw exists only
    // so unstable_cache never stores the transient error.
    listSponsors(hackathon.id).catch(() => []),
  ]);
  const registered = viewer !== null && isRegistrationComplete(viewerRegistration);
  const canEdit =
    (roles?.isAdmin ?? false) || (roles?.adminFor.includes(hackathon.id) ?? false);

  const sponsors = groupByTier(sponsorRows);

  const coverUrl = hackathon.cover_image_path
    ? publicStorageUrl("hackathon-covers", hackathon.cover_image_path)
    : null;

  // teams has no anon select policy, so the public results list goes through
  // the service role — this stays server-side and never reaches the browser.
  let finalists: Array<{ teamId: string; teamName: string; placement: number | null }> = [];
  if (isFinalistsVisible(hackathon)) {
    const sr = await createServiceRoleClient();
    const { data: rows, error: finalistsError } = await sr
      .from("teams")
      .select("id, name, placement")
      .eq("hackathon_id", hackathon.id)
      .eq("is_finalist", true)
      .order("placement", { ascending: true, nullsFirst: false });
    // The public reveal degrades to no list rather than an error banner.
    if (finalistsError) logQueryError("public.landing.finalists", finalistsError);
    finalists = ((rows as Array<{ id: string; name: string; placement: number | null }> | null) ??
      []).map((r) => ({ teamId: r.id, teamName: r.name, placement: r.placement }));
  }

  // The hero counts down to whatever comes next in the edition's life:
  // inscriptions, then submissions, then Pitch Day. Null once it is all over.
  // Server component, one render per request — "now" is a request input.
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();
  const countdownTarget =
    hackathon.registration_closes_at && new Date(hackathon.registration_closes_at).getTime() > nowMs
      ? {
          label: registrationClosesWithSubmission(hackathon)
            ? "Inscrições e submissões encerram em"
            : "Inscrições encerram em",
          iso: hackathon.registration_closes_at,
        }
      : new Date(hackathon.submission_deadline_at).getTime() > nowMs
        ? { label: "Submissões encerram em", iso: hackathon.submission_deadline_at }
        : hackathon.presential_at && new Date(hackathon.presential_at).getTime() > nowMs
          ? { label: "Pitch Day em", iso: hackathon.presential_at }
          : null;

  return (
    <div>
      <section
        className="relative overflow-hidden px-4 pb-6 pt-8 sm:px-6 lg:px-8 lg:pt-14"
        aria-label={hackathon.name}
      >
        {/* The brand's organic shapes, same treatment as the LP and the hub:
            yellow anchors the copy on the left, emerald bleeds the top-right
            behind the cover. Desktop and tablet only. */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div
            className="morth animate-float-a absolute hidden bg-yellow sm:-left-32 sm:top-[60%] sm:block sm:h-[22rem] sm:w-[22rem] lg:-left-44 lg:top-[66%] lg:h-[30rem] lg:w-[30rem] 2xl:-left-52 2xl:h-[38rem] 2xl:w-[38rem]"
            style={{ maskImage: "url(/brand/stbr/elements/morth-07.svg)", WebkitMaskImage: "url(/brand/stbr/elements/morth-07.svg)", transform: "rotate(14deg)" }}
          />
          <div
            className="morth animate-float-b absolute hidden bg-emerald sm:-right-36 sm:-top-16 sm:block sm:h-[20rem] sm:w-[20rem] lg:-right-44 lg:-top-24 lg:h-[28rem] lg:w-[28rem] 2xl:-right-56 2xl:h-[36rem] 2xl:w-[36rem]"
            style={{ maskImage: "url(/brand/stbr/elements/morth-12.svg)", WebkitMaskImage: "url(/brand/stbr/elements/morth-12.svg)", transform: "rotate(-9deg)" }}
          />
        </div>
        <div className="relative mx-auto mb-8 max-w-6xl">
          <BackLink href="/h" label="Hackathons" />
        </div>

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-16">
          <div>
            <p
              className={`mt-5 inline-flex items-center gap-2.5 rounded-full px-4 py-2 text-sm font-semibold ${
                open ? "bg-green-dark text-surface" : "border-2 border-green-dark/20 bg-surface-raised text-muted"
              }`}
            >
              {open && (
                <span className="relative flex h-2 w-2">
                  <span className="absolute h-full w-full animate-ping rounded-full bg-yellow/70" />
                  <span className="relative h-2 w-2 rounded-full bg-yellow" />
                </span>
              )}
              {open ? "Inscrições abertas" : "Inscrições encerradas"}
            </p>

            <h1 className="mt-5 font-heading font-black uppercase leading-[0.95] tracking-tight">
              <span className="block text-4xl [font-stretch:120%] sm:text-6xl">
                {hackathon.name.split(" ")[0]}
              </span>
              {hackathon.name.split(" ").length > 1 && (
                <span className="mt-3 inline-block -rotate-1 bg-green-dark px-4 py-1.5 text-2xl text-yellow [font-stretch:110%] sm:text-4xl">
                  {hackathon.name.split(" ").slice(1).join(" ")}
                </span>
              )}
            </h1>
            {hackathon.tagline && (
              <p className="mt-4 max-w-lg text-lg leading-relaxed text-muted">{hackathon.tagline}</p>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
              {registered ? (
                <Link
                  href={`/h/${hackathon.slug}/dashboard`}
                  className="btn-primary px-10 py-4 text-lg shadow-sticker"
                >
                  Acessar painel
                </Link>
              ) : open ? (
                <Link
                  href={`/h/${hackathon.slug}/register`}
                  className="btn-primary px-10 py-4 text-lg shadow-sticker"
                >
                  Fazer inscrição
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="btn-primary cursor-not-allowed opacity-60"
                >
                  Inscrições encerradas
                </button>
              )}

              {countdownTarget && (
                <div className="inline-block rounded-2xl border-2 border-green-dark bg-surface-raised px-5 py-3 shadow-sticker">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald">
                    {countdownTarget.label}
                  </p>
                  <Countdown
                    deadlineIso={countdownTarget.iso}
                    variant="segments"
                    size="md"
                    className="mt-1.5 !justify-start !gap-3"
                  />
                </div>
              )}
            </div>
          </div>

          {coverUrl && (
            <div className="relative rotate-2 rounded-2xl border-4 border-green-dark bg-green-dark shadow-[14px_14px_0_rgba(27,35,29,0.9)] transition-transform duration-300 hover:rotate-0">
              <div
                aria-hidden
                className="absolute -top-4 left-1/2 z-10 h-8 w-28 -translate-x-1/2 -rotate-2 rounded-sm bg-yellow/90 shadow-sm"
              />
              <div className="overflow-hidden rounded-xl">
              <Image
                src={coverUrl}
                alt={`Arte do ${hackathon.name}`}
                width={1080}
                height={1080}
                priority
                className="h-auto w-full"
                sizes="(max-width: 1024px) 100vw, 45vw"
              />
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="px-4 pb-8 pt-16 sm:px-6 lg:px-8" aria-label="Informações da edição">
        <div className="mx-auto max-w-6xl">
          <EditionFacts hackathon={hackathon} />
        </div>
      </section>

      {hackathon.page_md != null && (
        <div className="relative pt-20">
          {canEdit && (
            <div className="pointer-events-none absolute inset-x-4 top-6 z-20 sm:inset-x-6 lg:inset-x-8">
              <div className="mx-auto flex max-w-6xl justify-end">
                <Link
                  href={`/admin/h/${hackathon.slug}/page`}
                  className="pointer-events-auto rounded-full border-2 border-green-dark bg-surface-raised px-3.5 py-1 text-xs font-bold text-ink transition-colors hover:bg-green-dark hover:text-surface"
                >
                  Editar página ✎
                </Link>
              </div>
            </div>
          )}
          <EditionPageDoc
            doc={hackathon.page_md}
            ctx={{
              sponsors,
              finalists,
              finalistsVisible: isFinalistsVisible(hackathon),
              startsAt: hackathon.starts_at,
            }}
          />
        </div>
      )}

    </div>
  );
}
