"use client";

import { usePathname } from "next/navigation";
import { TrackedCta } from "@/components/ui/tracked-cta";

/** The dock's cadastro button only exists on the campaign LP for visitors who
 *  are not signed in: everywhere else the header stays Entrar/avatar only, and
 *  a signed-in person gets the state-aware button in the hero instead. */
export function CadastroLink({ className }: { className: string }) {
  const pathname = usePathname();
  if (pathname !== "/") return null;
  return (
    <TrackedCta
      href="/auth?next=/pre-registro"
      event="cta_clicked"
      properties={{ cta: "cadastro", location: "header" }}
      className={className}
    >
      Fazer cadastro
    </TrackedCta>
  );
}
