"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { trackClient } from "@/lib/analytics-browser";
import { AUTH_DIALOG_EVENT, AuthDialog } from "@/components/auth/auth-dialog";

/** Entrar and Fazer cadastro open the login card over the page. Entrar carries
 *  the page it was clicked on, so login returns the visitor there instead of
 *  defaulting to their painel; cadastro keeps sending people to /pre-registro. */
const subscribeNoop = () => () => {};

export function AuthActions({
  signInClassName,
  signUpClassName,
}: {
  signInClassName: string;
  signUpClassName: string;
}) {
  const pathname = usePathname();
  const [next, setNext] = useState<string | null>(null);

  // Every /auth link on the page routes here instead of navigating: one card,
  // one mounted dialog, wherever the visitor clicked.
  useEffect(() => {
    const onOpen = (e: Event) =>
      setNext((e as CustomEvent<string>).detail ?? "");
    window.addEventListener(AUTH_DIALOG_EVENT, onOpen);
    return () => window.removeEventListener(AUTH_DIALOG_EVENT, onOpen);
  }, []);

  // A failed OAuth round trip comes back from Supabase as ?error= on the Site
  // URL, i.e. this page, with no login card in sight. 15 people hit that in
  // the first two weeks and saw a plain landing page. Open the card so the
  // form can show the message it already knows how to render. The URL is
  // read as an external store; the server snapshot says "no error".
  const oauthError = useSyncExternalStore(
    subscribeNoop,
    () => new URLSearchParams(window.location.search).has("error"),
    () => false,
  );
  const [errorDismissed, setErrorDismissed] = useState(false);
  const errorNext =
    oauthError && !errorDismissed
      ? pathname === "/"
        ? "/pre-registro"
        : (pathname ?? "")
      : null;
  const openNext = next ?? errorNext;
  const closeAll = useCallback(() => {
    setNext(null);
    setErrorDismissed(true);
  }, []);

  return (
    <>
      <button
        type="button"
        className={signInClassName}
        onClick={() => setNext(pathname && pathname !== "/" ? pathname : "")}
      >
        <span>Entrar</span>
      </button>
      <button
        type="button"
        className={signUpClassName}
        onClick={() => {
          trackClient("cta_clicked", { cta: "cadastro", location: "header" });
          setNext("/pre-registro");
        }}
      >
        <span>Criar conta</span>
      </button>
      <AuthDialog
        open={openNext !== null}
        onClose={closeAll}
        defaultNext={openNext || undefined}
      />
    </>
  );
}
