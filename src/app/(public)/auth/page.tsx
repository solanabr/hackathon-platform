import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { resolveAuthenticatedUserState } from "@/lib/user-state";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function AuthPage() {
  const state = await resolveAuthenticatedUserState();
  if (state) redirect(state.redirectPath);

  return (
    <main className="relative bg-surface">
      <div className="relative z-10 flex justify-center px-4 pb-16 pt-24 sm:px-6 sm:pb-20 sm:pt-28">
        <Suspense fallback={null}>
          <AuthForm />
        </Suspense>
      </div>
    </main>
  );
}
