import Link from "next/link";
import { PAGE_SHELL } from "@/components/layout/container";

export const metadata = {
  title: "Lab (preview)",
  robots: { index: false, follow: false },
};

export default function LabHub() {
  return (
    <div className={`${PAGE_SHELL} py-16`}>
      <p className="flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-ink/75">
        <span
          aria-hidden
          className="h-[7px] w-[18px] shrink-0 rounded-[2px] bg-emerald"
        />
        Preview
      </p>
      <h1 className="mt-4 font-heading text-4xl font-black uppercase tracking-tight">
        Laboratório
      </h1>
      <p className="mt-4 max-w-xl text-pretty text-ink/70">
        Peças fora do ar, para olhar com calma. Nada daqui entra no site
        publicado.
      </p>
      <ul className="mt-10 grid gap-4 sm:max-w-lg">
        <li>
          <Link
            href="/lab/hero?set=final"
            className="block rounded-2xl border-2 border-green-dark bg-surface-raised p-5 shadow-sticker transition-colors duration-(--dur-instant) ease-entrada hover:bg-surface"
          >
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-green-dark/70">
              Hero
            </p>
            <p className="mt-1 font-heading text-2xl font-black uppercase">
              Oito territórios
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ink/70">
              Manchete, Coliseu, legionário, ticket e botões. Quatro
              finalistas para decidir.
            </p>
          </Link>
        </li>
        <li>
          <Link
            href="/lab/legionario"
            className="block rounded-2xl border-2 border-green-dark/30 bg-surface-raised p-5 transition-colors duration-(--dur-instant) ease-entrada hover:border-green-dark"
          >
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-ink/45">
              Outra peça
            </p>
            <p className="mt-1 font-heading text-xl font-black uppercase">
              Legionário
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ink/70">
              A chapa sozinha e a régua de tom. O palco vive em Oito
              territórios.
            </p>
          </Link>
        </li>
      </ul>
    </div>
  );
}
