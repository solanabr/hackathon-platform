import { SectionCard } from "@/components/ui/section-card";
import { buildMilestones } from "@/lib/milestones";
import { DAY_MONTH, stripPeriods } from "@/lib/dates";
import type { Hackathon } from "@/types/db";

function d(iso: string): string {
  return stripPeriods(DAY_MONTH.format(new Date(iso)));
}

/**
 * The DoraHacks-style event panel, in the painel where the operational view
 * belongs: dated timeline with the current step marked, and the door to the
 * community group for questions. Reads only columns every edition has.
 */
export function EditionInfoCard({ hackathon }: { hackathon: Hackathon }) {
  const now = Date.now();
  const rows = buildMilestones(hackathon);

  const nextIdx = rows.findIndex((r) => new Date(r.at).getTime() > now);

  return (
    <SectionCard sticker title="Datas e dúvidas">
      <ol className="space-y-2.5">
        {rows.map((row, i) => {
          const done = new Date(row.at).getTime() <= now;
          const current = i === nextIdx;
          return (
            <li key={row.key} className="flex items-center justify-between gap-3 text-sm">
              <span
                className={`flex items-center gap-2.5 font-semibold ${
                  done ? "text-muted line-through decoration-muted/50" : current ? "text-ink" : "text-muted"
                }`}
              >
                <span
                  aria-hidden
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    current ? "bg-yellow-strong" : done ? "bg-green-dark/25" : "bg-emerald/50"
                  }`}
                />
                {row.label}
              </span>
              <span className={`font-bold uppercase tabular-nums ${current ? "text-emerald" : "text-muted"}`}>
                {row.detail}
              </span>
            </li>
          );
        })}
      </ol>

      {(hackathon.community_url || hackathon.rules_url) && (
        <div className="mt-5 border-t-2 border-green-dark/10 pt-4">
          <div className="flex flex-wrap items-center gap-2.5">
            {hackathon.community_url && (
              <a
                href={hackathon.community_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border-2 border-green-dark px-5 py-2 text-sm font-bold text-ink transition-colors duration-150 hover:bg-green-dark hover:text-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-dark focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              >
                Tirar dúvida no grupo
              </a>
            )}
            {hackathon.rules_url && (
              <a
                href={hackathon.rules_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border-2 border-green-dark/20 px-5 py-2 text-sm font-bold text-muted transition-colors duration-150 hover:border-green-dark hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-dark focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              >
                Regulamento
              </a>
            )}
          </div>
          {hackathon.community_url && (
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Mentores e organização respondem por lá durante todo o evento.
            </p>
          )}
        </div>
      )}
    </SectionCard>
  );
}
