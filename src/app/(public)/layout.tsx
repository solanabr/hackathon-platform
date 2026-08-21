import type { ReactNode } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Background } from "@/components/layout/background";

export const dynamic = "force-dynamic";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative min-h-screen overflow-x-clip bg-surface">
      <Background />
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-surface"
      >
        Pular para o conteúdo
      </a>
      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />
        <div id="conteudo" className="flex-1">{children}</div>
        <Footer />
      </div>
    </main>
  );
}
