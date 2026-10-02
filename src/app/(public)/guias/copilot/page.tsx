import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ArrowUpRightIcon, WhatsappLogoIcon } from "@phosphor-icons/react/dist/ssr";
import { CopyButton } from "@/components/ui/copy-button";
import { Reveal } from "@/components/ui/reveal";
import { SectionHat } from "@/components/ui/section-hat";
import { TrackedCta } from "@/components/ui/tracked-cta";
import { withPlatformUtm } from "@/lib/attribution";
import { WHATSAPP_COMMUNITY_URL } from "@/app/(public)/pre-registro/constants";
import { PAGE_SHELL } from "@/components/layout/container";
import { IdeaExamples } from "./idea-examples";

export const metadata: Metadata = {
  title: "Colosseum Copilot: valide sua ideia antes de construir",
  description: "Use o Colosseum Copilot no Claude Code ou no Codex para pesquisar mais de 8 mil projetos de hackathons anteriores e validar sua ideia. Guia de instalação, ideias e prompts em português.",
  openGraph: { title: "Colosseum Copilot · Guia da Superteam Brasil", description: "Saiba o que já foi construído antes de começar. Guia de instalação, ideias e prompts em português.", images: [{ url: "/guias/copilot/og.png", width: 1200, height: 630 }] },
};

const SIGNUP_URL = withPlatformUtm("https://colosseum.com/signup?ref=lp", { content: "guia_copilot_conta" });
const CONNECTIONS_URL = withPlatformUtm("https://colosseum.com/arena/copilot/connections", { content: "guia_copilot_conexoes" });
const DOCS_URL = withPlatformUtm("https://docs.colosseum.com/copilot", { content: "guia_copilot_docs" });
const SECTION = "px-4 pt-24 sm:px-6 lg:pt-28 xl:pt-32";
const AGENT_SETUP_PROMPT = "Set up Colosseum Copilot for this agent using https://colosseum.com/copilot/onboard.md. Install the official ColosseumOrg/colosseum-copilot skill, let me approve Colosseum sign-in, and return to my task.";
const INSTALL = [
  { agent: "Claude Code", cmd: "npx skills add ColosseumOrg/colosseum-copilot -g -a claude-code" },
  { agent: "Codex", cmd: "npx skills add ColosseumOrg/colosseum-copilot -g -a codex" },
  { agent: "OpenClaw", cmd: "npx skills add ColosseumOrg/colosseum-copilot -g -a openclaw" },
];
const LOGIN = "npx @colosseum-org/copilot-connect login";
const LOGIN_DEVICE = "npx @colosseum-org/copilot-connect login --device";
const STATUS = "npx @colosseum-org/copilot-connect status";
const PROMPTS = [
  "Use o Colosseum Copilot: quero construir pagamentos em stablecoin para agentes de IA na Solana. Quem já fez isso nos hackathons do Colosseum e o que deu errado?",
  "Use o Colosseum Copilot: compare os projetos vencedores de DeFi do Breakout e do Cypherpunk. O que os vencedores tinham em comum?",
  "Use o Colosseum Copilot: existe espaço para um app de consumo de privacidade na Solana? Liste os concorrentes vivos e os que morreram.",
  "Use o Colosseum Copilot: quais projetos de DePIN passaram para o acelerador? O que os diferenciou dos que não passaram?",
  "Use o Colosseum Copilot: quais ferramentas da minha chain servem para um marketplace B2B com liquidação em stablecoin, e o que times parecidos já construíram?",
];

