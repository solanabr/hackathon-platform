import Link from "next/link";

/**
 * The LP segmented control: one bordered capsule, options as segments inside.
 * Only the active segment is filled; rows of mutually exclusive options
 * (nav tabs, filters) use this — standalone pill CTAs keep PillLink.
 */
export const segmentedContainer =
  "inline-flex max-w-full gap-1 overflow-x-auto rounded-full border-2 border-green-dark bg-surface-raised p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

export const segmentClass = (active: boolean) =>
  `whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-bold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-dark focus-visible:ring-inset ${
    active ? "bg-green-dark text-surface" : "text-ink hover:bg-green-dark/10"
  }`;

export type SegmentedItem = {
  key: string;
  href: string;
  label: React.ReactNode;
  active: boolean;
};

export function SegmentedNav({
  label,
  items,
  className = "",
}: {
  label: string;
  items: SegmentedItem[];
  className?: string;
}) {
  return (
    <nav aria-label={label} className={`${segmentedContainer} ${className}`}>
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={segmentClass(item.active)}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
