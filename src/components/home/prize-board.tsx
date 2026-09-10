import { CountUp, Reveal } from "@/components/ui/reveal";

/* Os números não são promessa de prêmio: são o que já aconteceu e o que já
   está marcado no calendário. O bloco de baixo é que fala do que ainda não
   foi divulgado — separar as duas coisas é o ponto da seção. */
const KPIS = [
  {
    value: "R$10 mi",
    label: "Bido",
    note: "rodada levantada depois do hackathon",
  },
  {
    value: "R$1,5 mi",
    label: "Cloak",
    note: "investimento anjo depois do hackathon",
  },
  {
    value: "4 semanas",
    label: "14/09 a 12/10",
    note: "para construir e apresentar o projeto",
  },
  {
    value: "2 disputas",
    label: "um projeto só",
    note: "concorre na Colosseum e na Trilha Brasil",
  },
];

const DISCLOSURE = [
  {
    title: "Prêmios da competição",
    body: "Projetos selecionados podem receber prêmios conforme os critérios do hackathon. Valores, categorias e condições aparecem aqui após a divulgação oficial.",
  },
  {
    title: "Investimento",
    body: "Equipes selecionadas podem ser avaliadas para programas de aceleração e investimento. Essas oportunidades têm critérios próprios e dependem da seleção do projeto.",
  },
];

export function PrizeBoard() {
  return (
    <>
      <div className="mt-14 grid gap-10 border-t-2 border-green-dark/15 pt-10 sm:grid-cols-2 sm:gap-x-10 lg:mt-20 lg:grid-cols-4 lg:gap-x-10 xl:gap-x-12">
        {KPIS.map((kpi, i) => (
          <Reveal key={kpi.value} index={i + 1} tone="texto">
            <p className="whitespace-nowrap font-heading text-[2.75rem] font-black leading-none tracking-tight text-ink [font-stretch:108%] sm:text-5xl lg:text-[2.35rem] xl:text-[2.9rem]">
              <CountUp value={kpi.value} />
            </p>
            <p className="mt-4 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-green-dark/80">
              {kpi.label}
            </p>
            <p className="mt-1.5 max-w-[18rem] text-pretty text-sm leading-relaxed text-muted">
              {kpi.note}
            </p>
          </Reveal>
        ))}
      </div>

      <Reveal tone="texto" className="mt-14 border-t-2 border-green-dark/15 pt-10 lg:mt-20">
        <div className="grid gap-8 lg:grid-cols-[auto_1fr] lg:gap-16">
          <span className="inline-flex h-fit w-fit items-center rounded-full bg-yellow px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-green-dark">
            A divulgar
          </span>
          <div className="grid gap-8 sm:grid-cols-2 sm:gap-10">
            {DISCLOSURE.map((item) => (
              <div key={item.title}>
                <p className="font-heading text-lg font-black tracking-tight text-ink">
                  {item.title}
                </p>
                <p className="mt-2 max-w-[26rem] text-pretty text-sm leading-relaxed text-muted">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </>
  );
}
