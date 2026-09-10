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

/** Qual seção está sendo lida.
 *
 * Sem isto o menu é uma lista de atalhos: a pessoa consulta uma vez, não se
 * acha nele e não volta. Com a marcação ele vira um mapa — a página inteira
 * passa a ter um "você está aqui".
 *
 * É posição, não `IntersectionObserver`: metade das âncoras da LP são marcas
 * de 1px dentro de seções altas (a da jornada, por exemplo), e uma faixa de
 * observador em cima de um alvo de 1px pisca entre ativo e inativo a cada
 * frame. Comparar a distância até a linha de leitura é determinístico e
 * responde igual para âncora, seção e card.
 *
 * Um único listener passivo, coalescido em rAF: a LP já paga um para a
 * jornada, e esse é o teto antes de a rolagem começar a engasgar no telefone.
 */
function useSecaoAtiva(hrefs: string) {
  const [ativa, setAtiva] = useState<string | null>(null);

  useEffect(() => {
    const alvos = hrefs.split(" ").filter((h) => h.startsWith("#"));
    if (!alvos.length) return;

    let raf = 0;
    const medir = () => {
      raf = 0;
      // A linha de leitura fica no primeiro terço da tela, não no meio: é
      // onde o olho está quando uma seção começa a ser lida, e é o que faz a
      // marcação trocar junto com o título em vez de meia tela depois.
      const linha = window.innerHeight * 0.34;
      let atual: string | null = null;
      for (const href of alvos) {
        const el = document.getElementById(href.slice(1));
        if (!el) continue;
        if (el.getBoundingClientRect().top <= linha) atual = href;
      }
      setAtiva(atual);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(medir);
    };

    medir();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [hrefs]);

  return ativa;
}

export function LpSectionNav() {
  const pathname = usePathname();
  const nav = NAV[pathname];
  /* A lista entra como string: um array literal seria uma referência nova a
     cada render e remontaria o listener a cada frame de rolagem. */
  const ativa = useSecaoAtiva(nav?.links.map((l) => l.href).join(" ") ?? "");
  if (!nav) return null;

  return (
    <nav aria-label="Seções da página" className="hidden lg:flex lg:items-center lg:gap-2">
      {nav.links.map((link) => (
        <a
          key={link.href}
          href={link.href}
          data-ativo={ativa === link.href}
          aria-current={ativa === link.href ? "true" : undefined}
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
