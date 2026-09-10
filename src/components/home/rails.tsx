import { PAGE_SHELL } from "@/components/layout/container";

// As linhas são desenho técnico, não decoração: elas caem exatamente nas
// bordas do PAGE_SHELL, então o mesmo trilho que segura o header e o rodapé
// fica visível. Qualquer outra largura faria a página parecer desalinhada.

function Cross({ className }: { className: string }) {
  return (
    <span aria-hidden className={`absolute block h-[9px] w-[9px] ${className}`}>
      <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-ink/35" />
      <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-ink/35" />
    </span>
  );
}

export function SectionRails({
  className = "",
  crossOffset = "top-10",
}: {
  className?: string;
  crossOffset?: string;
}) {
  return (
    <div
      aria-hidden
      className={`cena-trilhos pointer-events-none absolute inset-0 -z-10 hidden md:block ${className}`}
    >
      <div
        className={`relative h-full ${PAGE_SHELL} border-x border-dashed border-ink/15`}
      >
        <Cross className={`-left-px -translate-x-1/2 ${crossOffset}`} />
        <Cross className={`-right-px translate-x-1/2 ${crossOffset}`} />
      </div>
    </div>
  );
}

// Sangra para fora do padding do PAGE_SHELL: só assim a régua horizontal
// termina exatamente onde os trilhos verticais correm, e não 48px para dentro.
export function StageRule({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`relative -mx-4 h-px sm:-mx-6 lg:-mx-8 xl:-mx-12 ${className}`}
    >
      <span className="absolute inset-0 border-t border-dashed border-ink/15" />
      <Cross className="-left-px top-1/2 -translate-x-1/2 -translate-y-1/2" />
      <Cross className="-right-px top-1/2 translate-x-1/2 -translate-y-1/2" />
    </div>
  );
}
