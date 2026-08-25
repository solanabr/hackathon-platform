import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { resolveAuthenticatedUserState } from "@/lib/user-state";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default async function AuthPage() {
  const state = await resolveAuthenticatedUserState();
  if (state) redirect(state.redirectPath);

  return (
    <main className="relative min-h-screen overflow-hidden bg-surface">
      {/* Same canvas as the homepage hero: few shapes, corners only. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="morth animate-float-a absolute hidden bg-yellow sm:-left-24 sm:top-[8%] sm:block sm:h-[28rem] sm:w-[28rem]"
          style={{
            maskImage: "url(/brand/stbr/elements/morth-07.svg)",
            WebkitMaskImage: "url(/brand/stbr/elements/morth-07.svg)",
            transform: "rotate(12deg)",
          }}
        />
        <div
          className="morth animate-float-b absolute -right-16 top-[6%] h-40 w-40 bg-[#008c4c] sm:-right-20 sm:top-[12%] sm:h-80 sm:w-80"
          style={{
            maskImage: "url(/brand/stbr/elements/morth-12.svg)",
            WebkitMaskImage: "url(/brand/stbr/elements/morth-12.svg)",
            transform: "rotate(-9deg)",
          }}
        />
        <div
          className="morth animate-float-c absolute -bottom-16 -left-10 h-40 w-40 bg-[#2f6b3f] sm:-bottom-24 sm:left-[8%] sm:h-72 sm:w-72"
          style={{
            maskImage: "url(/brand/stbr/elements/morth-18.svg)",
            WebkitMaskImage: "url(/brand/stbr/elements/morth-18.svg)",
            transform: "rotate(22deg)",
          }}
        />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-14 sm:px-6 sm:py-16">
        <Suspense fallback={null}>
          <AuthForm />
        </Suspense>
      </div>
    </main>
  );
}
