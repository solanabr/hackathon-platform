"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { LAB_FINALISTS, LAB_LIVE, labVariantById } from "./catalog";

function isTypingTarget(el: EventTarget | null) {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export function LabSwitcher({
  current,
  setFilter,
}: {
  current: string;
  setFilter?: string;
}) {
  const router = useRouter();
  const finalsOnly = setFilter === "final";
  const list = finalsOnly ? LAB_FINALISTS : LAB_LIVE;
  const isIndex = current === "indice" || !current;
  const idx = list.findIndex((v) => v.id === current);
  const meta = labVariantById(current);

  const go = (id: string) => {
    const qs = new URLSearchParams();
    qs.set("v", id);
    if (finalsOnly) qs.set("set", "final");
    router.replace(`/lab/hero?${qs.toString()}`, { scroll: false });
  };

  const cycle = (dir: -1 | 1) => {
    if (list.length === 0) return;
    if (isIndex) {
      go(dir === 1 ? list[0].id : list[list.length - 1].id);
      return;
    }
    const from = idx < 0 ? 0 : idx;
    const next = (from + dir + list.length) % list.length;
    go(list[next].id);
  };

  useEffect(() => {
    const footer = document.querySelector("footer");
    if (footer) footer.setAttribute("hidden", "");
    return () => footer?.removeAttribute("hidden");
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        cycle(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        cycle(1);
      } else if (e.key === "0" || e.key === "i") {
        const qs = finalsOnly ? "?set=final" : "";
        router.replace(`/lab/hero${qs}`, { scroll: false });
      } else if (/^[1-8]$/.test(e.key)) {
        const n = Number(e.key) - 1;
        if (list[n]) go(list[n].id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // cycle/go close over the current list; re-bind when the piece changes.
  }, [current, finalsOnly, idx, isIndex, list, router]);

  if (process.env.NODE_ENV === "production") return null;

  const label = isIndex
    ? "Índice"
    : `${meta?.n ?? "—"}  ${meta?.name ?? current}`;

  return (
    <div
      data-lab-switcher
      className="pointer-events-none fixed top-[5.5rem] right-4 z-40 flex flex-col items-end gap-2"
    >
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border-2 border-green-dark bg-ink px-1.5 py-1.5 text-surface shadow-sticker">
        <button
          type="button"
          onClick={() => cycle(-1)}
          className="flex size-8 items-center justify-center rounded-full text-surface transition-colors duration-(--dur-instant) ease-entrada hover:bg-surface/10"
          aria-label="Peça anterior"
        >
          <CaretLeftIcon size={16} weight="bold" />
        </button>
        <p className="min-w-[9.5rem] px-2 text-center font-mono text-[11px] font-bold uppercase tracking-[0.16em]">
          {label}
        </p>
        <button
          type="button"
          onClick={() => cycle(1)}
          className="flex size-8 items-center justify-center rounded-full text-surface transition-colors duration-(--dur-instant) ease-entrada hover:bg-surface/10"
          aria-label="Próxima peça"
        >
          <CaretRightIcon size={16} weight="bold" />
        </button>
      </div>

      <div className="pointer-events-auto flex flex-wrap justify-end gap-1.5">
        <Link
          href={finalsOnly ? "/lab/hero?set=final" : "/lab/hero"}
          className={`rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] transition-colors duration-(--dur-instant) ease-entrada ${
            isIndex
              ? "border-green-dark bg-yellow text-green-dark"
              : "border-green-dark/30 bg-surface text-ink/70 hover:border-green-dark hover:text-ink"
          }`}
        >
          Índice
        </Link>
        <Link
          href="/lab/hero?set=final"
          className={`rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] transition-colors duration-(--dur-instant) ease-entrada ${
            finalsOnly
              ? "border-green-dark bg-yellow text-green-dark"
              : "border-green-dark/30 bg-surface text-ink/70 hover:border-green-dark hover:text-ink"
          }`}
        >
          4 finalistas
        </Link>
        <Link
          href="/lab/hero"
          className={`rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] transition-colors duration-(--dur-instant) ease-entrada ${
            !finalsOnly
              ? "border-green-dark bg-ink text-surface"
              : "border-green-dark/30 bg-surface text-ink/70 hover:border-green-dark hover:text-ink"
          }`}
        >
          Todas
        </Link>
      </div>
    </div>
  );
}
