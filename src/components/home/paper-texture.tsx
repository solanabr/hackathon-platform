/* A trama de papel da página. Nasceu dentro do palco do bento e virou peça
   própria quando a seção de prêmios passou a se apoiar nela: o mesmo ponto,
   a mesma cadência, um lugar só para mexer. A máscara é do chamador — num
   palco ela emoldura pelas bordas, numa seção inteira ela some no meio. */
const DOTS =
  "bg-[radial-gradient(circle,rgb(27_35_29/0.22)_1px,transparent_1px)] [background-size:10px_10px]";

const STAGE_MASK =
  "[mask-image:radial-gradient(120%_100%_at_50%_50%,rgb(0_0_0/0.15)_25%,#000_85%)] [-webkit-mask-image:radial-gradient(120%_100%_at_50%_50%,rgb(0_0_0/0.15)_25%,#000_85%)]";

export function PaperTexture({ className = STAGE_MASK }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute inset-0 ${DOTS} ${className}`}
    />
  );
}
