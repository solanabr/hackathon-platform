import Image from "next/image";

export function EmptyState({
  title = "Nenhum projeto publicado ainda",
  body,
}: {
  title?: string;
  body?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white-10 bg-surface-raised px-8 py-16 text-center">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-64 w-80 -translate-x-1/2 -translate-y-1/2 opacity-[0.07]">
          <Image
            src="/brand/stbr/elements/morth-05.svg"
            alt=""
            fill
            className="object-contain"
            sizes="320px"
          />
        </div>
      </div>
      <p className="relative font-heading text-lg font-bold text-ink">{title}</p>
      {body && <p className="relative mt-1 text-sm text-muted">{body}</p>}
    </div>
  );
}
