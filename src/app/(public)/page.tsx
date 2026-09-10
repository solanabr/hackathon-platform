import type { CSSProperties, ReactNode } from "react";
import {
  COLOSSEUM_DEADLINE_FALLBACK,
  COLOSSEUM_SLUG,
  WHATSAPP_COMMUNITY_URL,
} from "./pre-registro/constants";
import { getHackathonBySlug } from "@/lib/hackathon";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { logQueryError } from "@/lib/supabase/unwrap";
import { resolveAuthenticatedUserState } from "@/lib/user-state";
import { withPlatformUtm } from "@/lib/attribution";
import {
  BookOpenIcon,
  CheckIcon,
  CoinsIcon,
  DiscordLogoIcon,
  GraduationCapIcon,
  WhatsappLogoIcon,
  YoutubeLogoIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Countdown } from "@/components/ui/countdown";
import { CountUp, Reveal } from "@/components/ui/reveal";
import { TrackedCta } from "@/components/ui/tracked-cta";
import { ColosseumScene } from "@/components/home/colosseum";
import { HalftoneImage } from "@/components/home/halftone-image";
import { CtaHalftone } from "@/components/home/cta-halftone";
import { HeroHalftone } from "@/components/home/hero-halftone";
import { NetworkHalo } from "@/components/home/network-halo";
import { StepNumeral } from "@/components/home/step-numeral";
import { JourneyPin } from "@/components/home/journey-pin";
import { FaqHalftone } from "@/components/home/faq-halftone";
import { EventTicket } from "@/components/campaign/event-ticket";
import { CasesFan } from "@/components/home/cases-fan";
import {
  CommunityPreview,
  EarnPreview,
} from "@/components/home/bento-previews";
import {
  CalendarTrack,
  type CalendarItem,
} from "@/components/home/calendar-track";
import { SolanaCoin } from "@/components/home/solana-coin";
import { PressSheet } from "@/components/home/press-sheet";
import { SectionRails } from "@/components/home/rails";
import { SoundToggle } from "@/components/campaign/sound-toggle";
import { PAGE_SHELL } from "@/components/layout/container";

// A dissolução mora no container, não no SVG: a faixa é recortada de forma
// diferente em cada largura, e só uma máscara relativa à viewport garante que
// o topo do que aparece sempre esmaece em vez de cortar reto.
export const metadata = {
  title: "Hackathon Colosseum | Tire sua ideia do papel",
  description:
    "Participe do hackathon da Colosseum, transforme sua ideia em produto e conheça oportunidades de premiação e investimento. Crie sua conta.",
  openGraph: {
    title: "O próximo time a captar milhões pode ser o seu.",
    description:
      "Hackathon online de 14 de setembro a 12 de outubro de 2026. Crie sua conta na Superteam Brasil e comece.",
    images: [{ url: "/brand/og-colosseum.png", width: 1200, height: 630 }],
  },
};

const CASES = [
  {
    name: "Cloak",
    url: "https://www.cloak.ag/",
    logo: "/brand/cases/cloak.png",
    figure: "R$1,5 mi",
    result: "Investimento anjo",
    tagline: "Infraestrutura de privacidade para empresas que usam blockchain",
    body: (
      <>
        Time brasileiro formado só por{" "}
        <strong className="text-ink">alunos universitários</strong>. Saíram do
        hackathon com investimento anjo de R$1,5 milhão e se formaram com a
        startup já rodando.
      </>
    ),
  },
  {
    name: "Bido",
    url: "https://www.usebido.com/",
    logo: "/brand/cases/bido.png",
    figure: "R$10 mi",
    result: "Rodada levantada",
    tagline: "Camada de pagamentos para agentes de IA",
    body: "Dois amigos de vinte e poucos anos. Chegaram ao último hackathon sem ideia, participaram de todas as mentorias, pivotaram e saíram direto para uma das melhores incubadoras do Vale do Silício.",
  },
  {
    name: "Pode ser você",
    tagline: "Seu time, daqui a um mês",
    tone: "dark" as const,
    glyph: "?",
  },
];

// Os quatro fatos que decidem se a pessoa se inscreve: onde ela compete, o que
// ganha, se o projeto que já existe vale, e se a área dela cabe. Vêm antes do
// convite porque a dúvida chega antes da vontade.
const COLOSSEUM_FACTS = [
  {
    figure: "8 trilhas",
    title: "Uma trilha por rede",
    body: "Solana, Ethereum, Base, Arbitrum, Hyperliquid, Tempo, Zcash e Robinhood Chain. Uma única submissão no Colosseum concorre à trilha da sua rede, bancada pelo parceiro e julgada pelo Colosseum, e ao prêmio geral entre todas as redes. As trilhas já anunciadas pagam US$ 100 mil entre os 10 melhores.",
  },
  {
    figure: "US$ 250 mil",
    accent: true,
    title: "O cheque do acelerador",
    body: "Vencedores selecionados entram no acelerador do Colosseum com US$ 250 mil de investimento. Exige alguma integração com a Solana.",
  },
  {
    figure: "Projeto existente",
    title: "Pode, com regras",
    body: "Vale se a startup ainda não captou capital relevante. Só conta o que for construído entre 14 de setembro e 12 de outubro, e código anterior precisa ser declarado.",
  },
  {
    figure: "Qualquer área",
    title: "DeFi, pagamentos, RWA, consumer, IA",
    body: "As trilhas são por rede, não por tema. Os jurados olham produto, tração e plano de distribuição. Sozinho ou em time, uma submissão por pessoa.",
  },
];

const SOLANA_STATS = [
  {
    value: "33B",
    label: "transações em 2025, mais que todas as outras redes combinadas",
  },
  { value: "70M", label: "carteiras ativas mensais em média durante 2025" },
  {
    value: "$700K",
    label: "em taxas num único dia, mais que 30+ redes combinadas",
  },
  { value: "$972B", label: "em volume de stablecoins em fevereiro de 2026" },
];

const CALENDAR: CalendarItem[] = [
  {
    label: "Agora",
    title: "Registro aberto na Colosseum",
    body: "Crie sua conta, conheça as regras e converse com quem pode construir com você.",
  },
  {
    day: "14",
    label: "set",
    startsAt: "2026-09-14T00:00:00-03:00",
    title: "Início do hackathon",
    body: "Começa a competição. Cadastre projeto e time na plataforma oficial. Só o que for construído a partir daqui conta.",
  },
  {
    label: "Set a out",
    startsAt: "2026-09-15T00:00:00-03:00",
    title: "Construa e prepare a apresentação",
    body: "Workshops e mentorias ao vivo. Construa seu produto e prepare o vídeo de apresentação.",
  },
  {
    day: "12",
    label: "out",
    startsAt: "2026-10-12T00:00:00-03:00",
    isDeadline: true,
    title: "Encerramento do evento",
    body: "Envie o projeto pela plataforma oficial até 23h59 no horário da Califórnia, 3h59 do dia 13 em Brasília. Confira o horário e o fuso por lá.",
  },
  {
    label: "Em breve",
    title: "Anúncio dos vencedores",
    body: "Avisamos por e-mail e WhatsApp.",
  },
];

