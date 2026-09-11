/* The page's paper weave. It was born inside the bento stage and became its
   own piece when the prizes section started leaning on it: same dot, same
   cadence, one place to tweak. The mask belongs to the caller — on a stage it
   frames the edges, on a whole section it fades out in the middle. */
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
