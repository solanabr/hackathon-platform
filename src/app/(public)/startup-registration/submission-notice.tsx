import { ArrowUpRightIcon, WarningIcon } from "@phosphor-icons/react/dist/ssr";
import { TrackedCta } from "@/components/ui/tracked-cta";
import { withPlatformUtm } from "@/lib/attribution";
import { COLOSSEUM_ARENA_URL, COLOSSEUM_SLUG, TRILHA_BRASIL_EARN_URL } from "../pre-registro/constants";

const LINK =
  "mt-3 inline-flex items-center gap-1.5 rounded-full bg-green-dark px-5 py-2 text-sm font-bold text-surface transition-transform duration-(--dur-instant) ease-mola hover:-translate-y-0.5";

const PLACES = [
  {
    target: "colosseum_arena",
    title: "Hackathon do Colosseum",
    text: "É a submissão que vale para o hackathon.",
    cta: "Enviar no Colosseum",
    href: COLOSSEUM_ARENA_URL,
  },
  {
    target: "trilha_brasil",
    title: "Trilha Brasil, no Superteam Earn",
    text: "US$ 5 mil para times brasileiros com projeto na Solana. É o mesmo projeto, enviado também lá.",
    cta: "Enviar na Trilha Brasil",
    href: withPlatformUtm(TRILHA_BRASIL_EARN_URL, { content: "submissao_trilha_brasil" }),
  },
] as const;

/** Filling our form submits nothing: say so wherever the form is offered. */
export function SubmissionNotice({ location }: { location: "startup_form" | "dashboard" }) {
  return (
    <div role="note" className="rounded-2xl border-2 border-green-dark bg-yellow p-5 shadow-sticker">
      <p className="flex items-center gap-2 font-heading text-lg font-black uppercase leading-tight text-green-dark">
        <WarningIcon size={22} weight="fill" aria-hidden className="shrink-0" />
        Isto não é a submissão oficial
      </p>
      <p className="mt-2 text-sm leading-relaxed text-green-dark">
        Esta página serve só para o time da Superteam Brasil acompanhar seu projeto e mandar feedback. Para concorrer,
        envie o projeto nos dois lugares até <strong>12 de outubro</strong>:
      </p>
      <ol className="mt-4 space-y-3">
        {PLACES.map((place, i) => (
          <li key={place.target} className="rounded-xl border-2 border-green-dark bg-surface-raised p-4">
            <p className="font-heading text-base font-bold text-ink">
              {i + 1}. {place.title}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted">{place.text}</p>
            <TrackedCta
              href={place.href}
              event="campaign_link_clicked"
              properties={{ target: place.target, location, edition: COLOSSEUM_SLUG }}
              className={LINK}
            >
              {place.cta}
              <ArrowUpRightIcon size={14} weight="bold" aria-hidden />
            </TrackedCta>
          </li>
        ))}
      </ol>
    </div>
  );
}