const RESOURCES = [
  {
    label: "Grupo do WhatsApp",
    href: WHATSAPP_COMMUNITY_URL,
    icon: WhatsappLogoIcon,
  },
  {
    label: "Aulas no YouTube",
    href: "https://www.youtube.com/@SuperteamBrasil",
    icon: YoutubeLogoIcon,
  },
  {
    label: "Wiki do Superteam",
    href: "https://wiki.superteam.com.br",
    icon: BookOpenIcon,
  },
  {
    label: "Superteam Earn",
    href: withPlatformUtm("https://superteam.fun/earn/s/superteambr", {
      content: "lp_recursos",
      campaign: "colosseum-2026",
    }),
    icon: CoinsIcon,
  },
  {
    label: "Academy",
    href: "https://www.st.academy/",
    icon: GraduationCapIcon,
  },
  {
    label: "Discord",
    href: "https://discord.gg/superteambrasil",
    icon: DiscordLogoIcon,
  },
];
const FAQ_ITEMS = [
  {
    q: "Preciso saber programar?",
    a: "Não. Você também pode contribuir com design, comunicação, marketing ou negócios. A Colosseum permite a participação de pessoas sem formação técnica.",
  },
  {
    q: "Ainda não tenho uma ideia. Posso começar?",
    a: "Pode. Crie sua conta, indique suas habilidades e conheça a comunidade enquanto procura um projeto de que gostaria de participar.",
  },
  {
    q: "Preciso ter uma equipe formada?",
    a: "Não. Você pode começar sem uma equipe e indicar no cadastro que está procurando pessoas para construir com você.",
  },
  {
    q: "Criar a conta aqui já me inscreve no evento?",
    a: "Não. A conta é da plataforma da Superteam Brasil. Depois, você precisa concluir sua inscrição oficial na Colosseum. Mostramos esse próximo passo durante o cadastro.",
  },
  {
    q: "Posso completar minhas informações depois?",
    a: "Sim. As informações complementares sobre sua ideia e sua equipe podem ser salvas e concluídas depois. A inscrição oficial e a entrega do projeto seguem os prazos do evento.",
  },
  {
    q: "Quanto custa?",
    a: "Nada. Criar a conta, participar da comunidade e entrar no hackathon são gratuitos.",
  },
  {
    q: "Preciso falar inglês?",
    a: "A submissão na Colosseum é em inglês. Toda a Trilha Brasil, as mentorias e o suporte da Superteam Brasil são em português.",
  },
  {
    q: "Quais são os prêmios?",
    a: "Os detalhes de valores, categorias e critérios serão atualizados aqui após a divulgação oficial. A competição também pode abrir oportunidades de investimento, que dependem de seleção própria.",
  },
  {
    q: "Ganhar o hackathon garante investimento?",
    a: "Não. Prêmios e investimento seguem processos diferentes. A entrada em um programa de aceleração ou investimento depende da avaliação e dos critérios de seleção.",
  },
  {
    q: "Preciso usar Solana no meu projeto?",
    a: "O evento aceita projetos de diferentes blockchains, incluindo Solana. A Superteam Brasil faz parte da comunidade Solana, mas essa edição da Colosseum é aberta a todas essas redes.",
  },
  {
    q: "O que é a Trilha Brasil?",
    a: "Mentoria e premiação da Superteam Brasil só para times brasileiros, publicadas no Superteam Earn. Para concorrer, além de enviar o projeto na Colosseum, você submete o mesmo projeto no desafio da Trilha Brasil. Valores e condições saem no Earn.",
  },
  {
    q: "Posso entrar no grupo antes de criar minha conta?",
    a: "Sim. Você pode conhecer a comunidade pelo WhatsApp e criar sua conta quando decidir avançar. Entrar no grupo não conclui a inscrição no hackathon.",
  },
];

// Vertical rhythm only — the stage width and gutters come from PAGE_SHELL,
// the same rails the header and footer ride. Narrow text measures
// (max-w-2xl paragraphs etc.) stay local to their block.
const LP_SECTION = "pt-24 lg:pt-28 xl:pt-32";

function SectionHat({
  children,
  centered = false,
  onDark = false,
}: {
  children: ReactNode;
  centered?: boolean;
  onDark?: boolean;
}) {
  return (
    <p
      className={`flex items-center gap-3 font-mono text-[11px] font-bold uppercase tracking-[0.22em] ${onDark ? "text-surface" : "text-ink/75"} ${centered ? "justify-center" : ""}`}
    >
      <span
        aria-hidden
        className={`h-[7px] w-[18px] shrink-0 rounded-[2px] ${onDark ? "bg-yellow" : "bg-emerald"}`}
      />
      {children}
    </p>
  );
}

// The Solana hub, drawn as a network: one chip in the middle of a particle
// sphere, the four numbers hanging off it on dotted wires. Coordinates below
// live in the 1200x620 viewBox the lg+ diagram is locked to, so the wires and
// the absolutely placed cards land on the same points at any width.
/* Quatro fios espelhados ao pixel faziam um diagrama, não uma rede: o
   argumento e o apoio chegavam à moeda pelo mesmo caminho e com o mesmo peso.
   Agora o 33B encara a moeda de frente pelo fio mais curto e mais reto — é a
   conexão direta — e os três apoios orbitam à direita por fios dobrados de
   comprimentos diferentes. A ordem segue SOLANA_STATS: 33B, 70M, 700K, 972B. */
const WIRES = [
  { d: "M 368 240 H 446", cx: 368, cy: 240 },
  { d: "M 844 398 H 780 L 712 342", cx: 844, cy: 398 },
  { d: "M 820 74 H 762 L 700 140", cx: 820, cy: 74 },
  { d: "M 928 236 H 756", cx: 928, cy: 236 },
];

const STAT_SLOTS = [
  "left-0 top-1/2 w-[30%]",
  "right-[9%] top-[83%] w-[20%]",
  "right-[10%] top-[15%] w-[21%]",
  "right-0 top-[49%] w-[22%]",
];

