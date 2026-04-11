import { AnimatedCount } from "@/components/marketing/animated-count";

const barSeries = [
  { label: "Ene", height: "36%" },
  { label: "Feb", height: "52%" },
  { label: "Mar", height: "72%" },
  { label: "Abr", height: "64%" },
  { label: "May", height: "82%" },
];

export function ClubOsMiniDashboard() {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/6 p-6 shadow-[0_24px_60px_-42px_rgba(0,0,0,0.85)] backdrop-blur-xl sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-300/70">Mini dashboard</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Senales visuales de que el producto ya opera con datos y estado.
          </h2>
          <p className="mt-4 text-sm leading-6 text-slate-300 sm:text-base">
            No alcanza con decir que administra un club. Mostrar indicadores concretos hace que se perciba inmediatamente como una herramienta seria.
          </p>
        </div>

        <div className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/55">
          Vista resumida
        </div>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="grid gap-4 sm:grid-cols-3">
          <article className="rounded-[1.5rem] border border-white/10 bg-black/18 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">Socios activos</p>
            <AnimatedCount value={124} className="mt-3 block text-3xl font-bold tracking-tight text-white" />
            <p className="mt-2 text-sm text-slate-400">Padron aprobado y operativo</p>
          </article>
          <article className="rounded-[1.5rem] border border-white/10 bg-black/18 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">Ingresos del mes</p>
            <AnimatedCount value={420} prefix="$" suffix="k" className="mt-3 block text-3xl font-bold tracking-tight text-white" />
            <p className="mt-2 text-sm text-slate-400">Cobros registrados en el periodo</p>
          </article>
          <article className="rounded-[1.5rem] border border-white/10 bg-black/18 p-5">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">Deuda total</p>
            <AnimatedCount value={18} suffix=" socios" className="mt-3 block text-3xl font-bold tracking-tight text-white" />
            <p className="mt-2 text-sm text-slate-400">Estado facil de identificar</p>
          </article>
        </div>

        <div className="rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.02)_100%)] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Cobros recientes</p>
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/45">Tendencia mensual</p>
            </div>
            <span className="rounded-full bg-emerald-400/14 px-3 py-1 text-xs font-semibold text-emerald-300">
              +12% este mes
            </span>
          </div>

          <div className="mt-6 flex h-44 items-end gap-3 rounded-[1.2rem] bg-black/20 p-4">
            {barSeries.map((bar, index) => (
              <div key={bar.label} className="flex flex-1 flex-col items-center gap-2">
                <div className="text-[11px] font-medium text-slate-400">{bar.label}</div>
                <div className="flex h-28 w-full items-end">
                  <div
                    className="clubos-dashboard-bar w-full rounded-t-[0.85rem] bg-[linear-gradient(180deg,rgba(56,189,248,0.95)_0%,rgba(59,130,246,0.95)_55%,rgba(249,115,22,0.95)_100%)]"
                    style={{ height: bar.height, animationDelay: `${220 + index * 110}ms` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
