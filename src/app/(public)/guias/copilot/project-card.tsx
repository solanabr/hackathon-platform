import { ArrowUpRightIcon, GithubLogoIcon, PlayIcon, TrophyIcon } from "@phosphor-icons/react/dist/ssr";
import type { ProjectCard } from "@/lib/copilot/types";

export function ProjectCardView({ card }: { card: ProjectCard }) {
  return (
    <article className="flex h-full w-[82vw] shrink-0 snap-start flex-col rounded-2xl border-2 border-green-dark bg-surface-raised p-5 shadow-sticker sm:w-auto sm:shrink">
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-green-dark/70">
          {card.hackathon.name} · {card.hackathon.year}
        </p>
        {(card.isWinner || card.inAccelerator) && (
          <span className="inline-flex items-center gap-1 rounded-full bg-yellow px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-green-dark">
            <TrophyIcon size={12} weight="fill" aria-hidden />
            {card.inAccelerator ? "Acelerador" : "Premiado"}
          </span>
        )}
      </div>
      <h3 className="mt-2 font-heading text-lg font-bold leading-snug text-ink">{card.name}</h3>
      <p className="mt-1 line-clamp-4 text-sm leading-relaxed text-ink/75 sm:line-clamp-none">{card.oneLiner}</p>
      {card.evidence.length > 0 && (
        <ul className="mt-3 hidden space-y-1 border-l-2 border-yellow pl-3 text-xs leading-relaxed text-green-dark/80 sm:block">
          {card.evidence.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      )}
      {card.tracks.length > 0 && (
        <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-muted">{card.tracks.join(" · ")}</p>
      )}
      <div className="mt-auto flex flex-wrap gap-3 pt-4 text-xs font-bold">
        {card.links.colosseum && (
          <a href={card.links.colosseum} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-emerald-deep underline underline-offset-2">
            Colosseum <ArrowUpRightIcon size={12} weight="bold" aria-hidden />
          </a>
        )}
        {card.links.github && (
          <a href={card.links.github} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-ink/80 hover:text-ink">
            <GithubLogoIcon size={14} weight="bold" aria-hidden /> GitHub
          </a>
        )}
        {card.links.demo && (
          <a href={card.links.demo} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-ink/80 hover:text-ink">
            <PlayIcon size={14} weight="fill" aria-hidden /> Demo
          </a>
        )}
      </div>
    </article>
  );
}
