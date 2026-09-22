"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { openAuthDialog } from "@/components/auth/auth-dialog";
import { CopyButton } from "@/components/ui/copy-button";
import { Reveal } from "@/components/ui/reveal";
import { SectionHat } from "@/components/ui/section-hat";
import { trackClient } from "@/lib/analytics-browser";
import type { ProjectCard } from "@/lib/copilot/types";
import { ProjectCardView } from "./project-card";

export type ExplorerFilters = {
  hackathons: { slug: string; name: string; startDate: string; projectCount: number }[];
  tracks: { key: string; name: string; hackathonSlug: string }[];
  clusters: { key: string; label: string; projectCount: number }[];
};

type IdeaResult = { projects: ProjectCard[]; crowdedness: string | null; prompt: string; remaining: number };
type ApiError = { error: string; code: "invalid" | "unauthenticated" | "quota" | "rate_limited" | "unavailable"; retryAfter?: number };

const AUTH_NEXT = "/guias/copilot#valide";

async function post<T>(body: unknown): Promise<{ ok: true; data: T } | { ok: false; err: ApiError }> {
  const res = await fetch("/api/copilot/search", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({ error: "Falha de rede.", code: "unavailable" }));
  return res.ok ? { ok: true, data: json as T } : { ok: false, err: json as ApiError };
}

const CHIP = "rounded-full border-2 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] transition-colors duration-(--dur-instant) ease-entrada";
const chip = (on: boolean) => `${CHIP} ${on ? "border-green-dark bg-green-dark text-yellow" : "border-green-dark/30 text-ink hover:border-green-dark"}`;
const FILTER_LABEL = "font-mono text-[10px] uppercase tracking-widest text-green-dark/70";
const SELECT = "w-full max-w-full rounded-xl border-2 border-green-dark/30 bg-surface px-4 py-2.5 text-sm text-ink outline-none focus:border-green-dark focus:ring-2 focus:ring-emerald/30";

export function CopilotExplorer({ filters, signedIn }: { filters: ExplorerFilters; signedIn: boolean }) {
  return (
    <div className="space-y-20">
      <BrowseSection filters={filters} />
      <IdeaSection signedIn={signedIn} />
    </div>
  );
}

function ErrorLine({ err }: { err: ApiError }) {
  return (
    <div className="mt-4 rounded-2xl border-2 border-green-dark bg-yellow/30 px-5 py-4 text-sm leading-relaxed text-ink">
      <p>{err.error}</p>
      {err.code === "quota" && (
        <a href="#use-no-seu-agente" className="mt-2 inline-block font-bold text-emerald-deep underline underline-offset-2">Ver como gerar seu token</a>
      )}
    </div>
  );
}

function SkeletonCard() {
  return <div className="h-56 animate-pulse rounded-2xl border-2 border-green-dark/20 bg-surface-raised" />;
}

