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
  { href: "/admin/groups", label: "Grupos", icon: UsersRound },
  { href: "/admin/charges", label: "Cargos", icon: Receipt },
  { href: "/admin/expenses", label: "Egresos", icon: ArrowDownCircle },
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

  const handleLogout = () => {
    localStorage.removeItem("isAdminLogged");
    window.dispatchEvent(new Event("admin-auth-change"));
    router.replace("/admin/login");
  };

  return (
    <div className="club-page-shell relative min-h-screen overflow-hidden bg-transparent">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(50rem 28rem at -10% -10%, color-mix(in srgb, var(--club-primary) 16%, transparent) 0%, transparent 62%), radial-gradient(46rem 26rem at 110% -10%, color-mix(in srgb, var(--club-accent) 18%, transparent) 0%, transparent 60%), linear-gradient(to bottom, rgba(248,250,252,0.92), rgba(238,242,255,0.72))",
        }}
      />

      <div className="relative mx-auto flex w-full max-w-[100rem] gap-4 p-3 md:p-5">
        <aside className="club-surface hidden w-72 shrink-0 flex-col rounded-[2rem] p-4 md:flex">
          <div className="rounded-[1.5rem] border border-white/70 bg-white/72 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/65">Club OS</p>
            <div className="mt-3 flex items-start gap-3">
              <ClubLogo
                src={config.logo}
                alt={isConfigLoading ? "Logo del club" : `Logo de ${config.name}`}
                className="h-12 w-12 shrink-0 rounded-[1rem] bg-white/90 p-1.5 shadow-[0_16px_30px_-24px_rgba(15,23,42,0.42)]"
              />
              <div className="min-w-0">
                <h2 className="text-lg font-semibold leading-tight text-slate-950">
                  {isConfigLoading ? "Cargando..." : config.name}
                </h2>
                <p className="mt-1 text-xs text-slate-500">Panel administrativo con identidad de marca</p>
              </div>
            </div>
          </div>

          <nav className="mt-4 flex flex-1 flex-col gap-1.5">
            {navItems.map((item) => {
              const isActive = isNavItemActive(pathname, item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-2 rounded-[1rem] px-3.5 py-3 text-sm font-medium transition-all ${
                    isActive
                      ? "text-white shadow-[0_22px_44px_-24px_rgba(15,23,42,0.55)]"
                      : "text-slate-700 hover:bg-white/80 hover:text-slate-950"
                  }`}
                  style={
                    isActive
                      ? {
                          background:
                            "linear-gradient(135deg, var(--club-primary) 0%, color-mix(in srgb, var(--club-primary) 78%, var(--club-accent)) 100%)",
                        }
                      : undefined
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="club-surface-muted mt-4 rounded-[1.5rem] p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-2 text-primary">
                <BadgeCheck className="h-4 w-4" aria-hidden />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-950">Resumen del club</p>
                <p className="text-xs text-slate-500">Datos visibles tambien en la experiencia publica.</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              <div className="rounded-[1.15rem] bg-white/90 p-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary/65">Cuota mensual</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">{monthlyFeeLabel}</p>
              </div>
              <div className="rounded-[1.15rem] bg-white/90 p-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-accent" aria-hidden />
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Alias de cobro</p>
                </div>
                <p className="mt-2 truncate text-sm font-semibold text-slate-900">{paymentAliasLabel}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <Link href="/club" className={buttonClassNames({ variant: "outline", size: "md", fullWidth: true })}>
                <House className="h-4 w-4" strokeWidth={1.8} aria-hidden />
                Ver sitio
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className={buttonClassNames({
                  variant: "ghost",
                  size: "md",
                  fullWidth: true,
                  className: "text-danger hover:bg-danger/10 hover:text-danger",
                })}
              >
                <LogOut className="h-4 w-4" strokeWidth={1.8} aria-hidden />
                Salir
              </button>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="club-surface mb-4 rounded-[1.75rem] p-3 md:hidden">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <ClubLogo
                  src={config.logo}
                  alt={isConfigLoading ? "Logo del club" : `Logo de ${config.name}`}
                  className="h-10 w-10 shrink-0 rounded-[0.9rem] bg-white/90 p-1"
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary/65">Admin</p>
                  <p className="truncate text-sm font-semibold text-slate-950">
                    {isConfigLoading ? "Cargando..." : config.name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link href="/club" className={buttonClassNames({ variant: "outline", size: "sm" })}>
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
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-all ${
                      isActive
                        ? "text-white shadow-[0_16px_32px_-20px_rgba(15,23,42,0.55)]"
                        : "bg-white/85 text-slate-700 hover:bg-white hover:text-slate-950"
                    }`}
                    style={
                      isActive
                        ? {
                            background:
                              "linear-gradient(135deg, var(--club-primary) 0%, color-mix(in srgb, var(--club-primary) 78%, var(--club-accent)) 100%)",
                          }
                        : undefined
                    }
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} aria-hidden />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </header>

          <div className="club-surface rounded-[2rem] p-4 md:p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
