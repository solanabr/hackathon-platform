import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { Background } from "@/components/layout/background";
import { resolveAuthenticatedUserState } from "@/lib/user-state";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function AuthPage() {
  const state = await resolveAuthenticatedUserState();
  if (state) redirect(state.redirectPath);

  return (
    <main className="relative min-h-screen overflow-hidden">
      <Background />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12 sm:px-6">
        <Suspense fallback={null}>
          <AuthForm />
        </Suspense>
      </div>
    </main>
  );
}
