"use client";

import Link from "next/link";
import { trackClient } from "@/lib/analytics-browser";

/** Campaign CTA with explicit capture: internal links navigate via next/link,
 * external ones open a new tab; both fire the event with its properties. */
export function TrackedCta({
  href,
  event,
  properties,
  className,
  children,
}: {
  href: string;
  event: string;
  properties: Record<string, unknown>;
  className?: string;
  children: React.ReactNode;
}) {
  const fire = () => trackClient(event, properties);
  if (href.startsWith("#")) {
    return (
      <a href={href} className={className} onClick={fire}>
        {children}
      </a>
    );
  }
  if (href.startsWith("http")) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className} onClick={fire}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className} onClick={fire}>
      {children}
    </Link>
  );
}
