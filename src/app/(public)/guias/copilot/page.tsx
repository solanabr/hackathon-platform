import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ArrowUpRightIcon, WhatsappLogoIcon } from "@phosphor-icons/react/dist/ssr";
import { CopyButton } from "@/components/ui/copy-button";
import { Reveal } from "@/components/ui/reveal";
import { SectionHat } from "@/components/ui/section-hat";
import { TrackedCta } from "@/components/ui/tracked-cta";
import { withPlatformUtm } from "@/lib/attribution";
import { WHATSAPP_COMMUNITY_URL } from "@/app/(public)/pre-registro/constants";
import { getFilters } from "@/lib/copilot/client";
import { resolveAuthenticatedUserState } from "@/lib/user-state";
import { PAGE_SHELL } from "@/components/layout/container";
import { CopilotExplorer, type ExplorerFilters } from "./explorer";

export const metadata: Metadata = {
  title: "Colosseum Copilot: valide sua ideia antes de construir",
  description: "Pesquise 5.400 projetos de hackathons anteriores, veja quão disputada é a sua área e leve a ideia para o Claude Code ou Codex com a skill do Colosseum Copilot. Guia em português.",
  openGraph: { title: "Colosseum Copilot · Guia da Superteam Brasil", description: "Saiba o que já foi construído antes de começar. Pesquisa gratuita, guia de instalação e prompts em português." },
};

const ARENA_TOKEN_URL = withPlatformUtm("https://colosseum.com/arena/copilot", { content: "guia_copilot_token" });
const DOCS_URL = withPlatformUtm("https://docs.colosseum.com/copilot", { content: "guia_copilot_docs" });
const SECTION = "px-4 pt-24 sm:px-6 lg:pt-28 xl:pt-32";
const ENV_SNIPPET = `export COLOSSEUM_COPILOT_API_BASE="https://copilot.colosseum.com/api/v1"\nexport COLOSSEUM_COPILOT_PAT="cole-seu-token-aqui"`;
const INSTALL = [
  { agent: "Claude Code", cmd: "npx skills add ColosseumOrg/colosseum-copilot" },
  { agent: "Codex", cmd: "npx skills add ColosseumOrg/colosseum-copilot -a codex" },
  { agent: "OpenClaw", cmd: "npx skills add ColosseumOrg/colosseum-copilot -a openclaw" },
];
const VERIFY = `curl "$COLOSSEUM_COPILOT_API_BASE/status" -H "Authorization: Bearer $COLOSSEUM_COPILOT_PAT"`;
const PROMPTS = [
  "Quero construir pagamentos em stablecoin para agentes de IA na Solana. Quem já fez isso nos hackathons do Colosseum e o que deu errado?",
  "Compare os projetos vencedores de DeFi do Breakout e do Cypherpunk. O que os vencedores tinham em comum?",
  "Existe espaço para um app de consumo de privacidade na Solana? Liste os concorrentes vivos e os que morreram.",
  "Quais projetos de DePIN passaram para o acelerador? O que os diferenciou dos que não passaram?",
  "Estou pensando em um marketplace B2B com liquidação em stablecoin. Vale a pena? Seja honesto.",
];

