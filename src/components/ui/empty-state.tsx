import Image from "next/image";

export function EmptyState({
  title,
  description,
  cta,
  className = "",
}: {
  title?: string;
  description?: string;
  cta?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-ink/10 bg-surface-raised px-8 py-16 text-center ${className}`}
    >
      <Image
        src="/brand/stbr/elements/morth-24.svg"
        alt=""
        aria-hidden
        width={128}
        height={128}
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.07]"
      />
      {title && (
        <h3 className="relative font-heading text-lg font-bold text-ink">{title}</h3>
      )}
      {description && (
        <p className="relative mt-2 max-w-sm text-sm text-muted">{description}</p>
      )}
      {cta && <div className="relative mt-6">{cta}</div>}
    </div>
  );
}
