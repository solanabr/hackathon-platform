export function Card({
  className = "",
  accent = false,
  sticker = false,
  children,
}: {
  className?: string;
  accent?: boolean;
  sticker?: boolean;
  children: React.ReactNode;
}) {
  if (sticker) {
    return (
      <div
        className={`relative rounded-2xl border-2 border-green-dark bg-surface-raised shadow-sticker ${className}`}
      >
        {children}
      </div>
    );
  }
  return (
    <div
      className={`relative rounded-2xl border bg-surface-raised ${
        accent
          ? "border-emerald/40 before:absolute before:inset-x-0 before:top-0 before:h-px before:rounded-t-2xl before:bg-emerald/60"
          : "border-green/15"
      } shadow-[0_8px_32px_rgba(0,140,76,0.08)] ${className}`}
    >
      {children}
    </div>
  );
}
