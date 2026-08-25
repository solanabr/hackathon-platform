import Image from "next/image";

export function EmptyState({
  title,
  message,
  action,
  className = "",
}: {
  title: string;
  message: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-surface-raised px-6 py-14 text-center ${className}`}>
      <Image
        src="/brand/stbr/elements/morth-12.svg"
        alt=""
        width={160}
        height={160}
        className="mx-auto opacity-20"
      />
      <h2 className="mt-4 font-heading text-xl font-bold">{title}</h2>
      <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-muted">{message}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
