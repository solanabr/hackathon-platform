import Image from "next/image";

const SYMBOL = "/brand/stbr/logo/SYMBOL-EMERALD-GREEN.svg";

/**
 * The sheet still on the press — the page's first frame.
 *
 * The whole LP is a print identity, and the hero headline is literally
 * stamped. So the first frame is not a spinner waiting for data: it is the
 * sheet before it leaves the roller. The symbol inks itself bottom to top,
 * the sheet is pulled away, and what shows underneath is the headline already
 * coming off the roller — the two are one gesture, not two effects.
 *
 * A Server Component on purpose: it ships in the HTML and is removed by CSS.
 * Without JS it still works, and there is no frame of content showing before
 * it gets covered, which a client-mounted preloader always produces.
 */
export function PressSheet() {
  return (
    <div aria-hidden className="press-sheet">
      <div className="press-sheet-mark">
        <Image
          src={SYMBOL}
          alt=""
          fill
          sizes="72px"
          className="object-contain opacity-[0.13] grayscale"
        />
        <div className="press-sheet-ink absolute inset-0">
          <Image
            src={SYMBOL}
            alt=""
            fill
            sizes="72px"
            priority
            className="object-contain"
          />
        </div>
      </div>
    </div>
  );
}
