"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { trackClient } from "@/lib/analytics-browser";
import { AUTH_DIALOG_EVENT, AuthDialog } from "@/components/auth/auth-dialog";

/** Entrar and Fazer cadastro open the login card over the page. Entrar carries
 *  the page it was clicked on, so login returns the visitor there instead of
 *  defaulting to their painel; cadastro keeps sending people to /pre-registro. */
export function AuthActions({
  signInClassName,
  signUpClassName,
}: {
  signInClassName: string;
  signUpClassName: string;
}) {
  const pathname = usePathname();
  const [next, setNext] = useState<string | null>(null);
  const close = useCallback(() => setNext(null), []);

  // Every /auth link on the page routes here instead of navigating: one card,
  // one mounted dialog, wherever the visitor clicked.
  useEffect(() => {
    const onOpen = (e: Event) =>
      setNext((e as CustomEvent<string>).detail ?? "");
    window.addEventListener(AUTH_DIALOG_EVENT, onOpen);
    return () => window.removeEventListener(AUTH_DIALOG_EVENT, onOpen);
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
        open={next !== null}
        onClose={close}
        defaultNext={next || undefined}
      />
    </>
  );
}
