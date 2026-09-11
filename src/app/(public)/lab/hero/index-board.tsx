import Link from "next/link";
import { PAGE_SHELL } from "@/components/layout/container";
import { LAB_FINALISTS, LAB_VARIANTS, type LabVariant } from "./catalog";

function Schematic({ id }: { id: string }) {
  const slot = (cls: string) => (
    <span aria-hidden className={`absolute rounded-[2px] ${cls}`} />
  );

  return (
    <div className="relative aspect-[16/9] overflow-hidden rounded-lg border border-green-dark/20 bg-surface">
      {id === "atual" && (
        <>
          {slot("bottom-0 left-0 h-[58%] w-[62%] bg-green-dark/25")}
          {slot("bottom-0 right-[2%] h-[72%] w-[18%] bg-ink/45")}
          {slot("left-1/2 top-[18%] h-[28%] w-[44%] -translate-x-1/2 bg-ink/20")}
          {slot("bottom-[8%] left-1/2 h-[10%] w-[36%] -translate-x-1/2 bg-emerald/70")}
          {slot("bottom-[6%] right-[2%] h-[22%] w-[38%] bg-yellow")}
        </>
      )}
      {id === "editorial" && (
        <>
          {slot("bottom-0 left-0 h-[48%] w-[46%] bg-green-dark/20")}
          {slot("bottom-0 right-0 h-[90%] w-[34%] bg-ink/45")}
          {slot("left-[6%] top-[16%] h-[36%] w-[38%] bg-ink/20")}
          {slot("left-[6%] top-[54%] h-[10%] w-[32%] bg-emerald/70")}
          {slot("bottom-[6%] left-[6%] h-[18%] w-[32%] bg-yellow")}
        </>
      )}
      {id === "paisagem" && (
        <>
          {slot("inset-x-0 bottom-0 h-[48%] bg-green-dark/25")}
          {slot("bottom-0 left-[36%] h-[52%] w-[14%] bg-ink/45")}
          {slot("left-[6%] top-[12%] h-[32%] w-[46%] bg-ink/20")}
          {slot("left-[6%] top-[48%] h-[9%] w-[32%] bg-emerald/70")}
          {slot("bottom-[6%] right-[4%] h-[20%] w-[34%] bg-yellow")}
        </>
      )}
      {id === "cartaz" && (
        <>
          {slot("bottom-0 right-0 h-[92%] w-[58%] bg-green-dark/30")}
          {slot("bottom-0 left-[42%] h-[80%] w-[16%] bg-ink/45")}
          {slot("left-[5%] top-[14%] h-[36%] w-[30%] bg-surface-raised shadow-sticker")}
          {slot("left-[8%] top-[54%] h-[9%] w-[26%] bg-emerald/70")}
          {slot("bottom-[8%] left-[5%] h-[18%] w-[32%] bg-yellow")}
        </>
      )}
      {id === "friso" && (
        <>
          {slot("inset-x-0 bottom-0 h-[44%] bg-green-dark/25")}
          {slot("bottom-0 right-0 h-[70%] w-[16%] bg-ink/45")}
          {slot("left-[6%] top-[10%] h-[28%] w-[70%] bg-ink/20")}
          {slot("left-[6%] top-[42%] h-[9%] w-[28%] bg-emerald/70")}
          {slot("left-[36%] top-[42%] h-[9%] w-[22%] bg-emerald/35")}
          {slot("bottom-[6%] left-[32%] h-[20%] w-[30%] bg-yellow")}
        </>
      )}
      {id === "dock" && (
        <>
          {slot("inset-x-[8%] bottom-[10%] h-[46%] bg-green-dark/25")}
          {slot("bottom-0 right-[8%] h-[64%] w-[16%] bg-ink/45")}
          {slot("left-[6%] top-[10%] h-[28%] w-[52%] bg-ink/20")}
          {slot("right-[6%] top-[14%] h-[9%] w-[22%] bg-emerald/70")}
          {slot("right-[6%] top-[26%] h-[9%] w-[22%] bg-emerald/35")}
          {slot("bottom-[4%] right-[4%] h-[18%] w-[38%] bg-yellow")}
        </>
      )}
      {id === "trilho" && (
        <>
          {slot("bottom-0 left-0 h-[58%] w-[52%] bg-green-dark/25")}
          {slot("bottom-0 left-[48%] h-[78%] w-[16%] bg-ink/45")}
          {slot("left-[6%] top-[12%] h-[30%] w-[42%] bg-ink/20")}
          {slot("right-[4%] bottom-[28%] h-[20%] w-[26%] bg-yellow")}
          {slot("right-[4%] bottom-[16%] h-[9%] w-[24%] bg-emerald/70")}
          {slot("right-[4%] bottom-[6%] h-[9%] w-[24%] bg-emerald/35")}
        </>
      )}
      {id === "objeto" && (
        <>
          {slot("inset-x-0 bottom-0 h-[34%] bg-green-dark/20")}
          {slot("bottom-0 right-0 h-[94%] w-[38%] bg-ink/50")}
          {slot("left-[6%] top-[18%] h-[32%] w-[40%] bg-ink/20")}
          {slot("left-[6%] top-[54%] h-[9%] w-[24%] bg-emerald/70")}
          {slot("right-[6%] bottom-[6%] h-[20%] w-[28%] bg-yellow")}
        </>
      )}
    </div>
  );
}

