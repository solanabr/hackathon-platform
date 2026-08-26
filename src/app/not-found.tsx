import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-surface px-4 py-16">
      <div className="w-full max-w-md rounded-3xl border-2 border-green-dark bg-surface-raised p-10 text-center shadow-[10px_10px_0_rgba(27,35,29,0.18)]">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-emerald">
          Erro 404
        </p>
        <h1 className="mt-3 font-heading text-3xl font-black uppercase tracking-tight [font-stretch:118%]">
          Página não encontrada
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          O endereço pode estar errado, ou esta edição ainda não foi publicada.
        </p>
        <Link href="/" className="btn-primary mt-7 inline-block px-6 py-3 text-sm">
          Voltar para o início
        </Link>
      </div>
    </main>
  );
}
