"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { AuthForm } from "./auth-form";

export const AUTH_DIALOG_EVENT = "auth-dialog:open";

/** Anything already pointing at /auth keeps its href — the click is what gets
 *  intercepted, so the link still navigates if JS never runs. */
export function authDialogNext(href: string): string | null {
  if (!href.startsWith("/auth") || href.startsWith("/auth/callback"))
    return null;
  const query = href.slice(href.indexOf("?") + 1);
  if (!href.includes("?")) return "";
  return new URLSearchParams(query).get("next") ?? "";
}

export function openAuthDialog(next: string) {
  window.dispatchEvent(new CustomEvent(AUTH_DIALOG_EVENT, { detail: next }));
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Login without leaving the page: the same card the /auth route renders, over
 * the current view. /auth stays as the destination for middleware redirects
 * and deep links, so nothing that already points there has to change.
 */
export function AuthDialog({
  open,
  onClose,
  defaultNext,
}: {
  open: boolean;
  onClose: () => void;
  defaultNext?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Close on navigation as an adjust-during-render, like UserMenu: an effect
  // would flash the open dialog over the new page for a frame first.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    if (open) onClose();
  }

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const items = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!items || items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    // The panel itself, not the close button: opening the card should not
    // arm "Fechar" under the visitor's Enter key.
    panelRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      opener?.focus?.();
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  // The header sets backdrop-blur, which makes it the containing block for
  // position:fixed — the card would be clipped to the 64px bar. It has to
  // hang off the body.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Acessar a plataforma"
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto overscroll-contain bg-ink/45 px-4 py-10 auth-overlay-in backdrop-blur-sm sm:items-center sm:py-12"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="auth-panel-in relative w-full max-w-md focus:outline-none"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors duration-150 hover:bg-green-dark/10 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-dark"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <Suspense fallback={null}>
          <AuthForm defaultNext={defaultNext} titleAs="h2" />
        </Suspense>
      </div>
    </div>,
    document.body,
  );
}
