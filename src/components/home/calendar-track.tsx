"use client";

import { useEffect, useState } from "react";
import { CalendarPlusIcon } from "@phosphor-icons/react/dist/ssr";

export type CalendarItem = {
  day?: string;
  label: string;
  title: string;
  body: string;
  href?: string;
  /* When the step starts. Without a date a step never becomes current on
     its own — the case of "Em breve", which only the announcement resolves. */
  startsAt?: string;
  /* The step whose end is the deadline: gets the live counter and the calendar. */
  isDeadline?: boolean;
};

/* A calendar that marks the same step in September and in October is a
   picture, not a calendar. State comes from the date: everything that has
   started is past, the last thing that started is now, the rest is yet to come. */
function stepFromDates(items: CalendarItem[], nowMs: number): number {
  let current = 0;
  items.forEach((item, i) => {
    if (item.startsAt && new Date(item.startsAt).getTime() <= nowMs) current = i;
  });
  return current;
}

function googleCalendarUrl(deadlineIso: string): string {
  const end = new Date(deadlineIso);
  const start = new Date(end.getTime() - 3_600_000);
  const stamp = (d: Date) => d.toISOString().replace(/[-:]|\.\d{3}/g, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: "Deadline de submissão — Hackathon Colosseum",
    dates: `${stamp(start)}/${stamp(end)}`,
    details:
      "Envie o projeto pela plataforma oficial do Colosseum antes deste horário.",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

const RAIL = "absolute left-[5.25rem] w-px -translate-x-1/2";
/* The gradient cut is exactly the dot's height: the rail arrives coloured up
   to the current step's marker and continues faded after it. */
const RAIL_SPLIT =
  "[background:linear-gradient(to_bottom,var(--color-emerald)_0_2.125rem,rgb(27_35_29/0.15)_2.125rem)]";

export function CalendarTrack({
  items,
  deadlineIso,
}: {
  items: CalendarItem[];
  deadlineIso: string;
}) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const current = stepFromDates(items, nowMs);

  return (
    <ol className="relative mx-6 mb-6 mt-5 flex flex-1 flex-col overflow-hidden rounded-2xl border-2 border-green-dark bg-surface-raised px-5 py-2 sm:mx-8 sm:mb-8 sm:mt-6 sm:px-6 sm:py-3">
      {items.map((item, i) => {
        const done = i < current;
        const now = i === current;
        const first = i === 0;
        const last = i === items.length - 1;
        /* A step whose label is already the word "agora" does not get the
           badge: saying the same thing twice in the same pair of lines is noise. */
        const saysNow = item.label.trim().toLowerCase() === "agora";

        /* The rail is a single line broken only by the dots: coloured up to
           the current step's marker and faded from there down. The first step
           has only the lower stretch, the last only the upper — which is why
           the gradient fits only in the middle. */
        const railTone =
          done || (now && last)
            ? "bg-emerald"
            : now && !first
              ? RAIL_SPLIT
              : "bg-green-dark/15";

        return (
          <li
            key={item.title}
            aria-current={now ? "step" : undefined}
            className={`group relative flex grow gap-5 py-4 ${
              i > 0 ? "border-t border-green-dark/15" : ""
            }`}
          >
            {/* The highlight bleeds to the panel edge instead of stopping at
                the list padding: a band that dies halfway reads as an
                alignment error, not as state. */}
            <span
              aria-hidden
              className={`pointer-events-none absolute inset-y-0 -left-5 -right-5 transition-colors duration-(--dur-instant) ease-entrada sm:-left-6 sm:-right-6 ${
                now
                  ? "bg-emerald/[0.055]"
                  : "bg-transparent group-hover:bg-green-dark/[0.03]"
              }`}
            />
            <span
              aria-hidden
              className={`${RAIL} ${railTone} ${
                first
                  ? "bottom-0 top-[2.125rem]"
                  : last
                    ? "top-0 h-[2.125rem]"
                    : "inset-y-0"
              }`}
            />
            <span
              aria-hidden
              className={`absolute left-[5.25rem] top-[2.125rem] h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-(--dur-rapida) ease-mola ${
                now
                  ? "scale-110 bg-emerald ring-4 ring-emerald/20"
                  : done
                    ? "bg-emerald"
                    : "border border-green-dark/30 bg-surface-raised group-hover:border-emerald group-hover:bg-emerald/20"
              }`}
            />

            <div className="w-16 shrink-0 text-right">
              {item.day ? (
                <>
                  <p
                    className={`flex h-9 items-center justify-end font-heading text-4xl font-black leading-none tabular-nums [font-stretch:112%] ${
                      now ? "text-emerald-deep" : done ? "text-muted" : "text-ink"
                    }`}
                  >
                    {item.day}
                  </p>
                  <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-widest text-green-dark/70">
                    {item.label}
                  </p>
                </>
              ) : (
                <p
                  className={`flex h-9 items-center justify-end text-balance font-heading text-base font-black uppercase leading-tight [font-stretch:112%] ${
                    now ? "text-emerald-deep" : "text-green-dark/70"
                  }`}
                >
                  {item.label}
                </p>
              )}
            </div>

            <div className="min-w-0 flex-1 pl-5 pt-1.5">
              <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-heading text-base font-bold text-ink">
                {item.href ? (
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-sm underline decoration-yellow decoration-4 underline-offset-4 transition-colors duration-(--dur-instant) ease-entrada hover:text-emerald-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-deep focus-visible:ring-offset-2 focus-visible:ring-offset-surface-raised"
                  >
                    {item.title}
                  </a>
                ) : (
                  item.title
                )}
                {now && !saysNow && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald/12 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-deep">
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 rounded-full bg-emerald bento-pulse"
                    />
                    Acontecendo agora
                  </span>
                )}
              </p>
              <p
                className={`mt-1 text-pretty text-sm leading-snug ${
                  done ? "text-muted/80" : "text-muted"
                }`}
              >
                {item.body}
              </p>

              {/* The step that decides the hackathon is the only one that gets an action. */}
              {item.isDeadline && (
                <a
                  href={googleCalendarUrl(deadlineIso)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-green-dark/20 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-green-dark/70 transition-colors duration-(--dur-instant) ease-entrada hover:border-emerald hover:bg-emerald/10 hover:text-emerald-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-deep"
                >
                  <CalendarPlusIcon weight="bold" className="h-3.5 w-3.5" />
                  Adicionar à agenda
                </a>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
