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

      <Card variant="hero" className="overflow-hidden rounded-[2rem] p-6 sm:p-8">
        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary/65">Estado del mes</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              {balanceIsPositive ? "El club mantiene un balance saludable." : "El club necesita ajustar el balance del mes."}
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              La combinacion entre cobros registrados, egresos y deuda pendiente te permite detectar rapido si el periodo esta bajo control o necesita intervencion.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <article className="club-metric-card rounded-[1.5rem] p-5">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary/65">Cobros del mes</p>
                <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">{formatMoney(stats.monthlyCashIn)}</p>
                <p className="mt-2 text-sm text-slate-600">Registrados en charge_payments.</p>
              </article>
              <article className="club-metric-card rounded-[1.5rem] p-5">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary/65">Egresos</p>
                <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">{formatMoney(stats.monthlyExpenses)}</p>
                <p className="mt-2 text-sm text-slate-600">Gastos imputados al mes calendario.</p>
              </article>
              <article className="club-metric-card rounded-[1.5rem] p-5">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary/65">Balance</p>
                <p className={`mt-3 text-2xl font-bold tracking-tight ${balanceIsPositive ? "text-success" : "text-danger"}`}>
                  {formatMoney(stats.monthlyBalance)}
                </p>
                <p className="mt-2 text-sm text-slate-600">Resultado neto del periodo actual.</p>
              </article>
            </div>
          </div>

          <div className="club-surface rounded-[1.75rem] p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary/65">Senales rapidas</p>
                <h3 className="mt-3 text-xl font-bold tracking-tight text-slate-950">Indicadores para seguimiento diario</h3>
              </div>
              <div className="rounded-full bg-primary/10 p-2 text-primary">
                <Activity className="h-4 w-4" aria-hidden />
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              <div className="rounded-[1.25rem] bg-white/90 p-4">
                <p className="text-sm font-semibold text-slate-900">Socios con deuda</p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{stats.membersWithDebt}</p>
                <p className="mt-2 text-sm text-slate-600">Socios con saldo pendiente en algun cargo.</p>
              </div>
              <div className="rounded-[1.25rem] bg-white/90 p-4">
                <p className="text-sm font-semibold text-slate-900">Pendientes de aprobacion</p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{stats.pendingMembers}</p>
                <p className="mt-2 text-sm text-slate-600">Solicitudes que esperan validacion administrativa.</p>
              </div>
              <div className="rounded-[1.25rem] bg-white/90 p-4">
                <p className="text-sm font-semibold text-slate-900">Ingresos proyectados</p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
                  {formatMoney(stats.nextMonthProjectedIncome)}
                </p>
                <p className="mt-2 text-sm text-slate-600">Referencia basada en cuota mensual por socios activos.</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {overviewCards.map((card) => {
          const Icon = card.icon;

          return (
            <Card key={card.title} className="rounded-[1.6rem] p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">{card.title}</p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{card.value}</p>
                </div>
                <div className="rounded-full bg-slate-950 p-2 text-white shadow-[0_18px_30px_-22px_rgba(15,23,42,0.52)]">
                  <Icon className="h-4 w-4" aria-hidden />
                </div>
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-500">{card.helper}</p>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="rounded-[1.75rem] p-5 xl:col-span-2 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Cobros por mes</h2>
              <p className="text-sm text-slate-500">Ultimos 6 meses segun charge_payments.</p>
            </div>
            <Badge variant="info">Serie reciente</Badge>
          </div>

          <div className="mt-6 flex h-60 items-end justify-between gap-3 rounded-[1.5rem] bg-slate-50/85 p-4 sm:p-5">
            {stats.recentMonthlyIncome.map((item) => {
              const heightPercent = Math.max(8, (item.income / maxSeriesIncome) * 100);
              const monthDate = new Date(`${item.month}-01T00:00:00`);
              const monthLabel = monthLabelFormatter
                .format(monthDate)
                .replace(".", "")
                .replace(/^./, (char) => char.toUpperCase());

              return (
                <div key={item.month} className="flex flex-1 flex-col items-center gap-2">
                  <div className="text-[11px] font-medium text-slate-500">{formatMoney(item.income)}</div>
                  <div className="flex h-40 w-full items-end">
                    <div
                      className="w-full rounded-t-[0.8rem] bg-[linear-gradient(180deg,var(--club-accent)_0%,var(--club-primary)_100%)] shadow-[0_16px_28px_-20px_rgba(15,23,42,0.45)]"
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>
                  <div className="text-xs font-medium text-slate-500">{monthLabel}</div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="rounded-[1.75rem] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Socios con deuda</h2>
              <p className="text-sm text-slate-500">{stats.membersWithDebt} socios con saldo pendiente</p>
            </div>
            <Badge variant={stats.membersWithDebt > 0 ? "warning" : "success"}>
              {stats.membersWithDebt > 0 ? "Atencion" : "En orden"}
            </Badge>
          </div>

          <div className="mt-5 space-y-4">
            {stats.topDebtMembers.length === 0 ? (
              <div className="club-surface-muted rounded-[1.25rem] p-4">
                <p className="text-sm text-slate-500">No hay deuda pendiente.</p>
              </div>
            ) : (
              stats.topDebtMembers.map((debtor) => (
                <article key={debtor.memberId} className="club-surface-muted flex items-center justify-between gap-3 rounded-[1.25rem] p-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{debtor.fullName}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">Saldo pendiente</p>
                  </div>
                  <p className="text-sm font-semibold text-warning">{formatMoney(debtor.debtAmount)}</p>
                </article>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card className="grid grid-cols-1 gap-4 rounded-[1.75rem] p-5 md:grid-cols-4">
        <article className="rounded-[1.25rem] bg-slate-50/80 p-4">
          <p className="text-sm text-slate-500">Cuota mensual (referencia)</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{formatMoney(stats.monthlyFee)}</p>
        </article>
        <article className="rounded-[1.25rem] bg-slate-50/80 p-4">
          <p className="text-sm text-slate-500">Socios activos</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{stats.activeMembers}</p>
        </article>
        <article className="rounded-[1.25rem] bg-slate-50/80 p-4">
          <p className="text-sm text-slate-500">Pendientes de aprobacion</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{stats.pendingMembers}</p>
        </article>
        <article className="rounded-[1.25rem] bg-slate-50/80 p-4">
          <p className="text-sm text-slate-500">Ingresos proyectados</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{formatMoney(stats.nextMonthProjectedIncome)}</p>
        </article>
      </Card>
    </section>
  );
}