function IdeaSection({ signedIn }: { signedIn: boolean }) {
  const [idea, setIdea] = useState("");
  const [result, setResult] = useState<IdeaResult | null>(null);
  const [err, setErr] = useState<ApiError | null>(null);
  const [pending, start] = useTransition();

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!signedIn) { openAuthDialog(AUTH_NEXT); return; }
    setErr(null);
    start(async () => {
      const r = await post<IdeaResult>({ mode: "idea", idea });
      if (r.ok) { setResult(r.data); trackClient("copilot_idea_searched", { results: r.data.projects.length }); }
      else { setResult(null); setErr(r.err); if (r.err.code === "unauthenticated") openAuthDialog(AUTH_NEXT); }
    });
  }

  return (
    <section id="valide" className="scroll-mt-28">
      <Reveal tone="texto">
        <SectionHat>Valide antes de codar</SectionHat>
        <h2 className="mt-4 font-heading text-3xl font-black uppercase leading-[0.95] text-ink [font-stretch:115%] sm:text-4xl">Sua ideia, contra 5.400 projetos</h2>
        <p className="mt-3 max-w-2xl text-ink/75">
          Escreva a ideia em uma frase. A gente mostra os projetos mais parecidos e quão disputado é o tema. É uma amostra: a avaliação completa, com concorrentes vivos e leituras de mercado, acontece no seu agente com a skill do Copilot, explicada logo abaixo. Precisa estar logado, e cada conta tem 20 pesquisas por dia.
        </p>
      </Reveal>
      <form onSubmit={submit} className="mt-8 rounded-3xl border-2 border-green-dark bg-surface-raised p-5 shadow-sticker sm:p-7">
        <label htmlFor="idea" className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-deep">Sua ideia em uma frase</label>
        <textarea
          id="idea" value={idea} onChange={(e) => setIdea(e.target.value)} maxLength={300} rows={3} required minLength={8}
          placeholder="Ex.: um app de pagamentos em stablecoin para motoristas de aplicativo"
          className="mt-3 w-full resize-none rounded-xl border-2 border-green-dark/30 bg-surface px-4 py-3 text-base leading-relaxed text-ink outline-none focus:border-green-dark focus:ring-2 focus:ring-emerald/30"
        />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending || idea.trim().length < 8}
            className="btn-cut inline-flex items-center bg-emerald-deep px-8 py-3.5 text-base font-bold text-surface transition-colors duration-(--dur-instant) ease-entrada hover:bg-green-dark disabled:opacity-60">
            <span>{pending ? "Pesquisando…" : signedIn ? "Ver o que já existe" : "Entrar e pesquisar"}</span>
          </button>
          <span className="text-xs text-muted">{idea.length}/300</span>
          {result && <span className="text-xs text-muted">{result.remaining} pesquisas restantes hoje</span>}
        </div>
        {err && <ErrorLine err={err} />}
      </form>

      {result && (
        <div className="mt-8 space-y-10">
          {result.crowdedness && (
            <Reveal tone="papel">
              <p className="rounded-2xl bg-green-dark px-6 py-4 font-heading text-lg font-bold leading-snug text-surface shadow-sticker">{result.crowdedness}</p>
            </Reveal>
          )}
          <div>
            <Reveal tone="texto"><h3 className="font-heading text-2xl font-black uppercase text-ink [font-stretch:115%]">Projetos parecidos</h3></Reveal>
            {result.projects.length === 0 ? (
              <p className="mt-3 text-ink/75">Nada parecido nos hackathons anteriores. Isso pode ser bom sinal, ou sinal de que ninguém achou um mercado. Leve para o seu agente.</p>
            ) : (
              <div className="mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [scrollbar-width:none] sm:grid sm:snap-none sm:overflow-visible sm:pb-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {result.projects.map((c, i) => <Reveal key={c.slug} index={i} tone="papel" className="h-full"><ProjectCardView card={c} /></Reveal>)}
              </div>
            )}
          </div>
          <Reveal tone="papel">
          <div className="rounded-3xl border-2 border-green-dark bg-yellow p-5 shadow-sticker sm:p-7">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-green-dark/80">Leve para o seu agente</p>
            <p className="mt-2 text-sm text-green-dark">O julgamento de verdade acontece no Claude Code ou Codex com a skill do Copilot. Cole este prompt lá.</p>
            <pre className="mt-4 whitespace-pre-wrap [overflow-wrap:anywhere] rounded-xl bg-surface-raised p-4 font-mono text-sm leading-relaxed text-ink">{result.prompt}</pre>
            <div className="mt-4 flex flex-wrap gap-3">
              <CopyButton text={result.prompt} label="Copiar prompt" event={{ name: "copilot_prompt_copied" }} />
              <a href="#use-no-seu-agente" className="inline-flex items-center px-2 py-2 text-sm font-bold text-green-dark underline underline-offset-2">Ainda não instalou? Veja como</a>
            </div>
          </div>
          </Reveal>
        </div>
      )}
    </section>
  );
}

