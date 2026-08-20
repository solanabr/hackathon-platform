import type { ReactNode } from "react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { GradientBackground } from "@/components/layout/background";
import { resolveAuthenticatedUserState } from "@/lib/user-state";
import { requireAdmin } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const state = await resolveAuthenticatedUserState();
  const primaryHref = state?.redirectPath ?? "/dashboard";
  const admin = state ? (await requireAdmin()).ok : false;

  return (
    <main className="relative min-h-screen overflow-hidden bg-bh-bg">
      <GradientBackground fullHeight />
      <div className="relative z-10 flex min-h-screen flex-col">
        <Header isAuthenticated={true} primaryHref={primaryHref} isAdmin={admin} />
        <div className="flex-1">{children}</div>
        <Footer />
      </div>
    </main>
  );
}
