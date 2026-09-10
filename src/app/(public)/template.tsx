import type { ReactNode } from "react";

/**
 * A passagem entre páginas públicas.
 *
 * `template.tsx` existe justamente para isto: ao contrário do layout, ele é
 * remontado a cada navegação, então as animações de CSS aqui dentro rodam de
 * novo a cada rota — sem estado, sem `usePathname`, sem client component.
 *
 * A folha e a entrada são puro CSS (`src/styles/rota.css`); este arquivo só
 * marca onde elas acontecem. Continua sendo Server Component, então a passagem
 * não custa um byte de JS nem espera hidratação para começar.
 */
export default function PublicTemplate({ children }: { children: ReactNode }) {
  return (
    <>
      <div aria-hidden className="rota-folha" />
      <div className="rota-entra">{children}</div>
    </>
  );
}
