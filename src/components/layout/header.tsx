import Link from "next/link";
import Image from "next/image";
import { resolveRoleState } from "@/lib/roles";
import { NavLink } from "./nav-link";

export async function Header() {
  const roles = await resolveRoleState();
  const state = roles?.state ?? null;
  const admin = roles?.isAdmin ?? false;
  const judge = admin || (roles?.judgeFor.length ?? 0) > 0;

  return (
    <header className="sticky top-0 z-50 border-b border-green-dark/15 bg-surface/80 backdrop-blur-md">
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
              {judge && <NavLink href="/judge">Avaliação</NavLink>}
              {admin && <NavLink href="/admin">Admin</NavLink>}
              <NavLink href="/account">Minha conta</NavLink>
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
