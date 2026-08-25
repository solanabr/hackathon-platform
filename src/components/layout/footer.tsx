import Link from "next/link";
import Image from "next/image";

const COLUMNS = [
  {
    title: "Plataforma",
    links: [
      { label: "Edições", href: "/#edicoes" },
      { label: "Como funciona", href: "/#como-funciona" },
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
              A plataforma de hackathons da Superteam Brasil. Construa no ecossistema Solana, do
              primeiro commit ao Pitch Day.
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

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-surface/15 py-6 text-sm text-surface/50">
          <p>Superteam Brasil</p>
          <p>Feito por builders, para builders.</p>
        </div>
      </div>

      <div aria-hidden className="select-none px-4 pb-2 sm:px-6">
        <Image
          src="/brand/stbr/wordmark-offwhite.svg"
          alt=""
          width={1600}
          height={220}
          className="h-auto w-full opacity-[0.06]"
        />
      </div>
    </footer>
  );
}
