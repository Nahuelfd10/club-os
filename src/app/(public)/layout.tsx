import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { ClubOsLogo } from "@/components/clubos-logo";
import { buttonClassNames } from "@/components/ui";

export default async function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18)_0%,transparent_28%),radial-gradient(circle_at_90%_0%,rgba(249,115,22,0.12)_0%,transparent_24%),linear-gradient(180deg,#020617_0%,#0f172a_45%,#111827_100%)] text-white">
      <div className="sticky top-0 z-30 px-4 pt-4 sm:px-6">
        <header className="mx-auto flex w-full max-w-[100rem] items-center justify-between gap-4 rounded-[1.75rem] border border-white/10 bg-white/6 px-4 py-3 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.9)] backdrop-blur-xl sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-3 text-white">
            <div className="rounded-[1.35rem] border border-white/10 bg-black/20 px-3 py-2 shadow-[0_22px_40px_-28px_rgba(0,0,0,0.9)]">
              <ClubOsLogo className="h-8 w-auto text-white" />
            </div>
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            <Link href="/#beneficios" className="rounded-full px-4 py-2 text-sm font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white">
              Beneficios
            </Link>
            <Link href="/#producto" className="rounded-full px-4 py-2 text-sm font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white">
              Producto
            </Link>
            <Link href="/#demo" className="rounded-full px-4 py-2 text-sm font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white">
              Demo club
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/club"
              className={buttonClassNames({ variant: "ghost", size: "md", className: "hidden border-white/10 text-white hover:bg-white/10 hover:text-white sm:inline-flex" })}
            >
              Ver club
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="/admin" className={buttonClassNames({ variant: "primary", size: "md" })}>
              Entrar al panel
            </Link>
          </div>
        </header>
      </div>

      <div className="relative z-10 flex-1">{children}</div>
    </div>
  );
}
