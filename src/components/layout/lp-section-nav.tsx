"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";

type NavLink = { href: string; label: string };
type PageNav = { links: NavLink[]; accent?: NavLink };

// Section jump links per public page; pages not listed render nothing.
const NAV: Record<string, PageNav> = {
  "/": {
    links: [
      { href: "#cases", label: "O hackathon" },
      { href: "#jornada", label: "Como participar" },
      { href: "#comunidade", label: "Comunidade" },
      { href: "#faq", label: "Dúvidas" },
    ],
  },
  "/h": {
    links: [
      { href: "#edicoes", label: "Edições" },
      { href: "#como-funciona", label: "Como funciona" },
    ],
    accent: { href: "/", label: "Colosseum 2026" },
  },
};

/** Which section is being read.
 *
 * Without this the menu is a list of shortcuts: people check it once, don't
 * find themselves in it and never come back. With the marker it becomes a map
 * — the whole page gains a "you are here".
 *
 * It is position, not `IntersectionObserver`: half the LP's anchors are 1px
 * marks inside tall sections (the journey's, for one), and an observer band
 * over a 1px target flickers between active and inactive every frame.
 * Comparing the distance to the reading line is deterministic and answers the
 * same for an anchor, a section and a card.
 *
 * A single passive listener, coalesced into rAF: the LP already pays one for
 * the journey, and that is the ceiling before scroll starts to stutter on phones.
 */
function useActiveSection(hrefs: string) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const targets = hrefs.split(" ").filter((h) => h.startsWith("#"));
    if (!targets.length) return;

    let raf = 0;
    const measure = () => {
      raf = 0;
      // The reading line sits in the first third of the screen, not the middle:
      // it is where the eye is when a section starts being read, and what makes
      // the marker switch along with the title instead of half a screen later.
      const line = window.innerHeight * 0.34;
      let current: string | null = null;
      for (const href of targets) {
        const el = document.getElementById(href.slice(1));
        if (!el) continue;
        if (el.getBoundingClientRect().top <= line) current = href;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [hrefs]);

  return active;
}

export function LpSectionNav() {
  const pathname = usePathname();
  const nav = NAV[pathname];
  /* The list comes in as a string: an array literal would be a new reference
     on every render and would remount the listener on every scroll frame. */
  const active = useActiveSection(nav?.links.map((l) => l.href).join(" ") ?? "");
  if (!nav) return null;

  return (
    <nav aria-label="Seções da página" className="hidden lg:flex lg:items-center lg:gap-2">
      {nav.links.map((link) => (
        <a
          key={link.href}
          href={link.href}
          data-ativo={active === link.href}
          aria-current={active === link.href ? "true" : undefined}
          className="nav-pilula whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium text-ink/75 transition-colors duration-(--dur-instant) ease-entrada hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-dark focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          {link.label}
        </a>
      ))}
      {nav.accent && (
        <Link
          href={nav.accent.href}
          className="ml-2 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-green-dark/25 px-3.5 py-1 text-sm font-medium text-ink transition-colors duration-(--dur-instant) ease-entrada hover:border-emerald-deep hover:bg-emerald-deep hover:text-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-dark focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          {nav.accent.label}
          <ArrowRightIcon size={14} weight="bold" aria-hidden />
        </Link>
      )}
    </nav>
  );
}
