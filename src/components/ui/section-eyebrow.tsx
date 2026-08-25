export function SectionEyebrow({
  children,
  accent = false,
  className = "",
}: {
  children: React.ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <p
      className={`text-[12px] font-mono uppercase tracking-wider ${
        accent ? "text-yellow" : "text-emerald"
      } ${className}`}
    >
      {children}
    </p>
  );
}
