import { Plate } from "./plate";
import { PLATE_SRC } from "./plates";

/** Closing: halftone texture in the same stroke as the illustrations. The
 *  caller sets colour, radial mask and the zoom scene on the wrapper; the
 *  plate fills the frame from inside, framed as `xMidYMid slice`. */
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
