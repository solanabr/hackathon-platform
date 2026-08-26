"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Entrar carries the page it was clicked on, so login returns the visitor
 *  there instead of defaulting to their painel. */
export function EntrarLink({ className }: { className: string }) {
  const pathname = usePathname();
  const next = pathname && pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : "";
  return (
    <Link href={`/auth${next}`} className={className}>
      Entrar
    </Link>
  );
}
