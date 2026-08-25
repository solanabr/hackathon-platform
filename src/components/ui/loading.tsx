import Image from "next/image";

export default function Loading({ className = "min-h-screen" }: { className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-5 ${className}`}
    >
      <div aria-hidden className="relative h-16 w-16">
        <Image
          src="/brand/stbr/elements/morth-24.svg"
          alt=""
          fill
          className="object-contain opacity-20"
          sizes="64px"
        />
      </div>
      <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted">
        Carregando
      </p>
      <span
        aria-hidden
        className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald motion-reduce:animate-none"
      />
    </div>
  );
}
