"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";

export type DeckCard = {
  key: string;
  href: string | null;
  label: string;
  meta: string | null;
  coverUrl: string | null;
};

/** Fanned 3D poses; the change animates with a springy overshoot. */
const POSES = [
  { transform: "translateX(0) translateY(0) rotateY(-4deg) rotateZ(2deg) scale(1)", zIndex: 30, opacity: 1 },
  { transform: "translateX(11.5%) translateY(3%) rotateY(-16deg) rotateZ(7deg) scale(0.93)", zIndex: 20, opacity: 0.92 },
  { transform: "translateX(21.5%) translateY(6.5%) rotateY(-26deg) rotateZ(12deg) scale(0.86)", zIndex: 10, opacity: 0.8 },
];

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
    }, 5000);
    return () => clearInterval(id);
  }, [paused, cards.length]);

  if (cards.length === 0) return null;
  const frontCard = cards[front];

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative aspect-square w-[82%] max-w-md [perspective:1200px] sm:w-full">
        {cards.map((card, idx) => {
          const slot = (idx - front + cards.length) % cards.length;
          const pose = POSES[slot] ?? POSES[2];
          const isFront = slot === 0;
          const face = (
            <div className="relative h-full w-full overflow-hidden rounded-2xl border-4 border-green-dark bg-green-dark shadow-[12px_12px_0_rgba(27,35,29,0.9)]">
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
              style={{ transform: pose.transform, zIndex: pose.zIndex, opacity: pose.opacity }}
              className="absolute inset-0 transition-[transform,opacity] duration-600 ease-[cubic-bezier(0.34,1.56,0.64,1)] will-change-transform motion-reduce:transition-none"
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

      <div className="mt-8 flex items-center justify-between gap-4 pr-2">
        <div aria-live="polite" className="min-w-0">
          <p className="truncate font-heading text-base font-bold">{frontCard.label}</p>
          {frontCard.meta && (
            <p className="truncate text-sm font-semibold text-muted">{frontCard.meta}</p>
          )}
        </div>
        {cards.length > 1 && (
          <div className="flex shrink-0 gap-2.5" role="tablist" aria-label="Cartas do destaque">
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
    </div>
  );
}
