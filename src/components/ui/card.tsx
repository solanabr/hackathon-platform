export function Card({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-surface-raised ${className}`}>
      {children}
    </div>
  );
}