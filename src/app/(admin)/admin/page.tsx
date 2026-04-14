import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BadgeCheck,
  CalendarClock,
  HandCoins,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { Badge, Card, PageHeader } from "@/components/ui";
import { getDashboardStats } from "@/lib/dashboard";
import { formatMoney } from "@/lib/formatters";

type OverviewCard = {
  title: string;
  value: string | number;
  helper: string;
  icon: LucideIcon;
};

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();
  const percentFormatter = new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const monthLabelFormatter = new Intl.DateTimeFormat("es-AR", { month: "short" });

  const overviewCards: OverviewCard[] = [
    { title: "Total socios", value: stats.totalMembers, helper: "Socios registrados", icon: Users },
    {
      title: "Total esperado (cargos)",
      value: formatMoney(stats.totalExpected),
      helper: "Suma de member_charges.amount",
      icon: BadgeCheck,
    },
    {
      title: "Total cobrado (cargos)",
      value: formatMoney(stats.totalCollected),
      helper: "Suma de member_charges.paid_amount",
      icon: HandCoins,
    },
    {
      title: "Deuda cuota mensual",
      value: formatMoney(stats.membershipDebtTotal),
      helper: "Cuotas mensuales del club",
      icon: CalendarClock,
    },
    {
      title: "Deuda otros cargos",
      value: formatMoney(stats.otherDebtTotal),
      helper: "Actividades, inscripciones y cargos sin categoria",
      icon: ArrowDownRight,
    },
    {
      title: "Deuda total",
      value: formatMoney(stats.totalDebt),
      helper: "Todos los member_charges pendientes",
      icon: Wallet,
    },
    {
      title: "Cobros registrados (mes)",
      value: formatMoney(stats.monthlyCashIn),
      helper: `${stats.incomeChangePercent >= 0 ? "+" : "-"}${percentFormatter.format(
        Math.abs(stats.incomeChangePercent)
      )} vs mes anterior (charge_payments)`,
      icon: ArrowUpRight,
    },
    {
      title: "Egresos del mes",
      value: formatMoney(stats.monthlyExpenses),
      helper: "Gastos del mes calendario",
      icon: ArrowDownRight,
    },
    {
      title: "Balance del mes",
      value: formatMoney(stats.monthlyBalance),
      helper: "Cobros del mes - egresos del mes",
      icon: Activity,
    },
  ];
  const maxSeriesIncome = Math.max(...stats.recentMonthlyIncome.map((item) => item.income), 1);
  const balanceIsPositive = stats.monthlyBalance >= 0;
  const balanceBadgeVariant = balanceIsPositive ? "success" : "danger";
  const incomeTrendVariant = stats.incomeChangePercent >= 0 ? "success" : "warning";

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Resumen ejecutivo"
        title="Dashboard"
        description="Vista general de socios, cobros, deuda y flujo del club con una lectura mas clara y mejor jerarquizada."
        actions={
          <>
            <Badge variant={incomeTrendVariant}>
              {stats.incomeChangePercent >= 0 ? "Cobros en alza" : "Cobros por revisar"}
            </Badge>
            <Badge variant={balanceBadgeVariant}>
              {balanceIsPositive ? "Balance positivo" : "Balance ajustado"}
            </Badge>
          </>
        }
      />

      <Card
        variant="hero"
        className="relative overflow-hidden rounded-[2rem] border-white/10 !bg-slate-950/62 p-6 shadow-[0_34px_90px_-46px_rgba(2,8,23,0.88)] sm:p-8"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.015) 100%), radial-gradient(circle at top right, color-mix(in srgb, var(--club-accent) 12%, transparent) 0%, transparent 28%)",
          }}
        />
        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">Estado del mes</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              {balanceIsPositive ? "El club mantiene un balance saludable." : "El club necesita ajustar el balance del mes."}
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              La combinacion entre cobros registrados, egresos y deuda pendiente te permite detectar rapido si el periodo esta bajo control o necesita intervencion.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <article className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">Cobros del mes</p>
                <p className="mt-3 text-2xl font-bold tracking-tight text-white">{formatMoney(stats.monthlyCashIn)}</p>
                <p className="mt-2 text-sm text-slate-300">Registrados en charge_payments.</p>
              </article>
              <article className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">Egresos</p>
                <p className="mt-3 text-2xl font-bold tracking-tight text-white">{formatMoney(stats.monthlyExpenses)}</p>
                <p className="mt-2 text-sm text-slate-300">Gastos imputados al mes calendario.</p>
              </article>
              <article className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">Balance</p>
                <p className={`mt-3 text-2xl font-bold tracking-tight ${balanceIsPositive ? "text-success" : "text-danger"}`}>
                  {formatMoney(stats.monthlyBalance)}
                </p>
                <p className="mt-2 text-sm text-slate-300">Resultado neto del periodo actual.</p>
              </article>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">Senales rapidas</p>
                <h3 className="mt-3 text-xl font-bold tracking-tight text-white">Indicadores para seguimiento diario</h3>
              </div>
              <div className="rounded-full bg-white/10 p-2 text-[color:var(--club-accent)]">
                <Activity className="h-4 w-4" aria-hidden />
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.045] p-4">
                <p className="text-sm font-semibold text-white">Socios con deuda</p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-white">{stats.membersWithDebt}</p>
                <p className="mt-2 text-sm text-slate-300">Socios con saldo pendiente en algun cargo.</p>
              </div>
              <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.045] p-4">
                <p className="text-sm font-semibold text-white">Pendientes de aprobacion</p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-white">{stats.pendingMembers}</p>
                <p className="mt-2 text-sm text-slate-300">Solicitudes que esperan validacion administrativa.</p>
              </div>
              <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.045] p-4">
                <p className="text-sm font-semibold text-white">Ingresos proyectados</p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-white">
                  {formatMoney(stats.nextMonthProjectedIncome)}
                </p>
                <p className="mt-2 text-sm text-slate-300">Referencia basada en cuota mensual por socios activos.</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {overviewCards.map((card) => {
          const Icon = card.icon;

          return (
            <Card
              key={card.title}
              className="rounded-[1.6rem] border-white/10 !bg-slate-950/56 p-5 shadow-[0_24px_56px_-36px_rgba(2,8,23,0.72)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-300">{card.title}</p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-white">{card.value}</p>
                </div>
                <div className="rounded-full bg-white/10 p-2 text-[color:var(--club-accent)] shadow-[0_18px_30px_-22px_rgba(2,8,23,0.72)]">
                  <Icon className="h-4 w-4" aria-hidden />
                </div>
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-400">{card.helper}</p>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="rounded-[1.75rem] border-white/10 !bg-slate-950/58 p-5 xl:col-span-2 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Cobros por mes</h2>
              <p className="text-sm text-slate-400">Ultimos 6 meses segun charge_payments.</p>
            </div>
            <Badge variant="info">Serie reciente</Badge>
          </div>

          <div className="mt-6 flex h-60 items-end justify-between gap-3 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4 sm:p-5">
            {stats.recentMonthlyIncome.map((item) => {
              const heightPercent = Math.max(8, (item.income / maxSeriesIncome) * 100);
              const monthDate = new Date(`${item.month}-01T00:00:00`);
              const monthLabel = monthLabelFormatter
                .format(monthDate)
                .replace(".", "")
                .replace(/^./, (char) => char.toUpperCase());

              return (
                <div key={item.month} className="flex flex-1 flex-col items-center gap-2">
                  <div className="text-[11px] font-medium text-slate-400">{formatMoney(item.income)}</div>
                  <div className="flex h-40 w-full items-end">
                    <div
                      className="w-full rounded-t-[0.8rem] bg-[linear-gradient(180deg,var(--club-accent)_0%,var(--club-primary)_100%)] shadow-[0_16px_28px_-20px_rgba(15,23,42,0.45)]"
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>
                  <div className="text-xs font-medium text-slate-400">{monthLabel}</div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="rounded-[1.75rem] border-white/10 !bg-slate-950/58 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Socios con deuda</h2>
              <p className="text-sm text-slate-400">{stats.membersWithDebt} socios con saldo pendiente</p>
            </div>
            <Badge variant={stats.membersWithDebt > 0 ? "warning" : "success"}>
              {stats.membersWithDebt > 0 ? "Atencion" : "En orden"}
            </Badge>
          </div>

          <div className="mt-5 space-y-4">
            {stats.topDebtMembers.length === 0 ? (
              <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm text-slate-300">No hay deuda pendiente.</p>
              </div>
            ) : (
              stats.topDebtMembers.map((debtor) => (
                <article key={debtor.memberId} className="flex items-center justify-between gap-3 rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4">
                  <div>
                    <p className="text-sm font-semibold text-white">{debtor.fullName}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-400">Saldo pendiente</p>
                  </div>
                  <p className="text-sm font-semibold text-warning">{formatMoney(debtor.debtAmount)}</p>
                </article>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card className="grid grid-cols-1 gap-4 rounded-[1.75rem] border-white/10 !bg-slate-950/58 p-5 md:grid-cols-4">
        <article className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4">
          <p className="text-sm text-slate-400">Cuota mensual (referencia)</p>
          <p className="mt-1 text-2xl font-bold text-white">{formatMoney(stats.monthlyFee)}</p>
        </article>
        <article className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4">
          <p className="text-sm text-slate-400">Socios activos</p>
          <p className="mt-1 text-2xl font-bold text-white">{stats.activeMembers}</p>
        </article>
        <article className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4">
          <p className="text-sm text-slate-400">Pendientes de aprobacion</p>
          <p className="mt-1 text-2xl font-bold text-white">{stats.pendingMembers}</p>
        </article>
        <article className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4">
          <p className="text-sm text-slate-400">Ingresos proyectados</p>
          <p className="mt-1 text-2xl font-bold text-white">{formatMoney(stats.nextMonthProjectedIncome)}</p>
        </article>
      </Card>
    </section>
  );
}