function Card({
  variant,
  href,
}: {
  variant: LabVariant;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-2xl border-2 border-green-dark bg-surface-raised p-3 shadow-sticker transition-colors duration-(--dur-instant) ease-entrada hover:bg-surface"
    >
      <Schematic id={variant.id} />
      <div className="mt-3 flex items-baseline justify-between gap-3 px-1">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ink/55">
          {variant.n}
        </p>
        {variant.finalist ? (
          <span className="bg-yellow px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-green-dark">
            Finalista
          </span>
        ) : variant.id === "atual" ? (
          <span className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-ink/40">
            Controle
          </span>
        ) : null}
      </div>
      <h2 className="mt-1 px-1 font-heading text-xl font-black uppercase tracking-tight text-ink">
        {variant.name}
      </h2>
      <p className="mt-2 px-1 text-pretty text-sm leading-relaxed text-ink/70">
        {variant.thesis}
      </p>
      <p className="mt-2 px-1 font-mono text-[10px] uppercase tracking-[0.12em] text-green-dark/70">
        {variant.tests}
      </p>
    </Link>
  );
}

export function LabIndex({ finalsOnly }: { finalsOnly: boolean }) {
  const list = finalsOnly ? LAB_FINALISTS : LAB_VARIANTS;
  const suffix = finalsOnly ? "&set=final" : "";

  return (
    <div data-lab-hero className="bg-surface pb-24 pt-10 text-ink">
      <div className={PAGE_SHELL}>
        <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-ink/75">
          <span
            aria-hidden
            className="h-[7px] w-[18px] shrink-0 rounded-[2px] bg-emerald"
          />
          Laboratório do hero
        </p>
        <h1 className="mt-4 max-w-4xl font-heading text-[clamp(2.2rem,5vw,4.25rem)] font-black uppercase leading-[0.92] tracking-[-0.04em] text-ink [font-stretch:115%]">
          {finalsOnly ? "As quatro que ficaram" : "Oito territórios"}
        </h1>
        <p className="mt-5 max-w-2xl text-pretty text-base leading-relaxed text-ink/70 sm:text-lg">
          {finalsOnly
            ? "Mesmos elementos, quatro decisões diferentes de palco. Abra cada uma em tela cheia e use as setas."
            : "Mesmos elementos — manchete, Coliseu, legionário, ticket, dois botões. Oito jeitos de repartir o palco. As quatro finalistas estão carimbadas."}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/lab/hero?set=final"
            className={`rounded-full border-2 px-4 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.16em] ${
              finalsOnly
                ? "border-green-dark bg-yellow text-green-dark"
                : "border-green-dark/30 text-ink/70 hover:border-green-dark hover:text-ink"
            }`}
          >
            4 finalistas
          </Link>
          <Link
            href="/lab/hero"
            className={`rounded-full border-2 px-4 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.16em] ${
              !finalsOnly
                ? "border-green-dark bg-ink text-surface"
                : "border-green-dark/30 text-ink/70 hover:border-green-dark hover:text-ink"
            }`}
          >
            Todas as peças
          </Link>
          {LAB_FINALISTS[0] ? (
            <Link
              href={`/lab/hero?v=${LAB_FINALISTS[0].id}&set=final`}
              className="rounded-full border-2 border-green-dark bg-emerald-deep px-4 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-surface"
            >
              Abrir ao vivo →
            </Link>
          ) : null}
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {list.map((variant) => (
            <Card
              key={variant.id}
              variant={variant}
              href={`/lab/hero?v=${variant.id}${suffix}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
