import type { ReactNode } from "react";

/**
 * The passage between public pages.
 *
 * `template.tsx` exists for exactly this: unlike the layout, it is remounted
 * on every navigation, so the CSS animations inside it run again on every
 * route — no state, no `usePathname`, no client component.
 *
 * The sheet and the entrance are pure CSS (`src/styles/rota.css`); this file
 * only marks where they happen. It stays a Server Component, so the passage
 * costs no JS bytes and does not wait for hydration to begin.
 */
export default function PublicTemplate({ children }: { children: ReactNode }) {
  return (
    <>
      <div aria-hidden className="rota-folha" />
      <div className="rota-entra">{children}</div>
    </>
  );
}
