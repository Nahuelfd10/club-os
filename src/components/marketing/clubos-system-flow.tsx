import type { CSSProperties } from "react";
import { ArrowRight, BadgeCheck, CalendarDays, CreditCard, UserRound } from "lucide-react";

const flowItems = [
  {
    title: "Socio",
    description: "Alta o renovacion activa",
    icon: UserRound,
  },
  {
    title: "Cuota marzo",
    description: "Cargo generado automaticamente",
    icon: CalendarDays,
  },
  {
    title: "Pago registrado",
    description: "Cobro validado en el panel",
    icon: CreditCard,
  },
  {
    title: "Al dia",
    description: "Estado actualizado en tiempo real",
    icon: BadgeCheck,
  },
];

export function ClubOsSystemFlow() {
  return (
    <div className="clubos-sheen rounded-[2rem] border border-white/10 bg-[linear-gradient(160deg,rgba(15,23,42,0.94)_0%,rgba(17,24,39,0.88)_50%,rgba(30,41,59,0.94)_100%)] p-6 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.95)] sm:p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-300/70">Flujo del sistema</p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-white">
            Asi se ve el valor del producto en movimiento.
          </h2>
        </div>
        <div className="rounded-full bg-white/8 p-3 text-sky-300">
          <ArrowRight className="h-5 w-5" aria-hidden />
        </div>
      </div>

      <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
        Desde el socio hasta el estado final, Club OS deja visible el recorrido que hoy suele perderse entre mensajes, notas y planillas.
      </p>

      <div className="mt-8 grid gap-3 lg:grid-cols-[repeat(4,minmax(0,1fr))] lg:items-center">
        {flowItems.map((item, index) => {
          const Icon = item.icon;
          const isLast = index === flowItems.length - 1;
          const nodeStyle = {
            "--flow-node-delay": `${index * 1.35}s`,
          } as CSSProperties;
          const connectorStyle = {
            "--flow-connector-delay": `${0.68 + index * 1.35}s`,
          } as CSSProperties;

          return (
            <div key={item.title} className="clubos-flow-step relative">
              <article
                className={`clubos-flow-node rounded-[1.4rem] border border-white/10 bg-white/6 p-4 ${isLast ? "clubos-flow-node-final" : ""}`}
                style={nodeStyle}
              >
                <div className="inline-flex rounded-full bg-white/8 p-2.5 text-sky-300">
                  <Icon className="h-4 w-4" aria-hidden />
                </div>
                <h3 className="mt-4 text-sm font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-300">{item.description}</p>
              </article>

              {!isLast ? (
                <div className="clubos-flow-connector hidden lg:block" aria-hidden style={connectorStyle}>
                  <span className="clubos-flow-line" />
                  <span className="clubos-flow-dot" />
                </div>
              ) : (
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-400/14 px-3 py-1.5 text-xs font-semibold text-emerald-300 lg:hidden">
                  <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                  Flujo completado
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-5 hidden items-center gap-2 rounded-full bg-emerald-400/14 px-3 py-1.5 text-xs font-semibold text-emerald-300 lg:inline-flex">
        <BadgeCheck className="clubos-flow-check h-3.5 w-3.5" aria-hidden />
        Estado final sincronizado
      </div>
    </div>
  );
}