function Ext({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className="font-bold text-emerald underline decoration-2 underline-offset-4 hover:text-green-dark">{children}</a>;
}

function Code({ code, label }: { code: string; label: string }) {
  return (
    <div className="mt-3 flex flex-col gap-3 rounded-2xl border-2 border-green-dark bg-green-dark p-4 sm:flex-row sm:items-start sm:justify-between">
      <pre className="min-w-0 flex-1 overflow-x-auto whitespace-pre-wrap font-mono text-sm leading-relaxed text-surface">{code}</pre>
      <CopyButton text={code} label="Copiar" event={{ name: "copilot_install_copied", properties: { label } }}
        className="btn-cut inline-flex shrink-0 items-center gap-2 bg-yellow px-4 py-2 text-sm font-bold text-green-dark transition-colors duration-(--dur-instant) ease-entrada hover:bg-yellow-strong" />
    </div>
  );
}

function Step({ n, title, why, children }: { n: number; title: string; why: string; children: ReactNode }) {
  return (
    <Reveal index={n} tone="papel">
      <div className={`card-cut mt-6 flex flex-col p-5 sm:p-6 ${n === 1 ? "" : "card-cut-kraft card-cut-open"}`}>
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-ink/75">Passo {String(n).padStart(2, "0")}</p>
        <h3 className="mt-3 font-heading text-xl font-black leading-snug text-ink [font-stretch:110%] sm:text-2xl">{title}</h3>
        <p className="mt-1 text-sm text-green-dark/70">{why}</p>
        <div className="mt-3 leading-relaxed text-ink/85">{children}</div>
      </div>
    </Reveal>
  );
}

export default async function CopilotGuidePage() {
  const [filters, state] = await Promise.all([
    getFilters().catch(() => null),
    resolveAuthenticatedUserState().catch(() => null),
  ]);
  const explorerFilters: ExplorerFilters = filters
    ? {
        hackathons: filters.hackathons.map((h) => ({ slug: h.slug, name: h.name, startDate: h.startDate, projectCount: h.projectCount })),
        tracks: filters.tracks.map((t) => ({ key: t.key, name: t.name, hackathonSlug: t.hackathonSlug })),
        clusters: filters.clusters.map((c) => ({ key: c.key, label: c.label, projectCount: c.projectCount })),
      }
    : { hackathons: [], tracks: [], clusters: [] };

  return (
    <div>
      <section className="px-4 pt-10 sm:px-6 sm:pt-14">
        <div className={PAGE_SHELL}>
          <Reveal tone="texto">
          <SectionHat>Guia · Colosseum Copilot</SectionHat>
          <h1 className="mt-4 font-heading font-black uppercase leading-[0.95] tracking-tight text-ink">
            <span className="block text-5xl [font-stretch:120%] sm:text-7xl">Saiba o que já existe</span>
            <span className="mt-3 inline-block -rotate-1 border-2 border-green-dark bg-yellow px-4 py-1.5 text-3xl text-green-dark shadow-sticker [font-stretch:110%] sm:text-5xl">antes de construir</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink/80">
            O Colosseum Copilot é a base de dados dos hackathons do Colosseum: 5.400 projetos, quem venceu, o que construíram e onde estão os links. Aqui você explora essa base, testa sua ideia contra ela e aprende a usar o Copilot dentro do seu agente de código, em português.
          </p>
          </Reveal>
        </div>
      </section>

      <section className={SECTION}>
        <div className={PAGE_SHELL}>
          {filters ? (
            <CopilotExplorer filters={explorerFilters} signedIn={Boolean(state)} />
          ) : (
            <p className="rounded-2xl border-2 border-green-dark bg-yellow/30 px-5 py-4 text-ink">A pesquisa está indisponível agora. O guia abaixo continua valendo.</p>
          )}
        </div>
      </section>

      <section id="use-no-seu-agente" className={`scroll-mt-28 ${SECTION}`}>
        <div className={PAGE_SHELL}>
          <Reveal tone="texto">
            <SectionHat>Use no seu agente</SectionHat>
            <h2 className="mt-4 font-heading text-3xl font-black uppercase leading-[0.95] text-ink [font-stretch:115%] sm:text-4xl">Instale o Copilot no seu editor</h2>
            <p className="mt-3 max-w-2xl text-ink/75">
              A skill é um pacote de instruções que ensina o Claude Code, o Codex ou o OpenClaw a consultar a base do Colosseum. Você instala uma vez e passa a perguntar em português dentro do seu editor.
            </p>
            <p className="mt-3 max-w-2xl text-ink/75">
              É lá que a avaliação de verdade acontece: o agente compara sua ideia com os projetos anteriores, lista concorrentes vivos, traz leituras do ecossistema e diz, com evidências, se vale a pena seguir.
            </p>
            <p className="mt-3 max-w-2xl text-ink/75">
              Custa nada: o token é gratuito para quem tem conta no Colosseum, a mesma conta onde você se inscreve no hackathon. Cinco minutos de setup.
            </p>
          </Reveal>

          <Step n={1} title="Crie sua conta no Colosseum e gere o token" why="O token identifica você para a API do Copilot.">
            <p>Entre no <Ext href={ARENA_TOKEN_URL}>Colosseum Arena</Ext> e clique em <strong>Generate your token</strong>. O token aparece uma vez só, copie na hora. Vale 90 dias, e é a mesma conta onde você se inscreve no hackathon.</p>
          </Step>

          <Step n={2} title="Exporte as variáveis no terminal" why="As variáveis dizem ao agente onde está a API e qual token usar.">
            <p>Cole no seu <code>.zshrc</code> ou <code>.bashrc</code>, trocando pelo seu token:</p>
            <Code code={ENV_SNIPPET} label="env" />
          </Step>

          <Step n={3} title="Instale a skill" why="A skill é o que ensina o agente a usar a API.">
            {INSTALL.map((i) => (
              <div key={i.agent} className="mt-4">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-green-dark/80">{i.agent}</p>
                <Code code={i.cmd} label={i.agent} />
              </div>
            ))}
          </Step>

          <Step n={4} title="Verifique a conexão" why="Confirma que token e variáveis estão certos antes de perguntar.">
            <Code code={VERIFY} label="verify" />
            <p className="mt-3 text-sm text-ink/70">A resposta deve trazer <code>&quot;authenticated&quot;: true</code>.</p>
          </Step>

          <Step n={5} title="Pergunte em português" why="Prompts prontos para o hackathon; copie e cole no agente.">
            <p>A skill entende português. Alguns prompts para começar:</p>
            <ul className="mt-4 space-y-3">
              {PROMPTS.map((p) => (
                <li key={p} className="flex flex-col gap-3 rounded-2xl border-2 border-green-dark bg-surface-raised p-4 shadow-sticker sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm leading-relaxed text-ink">{p}</span>
                  <CopyButton text={p} label="Copiar" event={{ name: "copilot_prompt_copied", properties: { preset: true } }} />
                </li>
              ))}
            </ul>
          </Step>

          <Reveal tone="papel">
          <div className="mt-12 rounded-2xl border-2 border-green-dark bg-green px-6 py-5 text-surface shadow-sticker">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-yellow">O que o Copilot faz e não faz</p>
            <p className="mt-2 leading-relaxed">Ele pesquisa: projetos, fontes, dados do ecossistema. Ele não julga por você. Quem avalia é o seu agente, com as evidências que o Copilot traz, e quem decide é você. Documentação completa em <Ext href={DOCS_URL}>docs.colosseum.com/copilot</Ext> <ArrowUpRightIcon className="inline" size={14} weight="bold" aria-hidden />.</p>
          </div>
          </Reveal>
        </div>
      </section>

      <section className={SECTION}>
        <div className={PAGE_SHELL}>
          <Reveal tone="papel">
          <div className="rounded-3xl border-2 border-green-dark bg-surface-raised p-6 text-center shadow-sticker sm:p-8">
            <SectionHat centered>Travou em algum passo?</SectionHat>
            <p className="mx-auto mt-3 max-w-xl text-ink/80">O grupo do WhatsApp da Superteam Brasil responde rápido, e é onde saem os workshops de IA e vibe coding.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <TrackedCta href={WHATSAPP_COMMUNITY_URL} event="campaign_link_clicked" properties={{ target: "whatsapp", location: "guia_copilot" }}
                className="btn-cut inline-flex items-center gap-2.5 bg-emerald-deep px-8 py-3.5 text-base font-bold text-surface transition-colors duration-(--dur-instant) ease-entrada hover:bg-green-dark">
                <WhatsappLogoIcon aria-hidden size={18} weight="bold" /><span>Entrar no grupo</span>
              </TrackedCta>
              <a href="#valide" className="btn-cut btn-cut-outline inline-flex items-center px-6 py-3 text-sm font-bold text-ink transition-colors duration-(--dur-instant) ease-entrada hover:text-surface [--btn-cut-fill:var(--color-surface-raised)]">Pesquisar outra ideia</a>
            </div>
          </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

