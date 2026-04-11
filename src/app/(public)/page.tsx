import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CreditCard,
  FolderKanban,
  Layers3,
  MessageSquareMore,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import { buttonClassNames } from "@/components/ui";

const productBenefits = [
  {
    title: "Alta de socios mas clara",
    description: "Landing institucional, registro y panel conectados para que el ingreso al club se sienta ordenado.",
    icon: Users,
  },
  {
    title: "Cobros y seguimiento",
    description: "Cuotas, cargos y deuda centralizados en una sola operacion diaria.",
    icon: CreditCard,
  },
  {
    title: "Panel para comision directiva",
    description: "Un lugar unico para ver socios, movimientos y senales importantes del club.",
    icon: BarChart3,
  },
  {
    title: "Base para escalar a otros clubes",
    description: "Se estructura primero sobre un caso real para validarlo y luego abrirlo a otras instituciones.",
    icon: Layers3,
  },
];

const productModules = [
  "Landing publica del club",
  "Registro digital de socios",
  "Dashboard administrativo",
  "Gestion de cobros y egresos",
  "Seguimiento por grupos y socios",
  "Configuracion institucional",
];

export default function Home() {
  return (
    <main className="px-4 pb-12 pt-10 sm:px-6 sm:pt-12">
      <div className="mx-auto flex w-full max-w-[100rem] flex-col gap-8 sm:gap-10">
        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/6 p-7 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:p-10 lg:p-12">
            <span className="inline-flex rounded-full border border-white/12 bg-white/8 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white/75">
              Producto para clubes reales
            </span>
            <h1 className="mt-6 max-w-4xl text-4xl font-black leading-[1.02] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Club OS ordena la operacion del club y mejora la experiencia desde la primera visita.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
              No es una landing institucional suelta ni solo un panel administrativo. Es una experiencia completa para que un club gestione mejor socios, cobros y comunicacion sin perder cercania.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/club" className={buttonClassNames({ variant: "primary", size: "xl" })}>
                Ver demo del club
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="#producto"
                className={buttonClassNames({
                  variant: "ghost",
                  size: "xl",
                  className: "border border-white/10 text-white hover:bg-white/10 hover:text-white",
                })}
              >
                Entender el producto
              </Link>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              <article className="rounded-[1.5rem] border border-white/10 bg-black/18 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">Validacion real</p>
                <p className="mt-3 text-2xl font-bold tracking-tight text-white">1 club</p>
                <p className="mt-2 text-sm text-slate-400">Primero funciona en contexto real, despues escala.</p>
              </article>
              <article className="rounded-[1.5rem] border border-white/10 bg-black/18 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">Experiencia unificada</p>
                <p className="mt-3 text-2xl font-bold tracking-tight text-white">Publica + admin</p>
                <p className="mt-2 text-sm text-slate-400">Landing del club y operacion interna bajo la misma logica.</p>
              </article>
              <article className="rounded-[1.5rem] border border-white/10 bg-black/18 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">Base modular</p>
                <p className="mt-3 text-2xl font-bold tracking-tight text-white">Lista para iterar</p>
                <p className="mt-2 text-sm text-slate-400">Se puede adaptar cuando el producto madure para otros equipos.</p>
              </article>
            </div>
          </div>

          <aside className="grid gap-4">
            <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(160deg,rgba(15,23,42,0.94)_0%,rgba(17,24,39,0.88)_50%,rgba(30,41,59,0.94)_100%)] p-6 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.95)] sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-300/70">Posicionamiento</p>
                  <h2 className="mt-3 text-2xl font-bold tracking-tight text-white">Club OS no vende humo: primero resuelve.</h2>
                </div>
                <div className="rounded-full bg-white/8 p-3 text-sky-300">
                  <ShieldCheck className="h-5 w-5" aria-hidden />
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
                  <p className="text-sm font-semibold text-white">Caso real antes que plantilla generica</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">El producto nace dentro de un club concreto, con necesidades concretas y validacion diaria.</p>
                </div>
                <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
                  <p className="text-sm font-semibold text-white">Diseno con foco operativo</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">Cada decision visual tiene impacto directo en claridad, percepcion y uso real del sistema.</p>
                </div>
                <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
                  <p className="text-sm font-semibold text-white">Listo para productoizar despues</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">Cuando cierre bien el caso actual, la base ya va a estar preparada para abrirse a otros clubes.</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.6rem] border border-white/10 bg-white/6 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">Demo viva</p>
                <p className="mt-3 text-xl font-semibold text-white">Landing del club</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">Una experiencia institucional real, no un mockup.</p>
              </div>
              <div className="rounded-[1.6rem] border border-white/10 bg-white/6 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">Backoffice</p>
                <p className="mt-3 text-xl font-semibold text-white">Operacion centralizada</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">Socios, cargos, dashboards y configuracion en una sola capa.</p>
              </div>
            </div>
          </aside>
        </section>

        <section id="beneficios" className="grid gap-4 lg:grid-cols-4">
          {productBenefits.map((benefit) => {
            const Icon = benefit.icon;

            return (
              <article
                key={benefit.title}
                className="rounded-[1.75rem] border border-white/10 bg-white/6 p-6 shadow-[0_24px_60px_-42px_rgba(0,0,0,0.85)] backdrop-blur-xl"
              >
                <div className="inline-flex rounded-full bg-white/8 p-3 text-sky-300">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-white">{benefit.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">{benefit.description}</p>
              </article>
            );
          })}
        </section>

        <section id="producto" className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[2rem] border border-white/10 bg-white/6 p-7 backdrop-blur-xl sm:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-300/70">Producto</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Una plataforma pensada para clubes que necesitan orden sin perder identidad.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-300">
              La vision no es solo administrar datos. Es crear una experiencia coherente para socios, familias y administracion, donde lo publico y lo interno trabajen juntos.
            </p>

            <div className="mt-8 grid gap-3">
              {productModules.map((module) => (
                <div key={module} className="flex items-center gap-3 rounded-[1.2rem] border border-white/10 bg-black/18 px-4 py-3">
                  <div className="rounded-full bg-white/8 p-2 text-sky-300">
                    <FolderKanban className="h-4 w-4" aria-hidden />
                  </div>
                  <p className="text-sm font-semibold text-white">{module}</p>
                </div>
              ))}
            </div>
          </div>

          <div id="demo" className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.03)_100%)] p-7 backdrop-blur-xl sm:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-300/70">Demo del caso real</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Hoy el producto se prueba sobre la experiencia completa de un club.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-300">
              Esa separacion entre `Club OS` y la landing del club ya permite mostrar el producto sin confundirlo con la marca institucional del cliente.
            </p>

            <div className="mt-8 space-y-4">
              <article className="rounded-[1.4rem] border border-white/10 bg-black/20 p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-white/8 p-2 text-sky-300">
                    <Sparkles className="h-4 w-4" aria-hidden />
                  </div>
                  <p className="text-sm font-semibold text-white">Landing institucional del club</p>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300">Comunica al socio, presenta la propuesta y deriva al registro.</p>
              </article>
              <article className="rounded-[1.4rem] border border-white/10 bg-black/20 p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-white/8 p-2 text-sky-300">
                    <MessageSquareMore className="h-4 w-4" aria-hidden />
                  </div>
                  <p className="text-sm font-semibold text-white">Panel administrativo</p>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300">Ordena aprobaciones, socios, cargos y lectura ejecutiva del club.</p>
              </article>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/club" className={buttonClassNames({ variant: "primary", size: "xl" })}>
                Explorar demo club
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/admin"
                className={buttonClassNames({
                  variant: "ghost",
                  size: "xl",
                  className: "border border-white/10 text-white hover:bg-white/10 hover:text-white",
                })}
              >
                Abrir panel
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
