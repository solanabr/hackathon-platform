"use client";

import { useState } from "react";
import { CopyButton } from "@/components/ui/copy-button";
import { Reveal } from "@/components/ui/reveal";
import { SectionHat } from "@/components/ui/section-hat";
import { IDEA_EXAMPLES, ideaAgentPrompt, type IdeaExample, type IdeaStatus } from "@/lib/copilot/idea-examples";

const FIRST_ROWS = 6;

const STATUS: Record<IdeaStatus, { label: string; className: string }> = {
  clear: { label: "Caminho livre", className: "bg-yellow text-green-dark" },
  adjacent: { label: "Tem vizinhos", className: "border border-green-dark/40 text-green-dark" },
  house: { label: "Ideia da casa", className: "bg-green-dark text-yellow" },
};

const EFFORT: Record<2 | 3 | 4, string> = { 2: "Esforço baixo", 3: "Esforço médio", 4: "Esforço alto" };

const TERM = "font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-deep";

function IdeaCard({ idea }: { idea: IdeaExample }) {
  const status = STATUS[idea.status];
  const footnote = [idea.inspiration && `Inspiração: ${idea.inspiration}`, idea.effort && EFFORT[idea.effort]].filter(Boolean).join(" · ");

  return (
    <article className="flex h-full w-[82vw] shrink-0 snap-start flex-col rounded-2xl border-2 border-green-dark bg-surface-raised p-5 shadow-sticker sm:w-auto sm:shrink">
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-green-dark/70">{idea.category}</p>
        <span className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${status.className}`}>{status.label}</span>
      </div>
      <h3 className="mt-2 font-heading text-lg font-bold leading-snug text-ink">{idea.name}</h3>
      <p className="mt-1 text-sm leading-relaxed text-ink/80">{idea.pitch}</p>
      <dl className="mt-4 space-y-3 border-l-2 border-yellow pl-3 text-xs leading-relaxed text-green-dark/85">
        <div>
          <dt className={TERM}>O diferencial</dt>
          <dd className="mt-0.5">{idea.edge}</dd>
        </div>
        <div>
          <dt className={TERM}>O maior risco</dt>
          <dd className="mt-0.5">{idea.risk}</dd>
        </div>
      </dl>
      {footnote && <p className="mt-3 text-xs leading-relaxed text-muted">{footnote}</p>}
      <div className="mt-auto pt-4">
        <CopyButton text={ideaAgentPrompt(idea)} label="Copiar prompt" event={{ name: "copilot_prompt_copied", properties: { preset: true, example: idea.id } }} />
      </div>
    </article>
  );
}

export function IdeaExamples() {
  const [expanded, setExpanded] = useState(false);
  const hiddenCount = IDEA_EXAMPLES.length - FIRST_ROWS;

  return (
    <section id="ideias" className="scroll-mt-28">
      <Reveal tone="texto">
        <SectionHat>Sem ideia ainda?</SectionHat>
        <h2 className="mt-4 font-heading text-3xl font-black uppercase leading-[0.95] text-ink [font-stretch:115%] sm:text-4xl">{IDEA_EXAMPLES.length} ideias para começar</h2>
        <p className="mt-3 max-w-2xl text-ink/75">
          A Superteam Brasil levantou estas ideias numa varredura de mercado em setembro de 2026. Cada uma traz o que a diferencia e o maior risco. Não são recomendações: são pontos de partida para você testar, adaptar ou descartar. Copie o prompt de uma delas e cole no seu agente para ver quem já tentou algo parecido.
        </p>
        <p className="mt-3 max-w-2xl text-sm text-ink/70">
          <strong className="text-ink">Caminho livre:</strong> a varredura não achou concorrente direto. <strong className="text-ink">Tem vizinhos:</strong> há projetos próximos, mas não iguais. <strong className="text-ink">Ideia da casa:</strong> veio do nosso time e ainda não foi pesquisada.
        </p>
      </Reveal>

      <div className="mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [scrollbar-width:none] sm:grid sm:snap-none sm:grid-cols-2 sm:overflow-visible sm:pb-0 lg:grid-cols-3">
        {IDEA_EXAMPLES.map((idea, i) => (
          <Reveal key={idea.id} index={i % 12} tone="papel" className={`h-full ${!expanded && i >= FIRST_ROWS ? "sm:hidden" : ""}`}>
            <IdeaCard idea={idea} />
          </Reveal>
        ))}
      </div>

      {!expanded && hiddenCount > 0 && (
        <button type="button" onClick={() => setExpanded(true)}
          className="btn-cut btn-cut-outline mt-6 hidden items-center px-7 py-3 text-sm font-bold text-ink transition-colors duration-(--dur-instant) ease-entrada hover:text-surface sm:inline-flex [--btn-cut-fill:var(--color-surface-raised)]">
          <span>Ver as outras {hiddenCount} ideias</span>
        </button>
      )}
    </section>
  );
}
