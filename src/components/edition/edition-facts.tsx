import { DAY_MONTH, DAY_MONTH_LONG, TIME_HM, stripPeriods } from "@/lib/dates";
import type { Hackathon } from "@/types/db";

type Fact = {
  key: string;
  label: string;
  value: string;
  detail?: string | null;
  icon: React.ReactNode;
  lead?: boolean;
};

const day = (iso: string) => stripPeriods(DAY_MONTH.format(new Date(iso)));

/**
 * The prize column is one long sentence — "US$ 3.000 em dinheiro, divididos
 * entre os quatro primeiros · US$ 200 em tokens…". A card wants a headline and
 * a caption, so the leading amount becomes the headline and the sentence the
 * caption. No amount written, no headline: the sentence carries the card on
 * its own rather than a card rendering half-empty.
 */
function splitPrize(summary: string): { value: string; detail: string | null } {
  const amount = summary.match(/(?:US\$|R\$|\$)\s?[\d][\d.,]*/);
  if (!amount) return { value: summary, detail: null };
  const clause = summary.split("·")[0].trim();
  const detail = clause
    .slice(clause.indexOf(amount[0]) + amount[0].length)
    .replace(/^[\s,;–-]+/, "");
  return { value: amount[0], detail: detail || null };
}

const IconCalendar = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <rect x="3" y="5" width="18" height="16" rx="2.5" />
    <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
  </svg>
);

const IconPin = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <path d="M12 21s7-6.03 7-11a7 7 0 1 0-14 0c0 4.97 7 11 7 11Z" strokeLinejoin="round" />
    <circle cx="12" cy="10" r="2.6" />
  </svg>
);

const IconTrophy = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <path d="M7 4h10v6a5 5 0 0 1-10 0V4Z" strokeLinejoin="round" />
    <path d="M7 6H4v1a4 4 0 0 0 3 3.87M17 6h3v1a4 4 0 0 1-3 3.87" strokeLinecap="round" />
    <path d="M12 15v3m-3.5 2h7" strokeLinecap="round" />
  </svg>
);

const IconClock = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5.2l3.2 2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * The edition at a glance, straight from its typed columns — never from the
 * document, so these four can't drift from the dates the platform enforces.
 */
export function EditionFacts({ hackathon }: { hackathon: Hackathon }) {
  const deadline = new Date(hackathon.submission_deadline_at);
  const prize = hackathon.prize_summary ? splitPrize(hackathon.prize_summary) : null;

  const facts: Fact[] = [
    {
      key: "quando",
      label: "Quando",
      value: `${day(hackathon.starts_at)} a ${day(
        hackathon.presential_at ?? hackathon.submission_deadline_at,
      )}`,
      icon: IconCalendar,
    },
    {
      key: "onde",
      label: "Onde",
      value: hackathon.location_city ?? "Online",
      detail: hackathon.location_name,
      icon: IconPin,
    },
    {
      key: "prazo",
      label: "Prazo final",
      value: stripPeriods(DAY_MONTH_LONG.format(deadline)),
      detail: `Submissão até ${TIME_HM.format(deadline)}`,
      icon: IconClock,
    },
    ...(prize
      ? [
          {
            key: "premios",
            label: "Premiação",
            value: prize.value,
            detail: prize.detail,
            icon: IconTrophy,
            lead: true,
          },
        ]
      : []),
  ];

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {facts.map((fact) => (
        <li
          key={fact.key}
          className={`flex flex-col rounded-2xl border-2 bg-surface-raised p-6 ${
            fact.lead ? "border-green-dark shadow-sticker" : "border-green-dark/15"
          }`}
        >
          <span aria-hidden className="h-6 w-6 text-emerald">
            {fact.icon}
          </span>
          <p className="mt-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-emerald">
            {fact.label}
          </p>
          <p className="mt-1.5 text-balance font-heading text-2xl font-black leading-tight">
            {fact.value}
          </p>
          {fact.detail && (
            <p className="mt-2 text-sm leading-relaxed text-muted">{fact.detail}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
