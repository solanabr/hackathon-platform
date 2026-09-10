/* Uma chapa de meio-tom servida como arquivo e aplicada como MÁSCARA: o
   desenho vem de `/halftone/*.svg`, a tinta vem do `currentColor` da caixa.
   É o que tira os halftones grandes do HTML sem perder a cor do chamador —
   `text-ink/40` continua valendo, alfa incluído.

   `fit` espelha o `preserveAspectRatio` que o SVG inline tinha: `cover`
   (xMidYMid slice), `cover-bottom` (xMidYMax slice) ou `contain`. */
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
