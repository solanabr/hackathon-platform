"use client";

import { trackClient } from "@/lib/analytics-browser";

/** Outbound jornada links are the campaign's real conversions after the
 * pre-registration itself, so each click is captured with its target. */
export function TrackedLink({
  href,
  target,
  className,
  children,
}: {
  href: string;
  target: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() => trackClient("campaign_link_clicked", { target })}
    >
      {children}
    </a>
  );
}
