import { Plate } from "./plate";
import { PLATE_SRC } from "./plates";

/** The dot sphere behind the coin. Seven hundred circles as a file instead of
 *  seven hundred DOM nodes — twice, because the stage exists at two widths.
 *  The plate is square, so the box is too. */
export function NetworkHalo({ className = "" }: { className?: string }) {
  return (
    <Plate
      src={PLATE_SRC.rede}
      fit="contain"
      className={`aspect-square ${className}`}
    />
  );
}
