"use client";

import {
  ArrowDownCircle,
  BadgeCheck,
  CreditCard,
  House,
  LayoutDashboard,
  LogOut,
  Receipt,
  Settings,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { ClubLogo } from "@/components/club-logo";
import { useActiveClubConfig } from "@/config/use-active-club-config";
import { formatMoney } from "@/lib/formatters";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { Button, buttonClassNames } from "@/components/ui";

type AdminShellProps = {
  children: React.ReactNode;
};

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const navItems: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/socios", label: "Socios", icon: Users },
  { href: "/admin/charges", label: "Cobros", icon: Receipt },
  { href: "/admin/expenses", label: "Caja", icon: ArrowDownCircle },
  { href: "/admin/groups", label: "Grupos", icon: UsersRound },
  { href: "/admin/settings", label: "Ajustes", icon: Settings },
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
  const monthlyFeeLabel = formatMoney(config.monthly_fee);
  const paymentAliasLabel = config.payment_alias || "Alias pendiente";

  const handleLogout = async () => {
    try {
      const supabase = getBrowserSupabase();
      await supabase.auth.signOut();
    } catch (error) {
      // No bloqueamos al usuario si el sign-out remoto falla:
      // limpiamos sesión local y forzamos refresh para que el middleware
      // detecte el estado sin cookies y redirija.
      console.error("Error cerrando sesión", error);
    } finally {
      router.replace("/admin/login");
      router.refresh();
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-slate-50 text-slate-800">
      <div className="min-h-screen md:block">
        <aside className="hidden h-screen w-[268px] flex-col overflow-y-auto border-r border-white/8 bg-[#0b1220] px-4 py-5 text-white shadow-[18px_0_42px_-34px_rgba(15,23,42,0.75)] md:fixed md:inset-y-0 md:left-0 md:flex">
          <div className="border-b border-white/8 px-2 pb-4">
            <div className="flex items-center gap-3">
              <ClubLogo
                src={config.logo}
                alt={isConfigLoading ? "Logo del club" : `Logo de ${config.name}`}
                className="h-10 w-10 shrink-0 rounded-xl bg-white p-1.5 shadow-[0_12px_24px_-18px_rgba(0,0,0,0.65)]"
              />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">Admin</p>
                <h2 className="mt-1 truncate text-sm font-semibold leading-tight text-white">
                  {isConfigLoading ? "Cargando..." : config.name}
                </h2>
              </div>
            </div>
          </div>

          <nav className="mt-5 flex flex-1 flex-col gap-1">
            <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">Gestion</p>
            {navItems.map((item) => {
              const isActive = isNavItemActive(pathname, item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative inline-flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-nav-active/14 text-white ring-1 ring-nav-active/25"
                      : "text-white/72 hover:bg-white/[0.055] hover:text-white"
                  }`}
                >
                  {isActive ? <span className="absolute -left-4 top-2 bottom-2 w-0.75 rounded-r-full bg-nav-active" /> : null}
                  <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-nav-active" : "text-white/62"}`} strokeWidth={1.8} aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.04] p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-emerald-400/12 p-2 text-emerald-300">
                <BadgeCheck className="h-4 w-4" aria-hidden />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Resumen del club</p>
                <p className="text-xs text-white/48">Datos base del sistema.</p>
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              <div className="rounded-xl border border-white/8 bg-black/18 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/42">Cuota mensual</p>
                <p className="mt-2 text-lg font-semibold text-white">{monthlyFeeLabel}</p>
              </div>
              <div className="rounded-xl border border-white/8 bg-black/18 p-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-accent" aria-hidden />
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/42">Alias</p>
                </div>
                <p className="mt-2 truncate text-sm font-semibold text-white">{paymentAliasLabel}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link
                href="/club"
                className={buttonClassNames({
                  variant: "ghost",
                  size: "sm",
                  fullWidth: true,
                  className: "border border-white/10 text-white hover:bg-white/10 hover:text-white",
                })}
              >
                <House className="h-4 w-4" strokeWidth={1.8} aria-hidden />
                Sitio
              </Link>
              <button
                type="button"
                onClick={() => void handleLogout()}
                className={buttonClassNames({
                  variant: "ghost",
                  size: "sm",
                  fullWidth: true,
                  className: "border border-transparent text-white/78 hover:bg-danger/10 hover:text-red-300",
                })}
              >
                <LogOut className="h-4 w-4" strokeWidth={1.8} aria-hidden />
                Salir
              </button>
            </div>
          </div>
        </aside>

        <div className="flex h-screen min-w-0 flex-1 flex-col overflow-y-auto md:ml-[268px]">
          <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/92 p-3 shadow-[0_14px_28px_-28px_rgba(15,23,42,0.3)] backdrop-blur md:hidden">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <ClubLogo
                  src={config.logo}
                  alt={isConfigLoading ? "Logo del club" : `Logo de ${config.name}`}
                  className="h-10 w-10 shrink-0 rounded-xl bg-white p-1 shadow-sm"
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Admin</p>
                  <p className="truncate text-sm font-semibold text-slate-950">
                    {isConfigLoading ? "Cargando..." : config.name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/club"
                  className={buttonClassNames({
                    variant: "ghost",
                    size: "sm",
                    className: "border border-slate-200 text-slate-700 hover:bg-slate-100",
                  })}
                >
                  Ver sitio
                </Link>
                <Button type="button" variant="ghost" size="md" onClick={() => void handleLogout()} className="border border-slate-200 text-slate-700 hover:bg-slate-100">
                  Salir
                </Button>
              </div>
            </div>

            <nav className="flex flex-wrap gap-2">
              {navItems.map((item) => {
                const isActive = isNavItemActive(pathname, item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-slate-950 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-950"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} aria-hidden />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </header>

          <main className="admin-light-content min-w-0 flex-1 px-4 py-5 md:px-8 md:py-8 lg:px-10">
            <div
              aria-hidden
              className="pointer-events-none fixed inset-y-0 right-0 hidden w-[38rem] bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.10),transparent_55%)] lg:block"
            />
            <div className="relative z-10 mx-auto w-full max-w-[86rem]">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
