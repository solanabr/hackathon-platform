import Image from "next/image";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-green/10 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 text-center sm:px-6">
        <Image
          src="/brand/stbr/logo/SYMBOL-EMERALD-GREEN.svg"
          alt="Superteam Brasil"
          width={32}
          height={32}
        />
        <p className="text-sm text-muted">
          Plataforma de hackathons da Superteam Brasil.
        </p>
        <div className="flex gap-4 text-sm font-semibold text-muted">
          <a href="https://superteam.com.br" target="_blank" rel="noreferrer" className="hover:text-ink">
            superteam.com.br
          </a>
          <a href="https://wiki.superteam.com.br" target="_blank" rel="noreferrer" className="hover:text-ink">
            Wiki
          </a>
        </div>
      </div>
    </footer>
  );
}
