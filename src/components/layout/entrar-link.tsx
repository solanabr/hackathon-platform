"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Entrar carries the page it was clicked on, so login returns the visitor
 *  there instead of defaulting to their painel. On the LP the dock already has
 *  the yellow cadastro button, so Entrar takes the quieter class there. */
export function EntrarLink({ className, lpClassName }: { className: string; lpClassName?: string }) {
  const pathname = usePathname();
  const onLp = pathname === "/";
  const next = pathname && !onLp ? `?next=${encodeURIComponent(pathname)}` : "";
  return (
    <Link href={`/auth${next}`} className={onLp && lpClassName ? lpClassName : className}>
      Entrar
    </Link>
  );
}
