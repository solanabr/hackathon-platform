import { Reveal } from "@/components/ui/reveal";
import { TrophyScene } from "@/components/home/trophy-scene";

/* A taça é a única peça da seção: sem trama, sem degrau, sem adesivo em volta.
   Ela gira no mesmo meio-tom do Colosseum — é a LP inteira falando a mesma
   língua de impressão, e é o que dispensa qualquer ornamento embaixo. */
export function PrizePedestal() {
  return (
    <Reveal tone="longe" className="mx-auto w-full max-w-[30rem]">
      <TrophyScene className="h-[15rem] sm:h-[19rem] lg:h-[26rem]" />
    </Reveal>
  );
}
