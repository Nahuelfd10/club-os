import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CreditCard,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";

import { ClubLogo } from "@/components/club-logo";
import { buttonClassNames, cardClassNames } from "@/components/ui";
import { getActiveClubConfig } from "@/config/active-club";
import { formatMoney } from "@/lib/formatters";

type TeamCard = {
  name: string;
  headline: string;
  schedule: string;
  description: string;
};

type FeatureCard = {
  title: string;
  description: string;
  icon: LucideIcon;
};

type StepCard = {
  title: string;
  description: string;
};

const teams: TeamCard[] = [
  {
    name: "Masculino",
    headline: "Competencia y compromiso colectivo",
    schedule: "Mar y Jue - 20:00",
    description: "Un plantel pensado para competir, crecer y representar al club cada semana.",
  },
  {
    name: "Femenino",
    headline: "Desarrollo, identidad y proyeccion",
    schedule: "Lun y Mie - 19:00",
    description: "Un espacio con acompanamiento, objetivos claros y mirada a largo plazo.",
  },
  {
    name: "+40",
    headline: "Comunidad para seguir jugando",
    schedule: "Sab - 10:00",
    description: "Un grupo que combina pertenencia, salud y la alegria de seguir compitiendo.",
  },
];

const benefits: FeatureCard[] = [
  {
    title: "Ingreso claro desde el primer dia",
    description: "Registro simple, seguimiento ordenado y una propuesta que acompana a cada nuevo socio.",
    icon: Sparkles,
  },
  {
    title: "Comunidad con pertenencia",
    description: "Mas que actividad deportiva: encuentros, acompanamiento y una identidad compartida.",
    icon: HeartHandshake,
  },
  {
    title: "Organizacion confiable",
    description: "Cobros, altas y comunicacion mas prolijos para dar una mejor experiencia a familias y jugadores.",
    icon: ShieldCheck,
  },
  {
    title: "Espacios para competir y crecer",
    description: "Programas, categorias y equipos que ordenan mejor el recorrido dentro del club.",
    icon: Trophy,
  },
];

const steps: StepCard[] = [
  {
    title: "Completas tu registro",
    description: "Dejas tus datos en pocos minutos y el club recibe la solicitud lista para revisarla.",
  },
  {
    title: "El club valida la informacion",
    description: "La administracion confirma el alta y deja todo ordenado para empezar con seguimiento.",
  },
  {
    title: "Empiezas a participar",
    description: "Con una experiencia mas clara, simple y cercana para cada nuevo socio.",
  },
];

