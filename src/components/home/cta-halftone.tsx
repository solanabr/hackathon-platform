import { Plate } from "./plate";
import { PLATE_SRC } from "./plates";

/** Fechamento: textura de meio-tom no mesmo traço das ilustrações. O
 *  chamador põe cor, máscara radial e a cena de zoom no invólucro; a chapa
 *  preenche o quadro por dentro, no enquadramento de `xMidYMid slice`. */
export function CtaHalftone({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={["halftone-press", className].filter(Boolean).join(" ")}
    >
      <Plate src={PLATE_SRC.fechamento} fit="cover" className="absolute inset-0" />
    </div>
  );
}
