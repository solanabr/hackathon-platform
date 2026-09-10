import { Plate } from "./plate";
import { PLATE_SRC } from "./plates";

/** O anfiteatro subindo da base do hero — a única imagem da dobra, no mesmo
 *  traço de meio-tom das ilustrações da jornada. O desenho mora em
 *  `plates.ts` e chega como arquivo; aqui só o enquadramento. */
export function ColosseumBackdrop({ className = "" }: { className?: string }) {
  return (
    <Plate
      src={PLATE_SRC.colosseum}
      fit="cover-bottom"
      className={`pointer-events-none h-full w-full text-ink ${className}`}
    />
  );
}