/* O stagger tem que seguir o caminho do olho, não a ordem do array. No palco
   os apoios ficam em topo/meio/base à direita, então o argumento entra
   primeiro e a varredura desce em volta da moeda. Ordem de SOLANA_STATS
   (33B, 70M, 700K, 972B) mapeada para posição na entrada. */
const STAT_ENTRY_ORDER = [1, 4, 2, 3];

function StatWires() {
  return (
    <svg
      aria-hidden
      focusable="false"
      viewBox="0 0 1200 480"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      {WIRES.map((wire) => (
        <g key={wire.d}>
          <path
            d={wire.d}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeDasharray="2 7"
            strokeLinecap="round"
            className="text-surface/40"
          />
          <circle cx={wire.cx} cy={wire.cy} r={5} className="fill-yellow" />
        </g>
      ))}
    </svg>
  );
}

/* `lead` é o argumento da seção, não mais um número: ganha corpo maior, mais
   respiro e o ângulo de repouso do papel, para o olho pousar nele antes dos
   outros três. Sem isso são quatro caixas de peso igual e nenhuma voz. */
function StatCard({
  stat,
  lead = false,
}: {
  stat: (typeof SOLANA_STATS)[number];
  lead?: boolean;
}) {
  return (
    <div
      className={`h-full rounded-xl border-2 border-green-dark bg-surface-raised shadow-sticker ${
        lead
          ? "rotate-[calc(var(--tilt-papel)*-1)] px-6 py-6 lg:px-7 lg:py-7"
          : "px-5 py-4"
      }`}
    >
      <dt
        className={`font-heading font-black uppercase leading-none tracking-tight text-green-dark [font-stretch:115%] ${
          lead
            ? "text-5xl sm:text-6xl lg:text-[4.4rem] xl:text-[5.2rem]"
            : "text-3xl sm:text-4xl"
        }`}
      >
        <CountUp value={stat.value} />
      </dt>
      <dd
        className={`text-pretty leading-snug text-muted ${
          lead ? "mt-3 text-sm sm:text-base" : "mt-2 text-xs sm:text-sm"
        }`}
      >
        {stat.label}
      </dd>
    </div>
  );
}

