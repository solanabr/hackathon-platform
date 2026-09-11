import { PAGE_SHELL } from "@/components/layout/container";

// The lines are technical drawing, not decoration: they land exactly on the
// PAGE_SHELL edges, so the same rail that holds the header and the footer
// becomes visible. Any other width would make the page look misaligned.

function Cross({ className }: { className: string }) {
  return (
    <span aria-hidden className={`absolute block h-[9px] w-[9px] ${className}`}>
      <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-ink/35" />
      <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-ink/35" />
    </span>
  );
}

export function SectionRails({
  className = "",
  crossOffset = "top-10",
}: {
  className?: string;
  crossOffset?: string;
}) {
  return (
    <div
      aria-hidden
      className={`cena-trilhos pointer-events-none absolute inset-0 -z-10 hidden md:block ${className}`}
    >
      <div
        className={`relative h-full ${PAGE_SHELL} border-x border-dashed border-ink/15`}
      >
        <Cross className={`-left-px -translate-x-1/2 ${crossOffset}`} />
        <Cross className={`-right-px translate-x-1/2 ${crossOffset}`} />
      </div>
    </div>
  );
}

// Bleeds past the PAGE_SHELL padding: only then does the horizontal rule end
// exactly where the vertical rails run, and not 48px inward.
export function StageRule({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`relative -mx-4 h-px sm:-mx-6 lg:-mx-8 xl:-mx-12 ${className}`}
    >
      <span className="absolute inset-0 border-t border-dashed border-ink/15" />
      <Cross className="-left-px top-1/2 -translate-x-1/2 -translate-y-1/2" />
      <Cross className="-right-px top-1/2 translate-x-1/2 -translate-y-1/2" />
    </div>
  );
}
