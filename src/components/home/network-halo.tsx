import { Plate } from "./plate";
import { PLATE_SRC } from "./plates";

/** A esfera de pontos atrás da moeda. Setecentos círculos como arquivo em vez
 *  de setecentos nós no DOM — duas vezes, porque o palco existe em duas
 *  larguras. A chapa é quadrada, então a caixa também é. */
export function NetworkHalo({ className = "" }: { className?: string }) {
  return (
    <Plate
      src={PLATE_SRC.rede}
      fit="contain"
      className={`aspect-square ${className}`}
    />
  );
}
