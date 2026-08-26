import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { extractOutline, slugifyHeading, type OutlineEntry } from "@/lib/page-doc";
import type { SponsorLogo } from "@/lib/sponsors";
import type { SponsorTier } from "@/types/db";

const H2 =
  "text-balance font-heading text-3xl font-black uppercase leading-tight tracking-tight [font-stretch:118%] sm:text-4xl";

export type Finalist = { teamId: string; teamName: string; placement: number | null };

export type DocContext = {
  sponsors: Record<SponsorTier, SponsorLogo[]>;
  finalists: Finalist[];
  finalistsVisible: boolean;
};

/**
 * The page body is the edition's markdown document — headings, paragraphs,
 * lists and tables, all hand-written in the page editor. Only two things
 * are not the document's to write: the finalists grid (appears once the
 * announcement date passes) and the sponsor band from Marcas, rendered
 * after it so they can never be forgotten or mistyped.
 */
export function EditionPageDoc({ doc, ctx }: { doc: string; ctx: DocContext }) {
  const showFinalists = ctx.finalistsVisible && ctx.finalists.length > 0;
  const showPartners =
    ctx.sponsors.realizacao.length > 0 || ctx.sponsors.apoiador.length > 0;

  const outline: OutlineEntry[] = [
    ...extractOutline(doc),
    ...(showFinalists ? [{ id: "finalistas", text: "Finalistas" }] : []),
  ];
  const withNav = outline.length >= 2;

  return (
    <div className="px-4 pb-20 sm:px-6 lg:px-8">
      <div
        className={`mx-auto max-w-6xl ${
          withNav ? "lg:grid lg:grid-cols-[190px_minmax(0,1fr)] lg:items-start lg:gap-12" : ""
        }`}
      >
        {withNav && <OutlineNav outline={outline} />}

        <div className="min-w-0 space-y-14">
          {doc.trim() !== "" && <ProseDoc md={doc} />}
          {showFinalists && <FinalistsSection finalists={ctx.finalists} />}
          {showPartners && <PartnersSection sponsors={ctx.sponsors} />}
        </div>
      </div>
    </div>
  );
}

function OutlineNav({ outline }: { outline: OutlineEntry[] }) {
  return (
    <nav aria-label="Nesta página" className="sticky top-24 hidden self-start lg:block">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
        Nesta página
      </p>
      <ul className="mt-3 space-y-1 border-l-2 border-green-dark/10">
        {outline.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              className="-ml-0.5 block border-l-2 border-transparent py-1 pl-4 text-sm font-semibold text-muted transition-colors hover:border-emerald hover:text-ink"
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function ProseDoc({ md }: { md: string }) {
  return (
    <div className="prose-lp max-w-3xl">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => {
            const text = (Array.isArray(children) ? children : [children])
              .filter((c): c is string => typeof c === "string")
              .join(" ");
            return (
              <h2
                id={slugifyHeading(text)}
                className={`${H2} scroll-mt-28 [&:not(:first-child)]:mt-14`}
              >
                {children}
              </h2>
            );
          },
          p: ({ children }) => (
            <p className="mt-4 max-w-2xl leading-relaxed text-muted">{children}</p>
          ),
          table: ({ children }) => (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full max-w-2xl border-collapse text-left text-sm">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b-2 border-green-dark/15 py-3 pr-6 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-emerald">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-green-dark/10 py-3 pr-6 align-top leading-relaxed">
              {children}
            </td>
          ),
        }}
      >
        {md}
      </ReactMarkdown>
    </div>
  );
}

function FurnitureHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className={`${H2} scroll-mt-28`}>
      {children}
    </h2>
  );
}

function FinalistsSection({ finalists }: { finalists: Finalist[] }) {
  return (
    <section aria-label="Finalistas">
      <FurnitureHeading id="finalistas">Finalistas</FurnitureHeading>
      <p className="mt-3 max-w-2xl leading-relaxed text-muted">
        As equipes classificadas para a fase final.
      </p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {finalists.map((f) => (
          <li
            key={f.teamId}
            className="rounded-2xl border-2 border-green-dark/15 bg-surface-raised p-6"
          >
            {f.placement !== null && (
              <p className="font-mono text-sm font-bold tabular-nums text-emerald">
                {f.placement}º lugar
              </p>
            )}
            <h3 className="mt-1 font-heading text-lg font-bold">{f.teamName}</h3>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SponsorImage({ sponsor, className }: { sponsor: SponsorLogo; className: string }) {
  // Width/height reserve the box so the band doesn't reflow as logos land.
  // eslint-disable-next-line @next/next/no-img-element
  const img = (
    <img
      src={sponsor.src}
      alt={sponsor.name ?? ""}
      loading="lazy"
      decoding="async"
      width={190}
      height={64}
      className={`h-auto w-auto object-contain ${className}`}
    />
  );
  return sponsor.url ? (
    <a href={sponsor.url} target="_blank" rel="noopener noreferrer">
      {img}
    </a>
  ) : (
    img
  );
}

function PartnersSection({ sponsors }: { sponsors: Record<SponsorTier, SponsorLogo[]> }) {
  const { realizacao, apoiador } = sponsors;
  return (
    <section aria-label="Realização e apoiadores">
      <div className="rounded-3xl bg-green-dark px-8 py-12 shadow-[10px_10px_0_rgba(27,35,29,0.25)] sm:px-12">
        {realizacao.length > 0 && (
          <>
            <h2 className="text-center text-[11px] font-bold uppercase tracking-[0.2em] text-surface/50">
              Realização
            </h2>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-x-14 gap-y-8 sm:gap-x-20">
              {realizacao.map((p) => (
                <SponsorImage
                  key={p.id}
                  sponsor={p}
                  className="max-h-7 w-auto max-w-[190px] opacity-90 sm:max-h-8 sm:max-w-[218px]"
                />
              ))}
            </div>
          </>
        )}

        {apoiador.length > 0 && (
          <>
            {realizacao.length > 0 && (
              <div aria-hidden className="mx-auto mt-10 h-px max-w-xl bg-surface/15" />
            )}
            <h2 className="mt-10 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-surface/50">
              Apoiadores
            </h2>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-x-12 gap-y-8 sm:gap-x-16">
              {apoiador.map((sp) => (
                <SponsorImage
                  key={sp.id}
                  sponsor={sp}
                  className="max-h-9 w-auto max-w-[112px] opacity-80 sm:max-h-10 sm:max-w-[128px]"
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
