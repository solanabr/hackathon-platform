/* A halftone plate served as a file and applied as a MASK: the drawing comes
   from `/halftone/*.svg`, the ink from the box's `currentColor`. This is what
   takes the large halftones out of the HTML without losing the caller's
   colour — `text-ink/40` still applies, alpha included.

   `fit` mirrors the `preserveAspectRatio` the inline SVG had: `cover`
   (xMidYMid slice), `cover-bottom` (xMidYMax slice) or `contain`. */
export function Plate({
  src,
  fit = "cover",
  className = "",
}: {
  src: string;
  fit?: "cover" | "cover-bottom" | "contain";
  className?: string;
}) {
  const mask = `url("${src}")`;
  return (
    <div
      aria-hidden
      className={`chapa chapa-${fit} ${className}`.trim()}
      style={{ maskImage: mask, WebkitMaskImage: mask }}
    />
  );
}
