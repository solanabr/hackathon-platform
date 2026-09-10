import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { Background } from "@/components/layout/background";
import { AttributionCapture } from "@/components/analytics/attribution-capture";

export const dynamic = "force-dynamic";

// The sign-in screen has one job. No dock, no section nav, no footer: only a
// way back to the LP, so nothing competes with the form.
export default function BareLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative min-h-dvh overflow-x-clip bg-surface">
      <Background />
      <AttributionCapture />
      <div className="relative z-10 flex min-h-dvh flex-col">
        <div className="px-5 pt-5 sm:px-8 sm:pt-7">
          <Link
            href="/"
            aria-label="Superteam Brasil"
            className="inline-flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            <Image
              src="/brand/stbr/logo/ST-DARK-GREEN-HORIZONTAL.svg"
              alt="Superteam Brasil"
              width={140}
              height={24}
              priority
              className="h-6 w-auto"
              style={{ height: "1.5rem", width: "auto" }}
            />
          </Link>
        </div>
        <div className="flex-1">{children}</div>
      </div>
    </main>
  );
}
