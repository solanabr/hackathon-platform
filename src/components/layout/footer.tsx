import Link from "next/link";
import Image from "next/image";

const COLUMNS = [
  {
    title: "Plataforma",
    links: [
      { label: "Hackathons", href: "/h" },
      { label: "Pré-cadastro", href: "/pre-registro" },
      { label: "Entrar", href: "/auth" },
    ],
  },
  {
    title: "Superteam",
    links: [
      { label: "superteam.com.br", href: "https://superteam.com.br" },
      { label: "Wiki", href: "https://wiki.superteam.com.br" },
      { label: "Earn", href: "https://earn.superteam.fun" },
    ],
  },
  {
    title: "Comunidade",
    links: [
      { label: "X / Twitter", href: "https://x.com/SuperteamBR" },
      { label: "YouTube", href: "https://www.youtube.com/@SuperteamBrasil" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-24 overflow-hidden bg-green-dark">
      <div className="mx-auto max-w-6xl px-4 pt-14 sm:px-6">
        <div className="grid gap-12 pb-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Image
              src="/brand/stbr/logo/horizontal-fwhite.svg"
              alt="Superteam Brasil"
              width={190}
              height={32}
              className="h-8 w-auto"
            />
            <p className="mt-5 max-w-xs text-pretty leading-relaxed text-surface/70">
              A plataforma de hackathons da Superteam Brasil. Feito por builders, para builders.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title} className="lg:col-span-2">
              <h2 className="text-xs font-bold uppercase tracking-widest text-yellow">{col.title}</h2>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.href.startsWith("http") ? (
                      <a
                        href={l.href}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-semibold text-surface/70 transition-colors duration-150 hover:text-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow"
                      >
                        {l.label}
                      </a>
                    ) : (
                      <Link
                        href={l.href}
                        className="text-sm font-semibold text-surface/70 transition-colors duration-150 hover:text-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow"
                      >
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="flex gap-6 border-t border-surface/15 py-5 text-sm text-surface/50">
          <Link href="/privacidade" className="transition-colors hover:text-surface">
            Privacidade
          </Link>
          <Link href="/termos" className="transition-colors hover:text-surface">
            Termos
          </Link>
        </div>
      </div>

      <svg
        aria-hidden
        viewBox="0 0 1000 128"
        className="block w-full select-none text-surface/[0.07]"
      >
        <text
          x="500"
          y="122"
          textAnchor="middle"
          textLength="996"
          lengthAdjust="spacingAndGlyphs"
          fill="currentColor"
          fontSize="150"
          fontWeight="900"
          className="font-heading"
          style={{ fontStretch: "125%" }}
        >
          SUPERTEAM
        </text>
      </svg>
    </footer>
  );
}
