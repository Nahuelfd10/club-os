import Link from "next/link";
import { ArrowRight, CreditCard, LayoutDashboard, MessageSquareMore, UsersRound } from "lucide-react";

import { ClubOsMiniDashboard } from "@/components/marketing/clubos-mini-dashboard";
import { ClubOsProductStory } from "@/components/marketing/clubos-product-story";
import { Reveal } from "@/components/marketing/reveal";
import { WhatsAppReminderPreview } from "@/components/marketing/whatsapp-reminder-preview";
import { buttonClassNames } from "@/components/ui";
import { adminPath, clubPath } from "@/lib/routes";

const pillars = [
  {
    title: "Socios ordenados",
    description: "Registro publico, aprobaciones y ficha de cada socio en un mismo recorrido.",
    icon: UsersRound,
  },
  {
    title: "Cobros primero",
    description: "Cuota mensual, pedidos y pagos visibles sin depender de una planilla aislada.",
    icon: CreditCard,
  },
  {
    title: "Panel accionable",
    description: "El tesorero ve que resolver hoy, donde falta cobrar y como viene la caja.",
    icon: LayoutDashboard,
  },
  {
    title: "Seguimiento humano",
    description: "WhatsApp manual con mensajes listos, sin automatizar antes de que el flujo sea claro.",
    icon: MessageSquareMore,
  },
];

export default function Home() {
  return (
    <main className="px-4 pb-16 pt-16 sm:px-6 lg:pt-20">
      <div className="mx-auto flex w-full max-w-[74rem] flex-col gap-16">
        <section className="text-center">
          <Reveal delayMs={40}>
            <p className="club-eyebrow text-white/48">Sistema operativo para clubes locales</p>
            <h1 className="mx-auto mt-6 max-w-5xl text-5xl font-semibold leading-[0.96] tracking-[-0.045em] text-white sm:text-6xl lg:text-7xl">
              Cobros, socios y caja del club en una sola herramienta.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-white/68 sm:text-lg">
              Club OS ayuda a que un club deje de perseguir cuotas en mensajes sueltos y empiece a operar con estados
              claros: quien debe, cuanto pago, cuanto falta y que accion sigue.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href={clubPath()} className={buttonClassNames({ variant: "primary", size: "xl" })}>
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
                Entender el sistema
              </Link>
            </div>
          </Reveal>
        </section>

        <Reveal delayMs={80}>
          <div id="beneficios">
            <ClubOsMiniDashboard />
          </div>
        </Reveal>

        <section id="producto" className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {pillars.map((pillar, index) => {
            const Icon = pillar.icon;
            return (
              <Reveal key={pillar.title} delayMs={80 + index * 70}>
                <article className="h-full rounded-3xl border border-white/10 bg-white/[0.045] p-6 shadow-[0_24px_60px_-42px_rgba(0,0,0,0.85)] backdrop-blur transition hover:-translate-y-1 hover:bg-white/[0.07]">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/8 text-sky-300">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <h2 className="mt-5 text-lg font-semibold text-white">{pillar.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-white/64">{pillar.description}</p>
                </article>
              </Reveal>
            );
          })}
        </section>

        <Reveal delayMs={90}>
          <WhatsAppReminderPreview />
        </Reveal>

        <Reveal delayMs={110}>
          <ClubOsProductStory />
        </Reveal>

        <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <Reveal delayMs={80}>
            <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-7 backdrop-blur sm:p-9">
              <p className="club-eyebrow text-sky-300/70">Para venderlo despues</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Primero se valida con un club real. Despues se vuelve repetible.
              </h2>
              <p className="mt-4 text-base leading-7 text-white/66">
                La arquitectura mantiene el nombre, colores, cuota, alias y sponsors configurables. Eso permite que hoy
                funcione para Ventarron y manana pueda adaptarse a otros clubes locales sin reescribir el producto.
              </p>
            </div>
          </Reveal>

          <Reveal delayMs={130}>
            <div className="rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(59,130,246,0.20),rgba(255,255,255,0.04)_48%,rgba(249,115,22,0.14))] p-7 backdrop-blur sm:p-9">
              <p className="club-eyebrow text-white/48">Mapa interno</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                El hub de pantallas sirve como guia de producto y diseño.
              </h2>
              <p className="mt-4 text-base leading-7 text-white/66">
                El `index.html` del rediseño no deberia ser una landing publica: funciona mejor como mapa interno para
                revisar pantallas, decidir prioridades y mantener consistencia cuando el sistema crezca.
              </p>
            </div>
          </Reveal>
        </section>

        <Reveal delayMs={80}>
          <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,#1e3a8a_0%,#0f172a_72%)] p-8 text-center shadow-[0_32px_90px_-46px_rgba(2,8,23,0.95)] sm:p-12">
            <h2 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Un club mas ordenado se empieza cobrando mejor.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-white/68">
              La landing muestra valor. El panel hace el trabajo. La cuota mensual marca el primer habito.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link href={clubPath("registro")} className={buttonClassNames({ variant: "accent", size: "xl" })}>
                Ver alta de socio
              </Link>
              <Link
                href={adminPath()}
                className={buttonClassNames({
                  variant: "ghost",
                  size: "xl",
                  className: "border border-white/10 text-white hover:bg-white/10 hover:text-white",
                })}
              >
                Abrir panel
              </Link>
            </div>
          </section>
        </Reveal>
      </div>
    </main>
  );
}