function NetworkSphere({ className }: { className: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-surface [mask-image:radial-gradient(closest-side,black_58%,transparent)] ${className}`}
    >
      <NetworkHalo className="h-auto w-full" />
    </div>
  );
}

export default async function HomePage() {
  const [colosseum, state] = await Promise.all([
    getHackathonBySlug(COLOSSEUM_SLUG).catch(() => null),
    resolveAuthenticatedUserState().catch(() => null),
  ]);

  // Step 2's button only goes straight to Colosseum for who already did the
  // cadastro; everyone else is routed through /pre-registro first.
  let registered = false;
  if (state && colosseum) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("hackathon_registrations")
      .select("hackathon_id")
      .eq("hackathon_id", colosseum.id)
      .eq("user_id", state.userId)
      .maybeSingle();
    // The landing page never dies on this lookup: an error just means the
    // button routes through /pre-registro, which is the safe default.
    if (error) logQueryError("home.checkRegistration", error);
    registered = Boolean(data);
  }
  // Logged-out visitors skip the /pre-registro round trip and land on the
  // login step with the deep link already attached.
  const cadastroHref = state ? "/pre-registro" : "/auth?next=/pre-registro";
  const ctaLabel = state ? "Continuar meu cadastro" : "Criar conta";
  const submissionDeadline =
    colosseum?.submission_deadline_at ?? COLOSSEUM_DEADLINE_FALLBACK;

  const journey = [
    {
      marker: "Agora",
      title: "Crie sua conta.",
      items: [
        "Entre na plataforma da Superteam Brasil e preencha seus dados",
        "Você pode contar sobre sua ideia e sua equipe agora ou depois",
        "Leva dois minutos",
      ],
      cta: (
        <TrackedCta
          href={cadastroHref}
          event="cta_clicked"
          properties={{ cta: "cadastro", location: "jornada" }}
          className="btn-cut inline-flex w-fit items-center whitespace-nowrap bg-yellow px-6 py-3 text-sm font-bold text-green-dark transition-colors duration-(--dur-instant) ease-entrada hover:bg-yellow-strong"
        >
          <span>{ctaLabel}</span>
        </TrackedCta>
      ),
    },
    {
      marker: "Em seguida",
      title: "Conclua a inscrição oficial.",
      items: [
        "Siga o link para a Colosseum e faça sua inscrição no hackathon",
        "Cada integrante precisa ter uma conta na plataforma oficial",
        "Não precisa ter ideia nem time ainda",
      ],
      cta: colosseum?.external_url ? (
        <TrackedCta
          href={registered ? colosseum.external_url : cadastroHref}
          event={registered ? "campaign_link_clicked" : "cta_clicked"}
          properties={
            registered
              ? { target: "colosseum", location: "lp" }
              : { cta: "cadastro", location: "jornada_colosseum" }
          }
          className="btn-cut btn-cut-outline inline-flex w-fit items-center whitespace-nowrap px-6 py-3 text-sm font-bold text-ink transition-colors duration-(--dur-instant) ease-entrada hover:text-surface [--btn-cut-fill:var(--color-surface-raised)]"
        >
          <span>
            {registered ? "Abrir Colosseum" : "Libera depois de criar a conta"}
          </span>
        </TrackedCta>
      ) : (
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted">
          Inscrições abrem em breve
        </p>
      ),
    },
    {
      marker: "Antes de 14 set",
      title: "Construa com a comunidade.",
      items: [
        "Workshops e mentorias ao vivo",
        "Contato direto com a Superteam Brasil",
        "Onde quem chega sozinho encontra time",
      ],
      cta: (
        <TrackedCta
          href={WHATSAPP_COMMUNITY_URL}
          event="campaign_link_clicked"
          properties={{ target: "whatsapp", location: "lp" }}
          className="btn-cut btn-cut-outline inline-flex w-fit items-center whitespace-nowrap px-6 py-3 text-sm font-bold text-ink transition-colors duration-(--dur-instant) ease-entrada hover:text-surface [--btn-cut-fill:var(--color-surface-raised)]"
        >
          <span>Entrar no grupo do WhatsApp</span>
        </TrackedCta>
      ),
    },
  ];

  return (
    <div className="bg-surface text-ink">
      <PressSheet />
      {/* Hero: on wide screens the copy is centred over the fold, the
          amphitheatre rises from the lower left and bleeds past that margin,
          and the ticket rests against the opposite corner — with the legionary
          standing behind it, closing the right side. The two pieces reach the
          halftone by different routes (render depth, photographic luminance)
          and come out in the same ink, on the same 1.5px grid. */}
      {/* A dobra não corta nada. O ticket é DEPOSITADO no canto e a aresta de
          baixo dele descansa SOBRE a seção seguinte — objeto de papel pousado
          na página, não forma recortada por ela. Um `overflow-x: clip` aqui
          não serviria: o Chromium corta os dois eixos nessa combinação e o
          ticket voltaria a ser cerceado. Quem sangra são os fundos, e eles já
          têm o próprio quadro de corte; a garantia contra rolagem horizontal
          continua no `main`. O `z-10` é o que mantém a aba pendurada por cima
          de `#cases`, que pinta depois na ordem do DOM. */}
      <section className="cena-dobra relative z-10 flex min-h-[calc(100dvh-4rem)] flex-col justify-center lg:justify-start">
        {/* One still frame clips every drifting backdrop, because the fold
            itself no longer clips on Y — and the clip cannot ride on the
            drifting layers, since a clip travels with its own transform and
            would cut the bleeds along a line that walks with the parallax
            instead of along the edge of the fold. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-clip"
        >
          {/* A tinta que sobra nos cantos altos. O monumento e o legionário
            fecham a base do quadro e deixam o topo lateral em papel liso; a
            textura ocupa esse vão sem virar objeto. Deriva curta: ela está
            atrás do monumento, então anda menos que ele — e a camada é maior
            que a seção nos dois sentidos, senão o curso da deriva descobre uma
            faixa de papel limpo na borda onde a mancha é mais densa.

            Só a partir de `lg`: o vão que ela preenche é o das laterais da
            manchete centrada. Abaixo disso o texto é alinhado à esquerda e
            ocupa a largura inteira — a mesma mancha, ali, não preenche canto
            nenhum, ela entra por baixo da leitura. */}
          <div className="cena-deriva-curta absolute inset-x-0 -top-[4%] hidden h-[108%] lg:block">
            <HeroHalftone
              side="left"
              className="absolute left-0 top-0 h-[62%] w-[34%] text-ink/20 lg:h-[68%] lg:w-[30%]"
            />
            <HeroHalftone
              side="right"
              className="absolute right-0 top-0 h-[34%] w-[30%] text-ink/20 lg:h-[42%] lg:w-[28%]"
            />
          </div>

          <div className="cena-deriva-media absolute inset-0 lg:bottom-auto lg:h-[calc(100dvh-4rem)]">
            <div className="absolute inset-x-0 bottom-0 h-[48%] sm:h-[62%] lg:right-auto lg:bottom-[-12%] lg:left-[-10%] lg:h-[70%] lg:w-[72%]">
              <ColosseumScene />
            </div>

            {/* Wide screens only: below `lg` the ticket already owns the
              lower half, and the plate is never fetched. The
              shield bleeds past the right margin the way the amphitheatre
              bleeds past the left — and that bleed is what keeps the figure
              clear of the sub-headline on short screens. */}
            <div className="absolute right-[-5%] bottom-0 hidden h-[88%] w-[32%] lg:block">
              <HalftoneImage src="/home/legionario.webp" minWidth={1024} />
            </div>
          </div>
        </div>

        <div
          className={`relative ${PAGE_SHELL} py-10 lg:flex lg:min-h-[calc(100dvh-4rem)] lg:flex-col lg:[--hero-pt:11vh] lg:[--hero-pb:2.5rem] lg:pb-[var(--hero-pb)] lg:pt-[var(--hero-pt)] lg:[@media(max-height:860px)]:[--hero-pt:5vh] lg:[@media(max-height:860px)]:[--hero-pb:1.5rem]`}
        >
          <div className="lg:mx-auto lg:mb-auto lg:w-full lg:max-w-4xl lg:text-center">
            <div className="hero-print mb-5 flex lg:justify-center">
              <SectionHat>Hackathon Colosseum</SectionHat>
            </div>

            {/* A manchete não aparece: ela é IMPRESSA, e agora o processo
                inteiro está à vista. As chapas esmeralda e amarela entram
                fora do eixo e encaixam no mesmo instante em que a linha
                termina de subir de baixo do rolo. O `--p` é escrito UMA vez,
                aqui, e as três linhas o herdam: uma passagem de prensa, não
                três registros independentes. */}
            <h1
              className="hero-print registro-impressao font-heading text-[clamp(1.7rem,7.7vw,3.2rem)] font-black uppercase leading-[1.02] tracking-tight text-ink [font-stretch:108%] lg:whitespace-nowrap lg:text-[clamp(3rem,4.6vw,4.8rem)]"
              style={{ "--hero-i": 1 } as CSSProperties}
            >
              <span
                className="registro block"
                style={{ "--hero-i": 1 } as CSSProperties}
              >
                O próximo time
              </span>
              <span
                className="registro mt-1 block"
                style={{ "--hero-i": 2 } as CSSProperties}
              >
                a captar{" "}
                <span className="hero-marca inline-block px-3 text-green-dark">
                  milhões
                </span>
              </span>
              <span
                className="registro mt-1 block"
                style={{ "--hero-i": 3 } as CSSProperties}
              >
                pode ser o seu.
              </span>
            </h1>

            <p className="hero-after mt-5 max-w-[19rem] text-pretty text-base leading-relaxed text-ink/70 sm:max-w-2xl sm:text-lg lg:hidden">
              Tire sua ideia do papel, construa um produto e dispute prêmios e
              oportunidades de investimento.
            </p>
            <p className="hero-after mt-6 hidden max-w-xl text-pretty text-base leading-relaxed text-ink/70 sm:text-lg lg:mx-auto lg:block lg:max-w-2xl">
              Um hackathon online para tirar sua ideia do papel, construir um
              produto e disputar prêmios e oportunidades de investimento.
            </p>

            <div
              id="hero-cta"
              className="hero-after mt-8 flex flex-wrap items-center gap-3 lg:justify-center"
              style={{ "--hero-i": 1 } as CSSProperties}
            >
              <TrackedCta
                href={cadastroHref}
                event="cta_clicked"
                properties={{ cta: "cadastro", location: "hero" }}
                className="btn-cut inline-flex items-center whitespace-nowrap bg-emerald-deep px-8 py-3.5 text-sm font-semibold text-surface transition-colors duration-(--dur-instant) ease-entrada hover:bg-green-dark sm:px-10 sm:text-base"
              >
                <span>{ctaLabel}</span>
              </TrackedCta>
              <TrackedCta
                href={WHATSAPP_COMMUNITY_URL}
                event="campaign_link_clicked"
                properties={{ target: "whatsapp", location: "hero" }}
                className="btn-cut btn-cut-outline btn-cut-quiet inline-flex items-center px-8 py-3.5 text-sm font-semibold text-ink sm:px-9 sm:text-base sm:whitespace-nowrap"
              >
                <span>Entrar no grupo do WhatsApp</span>
              </TrackedCta>
            </div>
          </div>

          {/* O quadro guarda a PERSPECTIVA e a cena guarda o GIRO: quem
              observa é a página, quem vira é o cartão. Separados porque a
              cena também é o elemento que a régua de rolagem mede — juntar os
              dois faria a `view()` medir uma caixa que já está deformada. */}
          <div className="cena-bilhete-quadro lg:mt-6 lg:flex lg:w-full lg:max-w-[min(40vw,37rem)] lg:flex-col lg:self-end lg:[margin-bottom:calc((var(--hero-pb)+2rem)*-1)] lg:[@media(max-height:780px)]:origin-bottom-right lg:[@media(max-height:780px)]:scale-90">
            <div className="cena-bilhete">
              <div id="hero-ticket" className="hero-ticket">
                <EventTicket />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="colosseum"
        aria-label="O que é o Colosseum"
        className={`${LP_SECTION} relative bg-surface`}
      >
        <div className={PAGE_SHELL}>
          <Reveal>
            <h2 className="max-w-[15ch] text-balance font-heading text-[clamp(1.9rem,4.6vw,3.35rem)] font-black uppercase leading-[0.92] tracking-[-0.04em] text-ink [font-stretch:118%]">
              O que é o Colosseum
            </h2>
          </Reveal>

          <div className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-5">
            {COLOSSEUM_FACTS.map((fact, i) => (
              <Reveal
                key={fact.figure}
                index={i + 1}
                tone="papel"
                className="h-full min-w-0"
              >
                <article className="flex h-full flex-col rounded-2xl border-2 border-green-dark bg-surface-raised p-5 shadow-sticker sm:p-6">
                  <p className="text-balance font-heading text-[clamp(1.7rem,3vw,2.4rem)] font-black uppercase leading-[0.92] tracking-[-0.03em] text-green-dark [font-stretch:115%]">
                    {"accent" in fact ? (
                      <span className="inline-block bg-yellow px-2 pb-[0.06em] [clip-path:polygon(0_5%,100%_0,100%_95%,0_100%)]">
                        {fact.figure}
                      </span>
                    ) : (
                      fact.figure
                    )}
                  </p>
                  <h3 className="mt-3 font-heading text-lg font-bold leading-snug text-ink sm:text-xl">
                    {fact.title}
                  </h3>
                  <p className="mt-2 text-pretty text-sm leading-relaxed text-ink/75">
                    {fact.body}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>

          <Reveal index={5} tone="texto">
            <p className="mt-6 font-mono text-[11px] uppercase leading-[1.7] tracking-[0.06em] text-ink/65">
              Jurados e regras completas saem em 14 de setembro.
            </p>
          </Reveal>
        </div>
      </section>

      <section
        id="cases"
        className={`cena-p ${LP_SECTION} relative isolate overflow-x-clip bg-surface pb-8 lg:pb-28 xl:pb-32`}
        aria-label="O hackathon"
      >
        <SectionRails />
        <div className={PAGE_SHELL}>
          <CasesFan
            cases={CASES}
            title={
              <Reveal>
                <SectionHat>Colosseum</SectionHat>
                <h2 className="mt-6 font-heading text-[clamp(2rem,5.2vw,4.25rem)] font-black uppercase leading-[0.95] tracking-[-0.04em] [font-stretch:118%]">
                  <span className="block">Uma ideia pode</span>
                  <span className="block">ser o começo</span>
                  <span className="block">da sua empresa</span>
                </h2>
              </Reveal>
            }
            intro={
              <Reveal tone="texto">
                <div className="max-w-[48ch] space-y-4 text-pretty text-[0.95rem] leading-relaxed text-ink/80">
                  <p>
                    Um hackathon é uma competição em que você desenvolve uma
                    ideia e apresenta o resultado. Na Colosseum, a proposta é
                    construir um produto com potencial para virar um negócio.
                    Esta edição se chama Crypto World&apos;s Fair e acontece
                    online.
                  </p>
                  <p>
                    Durante quatro semanas, você pode testar sua ideia,
                    trabalhar com outras pessoas e mostrar o que criou.{" "}
                    <strong className="text-ink">
                      Nas duas últimas edições, times brasileiros saíram de lá
                      com capital confirmado.
                    </strong>
                  </p>
                </div>
              </Reveal>
            }
          />
        </div>
      </section>

      {/* A Jornada: trilho horizontal — pílula de tempo, marcador e cartão por passo. */}
      <JourneyPin
        containerClassName={PAGE_SHELL}
        header={
          <div>
            <SectionHat centered>Como participar</SectionHat>
            <h2 className="mt-4 text-center font-heading text-[3.75rem] font-black uppercase leading-[0.82] tracking-[-0.035em] [font-stretch:112%] [@media(min-height:880px)]:text-[4.75rem] xl:[@media(min-height:980px)]:text-[5.75rem]">
              Entre no
              <br />
              hackathon
              <br />
              em{" "}
              <span className="inline-block bg-green-dark px-3 pb-[0.1em] text-yellow [clip-path:polygon(0_5%,100%_0,100%_95%,0_100%)]">
                3 passos
              </span>
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-pretty text-center font-mono text-[13px] uppercase leading-[1.7] tracking-[0.06em] text-ink/65">
              Programação, design, comunicação e negócios: habilidades
              diferentes ajudam uma ideia a ganhar forma. Você pode começar sem
              ideia e sem time.
            </p>
          </div>
        }
      >
        {journey.map((step, i) => (
          <div
            key={step.title}
            data-journey-card
            className={`journey-card ${
              i === 1 ? "journey-card-mid" : i === 2 ? "journey-card-last" : ""
            }`}
          >
            <div
              className={`card-cut flex h-full flex-col p-5 sm:p-6 ${
                i === 0 ? "" : "card-cut-kraft card-cut-open"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-ink/75">
                  Passo {`0${i + 1}`}
                </p>
                <span
                  className={`inline-flex items-center rounded-full border-2 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] ${
                    i === 0
                      ? "border-green-dark bg-yellow text-green-dark"
                      : "border-green-dark/25 bg-green-dark/5 text-ink/80"
                  }`}
                >
                  {step.marker}
                </span>
              </div>
              <div className="mt-3 border-y border-green-dark/15 py-3 text-green-dark">
                <StepNumeral
                  digit={i + 1}
                  className="mx-auto h-24 w-auto [@media(min-height:960px)]:h-28"
                />
              </div>
              <h3 className="mt-4 font-heading text-xl font-bold">
                {step.title}
              </h3>
              <ul className="mb-4 mt-3 space-y-2">
                {step.items.map((item) => (
                  <li
                    key={item}
                    className="flex gap-2.5 text-pretty text-sm leading-relaxed text-ink/75"
                  >
                    <CheckIcon
                      aria-hidden
                      weight="bold"
                      className="mt-[3px] h-4 w-4 shrink-0 text-green-dark"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto">{step.cta}</div>
            </div>
          </div>
        ))}
      </JourneyPin>

      <section
        className="relative isolate pt-40 lg:pt-48 xl:pt-56"
        id="solana"
        aria-label="Onde a gente constrói"
      >
        <SectionRails crossOffset="top-24" />
        <div className={PAGE_SHELL}>
          <div className="grid items-end gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-14">
            <Reveal>
              <SectionHat>Onde a gente constrói</SectionHat>
              <h2 className="mt-5 text-balance font-heading text-4xl font-black leading-[1.02] tracking-tight text-ink [font-stretch:105%] sm:text-5xl xl:text-[3.6rem]">
                Uma nova infraestrutura financeira.{" "}
                <span className="inline-block -rotate-1 border-2 border-green-dark bg-yellow px-3 text-green-dark shadow-sticker">
                  Global.
                </span>
              </h2>
            </Reveal>

            <Reveal index={1} tone="texto">
              <p className="text-pretty text-base leading-relaxed text-muted sm:text-lg lg:pb-2">
                A Superteam Brasil faz parte da comunidade Solana: a rede
                blockchain mais rápida do mundo, com milhares de transações por
                segundo e taxas de frações de centavo. É de lá que vem o nosso
                suporte técnico. Esta edição da Colosseum aceita projetos de
                diferentes redes.
              </p>
            </Reveal>
          </div>
        </div>

        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-[-6rem] -z-10 h-44 bg-surface-kraft lg:bottom-[-7rem] lg:h-48"
        />

        <div className={`cena-p-curta ${PAGE_SHELL} mt-12 xl:mt-16`}>
          <div className="cena-assenta rounded-3xl border-2 border-green-dark bg-emerald-deep px-5 py-12 shadow-sticker sm:rounded-[2.5rem] sm:px-8 sm:py-14 lg:px-12 lg:py-16 xl:px-16">
            <div className="relative hidden aspect-[1200/480] w-full lg:block">
              <NetworkSphere className="w-[52%]" />
              <StatWires />

              <Reveal
                tone="longe"
                className="absolute left-1/2 top-1/2 w-[25%] -translate-x-1/2 -translate-y-1/2"
              >
                <SolanaCoin />
              </Reveal>

              <dl>
                {SOLANA_STATS.map((stat, i) => (
                  <Reveal
                    key={stat.value}
                    index={STAT_ENTRY_ORDER[i]}
                    tone="papel"
                    className={`absolute -translate-y-1/2 ${STAT_SLOTS[i]}`}
                  >
                    <StatCard stat={stat} lead={i === 0} />
                  </Reveal>
                ))}
              </dl>
            </div>

            <div className="lg:hidden">
              <Reveal className="relative mx-auto flex max-w-xs justify-center">
                <NetworkSphere className="w-[125%]" />
                <div className="relative w-[76%]">
                  <SolanaCoin />
                </div>
              </Reveal>

              <dl className="mt-8 grid grid-cols-2 gap-4 sm:gap-5">
                {SOLANA_STATS.map((stat, i) => (
                  <Reveal
                    key={stat.value}
                    index={i + 1}
                    tone="papel"
                    className={i === 0 || i === 3 ? "col-span-2" : undefined}
                  >
                    <StatCard stat={stat} lead={i === 0} />
                  </Reveal>
                ))}
              </dl>
            </div>

            <Reveal index={5} tone="texto">
              <p className="mx-auto mt-12 max-w-3xl text-balance text-center text-sm leading-relaxed text-surface/80 sm:text-base">
                Não é só hype:{" "}
                <span className="font-semibold text-surface">
                  Visa, Mastercard, Stripe, PayPal, BlackRock, J.P. Morgan,
                  Western Union, SpaceX e Kalshi
                </span>{" "}
                já emitem e liquidam ativos na rede. E a Solana está nas maiores
                bolsas do planeta, de Wall Street à B3.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      <section
        id="informacoes"
        aria-label="Informações"
        className="cena-p relative isolate mt-24 lg:mt-28"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-surface-kraft [mask-image:linear-gradient(to_bottom,black_0,black_calc(100%-20rem),rgba(0,0,0,0.82)_calc(100%-16rem),rgba(0,0,0,0.45)_calc(100%-11rem),rgba(0,0,0,0.12)_calc(100%-5rem),transparent_100%)]"
        />
        <div className={`${PAGE_SHELL} py-16 lg:pb-28 lg:pt-14`}>
          <Reveal>
            <SectionHat>Antes de começar</SectionHat>
            <h2 className="mt-4 font-heading text-[clamp(2.1rem,6.6vw,5.25rem)] font-black uppercase leading-[0.84] tracking-[-0.04em] text-ink [font-stretch:120%] lg:text-[clamp(3.6rem,7.2vw,5.25rem)]">
              Informações
            </h2>
            <p className="mt-5 max-w-2xl border-t-2 border-green-dark pt-4 text-pretty text-lg leading-relaxed text-ink/80">
              As datas que não podem passar batido, a trilha extra para
              brasileiros e a comunidade onde você encontra quem constrói com
              você.
            </p>
          </Reveal>

          {/* 50/50 é ausência de decisão. O calendário é a carta densa — cinco
              marcos com data e corpo — e fica na entrada da leitura, então
              recebe a fatia maior; a Trilha Brasil é parágrafo mais mock e
              comprime sem perder nada. */}
          <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,1fr)]">
            <Reveal index={1} tone="papel" className="h-full min-w-0">
              <article className="relative flex h-full flex-col overflow-clip rounded-2xl border-2 border-green-dark bg-emerald-deep shadow-sticker">
                <CtaHalftone className="cena-zoom pointer-events-none absolute inset-0 h-full w-full text-surface/20 [mask-image:radial-gradient(82%_86%_at_50%_50%,transparent_42%,rgba(0,0,0,0.45)_72%,black_100%)]" />
                <header className="relative px-6 pt-5 sm:px-8 sm:pt-6">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-surface">
                    Calendário
                  </p>
                  <h3 className="mt-1.5 font-heading text-xl font-black uppercase text-surface-raised [font-stretch:115%] sm:text-2xl">
                    Calendário do hackathon
                  </h3>
                  <p className="mt-1.5 max-w-2xl text-pretty text-sm leading-relaxed text-surface">
                    Da abertura das inscrições ao anúncio dos vencedores.
                  </p>
                  {/* O card abre com o único número que muda sozinho: sem ele
                      o calendário é uma tabela, com ele é um relógio. */}
                  <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-surface/25 bg-green-dark/25 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest text-surface-raised">
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 rounded-full bg-yellow bento-pulse bento-pulse-yellow"
                    />
                    Faltam
                    <Countdown
                      deadlineIso={submissionDeadline}
                      placeholder="—"
                      className="text-yellow tabular-nums"
                    />
                    para o envio
                  </p>
                </header>
                <CalendarTrack
                  items={CALENDAR}
                  deadlineIso={submissionDeadline}
                />
                <div className="relative px-6 pb-6 sm:px-8 sm:pb-8">
                  <TrackedCta
                    href="https://colosseum.com/hackathon"
                    event="campaign_link_clicked"
                    properties={{
                      target: "colosseum_docs",
                      location: "calendario",
                    }}
                    className="link-tinta text-sm font-bold text-surface transition-colors duration-(--dur-instant) ease-entrada hover:text-surface-raised"
                  >
                    Consultar as orientações oficiais
                  </TrackedCta>
                </div>
              </article>
            </Reveal>

            <Reveal index={2} tone="papel" className="h-full min-w-0">
              <article className="relative flex h-full flex-col overflow-hidden rounded-2xl border-2 border-green-dark bg-surface shadow-sticker">
                <header className="relative p-5 pb-0 sm:p-6 sm:pb-0">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-green-dark/80">
                    Superteam Earn
                  </p>
                  <h3 className="mt-2 font-heading text-2xl font-black uppercase text-ink [font-stretch:115%]">
                    Trilha Brasil
                  </h3>
                  <p className="mt-3 text-pretty text-sm leading-relaxed text-green-dark/70">
                    Os brasileiros têm uma trilha extra, publicada no Superteam
                    Earn, com mentoria e premiação da Superteam Brasil. Dá para
                    concorrer nas duas ao mesmo tempo, com apoio da Superteam
                    Brasil da conta à submissão. Valores e condições saem no
                    Earn.
                  </p>
                </header>
                <EarnPreview />
                <div className="relative mt-auto flex p-5 pt-6 sm:p-6 sm:pt-7">
                  <TrackedCta
                    href={withPlatformUtm(
                      "https://superteam.fun/earn/s/superteambr",
                      {
                        content: "lp_trilha_brasil",
                        campaign: "colosseum-2026",
                      },
                    )}
                    event="campaign_link_clicked"
                    properties={{ target: "earn", location: "lp" }}
                    className="btn-cut btn-cut-outline inline-flex w-fit items-center whitespace-nowrap px-6 py-3 text-sm font-bold text-ink transition-colors duration-(--dur-instant) ease-entrada hover:text-surface [--btn-cut-fill:var(--color-surface-raised)]"
                  >
                    <span className="relative">Ver oportunidades no Earn</span>
                  </TrackedCta>
                </div>
              </article>
            </Reveal>

            <Reveal index={3} tone="papel" className="min-w-0 lg:col-span-2">
              <article
                id="comunidade"
                className="relative grid overflow-hidden rounded-2xl border-2 border-green-dark bg-surface shadow-sticker lg:grid-cols-2 lg:items-stretch"
              >
                <div className="relative flex flex-col p-5 sm:p-6 lg:pr-0">
                  <header className="relative">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-green-dark/80">
                      Recursos
                    </p>
                    <h3 className="mt-2 font-heading text-[clamp(1.9rem,3.4vw,2.75rem)] font-black uppercase leading-[0.95] text-ink [font-stretch:115%]">
                      Conheça quem
                      <br />
                      vai construir
                      <br />
                      com você
                    </h3>
                    <p className="mt-3 text-pretty text-sm leading-relaxed text-green-dark/70">
                      Entre no grupo do WhatsApp para acompanhar as conversas,
                      apresentar sua ideia e conhecer possíveis parceiros de
                      equipe. Você pode conhecer a comunidade antes de criar sua
                      conta. As aulas, a wiki e a Academy cobrem o caminho do
                      zero até a submissão, e todo canal abaixo é aberto e
                      gratuito.
                    </p>
                  </header>
                  <ul className="mt-6 grid flex-1 auto-rows-fr grid-cols-2 gap-px overflow-hidden rounded-xl border-2 border-green-dark bg-green-dark shadow-sticker sm:grid-cols-3">
                    {RESOURCES.map((r) => {
                      const Icon = r.icon;
                      return (
                        <li key={r.label} className="bg-surface-raised">
                          <TrackedCta
                            href={r.href}
                            event="campaign_link_clicked"
                            properties={{
                              target: r.label,
                              location: "recursos",
                            }}
                            className="tile-recurso flex h-full flex-col items-center justify-center gap-2.5 px-3 py-7 text-center text-[13px] font-bold leading-tight text-ink transition-colors duration-(--dur-instant) ease-entrada hover:bg-emerald-deep hover:text-surface sm:py-8 sm:text-sm"
                          >
                            <Icon size={24} weight="bold" aria-hidden />
                            {r.label}
                          </TrackedCta>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <div className="pb-4 sm:pb-6">
                  <CommunityPreview />
                </div>
              </article>
            </Reveal>
          </div>
        </div>
      </section>

      <section
        id="faq"
        aria-label="Perguntas frequentes"
        className="relative isolate mt-8 overflow-clip pb-10 lg:mt-10 lg:pb-14"
      >
        <SectionRails crossOffset="top-8" />
        <div className={`${PAGE_SHELL} pt-6 lg:pt-8`}>
          <div className="grid items-end gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-16">
            <Reveal>
              <h2 className="font-heading text-[clamp(2.4rem,6.4vw,3.6rem)] font-black uppercase leading-[0.95] tracking-tight text-ink [font-stretch:112%] xl:text-[4rem]">
                Perguntas
                <br />
                frequentes
              </h2>
              <p className="mt-5 max-w-sm text-pretty leading-relaxed text-green-dark/75">
                O que todo time pergunta antes de entrar.
              </p>
            </Reveal>
            <Reveal index={1} tone="texto" className="reveal-estampa">
              <div className="cena-deriva-media flex flex-col items-start gap-0 lg:items-end">
                <FaqHalftone className="hidden -mb-4 w-[19rem] text-ink lg:block xl:w-[23rem]" />
              </div>
            </Reveal>
          </div>

          <div className="mt-10 grid border-t border-dashed border-green-dark/35 lg:grid-cols-2 lg:gap-x-14 xl:gap-x-24">
            {[FAQ_ITEMS.slice(0, 6), FAQ_ITEMS.slice(6)].map((column, c) => (
              <div key={c}>
                {column.map((f, i) => (
                  <Reveal key={f.q} index={i} tone="texto">
                    <details className="faq-linha group border-b border-dashed border-green-dark/35">
                      <summary className="flex cursor-pointer list-none items-start gap-4 py-5 sm:gap-5 [&::-webkit-details-marker]:hidden">
                        <span
                          aria-hidden
                          className="mt-1.5 w-7 shrink-0 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-green-dark/65"
                        >
                          Q{c * 6 + i + 1}
                        </span>
                        <span className="flex-1 text-pretty font-heading text-base font-bold leading-snug text-ink transition-colors duration-(--dur-instant) ease-entrada group-hover:text-emerald-deep sm:text-lg">
                          {f.q}
                        </span>
                        <span
                          aria-hidden
                          className="relative mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border-2 border-green-dark/60 text-green-dark transition-colors duration-(--dur-instant) ease-entrada group-hover:border-green-dark group-hover:bg-yellow"
                        >
                          <span className="h-[2px] w-3 rounded-full bg-current" />
                          <span className="absolute h-3 w-[2px] rounded-full bg-current transition-transform duration-(--dur-instant) ease-inout group-open:scale-y-0" />
                        </span>
                      </summary>
                      <p className="faq-answer pb-6 pl-11 pr-10 text-pretty leading-relaxed text-green-dark/75 sm:pl-12">
                        {f.a}
                      </p>
                    </details>
                  </Reveal>
                ))}
              </div>
            ))}
          </div>

          {/* A saída de emergência vem DEPOIS das perguntas: quem ainda não
              achou a resposta é quem precisa dela, e no topo ela aparecia
              antes de a pessoa ter procurado. De quebra fecha o vazio que
              sobrava entre a última linha e a seção seguinte. */}
          <Reveal index={2} tone="texto">
            <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-pretty font-heading text-lg font-bold leading-snug text-ink">
                Ficou faltando alguma?
              </p>
              <TrackedCta
                href={WHATSAPP_COMMUNITY_URL}
                event="campaign_link_clicked"
                properties={{ target: "whatsapp", location: "faq" }}
                className="btn-cut inline-flex w-fit items-center gap-2.5 whitespace-nowrap bg-emerald-deep px-8 py-3.5 text-sm font-semibold text-surface transition-colors duration-(--dur-instant) ease-entrada hover:bg-green-dark"
              >
                <WhatsappLogoIcon aria-hidden size={18} weight="bold" />
                <span>Pergunta no WhatsApp</span>
              </TrackedCta>
            </div>
          </Reveal>
        </div>
      </section>

      <section
        id="ultima-chamada"
        className={LP_SECTION}
        aria-label="Última chamada"
      >
        <div className="cena-p-curta mx-auto w-full max-w-[100rem] px-4 sm:px-6 lg:px-8">
          <div className="grao cena-assenta relative overflow-clip rounded-3xl border-2 border-green-dark bg-emerald-deep px-5 py-12 shadow-sticker sm:rounded-[2.5rem] sm:px-8 sm:py-14 lg:px-12 lg:py-16 xl:px-16">
            <CtaHalftone className="cena-zoom pointer-events-none absolute inset-0 h-full w-full text-surface/35 [mask-image:radial-gradient(82%_86%_at_50%_50%,transparent_42%,rgba(0,0,0,0.45)_72%,black_100%)]" />
            <div className="relative mx-auto max-w-5xl">
              <Reveal>
                <div className="text-center">
                  <SectionHat centered onDark>
                    Última chamada
                  </SectionHat>
                  {/* O mesmo gesto da primeira dobra, fechando o ciclo: a
                      manchete que abriu a página impressa é a que a encerra,
                      e aqui o registro é comandado pela rolagem em vez do
                      load. Sobre o verde as chapas trocam para creme e
                      amarelo — esmeralda sobre esmeralda não erra visível. */}
                  <h2 className="registro registro-escuro mt-5 mx-auto max-w-4xl font-heading font-black uppercase leading-[1.06] tracking-tight text-surface [font-stretch:108%]">
                    <span className="block text-balance text-[clamp(1.75rem,7vw,2.75rem)] lg:text-[3.1rem]">
                      O próximo time a captar
                    </span>
                    <span className="mt-1 block text-balance text-[clamp(1.75rem,7vw,2.75rem)] lg:text-[3.1rem]">
                      <span className="inline-block bg-yellow px-3 text-green-dark">
                        milhões
                      </span>{" "}
                      pode ser o seu.
                    </span>
                  </h2>
                  <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-surface/80 sm:text-lg">
                    Crie sua conta e comece a jornada para construir, apresentar
                    seu projeto e buscar oportunidades para transformá-lo em uma
                    empresa.
                  </p>
                </div>
              </Reveal>

              <div className="mt-14 lg:mt-16">
                <p className="flex items-center justify-center gap-4 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-surface sm:gap-6">
                  <span
                    aria-hidden
                    className="h-px w-8 bg-surface/25 sm:w-20"
                  />
                  O hackathon encerra em
                  <span
                    aria-hidden
                    className="h-px w-8 bg-surface/25 sm:w-20"
                  />
                </p>
                <Countdown
                  deadlineIso={submissionDeadline}
                  variant="segments"
                  size="xl"
                  tone="surface"
                  className="mt-7 sm:mt-9"
                />
                <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:mt-11 sm:flex-row sm:gap-4">
                  <TrackedCta
                    href={cadastroHref}
                    event="cta_clicked"
                    properties={{ cta: "cadastro", location: "fechamento" }}
                    className="btn-cut inline-flex items-center whitespace-nowrap bg-yellow px-8 py-3.5 text-sm font-semibold text-green-dark transition-colors duration-(--dur-instant) ease-entrada hover:bg-yellow-strong sm:px-10 sm:text-base"
                  >
                    <span>{ctaLabel}</span>
                  </TrackedCta>
                  <TrackedCta
                    href={WHATSAPP_COMMUNITY_URL}
                    event="campaign_link_clicked"
                    properties={{ target: "whatsapp", location: "fechamento" }}
                    className="btn-cut btn-cut-outline inline-flex items-center whitespace-nowrap px-8 py-3.5 text-sm font-semibold text-surface transition-colors duration-(--dur-instant) ease-entrada sm:px-10 sm:text-base [--btn-cut-edge-color:color-mix(in_srgb,var(--color-surface)_35%,transparent)] [--btn-cut-fill:var(--color-emerald-deep)]"
                  >
                    <span>Entrar no grupo do WhatsApp</span>
                  </TrackedCta>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SoundToggle />
    </div>
  );
}
