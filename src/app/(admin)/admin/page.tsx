import Link from "next/link";

import { getDashboardStats } from "@/lib/dashboard";

type StatCardProps = {
  title: string;
  value: string | number;
  description?: string;
};

function StatCard({ title, value, description }: StatCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
      {description ? <p className="mt-2 text-xs text-slate-500">{description}</p> : null}
    </article>
  );
}

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();
  const currencyFormatter = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });
  const percentFormatter = new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  const statCards = [
    { title: "Total socios", value: stats.totalMembers, description: "Socios registrados en el club" },
    { title: "Socios activos", value: stats.activeMembers, description: "Con estado activo actualmente" },
    {
      title: "Ingresos del mes",
      value: currencyFormatter.format(stats.monthlyIncome),
      description: "Pagos registrados en el mes actual",
    },
    {
      title: "Deuda total",
      value: currencyFormatter.format(stats.totalDebt),
      description: "Cuotas pendientes acumuladas",
    },
    {
      title: "Ganancias proximo mes",
      value: currencyFormatter.format(stats.nextMonthProjectedIncome),
      description: "Proyeccion segun socios activos",
    },
  ];
  const isIncomePositive = stats.incomeChange >= 0;
  const incomeChangeLabel = `${currencyFormatter.format(Math.abs(stats.incomeChange))} ${
    isIncomePositive ? "más" : "menos"
  }`;
  const variationPrefix = stats.incomeChangePercent >= 0 ? "+" : "-";
  const variationLabel = `${variationPrefix}${percentFormatter.format(
    Math.abs(stats.incomeChangePercent)
  )}%`;
  const variationColorClass =
    stats.incomeChangePercent > 0
      ? "text-emerald-700"
      : stats.incomeChangePercent < 0
      ? "text-red-700"
      : "text-slate-700";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-7xl">
        <h1 className="text-3xl font-bold" style={{ color: "var(--club-primary)" }}>
          Dashboard
        </h1>
        <p className="mt-2 text-sm text-slate-600">Panel principal del club.</p>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => (
            <StatCard
              key={card.title}
              title={card.title}
              value={card.value}
              description={card.description}
            />
          ))}
        </div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-100 p-5">
          <h2 className="text-lg font-semibold text-slate-900">Resumen del mes</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>Tenés {stats.membersWithDebt} socios con deuda.</li>
            <li className={isIncomePositive ? "text-emerald-700" : "text-red-700"}>
              Este mes ingresaste {incomeChangeLabel} que el mes pasado.
            </li>
            <li className={variationColorClass}>Variación mensual: {variationLabel}.</li>
          </ul>
          <p className="mt-3 text-xs text-slate-500">
            Ingreso del mes pasado: {currencyFormatter.format(stats.lastMonthIncome)}.
          </p>
        </section>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/admin/socios"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-100"
          >
            Ver socios
          </Link>
          <Link
            href="/admin/settings"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
          >
            Configuracion
          </Link>
        </div>
      </section>
    </main>
  );
}
