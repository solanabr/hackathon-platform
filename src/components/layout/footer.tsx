import Image from "next/image";

export function Footer() {
  return (
    <footer className="mt-24 bg-green-dark py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 text-center sm:px-6">
        <div className="flex items-center gap-3">
          <Image
            src="/brand/stbr/logo/SYMBOL-EMERALD-GREEN.svg"
            alt=""
            width={28}
            height={28}
          />
          <Image
            src="/brand/stbr/logo/horizontal-fwhite.svg"
            alt="Superteam Brasil"
            width={170}
            height={27}
          />
        </div>
        <p className="text-sm text-surface/70">
          Plataforma de hackathons da Superteam Brasil.
        </p>
        <div className="flex gap-4 text-sm font-semibold text-surface/70">
          <a href="https://superteam.com.br" target="_blank" rel="noreferrer" className="transition-colors duration-150 hover:text-surface">
            superteam.com.br
          </a>
          <a href="https://wiki.superteam.com.br" target="_blank" rel="noreferrer" className="transition-colors duration-150 hover:text-surface">
            Wiki
          </a>
        </div>
      </div>
    </footer>
  );
}