function BrowseSection({ filters }: { filters: ExplorerFilters }) {
  const [hackathon, setHackathon] = useState<string | undefined>();
  const [trackKey, setTrackKey] = useState<string | undefined>();
  const [clusterKey, setClusterKey] = useState<string | undefined>();
  const [winnersOnly, setWinnersOnly] = useState(false);
  const [projects, setProjects] = useState<ProjectCard[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const [err, setErr] = useState<ApiError | null>(null);
  const [pending, start] = useTransition();
  const [firstLoad, setFirstLoad] = useState(true);
  const requestId = useRef(0);

  const tracks = filters.tracks.filter((t) => !hackathon || t.hackathonSlug === hackathon).slice(0, 12);

  function load(offset: number, replace: boolean) {
    const id = ++requestId.current;
    start(async () => {
      setErr(null);
      const r = await post<{ projects: ProjectCard[]; hasMore: boolean; totalFound: number }>({ mode: "browse", hackathon, trackKey, clusterKey, winnersOnly, offset });
      if (id !== requestId.current) return;
      setFirstLoad(false);
      if (!r.ok) { setErr(r.err); return; }
      setProjects((prev) => (replace ? r.data.projects : [...prev, ...r.data.projects]));
      setHasMore(r.data.hasMore); setTotal(r.data.totalFound);
      if (replace) trackClient("copilot_browse_filtered", { hackathon, trackKey, clusterKey, winnersOnly });
    });
  }

  useEffect(() => {
    load(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hackathon, trackKey, clusterKey, winnersOnly]);

  return (
    <section id="explore" className="scroll-mt-28">
      <Reveal tone="texto">
        <SectionHat>Explore</SectionHat>
        <h2 className="mt-4 font-heading text-3xl font-black uppercase leading-[0.95] text-ink [font-stretch:115%] sm:text-4xl">O que já foi construído</h2>
        <p className="mt-3 max-w-2xl text-ink/75">Todos os projetos dos cinco hackathons anteriores. Filtre por hackathon, trilha ou tema e veja o que já existe antes de decidir o que construir. Os cards abrem o GitHub, a demo e a página no Colosseum.</p>
      </Reveal>

      <div className="mt-6">
        <p className={FILTER_LABEL}>Hackathon</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" className={chip(!hackathon)} onClick={() => { setHackathon(undefined); setTrackKey(undefined); }}>Todos</button>
          {filters.hackathons.map((h) => (
            <button key={h.slug} type="button" className={chip(hackathon === h.slug)} onClick={() => { setHackathon(hackathon === h.slug ? undefined : h.slug); setTrackKey(undefined); }}>
              {h.name} · {h.startDate.slice(0, 4)}
            </button>
          ))}
        </div>
      </div>

      {hackathon && (
        <div className="mt-4">
          <p className={FILTER_LABEL}>Trilha</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className={chip(!trackKey)} onClick={() => setTrackKey(undefined)}>Todas</button>
            {tracks.map((t) => (
              <button key={t.key} type="button" className={chip(trackKey === t.key)} onClick={() => setTrackKey(trackKey === t.key ? undefined : t.key)}>{t.name}</button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-0 w-full sm:w-auto sm:min-w-[18rem]">
          <label htmlFor="tema" className={`${FILTER_LABEL} block`}>Tema</label>
          <select id="tema" className={`${SELECT} mt-2`} value={clusterKey ?? ""} onChange={(e) => setClusterKey(e.target.value || undefined)}>
            <option value="">Todos os temas</option>
            {filters.clusters.map((c) => (
              <option key={c.key} value={c.key}>{c.label} ({c.projectCount})</option>
            ))}
          </select>
        </div>
        <button type="button" className={chip(winnersOnly)} onClick={() => setWinnersOnly((w) => !w)}>Só vencedores</button>
        {total !== null && <span className="ml-auto text-sm text-muted">{total} projetos</span>}
      </div>

      {err && <ErrorLine err={err} />}

      {firstLoad && pending ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : projects.length > 0 ? (
        <>
          <div className={`mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [scrollbar-width:none] transition-opacity duration-(--dur-instant) ease-entrada sm:grid sm:snap-none sm:overflow-visible sm:pb-0 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${pending ? "opacity-60" : ""}`}>
            {projects.map((c, i) => <Reveal key={c.slug} index={i % 12} tone="papel" className="h-full"><ProjectCardView card={c} /></Reveal>)}
          </div>
          {hasMore && (
            <button type="button" onClick={() => load(projects.length, false)} disabled={pending}
              className="btn-cut btn-cut-outline mt-6 inline-flex items-center px-7 py-3 text-sm font-bold text-ink transition-colors duration-(--dur-instant) ease-entrada hover:text-surface [--btn-cut-fill:var(--color-surface-raised)]">
              <span>{pending ? "Carregando…" : "Carregar mais"}</span>
            </button>
          )}
        </>
      ) : null}
    </section>
  );
}
