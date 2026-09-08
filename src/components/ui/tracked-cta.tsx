"use client";

import Link from "next/link";
import { trackClient } from "@/lib/analytics-browser";
import { authDialogNext, openAuthDialog } from "@/components/auth/auth-dialog";

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
  // A CTA into /auth opens the login card over the page; the href stays put so
  // the link still works with JS off, and so it can be opened in a new tab.
  const authNext = authDialogNext(href);
  const onClick = (e: React.MouseEvent) => {
    fire();
    if (
      authNext === null ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.button !== 0
    )
      return;
    e.preventDefault();
    openAuthDialog(authNext);
  };
  if (href.startsWith("#")) {
    return (
      <a href={href} className={className} onClick={fire}>
        {children}
      </a>
    );
  }
  if (href.startsWith("http")) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        onClick={fire}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}