export default async function ClubHomePage() {
  const config = await getActiveClubConfig();
  const feeReference = formatMoney(config.monthly_fee);
  const dueDay = config.monthly_due_day ? `Dia ${config.monthly_due_day} de cada mes` : "Fecha flexible";

  return (
    <main className="px-4 pb-8 pt-10 sm:px-6 sm:pt-12">
      <div className="mx-auto flex w-full max-w-[100rem] flex-col gap-8 sm:gap-10">
        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className={cardClassNames({ variant: "hero", className: "relative overflow-hidden rounded-[2rem] p-7 sm:p-10 lg:p-12" })}>
            <div
              aria-hidden
              className="absolute inset-x-0 top-0 h-48 opacity-80"
              style={{
                background:
                  "radial-gradient(circle at top left, color-mix(in srgb, var(--club-primary) 24%, transparent) 0%, transparent 58%), radial-gradient(circle at top right, color-mix(in srgb, var(--club-accent) 26%, transparent) 0%, transparent 48%)",
              }}
            />
            <div className="relative z-10 max-w-3xl">
              <span className="club-kicker">
                <BadgeCheck className="h-4 w-4" aria-hidden />
                Temporada abierta
              </span>
              <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[1.02] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Una experiencia de club que se <span className="club-gradient-text">siente moderna desde el primer contacto.</span>
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                En {config.name} combinamos comunidad, orden y cercania para que cada socio tenga un ingreso simple y una experiencia mas clara dentro del club.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/club/registro" className={buttonClassNames({ variant: "primary", size: "xl" })}>
                  Hacete socio
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link href="#beneficios" className={buttonClassNames({ variant: "outline", size: "xl" })}>
                  Ver propuesta
                </Link>
              </div>

              <div className="mt-10 grid gap-3 md:grid-cols-3">
                <article className="club-metric-card rounded-[1.5rem] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary/65">Cuota de referencia</p>
                  <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">{feeReference}</p>
                  <p className="mt-2 text-sm text-slate-600">Valor vigente para nuevos registros.</p>
                </article>
                <article className="club-metric-card rounded-[1.5rem] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary/65">Vencimiento</p>
                  <p className="mt-3 text-xl font-bold tracking-tight text-slate-950">{dueDay}</p>
                  <p className="mt-2 text-sm text-slate-600">Informacion clara para que todo sea mas ordenado.</p>
                </article>
                <article className="club-metric-card rounded-[1.5rem] p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary/65">Alta online</p>
                  <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">24/7</p>
                  <p className="mt-2 text-sm text-slate-600">Solicitud disponible cuando la necesites.</p>
                </article>
              </div>
            </div>
          </div>

          <aside className="grid gap-4">
            <div
              className="club-surface-hero relative overflow-hidden rounded-[2rem] p-6 sm:p-8"
              style={{
                background:
                  "linear-gradient(160deg, color-mix(in srgb, var(--club-primary) 12%, white) 0%, rgba(255,255,255,0.94) 45%, color-mix(in srgb, var(--club-accent) 10%, white) 100%)",
              }}
            >
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary/65">Identidad del club</p>
                  <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">Mas orden para vivir mejor cada etapa.</h2>
                </div>
                <ClubLogo
                  src={config.logo}
                  alt={`Logo de ${config.name}`}
                  className="h-16 w-16 rounded-[1.25rem] bg-white/85 p-2 shadow-[0_14px_28px_-20px_rgba(15,23,42,0.45)]"
                />
              </div>

              <div className="club-divider my-6" />

              <div className="grid gap-3">
                <div className="club-surface rounded-[1.35rem] p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-primary/10 p-2 text-primary">
                      <Users className="h-4 w-4" aria-hidden />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Comunidad mas cercana</p>
                      <p className="text-sm text-slate-600">Una experiencia mas prolija para socios, familias y comision.</p>
                    </div>
                  </div>
                </div>
                <div className="club-surface rounded-[1.35rem] p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-accent/10 p-2 text-accent">
                      <CreditCard className="h-4 w-4" aria-hidden />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Cobros mas claros</p>
                      <p className="text-sm text-slate-600">Visibilidad sobre cuotas y recordatorios con una comunicacion mas ordenada.</p>
                    </div>
                  </div>
                </div>
                <div className="club-surface rounded-[1.35rem] p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-primary/10 p-2 text-primary">
                      <CalendarDays className="h-4 w-4" aria-hidden />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Seguimiento continuo</p>
                      <p className="text-sm text-slate-600">Todo listo para acompanar altas, renovaciones y actividad mensual.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={cardClassNames({ className: "grid gap-3 rounded-[2rem] p-6 sm:grid-cols-3" })}>
              <article className="rounded-[1.35rem] bg-slate-950 px-4 py-5 text-white">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/55">Propuesta</p>
                <p className="mt-3 text-lg font-semibold">Experiencia simple y profesional</p>
              </article>
              <article className="rounded-[1.35rem] bg-white/90 px-4 py-5">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary/65">Registro</p>
                <p className="mt-3 text-lg font-semibold text-slate-950">Solicitud online con respuesta clara</p>
              </article>
              <article className="rounded-[1.35rem] bg-accent px-4 py-5 text-white">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/60">Panel</p>
                <p className="mt-3 text-lg font-semibold">Gestion centralizada para el club</p>
              </article>
            </div>
          </aside>
        </section>

        <section id="beneficios" className={cardClassNames({ className: "rounded-[2rem] p-7 sm:p-10" })}>
          <div className="max-w-2xl">
            <span className="club-kicker">Beneficios</span>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Una propuesta pensada para reforzar pertenencia, claridad y crecimiento.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              La landing deja de ser solo informativa y pasa a transmitir mejor el valor del club: cercania, orden y una forma mas profesional de recibir a cada socio.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;

              return (
                <article key={benefit.title} className="club-surface-muted rounded-[1.5rem] p-5">
                  <div className="inline-flex rounded-full bg-white p-3 text-primary shadow-[0_14px_28px_-22px_rgba(15,23,42,0.28)]">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-slate-950">{benefit.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{benefit.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section id="como-funciona" className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className={cardClassNames({ variant: "hero", className: "rounded-[2rem] p-7 sm:p-10" })}>
            <span className="club-kicker">Como funciona</span>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Un recorrido mas simple para el socio y mas claro para el club.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Cada etapa esta pensada para reducir friccion: desde el interes inicial hasta la validacion administrativa y el seguimiento posterior.
            </p>

            <div className="mt-8 space-y-4">
              {steps.map((step, index) => (
                <article key={step.title} className="club-surface rounded-[1.5rem] p-5">
                  <div className="flex gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-bold text-white">
                      0{index + 1}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">{step.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{step.description}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className={cardClassNames({ className: "rounded-[2rem] p-7 sm:p-10" })}>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary/65">Valor institucional</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Lo que deberia sentirse en una institucion bien gestionada.</h2>
              </div>
              <span className="rounded-full bg-primary/8 px-4 py-2 text-sm font-semibold text-primary">Hecho para crecer sin perder cercania</span>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <article className="club-surface-muted rounded-[1.5rem] p-5">
                <p className="text-sm font-semibold text-slate-950">Comunicacion mas clara</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  El club proyecta mayor orden desde la primera visita hasta el seguimiento interno.
                </p>
              </article>
              <article className="club-surface-muted rounded-[1.5rem] p-5">
                <p className="text-sm font-semibold text-slate-950">Conversion mas fuerte</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Una propuesta visual mejor presentada ayuda a que la decision de registrarse llegue mas rapido.
                </p>
              </article>
              <article className="club-surface-muted rounded-[1.5rem] p-5">
                <p className="text-sm font-semibold text-slate-950">Marca mas consistente</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Los colores del club dejan de ser decorativos y pasan a estructurar la experiencia completa.
                </p>
              </article>
              <article className="club-surface-muted rounded-[1.5rem] p-5">
                <p className="text-sm font-semibold text-slate-950">Percepcion mas premium</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Mejor jerarquia visual, mejores superficies y una interfaz que eleva la calidad percibida.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section id="equipos" className={cardClassNames({ className: "rounded-[2rem] p-7 sm:p-10" })}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <span className="club-kicker">Equipos y comunidad</span>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Espacios para competir, desarrollarse y seguir compartiendo el club.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                Cada grupo expresa una parte de la identidad del club: compromiso, evolucion y comunidad.
              </p>
            </div>
            <Link href="/club/registro" className={buttonClassNames({ variant: "outline", size: "lg" })}>
              Sumarme ahora
            </Link>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {teams.map((team) => (
              <article key={team.name} className="club-surface-muted rounded-[1.7rem] p-6">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary/65">{team.name}</p>
                <h3 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">{team.headline}</h3>
                <p className="mt-4 text-sm leading-6 text-slate-600">{team.description}</p>
                <div className="mt-6 rounded-[1.25rem] bg-white/85 px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Entrenamiento</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{team.schedule}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={cardClassNames({ variant: "hero", className: "rounded-[2rem] p-7 sm:p-10 lg:p-12" })}>
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <span className="club-kicker">Listo para crecer</span>
              <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
                Dale al club una presencia digital a la altura de la experiencia que quiere ofrecer.
              </h2>
              <p className="mt-5 text-base leading-7 text-slate-600 sm:text-lg">
                Desde la primera visita hasta la administracion diaria, cada pantalla puede transmitir mas confianza, mas identidad y una sensacion real de producto cuidado.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/club/registro" className={buttonClassNames({ variant: "primary", size: "xl" })}>
                Quiero registrarme
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link href="/admin" className={buttonClassNames({ variant: "ghost", size: "xl" })}>
                Ver panel
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
