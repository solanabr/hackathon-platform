import type { ReactNode } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Background } from "@/components/layout/background";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative min-h-screen overflow-x-clip bg-surface">
      <Background />
      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />
        {/* Same fold rule as the public layout: link block may peek, the
            wordmark stays below the scroll. */}
        <div className="min-h-[calc(100dvh-24rem)] flex-1">{children}</div>
        <Footer />
      </div>
    </main>
  );
}