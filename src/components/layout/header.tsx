import Link from "next/link";
import Image from "next/image";
import { resolveAuthenticatedUserState } from "@/lib/user-state";
import { isAdminFor } from "@/lib/roles";

export async function Header() {
  const state = await resolveAuthenticatedUserState();
  const admin = state ? await isAdminFor(state) : false;

  return (
    <header className="sticky top-0 z-50 border-b border-green/10 bg-surface/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/brand/stbr/logo/ST-DARK-GREEN-HORIZONTAL.svg"
            alt="Superteam Brasil"
            width={150}
            height={28}
            priority
          />
        </Link>

        <nav className="flex items-center gap-4 text-sm font-semibold">
          {state ? (
            <>
              {admin && (
                <Link href="/admin" className="text-muted transition-colors hover:text-ink">
                  Admin
                </Link>
              )}
              <Link href="/account" className="text-muted transition-colors hover:text-ink">
                Minha conta
              </Link>
              <form action="/api/auth/signout" method="post">
                <button type="submit" className="text-muted transition-colors hover:text-ink">
                  Sair
                </button>
              </form>
            </>
          ) : (
            <Link href="/auth" className="btn-primary px-5 py-2 text-sm">
              Entrar
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
