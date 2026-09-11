import { Plate } from "./plate";
import { PLATE_SRC } from "./plates";

/** The amphitheatre rising from the base of the hero — the only image above
 *  the fold, in the same halftone stroke as the journey illustrations. The
 *  drawing lives in `plates.ts` and arrives as a file; only the framing here. */
export function ColosseumBackdrop({ className = "" }: { className?: string }) {
  return (
    <Plate
      src={PLATE_SRC.colosseum}
      fit="cover-bottom"
      className={`pointer-events-none h-full w-full text-ink ${className}`}
    />
  );
}
