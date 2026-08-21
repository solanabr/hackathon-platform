export function Card({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border border-green/15 bg-surface-raised shadow-[0_8px_32px_rgba(0,140,76,0.08)] ${className}`}
    >
      {children}
    </div>
  );
}