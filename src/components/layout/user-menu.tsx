"use client";

import { useEffect, useRef, useState } from "react";
import posthog from "posthog-js";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";

type MenuLink = { href: string; label: string };

export function UserMenu({
  name,
  email,
  avatarUrl,
  links,
}: {
  name: string | null;
  email: string;
  avatarUrl: string | null;
  links: MenuLink[];
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close on navigation, as the docs' adjust-during-render pattern — an
  // effect would flash the open menu on the new page for a frame first.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const itemClass =
    "block rounded-lg px-3 py-2 text-sm font-semibold text-ink transition-colors duration-150 hover:bg-green-dark/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-dark";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menu da conta"
        onClick={() => setOpen((o) => !o)}
        className="block rounded-xl transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow"
      >
        <Avatar src={avatarUrl} name={name ?? email} size="sm" ring="ring-surface/30" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-64 rounded-2xl border-2 border-green-dark bg-surface-raised p-2 shadow-sticker"
        >
          <div className="px-3 pb-2 pt-1.5">
            <p className="text-xs font-semibold text-muted">Conectado como</p>
            <p className="truncate text-sm font-bold text-ink">{name ?? email}</p>
            {name && <p className="truncate text-xs text-muted">{email}</p>}
          </div>

          <div className="my-1 border-t border-green-dark/15" />

          {links.map((link) => (
            <Link key={link.href} role="menuitem" href={link.href} className={itemClass}>
              {link.label}
            </Link>
          ))}

          <div className="my-1 border-t border-green-dark/15" />

          {/* reset() before the POST navigates away — without it the next
              person on a shared device inherits this profile. */}
          <form
            action="/api/auth/signout"
            method="post"
            onSubmit={() => {
              if (posthog.__loaded) posthog.reset();
            }}
          >
            <button type="submit" role="menuitem" className={`${itemClass} w-full text-left`}>
              Sair
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
