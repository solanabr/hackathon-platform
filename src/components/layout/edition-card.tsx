"use client";

import Link from "next/link";
import Image from "next/image";
import type { Hackathon } from "@/types/db";
import { useEntranceAnimation } from "@/hooks/use-entrance-animation";

const MONTHS = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];

export function EditionCard({
  hackathon,
  coverUrl,
  index,
}: {
  hackathon: Hackathon;
  coverUrl: string | null;
  index: number;
}) {
  const { ref, isVisible } = useEntranceAnimation<HTMLAnchorElement>();
  const start = new Date(hackathon.starts_at);

  return (
    <Link
      ref={ref}
      href={`/h/${hackathon.slug}`}
      className={`group flex flex-col overflow-hidden rounded-2xl border border-green/30 bg-green-dark shadow-[0_8px_32px_rgba(0,140,76,0.12)] transition-all duration-500 hover:border-emerald/50 hover:shadow-[0_16px_48px_rgba(0,140,76,0.25)] ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      }`}
      style={{ transitionDelay: `${200 + index * 150}ms` }}
    >
      <div className="relative flex h-56 items-center justify-center overflow-hidden">
        {coverUrl && <Image src={coverUrl} alt="" fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />}
        <div className="absolute inset-0 bg-gradient-to-t from-green-dark/85 via-green-dark/40 to-green-dark/20" />

        <div className="absolute left-3 top-3 rounded-xl bg-surface px-3 py-2 text-center shadow-lg">
          <p className="text-[10px] font-bold uppercase tracking-wide text-emerald">
            {MONTHS[start.getMonth()]}
          </p>
          <p className="font-heading text-2xl font-bold leading-none text-ink">
            {start.getDate()}
          </p>
        </div>

        <h3 className="relative z-10 px-6 text-center font-heading text-xl font-bold leading-tight text-surface">
          {hackathon.name}
        </h3>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-5">
        {hackathon.tagline && (
          <p className="line-clamp-2 text-sm text-surface/70">{hackathon.tagline}</p>
        )}
        {hackathon.location_city && (
          <p className="text-xs font-semibold uppercase tracking-wider text-yellow">
            {hackathon.location_city}
          </p>
        )}
      </div>
    </Link>
  );
}
