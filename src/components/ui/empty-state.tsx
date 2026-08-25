import Image from "next/image";

export function EmptyState({
  title,
  description,
  cta,
  className = "",
}: {
  title: string;
  description?: string;
  cta?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`relative flex flex-col items-center justify-center overflow-hidden px-6 py-16 text-center ${className}`}
    >
      <Image
        src="/brand/stbr/elements/morth-24.svg"
        alt=""
        aria-hidden
        width={96}
        height={96}
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-15"
      />
      <h3 className="relative font-heading text-lg font-bold text-ink">{title}</h3>
      {description && (
        <p className="relative mt-2 max-w-sm text-sm text-muted">{description}</p>
      )}
      {cta && <div className="relative mt-6">{cta}</div>}
    </div>
  );
}
