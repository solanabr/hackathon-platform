import { Reveal } from "@/components/ui/reveal";
import { TrophyScene } from "@/components/home/trophy-scene";

/* A escada estreita e escurece no mesmo passo: nove folhas de papel empilhadas,
   cada uma um tom mais funda no caminho do creme ao kraft. Papel, e não verde
   chapado: bloco de cor vira gráfico de barras, e o que a marca tem é papel. */
const STEPS = [1, 0.88, 0.76, 0.64, 0.52, 0.41, 0.31, 0.22, 0.15].map(
  (width, index, all) => {
    /* Rampa em potência: o pé da escada precisa separar do degrau de cima, e
       uma rampa linear amontoa todo o contraste no topo. Do meio para baixo o
       kraft já saturou, então a profundidade que falta vem de tinta — sem sair
       da família do papel. */
    const step = (index + 1) / all.length;
    const kraft = Math.round(100 * Math.pow(step, 1.35));
    const ink = Math.round(24 * Math.pow(Math.max(0, step - 0.5) / 0.5, 1.4));
    return {
      width: `${width * 100}%`,
      color: `color-mix(in srgb, var(--color-green-dark) ${ink}%, color-mix(in srgb, var(--color-surface-kraft) ${kraft}%, var(--color-surface)))`,
    };
  },
);

/* Só as verticais, e quase apagadas: a grade dá medida ao papel antes do
   primeiro degrau, não desenha tabela por trás da taça. */
const GRID = {
  backgroundImage:
    "repeating-linear-gradient(to right, color-mix(in srgb, var(--color-green-dark) 5%, transparent) 0 1px, transparent 1px 8.3333%)",
};

/* A taça é a peça; quem dá escala a ela é o pódio atrás. A escada fica ATRÁS —
   o quadro do meio-tom sai em alfa (`paper={false}` na cena), então o traço da
   taça vem inteiro por cima em vez de ser tingido pelo fundo. */
export function PrizePedestal() {
  return (
    <Reveal
      tone="longe"
      className="relative h-[18rem] w-full sm:h-[23rem] lg:h-auto lg:min-h-0 lg:flex-1"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 flex h-full w-screen -translate-x-1/2 flex-col [mask-image:linear-gradient(to_bottom,transparent,black_18%)]"
      >
        {STEPS.map((step) => (
          <div key={step.width} className="flex min-h-0 flex-1 justify-center">
            <div
              className="h-full border-t border-green-dark/[0.09]"
              style={{ width: step.width, backgroundColor: step.color }}
            />
          </div>
        ))}
        <div
          className="absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent_46%)]"
          style={GRID}
        />
      </div>

      <TrophyScene className="absolute inset-x-0 top-1/2 h-[calc(100%-1.5rem)] max-h-[30rem] -translate-y-1/2 lg:h-[calc(100%-2.5rem)]" />
    </Reveal>
  );
}
