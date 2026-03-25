import { getDashboardStats } from "@/lib/dashboard";
import { formatMoney } from "@/lib/formatters";

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();
  const percentFormatter = new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const monthLabelFormatter = new Intl.DateTimeFormat("es-AR", { month: "short" });

  const overviewCards = [
    { title: "Total socios", value: stats.totalMembers, helper: "Socios registrados" },
    {
      title: "Ingresos del mes",
      value: formatMoney(stats.monthlyIncome),
      helper: `${stats.incomeChangePercent >= 0 ? "+" : "-"}${percentFormatter.format(
        Math.abs(stats.incomeChangePercent)
      )} vs mes anterior`,
    },
    {
      title: "Deuda total",
      value: formatMoney(stats.totalDebt),
      helper: `${stats.membersWithDebt} socios deben cuotas`,
    },
    {
      title: "Proyeccion mensual",
      value: formatMoney(stats.nextMonthProjectedIncome),
      helper: "Ingresos proyectados",
    },
  ];
  const maxSeriesIncome = Math.max(...stats.recentMonthlyIncome.map((item) => item.income), 1);

  return (
    <section className="space-y-6">
      <header>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">Panel principal del club.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {overviewCards.map((card) => (
          <article key={card.title} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{card.title}</p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{card.value}</p>
            <p className="mt-2 text-xs text-slate-500">{card.helper}</p>
          </article>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 xl:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900">Ingresos mensuales</h2>
          <p className="text-sm text-slate-500">Ultimos 6 meses</p>

          <div className="mt-5 flex h-56 items-end justify-between gap-3 rounded-xl bg-slate-50 p-4">
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
                      className="w-full rounded-t-md bg-indigo-500/90"
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>
                  <div className="text-xs font-medium text-slate-500">{monthLabel}</div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">Socios con deuda</h2>
          <p className="text-sm text-slate-500">{stats.membersWithDebt} socios deben cuotas</p>

          <div className="mt-5 space-y-4">
            {stats.topDebtMembers.length === 0 ? (
              <p className="text-sm text-slate-500">No hay deuda pendiente.</p>
            ) : (
              stats.topDebtMembers.map((debtor) => (
                <article key={debtor.memberId} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{debtor.fullName}</p>
                    <p className="text-xs text-slate-500">
                      {debtor.debtMonths} {debtor.debtMonths === 1 ? "mes" : "meses"} sin pagar
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-orange-600">{formatMoney(debtor.debtAmount)}</p>
                </article>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="grid grid-cols-2 gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 md:grid-cols-4">
        <article>
          <p className="text-sm text-slate-500">Cuota mensual</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{formatMoney(stats.monthlyFee)}</p>
        </article>
        <article>
          <p className="text-sm text-slate-500">Socios activos</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{stats.activeMembers}</p>
        </article>
        <article>
          <p className="text-sm text-slate-500">Pendientes de aprobacion</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{stats.pendingMembers}</p>
        </article>
        <article>
          <p className="text-sm text-slate-500">Ingresos mes anterior</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{formatMoney(stats.lastMonthIncome)}</p>
        </article>
      </section>
    </section>
  );
}
