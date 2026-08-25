"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";

export type DeckCard = {
  key: string;
  href: string | null;
  label: string;
  coverUrl: string | null;
};

const POSES = [
  "z-30 rotate-2 translate-x-0 translate-y-0 scale-100",
  "z-20 rotate-6 translate-x-8 translate-y-4 scale-[0.94] opacity-90",
  "z-10 rotate-12 translate-x-16 translate-y-8 scale-[0.88] opacity-75",
];

/**
 * The fanned 3-card deck in the hero. Front card is the next hackathon; the
 * fan auto-advances and any card or dot brings its card forward. Under
 * prefers-reduced-motion the fan holds still.
 */
export function HeroDeck({ cards }: { cards: DeckCard[] }) {
  const [front, setFront] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (paused || cards.length < 2) return;
    const id = setInterval(() => {
      if (!reduced.current) setFront((f) => (f + 1) % cards.length);
    }, 6000);
    return () => clearInterval(id);
  }, [paused, cards.length]);

  if (cards.length === 0) return null;

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative aspect-square w-full max-w-md">
        {cards.map((card, idx) => {
          const pose = POSES[(idx - front + cards.length) % cards.length] ?? POSES[2];
          const isFront = (idx - front + cards.length) % cards.length === 0;
          const face = (
            <div className="relative h-full w-full overflow-hidden rounded-2xl border-4 border-green-dark bg-green-dark shadow-[10px_10px_0_#1b231d]">
              {card.coverUrl ? (
                <Image
                  src={card.coverUrl}
                  alt={isFront ? `Arte da edição ${card.label}` : ""}
                  fill
                  priority={idx === 0}
                  sizes="(min-width: 1024px) 448px, 90vw"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-yellow p-8">
                  <Image
                    src="/brand/stbr/logo/ST-DARK-GREEN-HORIZONTAL.svg"
                    alt=""
                    width={220}
                    height={40}
                    className="h-auto w-3/4"
                  />
                </div>
              )}
            </div>
          );

          return (
            <div
              key={card.key}
              className={`absolute inset-0 transition-[transform,opacity] duration-500 ease-out ${pose}`}
            >
              {isFront && card.href ? (
                <Link
                  href={card.href}
                  aria-label={card.label}
                  className="block h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-dark focus-visible:ring-offset-4 focus-visible:ring-offset-surface"
                >
                  {face}
                </Link>
              ) : (
                <button
                  type="button"
                  aria-label={`Trazer ${card.label} para frente`}
                  onClick={() => setFront(idx)}
                  className="block h-full w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-dark focus-visible:ring-offset-4 focus-visible:ring-offset-surface"
                >
                  {face}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {cards.length > 1 && (
        <div className="mt-10 flex gap-2.5 pl-1" role="tablist" aria-label="Cartas do destaque">
          {cards.map((card, idx) => (
            <button
              key={card.key}
              type="button"
              role="tab"
              aria-selected={idx === front}
              aria-label={card.label}
              onClick={() => setFront(idx)}
              className={`h-2.5 rounded-full transition-[width,background-color] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-dark focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
                idx === front ? "w-8 bg-green-dark" : "w-2.5 bg-green-dark/30 hover:bg-green-dark/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
