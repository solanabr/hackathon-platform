"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react/dist/ssr";

export type CaseCard = {
  name: string;
  url: string;
  logo: string;
  result: string;
  tagline: string;
  body: ReactNode;
};

export function CasesRail({ cases, children }: { cases: CaseCard[]; children: ReactNode }) {
  const railRef = useRef<HTMLUListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);
  const [scrollable, setScrollable] = useState(false);

  const sync = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setScrollable(max > 8);
    setAtStart(el.scrollLeft <= 8);
    setAtEnd(el.scrollLeft >= max - 8);
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, [sync]);

  const scrollByCard = (direction: 1 | -1) => {
    const el = railRef.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    const step = card ? card.offsetWidth + 24 : el.clientWidth * 0.8;
    el.scrollBy({ left: step * direction, behavior: "smooth" });
  };

  const arrowClass =
    "inline-flex h-11 w-11 items-center justify-center rounded-full border-2 border-green-dark bg-surface-raised text-green-dark transition-colors duration-200 hover:bg-yellow disabled:cursor-default disabled:border-green-dark/20 disabled:bg-transparent disabled:text-ink/25 disabled:hover:bg-transparent";

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)] lg:items-start lg:gap-16">
      <div className="lg:sticky lg:top-28">
        {children}
        <div className={`mt-8 gap-3 ${scrollable ? "hidden lg:flex" : "hidden"}`}>
          <button
            type="button"
            onClick={() => scrollByCard(-1)}
            disabled={atStart}
            aria-label="Case anterior"
            className={arrowClass}
          >
            <CaretLeftIcon size={18} weight="bold" />
          </button>
          <button
            type="button"
            onClick={() => scrollByCard(1)}
            disabled={atEnd}
            aria-label="Próximo case"
            className={arrowClass}
          >
            <CaretRightIcon size={18} weight="bold" />
          </button>
        </div>
      </div>

      <ul
        ref={railRef}
        onScroll={sync}
        tabIndex={0}
        aria-label="Cases de times brasileiros"
        className="-mx-4 flex snap-x snap-mandatory gap-6 overflow-x-auto px-4 pb-3 [scrollbar-width:none] focus-visible:outline-none [&::-webkit-scrollbar]:hidden sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0"
      >
        {cases.map((c) => (
          <li key={c.name} className="w-[min(82vw,24rem)] shrink-0 snap-start lg:w-[26rem]">
            <a
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex h-full flex-col rounded-2xl border-2 border-green-dark bg-surface-raised p-6 shadow-sticker transition-transform duration-200 hover:-translate-y-1 sm:p-8"
            >
              <p className="inline-block self-start -rotate-1 bg-yellow px-2.5 py-1 text-sm font-bold text-green-dark">
                {c.result}
              </p>
              <p className="mb-8 mt-5 flex-1 text-pretty leading-relaxed text-green-dark/70">{c.body}</p>
              <div className="flex items-center gap-3 border-t-2 border-green-dark/10 pt-5">
                <Image
                  src={c.logo}
                  alt=""
                  width={44}
                  height={44}
                  className="h-11 w-11 rounded-xl border-2 border-green-dark/10 object-cover"
                />
                <div className="min-w-0">
                  <p className="font-heading text-lg font-bold group-hover:underline">{c.name}</p>
                  <p className="text-sm leading-snug text-muted">{c.tagline}</p>
                </div>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
