"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useActiveClubConfig } from "@/config/use-active-club-config";
import { Button } from "@/components/ui";

type AdminShellProps = {
  children: React.ReactNode;
};

type NavItem = {
  href: string;
  label: string;
};

const navItems: NavItem[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/socios", label: "Socios" },
  { href: "/admin/settings", label: "Configuracion" },
];

const isNavItemActive = (pathname: string, href: string) => {
  if (href === "/admin") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
};

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { config, isConfigLoading } = useActiveClubConfig();

  const handleLogout = () => {
    localStorage.removeItem("isAdminLogged");
    window.dispatchEvent(new Event("admin-auth-change"));
    router.replace("/admin/login");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(52rem 30rem at -10% -10%, rgba(100, 116, 139, 0.12) 0%, transparent 60%), radial-gradient(48rem 30rem at 110% -10%, rgba(148, 163, 184, 0.14) 0%, transparent 64%), linear-gradient(to bottom, #f8fafc, #eef2ff)",
        }}
      />

      <div className="relative mx-auto flex w-full max-w-[1400px] gap-4 p-3 md:p-5">
        <aside className="hidden w-64 shrink-0 flex-col rounded-3xl border border-white/70 bg-white/80 p-4 shadow-lg shadow-slate-900/5 backdrop-blur md:flex">
          <div className="border-b border-slate-200/70 pb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Club OS</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-900">
              {isConfigLoading ? "Cargando..." : config.name}
            </h2>
            <p className="mt-2 text-xs text-slate-500">Panel administrativo</p>
          </div>

          <nav className="mt-4 flex flex-1 flex-col gap-1">
            {navItems.map((item) => {
              const isActive = isNavItemActive(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-slate-900 text-white shadow-sm"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 border-t border-slate-200/80 pt-3">
            <Link
              href="/"
              className="inline-flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
                <path d="M3.75 10.5 12 3.75l8.25 6.75V19.5a.75.75 0 0 1-.75.75H14.25v-5.25h-4.5v5.25H4.5a.75.75 0 0 1-.75-.75V10.5Z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Ver sitio
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
                <path d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-7.5a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 6 21h7.5a2.25 2.25 0 0 0 2.25-2.25V15M10.5 12h10.5m0 0-3-3m3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Salir
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="mb-4 rounded-2xl border border-white/80 bg-white/80 p-3 shadow-sm backdrop-blur md:hidden">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Admin</p>
                <p className="text-sm font-semibold text-slate-900">
                  {isConfigLoading ? "Cargando..." : config.name}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/"
                  className="rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700"
                >
                  Ver sitio
                </Link>
                <Button type="button" variant="neutral" size="md" onClick={handleLogout}>
                  Salir
                </Button>
              </div>
            </div>

            <nav className="flex flex-wrap gap-2">
              {navItems.map((item) => {
                const isActive = isNavItemActive(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-slate-900 text-white shadow-sm"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </header>

          <div className="rounded-3xl border border-white/70 bg-white/85 p-4 shadow-lg shadow-slate-900/5 backdrop-blur md:p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
