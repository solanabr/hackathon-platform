import Image from "next/image";

/**
 * The symbol paints itself in from the bottom while the page loads. Two
 * stacked copies: a faint gray base and a full-color copy revealed by an
 * animating clip. Reduced motion shows the colored symbol at rest.
 */
export default function Loading({ className = "min-h-screen" }: { className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-6 ${className}`}
    >
      <div aria-hidden className="relative h-20 w-20">
        <Image
          src="/brand/stbr/logo/SYMBOL-EMERALD-GREEN.svg"
          alt=""
          fill
          className="object-contain opacity-15 grayscale"
          sizes="80px"
        />
        <div className="animate-brand-fill absolute inset-0">
          <Image
            src="/brand/stbr/logo/SYMBOL-EMERALD-GREEN.svg"
            alt=""
            fill
            className="object-contain"
            sizes="80px"
            priority
          />
        </div>
      </div>
      <p className="font-heading text-xs font-bold uppercase tracking-[0.2em] text-muted">
        Carregando
      </p>
    </div>
  );
}
