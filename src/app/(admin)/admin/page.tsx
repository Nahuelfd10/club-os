import Link from "next/link";
import { ArrowRight, CreditCard, Send, UserPlus } from "lucide-react";

import { Badge, Card, PageHeader } from "@/components/ui";
import { getDashboardStats } from "@/lib/dashboard";
import { formatMoney } from "@/lib/formatters";
import { adminPath } from "@/lib/routes";

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();
  const percentFormatter = new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const monthLabelFormatter = new Intl.DateTimeFormat("es-AR", { month: "short" });
  const dayLabelFormatter = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const maxSeriesIncome = Math.max(...stats.recentMonthlyIncome.map((item) => item.income), 1);
  const balanceIsPositive = stats.monthlyBalance >= 0;

  const tasks = [
    {
      href: adminPath("socios"),
      title: `${stats.pendingMembers} solicitudes esperando aprobacion`,
      description: "Llegaron desde la landing del club y necesitan revision.",
      tone: "warning",
      icon: UserPlus,
      show: stats.pendingMembers > 0,
    },
    {
      href: adminPath("charges/membership"),
      title: `${stats.membersWithDebt} socios con saldo pendiente`,
      description: `${formatMoney(stats.totalDebt)} abiertos entre cuota mensual y otros cobros.`,
      tone: "info",
      icon: CreditCard,
      show: stats.membersWithDebt > 0,
    },
    {
      href: adminPath("charges/lists"),
      title: "Preparar recordatorios del mes",
      description: "Mensajes de WhatsApp manuales listos desde el detalle de cada lista.",
      tone: "success",
      icon: Send,
      show: true,
    },
  ].filter((task) => task.show);

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Hoy"
        title="Panel del club"
        description="Vista corta para saber que resolver primero, como viene la caja y donde esta trabada la cobranza."
        actions={
          <Badge variant={balanceIsPositive ? "success" : "danger"}>
            {balanceIsPositive ? "Mes en equilibrio" : "Revisar caja"}
          </Badge>
        }
      />

      <section className="admin-dark-panel relative overflow-hidden rounded-[1.5rem] bg-[linear-gradient(135deg,#0b1220_0%,#14213d_58%,#1b2a4e_100%)] p-6 text-white shadow-[0_30px_60px_-40px_rgba(15,23,42,0.7)] md:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_88%_18%,rgba(249,115,22,0.18),transparent_36%),radial-gradient(circle_at_10%_90%,rgba(59,130,246,0.18),transparent_42%)]"
        />
        <div className="relative grid gap-8 xl:grid-cols-[1fr_22rem]">
          <div>
            <p className="club-eyebrow text-white/55">{dayLabelFormatter.format(new Date())}</p>
            <h2 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-white md:text-4xl">
              Tenes <span className="text-orange-300">{tasks.length} cosas</span> para mirar y el mes viene{" "}
              {balanceIsPositive ? "ordenado" : "con tension"}.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/68 md:text-base">
              Primero aprobaciones, despues cobranza pendiente y finalmente seguimiento. El dashboard deja visible el
              trabajo que antes quedaba repartido entre mensajes, notas y planillas.
            </p>

            <div className="mt-6 grid gap-2">
              {tasks.map((task) => {
                const Icon = task.icon;
                const toneClass =
                  task.tone === "warning"
                    ? "bg-orange-400/16 text-orange-200"
                    : task.tone === "success"
                      ? "bg-emerald-400/14 text-emerald-200"
                      : "bg-blue-400/16 text-blue-200";

                return (
                  <Link
                    key={task.title}
                    href={task.href}
                    className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.045] px-4 py-3 text-white transition hover:bg-white/[0.08]"
                  >
                    <span className={`grid h-8 w-8 place-items-center rounded-full ${toneClass}`}>
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{task.title}</span>
                      <span className="mt-0.5 block text-xs text-white/58">{task.description}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-white/46" aria-hidden />
                  </Link>
                );
              })}
            </div>
          </div>

          <aside className="rounded-2xl border border-white/8 bg-white/[0.055] p-5">
            <p className="club-eyebrow text-white/45">Balance del mes</p>
            <p className={`mt-4 text-4xl font-semibold tracking-tight ${balanceIsPositive ? "text-emerald-300" : "text-red-300"}`}>
              {formatMoney(stats.monthlyBalance)}
            </p>
            <p className="mt-2 text-sm leading-6 text-white/62">Resultado entre pagos registrados y egresos del mes.</p>
            <div className="mt-5 grid gap-3">
              <MetricLine label="Ingresos" value={formatMoney(stats.monthlyCashIn)} tone="income" />
              <MetricLine label="Egresos" value={formatMoney(stats.monthlyExpenses)} tone="expense" />
              <MetricLine
                label="vs. mes anterior"
                value={`${stats.incomeChangePercent >= 0 ? "+" : "-"}${percentFormatter.format(Math.abs(stats.incomeChangePercent))}%`}
                tone="income"
              />
              <MetricLine label="Socios activos" value={`${stats.activeMembers} / ${stats.totalMembers}`} />
            </div>
          </aside>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-4">
        <KpiCard label="Socios activos" value={stats.activeMembers.toString()} detail={`${stats.pendingMembers} solicitudes pendientes`} />
        <KpiCard label="Deuda total" value={formatMoney(stats.totalDebt)} detail={`${stats.membersWithDebt} socios con saldo`} tone="danger" />
        <KpiCard label="Cuota mensual" value={formatMoney(stats.monthlyFee)} detail="Valor vigente para socios activos" />
        <KpiCard label="Proyeccion proxima" value={formatMoney(stats.nextMonthProjectedIncome)} detail="Si todos los activos pagan la cuota" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.4fr_0.9fr]">
        <Card className="rounded-[1.5rem] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="club-eyebrow text-primary/70">Tendencia mensual</p>
              <h2 className="mt-2 text-lg font-semibold text-slate-950">Ingresos ultimos 6 meses</h2>
            </div>
            <Badge variant={stats.incomeChangePercent >= 0 ? "success" : "warning"}>
              {stats.incomeChangePercent >= 0 ? "+" : "-"}
              {percentFormatter.format(Math.abs(stats.incomeChangePercent))}% vs anterior
            </Badge>
          </div>

          <div className="mt-6 flex h-60 items-end justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
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
                      className="w-full rounded-t-xl bg-[linear-gradient(180deg,var(--club-primary)_0%,#1d4ed8_100%)] shadow-[0_16px_28px_-20px_rgba(37,99,235,0.55)]"
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>
                  <div className="text-xs font-medium text-slate-500">{monthLabel}</div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="rounded-[1.5rem] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="club-eyebrow text-primary/70">Atencion</p>
              <h2 className="mt-2 text-lg font-semibold text-slate-950">Mayores saldos</h2>
            </div>
            <Link href={adminPath("socios")} className="text-sm font-semibold text-primary hover:underline">
              Ver socios
            </Link>
          </div>

          <div className="mt-5 space-y-2">
            {stats.topDebtMembers.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                No hay deuda pendiente.
              </div>
            ) : (
              stats.topDebtMembers.map((debtor) => (
                <Link
                  key={debtor.memberId}
                  href={adminPath(`socios/${debtor.memberId}`)}
                  className="grid grid-cols-[2.25rem_1fr_auto] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 transition hover:bg-slate-50"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                    {debtor.fullName.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-950">{debtor.fullName}</span>
                    <span className="text-xs text-slate-500">Saldo pendiente</span>
                  </span>
                  <span className="text-sm font-semibold text-warning">{formatMoney(debtor.debtAmount)}</span>
                </Link>
              ))
            )}
          </div>
        </Card>
      </div>
    </section>
  );
}

function MetricLine({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "income" | "expense";
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 rounded-xl border border-white/8 bg-black/16 px-3 py-2">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-white/46">{label}</span>
      <span className={`text-sm font-semibold ${tone === "income" ? "text-emerald-300" : tone === "expense" ? "text-orange-200" : "text-white"}`}>
        {value}
      </span>
    </div>
  );
}

function KpiCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "danger";
}) {
  return (
    <Card className="rounded-[1.5rem] p-5">
      <p className="club-eyebrow text-slate-500">{label}</p>
      <p className={`mt-3 text-3xl font-semibold tracking-tight ${tone === "danger" ? "text-danger" : "text-slate-950"}`}>
        {value}
      </p>
      <p className="mt-2 text-sm text-slate-600">{detail}</p>
    </Card>
  );
}