function Ext({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className="font-bold text-emerald underline decoration-2 underline-offset-4 hover:text-green-dark">{children}</a>;
}

function Code({ code, label }: { code: string; label: string }) {
  return (
    <div className="mt-3 flex flex-col gap-3 rounded-2xl border-2 border-green-dark bg-green-dark p-4 sm:flex-row sm:items-start sm:justify-between">
      <pre className="min-w-0 flex-1 overflow-x-auto whitespace-pre-wrap [overflow-wrap:anywhere] font-mono text-sm leading-relaxed text-surface">{code}</pre>
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

export default function CopilotGuidePage() {
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
            O Colosseum Copilot é a base de dados dos hackathons do Colosseum: 8.286 projetos de cinco hackathons, quem venceu, o que construíram e onde estão os links. Aqui você aprende a usar o Copilot dentro do seu agente de código, em português, e encontra ideias para começar.
          </p>
          </Reveal>
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
              Não custa nada. Você precisa de uma conta no Colosseum, a mesma onde se inscreve no hackathon, e do Node.js 20 ou mais novo. Cinco minutos de setup.
            </p>
            <p className="mt-5 max-w-2xl rounded-2xl border-2 border-green-dark bg-yellow/30 px-5 py-4 text-sm leading-relaxed text-ink">
              <strong>Seguiu a versão antiga deste guia?</strong> O Colosseum trocou o token manual por um login no navegador. Os tokens antigos param de funcionar em 28 de outubro e não trazem o hackathon Frontier. Refaça os passos abaixo e apague <code>COLOSSEUM_COPILOT_PAT</code> e <code>COLOSSEUM_COPILOT_API_BASE</code> do seu <code>.zshrc</code> ou <code>.bashrc</code>.
            </p>
          </Reveal>

          <Step n={1} title="Tenha uma conta no Colosseum" why="É com ela que você entra no Copilot e se inscreve no hackathon.">
            <p>Se ainda não tem, <Ext href={SIGNUP_URL}>crie sua conta no Colosseum</Ext>. É grátis e leva um minuto.</p>
          </Step>

          <Step n={2} title="Peça para o seu agente configurar" why="O jeito mais rápido: o agente instala a skill e abre o login para você.">
            <p>Cole este pedido no Claude Code, no Codex ou no OpenClaw. Ele está em inglês porque é o texto oficial do Colosseum:</p>
            <Code code={AGENT_SETUP_PROMPT} label="agent-setup" />
            <p className="mt-3">O agente instala a skill e abre uma página do Colosseum no navegador. Confira se ela mostra a sua conta e clique em <strong>Approve</strong>. Deu certo? Pule para o passo 5.</p>
          </Step>

          <Step n={3} title="Ou instale a skill você mesmo" why="Os mesmos passos, rodando os comandos no terminal.">
            {INSTALL.map((i) => (
              <div key={i.agent} className="mt-4">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-green-dark/80">{i.agent}</p>
                <Code code={i.cmd} label={i.agent} />
              </div>
            ))}
            <p className="mt-3 text-sm text-ink/70">Depois abra uma nova sessão do agente, para ele carregar a skill.</p>
          </Step>

          <Step n={4} title="Entre com a sua conta" why="O login acontece no navegador. Não há mais token para copiar.">
            <Code code={LOGIN} label="login" />
            <p className="mt-3">Uma página do Colosseum abre no navegador. Confira a conta e clique em <strong>Approve</strong>. A caixa <strong>Help improve Copilot</strong> é opcional e vem desmarcada: se você marcar, suas perguntas e as respostas do agente são compartilhadas com o Colosseum.</p>
            <p className="mt-4 text-sm text-ink/70">Sem navegador, ou trabalhando por SSH? Este comando mostra um link e um código para usar em qualquer navegador:</p>
            <Code code={LOGIN_DEVICE} label="login-device" />
            <p className="mt-4 text-sm text-ink/70">Para conferir a conexão, rode o comando abaixo. A resposta deve trazer <code>ready</code>.</p>
            <Code code={STATUS} label="status" />
            <p className="mt-3 text-sm text-ink/70">O login vale 90 dias, ou até você passar 30 dias sem usar. Em <Ext href={CONNECTIONS_URL}>Connected agents</Ext> você vê e revoga os agentes conectados.</p>
          </Step>

          <Step n={5} title="Pergunte em português" why="Prompts prontos para o hackathon; copie e cole no agente.">
            <p>A skill entende português. Cite o Copilot no pedido, para o agente saber que deve usá-lo. Alguns prompts para começar:</p>
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
            <p className="mt-2 leading-relaxed">Ele pesquisa: os projetos dos hackathons, uma biblioteca de pesquisa, as ferramentas de cada chain do hackathon atual e as perguntas frequentes dos programas do Colosseum. Ele sabe o que os times enviaram, não o que está no ar hoje, e conhece melhor a Solana do que as outras chains. Ele não julga por você: quem avalia é o seu agente, com as evidências que o Copilot traz, e quem decide é você. Documentação completa em <Ext href={DOCS_URL}>docs.colosseum.com/copilot</Ext> <ArrowUpRightIcon className="inline" size={14} weight="bold" aria-hidden />.</p>
          </div>
          </Reveal>
        </div>
      </section>

      <section className={SECTION}>
        <div className={PAGE_SHELL}>
          <IdeaExamples />
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
              <a href="#ideias" className="btn-cut btn-cut-outline inline-flex items-center px-6 py-3 text-sm font-bold text-ink transition-colors duration-(--dur-instant) ease-entrada hover:text-surface [--btn-cut-fill:var(--color-surface-raised)]"><span>Ver as ideias</span></a>
            </div>
          </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

