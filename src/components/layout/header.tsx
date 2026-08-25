import Link from "next/link";
import Image from "next/image";
import { resolveRoleState } from "@/lib/roles";
import { NavLink } from "./nav-link";

/**
 * Floating dark dock instead of a hairline bar: the cream page keeps its
 * canvas, the chrome reads as one object sitting on top of it.
 */
export async function Header() {
  const roles = await resolveRoleState();
  const state = roles?.state ?? null;
  const admin = roles?.isAdmin ?? false;
  const judge = admin || (roles?.judgeFor.length ?? 0) > 0;

  return (
    <header className="sticky top-3 z-50 px-3 sm:top-4 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-2xl border-2 border-green-dark bg-green-dark px-4 py-3 shadow-[6px_6px_0_rgba(27,35,29,0.25)] sm:px-6">
        <Link
          href="/"
          className="flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-green-dark"
        >
          <Image
            src="/brand/stbr/logo/horizontal-fwhite.svg"
            alt="Superteam Brasil"
            width={140}
            height={24}
            priority
            className="h-6 w-auto"
          />
        </Link>

        <nav className="flex items-center gap-1 text-sm sm:gap-1.5">
          {state ? (
            <>
              {judge && <NavLink href="/judge">Avaliação</NavLink>}
              {admin && <NavLink href="/admin">Admin</NavLink>}
              <NavLink href="/account">Minha conta</NavLink>
              <form action="/api/auth/signout" method="post">
                <button
                  type="submit"
                  className="ml-1.5 rounded-full border border-surface/25 px-3.5 py-1.5 font-semibold text-surface/80 transition-colors duration-150 hover:border-surface/50 hover:text-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow"
                >
                  Sair
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/auth"
              className="rounded-full bg-yellow px-5 py-2 text-sm font-bold text-green-dark transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-green-dark"
            >
              Entrar
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
